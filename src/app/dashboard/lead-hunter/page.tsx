"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MapComponent } from '@/components/lead-hunter/map-component'
import { AddPermitForm, PermitFormData } from '@/components/lead-hunter/add-permit-form'
import { PermitDetailsSidebar } from '@/components/lead-hunter/permit-details-sidebar'
import { Plus, Filter, Search, MapPin, Building } from 'lucide-react'
import { toast } from 'sonner'

interface Permit {
  id: string
  address: string
  city?: string
  state?: string
  zip_code?: string
  builder_name: string
  builder_phone?: string
  permit_type: 'residential' | 'commercial'
  status: 'new' | 'contacted' | 'converted_to_lead' | 'rejected'
  notes?: string
  latitude: number
  longitude: number
  created_at: string
  photo_urls?: string[]
  created_by?: {
    full_name: string
  }
}

export default function LeadHunterPage() {
  const [permits, setPermits] = useState<Permit[]>([])
  const [filteredPermits, setFilteredPermits] = useState<Permit[]>([])
  const [selectedPermit, setSelectedPermit] = useState<Permit | null>(null)
  const [isAddFormOpen, setIsAddFormOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [clickedLocation, setClickedLocation] = useState<{lat: number, lng: number} | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [searchFilter, setSearchFilter] = useState('')

  // Load permits on component mount
  useEffect(() => {
    fetchPermits()
  }, [])

  // Apply filters when permits or filter values change
  useEffect(() => {
    let filtered = permits

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter)
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(p => p.permit_type === typeFilter)
    }

    if (searchFilter.trim()) {
      const search = searchFilter.toLowerCase()
      filtered = filtered.filter(p => 
        p.builder_name.toLowerCase().includes(search) ||
        p.address.toLowerCase().includes(search) ||
        (p.city && p.city.toLowerCase().includes(search))
      )
    }

    setFilteredPermits(filtered)
  }, [permits, statusFilter, typeFilter, searchFilter])

  const fetchPermits = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/permits')
      
      if (!response.ok) {
        throw new Error('Failed to fetch permits')
      }

      const data = await response.json()
      setPermits(data)
    } catch (error) {
      console.error('Error fetching permits:', error)
      toast.error('Failed to load permits')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddPermit = async (permitData: PermitFormData) => {
    try {
      const response = await fetch('/api/permits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(permitData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create permit')
      }

      const newPermit = await response.json()
      setPermits(prev => [newPermit, ...prev])
      setIsAddFormOpen(false)
      setClickedLocation(null)
      toast.success('Permit added successfully!')
    } catch (error) {
      console.error('Error creating permit:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create permit')
    }
  }

  const handlePermitSelect = (permit: Permit | null) => {
    setSelectedPermit(permit)
    setIsSidebarOpen(!!permit)
  }

  const handleMapClick = (lat: number, lng: number) => {
    setClickedLocation({ lat, lng })
    setIsAddFormOpen(true)
  }

  const handleStatusChange = async (permitId: string, newStatus: Permit['status']) => {
    try {
      const response = await fetch(`/api/permits/${permitId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update permit status')
      }

      const updatedPermit = await response.json()
      setPermits(prev => prev.map(p => p.id === permitId ? updatedPermit : p))
      setSelectedPermit(updatedPermit)
    } catch (error) {
      console.error('Error updating permit status:', error)
      throw error
    }
  }

  const handleConvertToLead = (permit: Permit) => {
    // TODO: Implement lead conversion in Phase 2
    toast.info('Lead conversion will be implemented in Phase 2!')
  }

  const handleEdit = (permit: Permit) => {
    // TODO: Implement edit functionality
    toast.info('Edit functionality coming soon!')
  }

  const handleDelete = async (permitId: string) => {
    try {
      const response = await fetch(`/api/permits/${permitId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete permit')
      }

      setPermits(prev => prev.filter(p => p.id !== permitId))
      setSelectedPermit(null)
      setIsSidebarOpen(false)
      toast.success('Permit deleted successfully')
    } catch (error) {
      console.error('Error deleting permit:', error)
      toast.error('Failed to delete permit')
    }
  }

  const getStatusCounts = () => {
    return {
      all: permits.length,
      new: permits.filter(p => p.status === 'new').length,
      contacted: permits.filter(p => p.status === 'contacted').length,
      converted_to_lead: permits.filter(p => p.status === 'converted_to_lead').length,
      rejected: permits.filter(p => p.status === 'rejected').length,
    }
  }

  const statusCounts = getStatusCounts()

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="bg-white border-b px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                Lead Hunter - Construction Map
              </h1>
              <p className="text-slate-600 mt-1 text-sm sm:text-base">
                Track construction permits and convert builders to leads
              </p>
            </div>
            <Button 
              onClick={() => setIsAddFormOpen(true)}
              className="bg-orange-500 hover:bg-orange-600 ml-4 flex-shrink-0"
              size="sm"
            >
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Permit</span>
            </Button>
          </div>

          {/* Filters and Stats */}
          <div className="mt-4 space-y-3 lg:space-y-0 lg:flex lg:flex-wrap lg:items-center lg:gap-4">
            {/* Search */}
            <div className="flex-1 lg:min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by builder or address..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters Row for Mobile */}
            <div className="flex space-x-3 lg:contents">
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="flex-1 lg:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status ({statusCounts.all})</SelectItem>
                  <SelectItem value="new">New ({statusCounts.new})</SelectItem>
                  <SelectItem value="contacted">Contacted ({statusCounts.contacted})</SelectItem>
                  <SelectItem value="converted_to_lead">Converted ({statusCounts.converted_to_lead})</SelectItem>
                  <SelectItem value="rejected">Rejected ({statusCounts.rejected})</SelectItem>
                </SelectContent>
              </Select>

              {/* Type Filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="flex-1 lg:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Map Container */}
          <div className="flex-1 relative">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
                  <p className="text-slate-600">Loading permits...</p>
                </div>
              </div>
            ) : (
              <MapComponent
                permits={filteredPermits}
                selectedPermit={selectedPermit}
                onPermitSelect={handlePermitSelect}
                onMapClick={handleMapClick}
              />
            )}

            {/* Map Legend - Responsive positioning */}
            <Card className="absolute bottom-4 left-4 right-4 lg:right-auto lg:w-auto p-3 bg-white/90 backdrop-blur">
              <h4 className="font-semibold text-sm mb-2 lg:mb-2">Legend</h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 lg:space-y-1 lg:grid-cols-1 text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0"></div>
                  <span>New</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500 flex-shrink-0"></div>
                  <span>Contacted</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0"></div>
                  <span>Converted</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0"></div>
                  <span>Rejected</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Add Permit Modal */}
      <AddPermitForm
        isOpen={isAddFormOpen}
        onClose={() => {
          setIsAddFormOpen(false)
          setClickedLocation(null)
        }}
        onSubmit={handleAddPermit}
        initialData={clickedLocation ? {
          lat: clickedLocation.lat,
          lng: clickedLocation.lng
        } : undefined}
      />

      {/* Permit Details Sidebar */}
      <PermitDetailsSidebar
        permit={selectedPermit}
        isOpen={isSidebarOpen}
        onClose={() => {
          setIsSidebarOpen(false)
          setSelectedPermit(null)
        }}
        onStatusChange={handleStatusChange}
        onConvertToLead={handleConvertToLead}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  )
}