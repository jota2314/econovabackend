"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MapComponent } from '@/components/lead-hunter/map-component'
import { AddPermitForm, PermitFormData } from '@/components/lead-hunter/add-permit-form'
import { EditPermitForm, EditPermitFormData } from '@/components/lead-hunter/edit-permit-form'
import { PermitDetailsSidebar } from '@/components/lead-hunter/permit-details-sidebar'
import { PermitTableView } from '@/components/lead-hunter/permit-table-view'
import { ZoneSelector } from '@/components/lead-hunter/zone-selector'
import { ViewToggle, ViewMode } from '@/components/lead-hunter/view-toggle'
import { CsvUpload } from '@/components/lead-hunter/csv-upload'
import { VisitRecommendations } from '@/components/lead-hunter/visit-recommendations'
import { Plus, Filter, Search, MapPin, Building, Minus, Flame, Upload } from 'lucide-react'
import { toast } from 'sonner'

interface Permit {
  id: string
  address: string
  city?: string
  state?: string
  zip_code?: string
  county?: string
  builder_name: string
  builder_phone?: string
  permit_type: 'residential' | 'commercial'
  status: 'new' | 'contacted' | 'converted_to_lead' | 'rejected' | 'hot' | 'cold' | 'visited' | 'not_visited'
  notes?: string
  project_value?: number
  description?: string
  priority_score?: number
  temperature?: 'hot' | 'warm' | 'cold'
  latitude: number
  longitude: number
  created_at: string
  photo_urls?: string[]
  created_by?: {
    full_name: string
  }
}

// City to County mapping for fallback when county is null
const getCityCountyMapping = (city: string): string | null => {
  const cityCountyMap: { [key: string]: string } = {
    'Andover': 'Essex',
    'Gloucester': 'Essex',
    'Hamilton': 'Essex',
    'Ipswich': 'Essex',
    'Rowley': 'Essex',
    'Topsfield': 'Essex',
    // Add more mappings as needed
  }
  return cityCountyMap[city] || null
}

export default function LeadHunterPage() {
  const [permits, setPermits] = useState<Permit[]>([])
  const [filteredPermits, setFilteredPermits] = useState<Permit[]>([])
  const [selectedPermit, setSelectedPermit] = useState<Permit | null>(null)
  const [isAddFormOpen, setIsAddFormOpen] = useState(false)
  const [isEditFormOpen, setIsEditFormOpen] = useState(false)
  const [editingPermit, setEditingPermit] = useState<Permit | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [clickedLocation, setClickedLocation] = useState<{lat: number, lng: number} | null>(null)
  const [isCsvUploadOpen, setIsCsvUploadOpen] = useState(false)

  // View Management
  const [currentView, setCurrentView] = useState<ViewMode>('map')
  
  // Legend Management
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(false)
  
  // Heat Zones Management
  const [showHeatZones, setShowHeatZones] = useState(false)
  
  // Zone Selector Collapse State - Prevent hydration mismatch
  const [isZoneSelectorCollapsed, setIsZoneSelectorCollapsed] = useState(true)
  const [isMounted, setIsMounted] = useState(false)

  // Load from localStorage after component mounts
  useEffect(() => {
    setIsMounted(true)
    const saved = localStorage.getItem('zoneSelectorCollapsed')
    if (saved !== null) {
      setIsZoneSelectorCollapsed(JSON.parse(saved))
    }
  }, [])

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [searchFilter, setSearchFilter] = useState('')
  const [geocodingFilter, setGeocodingFilter] = useState<string>('all')
  const [zoneFilter, setZoneFilter] = useState<{
    state?: 'MA' | 'NH'
    county?: string
    cities?: string[]
  }>({})

  // Load permits on component mount
  useEffect(() => {
    fetchPermits()
  }, [])
  
  // Save zone selector collapsed state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('zoneSelectorCollapsed', JSON.stringify(isZoneSelectorCollapsed))
    }
  }, [isZoneSelectorCollapsed])

  // Apply filters when permits or filter values change
  useEffect(() => {
    let filtered = permits

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter)
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(p => p.permit_type === typeFilter)
    }

    if (geocodingFilter !== 'all') {
      if (geocodingFilter === 'geocoded') {
        filtered = filtered.filter(p => p.latitude !== 0 || p.longitude !== 0)
      } else if (geocodingFilter === 'not_geocoded') {
        filtered = filtered.filter(p => p.latitude === 0 && p.longitude === 0)
      }
    }

    if (searchFilter.trim()) {
      const search = searchFilter.toLowerCase()
      filtered = filtered.filter(p => 
        p.builder_name.toLowerCase().includes(search) ||
        p.address.toLowerCase().includes(search) ||
        (p.city && p.city.toLowerCase().includes(search))
      )
    }

    // Zone filtering
    if (zoneFilter.state) {
      filtered = filtered.filter(p => p.state === zoneFilter.state)
    }

    if (zoneFilter.county) {
      filtered = filtered.filter(p => p.county === zoneFilter.county || (p.county === null && p.city && getCityCountyMapping(p.city) === zoneFilter.county))
    }

    if (zoneFilter.cities && zoneFilter.cities.length > 0) {
      filtered = filtered.filter(p => p.city && zoneFilter.cities!.includes(p.city))
    }

    setFilteredPermits(filtered)
  }, [permits, statusFilter, typeFilter, searchFilter, geocodingFilter, zoneFilter.state, zoneFilter.county, zoneFilter.cities])

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
    setEditingPermit(permit)
    setIsEditFormOpen(true)
  }

  const handleEditSubmit = async (permitId: string, permitData: EditPermitFormData) => {
    try {
      const response = await fetch(`/api/permits/${permitId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(permitData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update permit')
      }

      const updatedPermit = await response.json()
      setPermits(prev => prev.map(p => p.id === permitId ? updatedPermit : p))
      setIsEditFormOpen(false)
      setEditingPermit(null)

      // Update selected permit if it's the one being edited
      if (selectedPermit?.id === permitId) {
        setSelectedPermit(updatedPermit)
      }

      toast.success('Permit updated successfully!')
    } catch (error) {
      console.error('Error updating permit:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update permit')
    }
  }

  const handleUpdate = async (permitId: string, updates: Partial<Permit>) => {
    try {
      const response = await fetch(`/api/permits/${permitId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update permit')
      }

      const updatedPermit = await response.json()
      setPermits(prev => prev.map(p => p.id === permitId ? updatedPermit : p))

      // Update selected permit if it's the one being updated
      if (selectedPermit?.id === permitId) {
        setSelectedPermit(updatedPermit)
      }
    } catch (error) {
      console.error('Error updating permit:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update permit')
      throw error
    }
  }

  const handleDelete = async (permitId: string) => {
    try {
      const response = await fetch(`/api/permits/${permitId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`
        console.error('Delete failed:', errorMessage)
        throw new Error(errorMessage)
      }

      // Only remove from UI if the server deletion was successful
      setPermits(prev => prev.filter(p => p.id !== permitId))
      setSelectedPermit(null)
      setIsSidebarOpen(false)
      toast.success('Permit deleted successfully')
    } catch (error) {
      console.error('Error deleting permit:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete permit')
    }
  }

  const handleGeocode = async (permitId: string) => {
    try {
      const response = await fetch(`/api/permits/${permitId}/geocode`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`
        console.error('Geocoding failed:', errorMessage)
        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log('Geocoding successful:', result)

      // Update the permit in the state with new coordinates
      setPermits(prev => prev.map(permit =>
        permit.id === permitId
          ? { ...permit, latitude: result.latitude, longitude: result.longitude }
          : permit
      ))

      // Update selected permit if it's the one being geocoded
      setSelectedPermit(prev =>
        prev && prev.id === permitId
          ? { ...prev, latitude: result.latitude, longitude: result.longitude }
          : prev
      )

    } catch (error) {
      console.error('Error geocoding permit:', error)
      throw error // Re-throw to let the toast in PermitTableView handle it
    }
  }

  const getStatusCounts = () => {
    return {
      all: permits.length,
      new: permits.filter(p => p.status === 'new').length,
      contacted: permits.filter(p => p.status === 'contacted').length,
      converted_to_lead: permits.filter(p => p.status === 'converted_to_lead').length,
      rejected: permits.filter(p => p.status === 'rejected').length,
      hot: permits.filter(p => p.status === 'hot').length,
      cold: permits.filter(p => p.status === 'cold').length,
      visited: permits.filter(p => p.status === 'visited').length,
      not_visited: permits.filter(p => p.status === 'not_visited').length,
    }
  }

  const getGeocodingCounts = () => {
    return {
      all: permits.length,
      geocoded: permits.filter(p => p.latitude !== 0 || p.longitude !== 0).length,
      not_geocoded: permits.filter(p => p.latitude === 0 && p.longitude === 0).length,
    }
  }

  const statusCounts = getStatusCounts()
  const geocodingCounts = getGeocodingCounts()

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="bg-white border-b px-4 sm:px-6 py-2 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl font-bold text-slate-900">
                <span className="sm:hidden">Lead Hunter</span>
                <span className="hidden sm:inline">Lead Hunter - Construction Permits</span>
              </h1>
              <p className="text-slate-600 mt-1 text-sm sm:text-base hidden sm:block">
                Track construction permits and convert builders to leads
              </p>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 ml-4 flex-shrink-0">
              <ViewToggle
                currentView={currentView}
                onViewChange={setCurrentView}
                permitCount={filteredPermits.length}
              />
              {currentView === 'map' && (
                <Button
                  variant={showHeatZones ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowHeatZones(!showHeatZones)}
                  className={showHeatZones ? "bg-orange-600 hover:bg-orange-700" : ""}
                  title="Toggle Heat Zones for Hot Permits"
                >
                  <Flame className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Heat Zones</span>
                </Button>
              )}
              <Button
                onClick={() => setIsCsvUploadOpen(true)}
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <Upload className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Import CSV</span>
              </Button>
              <Button
                onClick={() => setIsAddFormOpen(true)}
                className="bg-green-600 hover:bg-green-700"
                size="sm"
              >
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Permit</span>
              </Button>
            </div>
          </div>

          {/* Filters and Stats */}
          <div className="mt-2 sm:mt-4 space-y-3 lg:space-y-0 lg:flex lg:flex-wrap lg:items-center lg:gap-4">
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

            {/* Filters Row */}
            <div className="hidden sm:flex space-x-3 lg:contents">
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="flex-1 lg:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status ({statusCounts.all})</SelectItem>
                  <SelectItem value="new">🆕 New ({statusCounts.new})</SelectItem>
                  <SelectItem value="contacted">📞 Contacted ({statusCounts.contacted})</SelectItem>
                  <SelectItem value="converted_to_lead">✅ Converted ({statusCounts.converted_to_lead})</SelectItem>
                  <SelectItem value="rejected">❌ Rejected ({statusCounts.rejected})</SelectItem>
                  <SelectItem value="hot">🔥 Hot ({statusCounts.hot})</SelectItem>
                  <SelectItem value="cold">❄️ Cold ({statusCounts.cold})</SelectItem>
                  <SelectItem value="visited">👥 Visited ({statusCounts.visited})</SelectItem>
                  <SelectItem value="not_visited">📍 Not Visited ({statusCounts.not_visited})</SelectItem>
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

              {/* Geocoding Filter */}
              <Select value={geocodingFilter} onValueChange={setGeocodingFilter}>
                <SelectTrigger className="flex-1 lg:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations ({geocodingCounts.all})</SelectItem>
                  <SelectItem value="geocoded">📍 On Map ({geocodingCounts.geocoded})</SelectItem>
                  <SelectItem value="not_geocoded">📍 Need Location ({geocodingCounts.not_geocoded})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Mobile Compact Filter */}
            <div className="sm:hidden">
              <Button
                variant="outline"
                onClick={() => setIsZoneSelectorCollapsed(!isZoneSelectorCollapsed)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4" />
                  <span>Filters</span>
                </div>
                <span className="text-sm text-slate-500">
                  {statusFilter !== 'all' || typeFilter !== 'all' || zoneFilter !== 'all' ? '•' : ''}
                </span>
              </Button>
            </div>
          </div>

          {/* Zone Selector - Desktop always visible, Mobile collapsible */}
          <div className={`mt-4 transition-all duration-300 ${
            !isMounted || isZoneSelectorCollapsed ? 'hidden' : 'block'
          } sm:block`}>
            <ZoneSelector 
              selectedZone={zoneFilter}
              onZoneChange={setZoneFilter}
              isCollapsed={isZoneSelectorCollapsed}
              onToggleCollapse={() => setIsZoneSelectorCollapsed(!isZoneSelectorCollapsed)}
            />
            
            {/* Mobile Filters in Collapsed State */}
            <div className="sm:hidden mt-3 space-y-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status ({statusCounts.all})</SelectItem>
                  <SelectItem value="new">🆕 New ({statusCounts.new})</SelectItem>
                  <SelectItem value="contacted">📞 Contacted ({statusCounts.contacted})</SelectItem>
                  <SelectItem value="converted_to_lead">✅ Converted ({statusCounts.converted_to_lead})</SelectItem>
                  <SelectItem value="rejected">❌ Rejected ({statusCounts.rejected})</SelectItem>
                  <SelectItem value="hot">🔥 Hot ({statusCounts.hot})</SelectItem>
                  <SelectItem value="cold">❄️ Cold ({statusCounts.cold})</SelectItem>
                  <SelectItem value="visited">👥 Visited ({statusCounts.visited})</SelectItem>
                  <SelectItem value="not_visited">📍 Not Visited ({statusCounts.not_visited})</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>

              <Select value={geocodingFilter} onValueChange={setGeocodingFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations ({geocodingCounts.all})</SelectItem>
                  <SelectItem value="geocoded">📍 On Map ({geocodingCounts.geocoded})</SelectItem>
                  <SelectItem value="not_geocoded">📍 Need Location ({geocodingCounts.not_geocoded})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
                <p className="text-slate-600">Loading permits...</p>
              </div>
            </div>
          ) : (
            <>
              {currentView === 'map' ? (
                <div className="flex-1 relative">
                  <MapComponent
                    permits={filteredPermits}
                    selectedPermit={selectedPermit}
                    onPermitSelect={handlePermitSelect}
                    onMapClick={handleMapClick}
                    showHeatZones={showHeatZones}
                  />

                  {/* Map Legend - Only show in map view */}
                  <Card className="absolute bottom-4 left-4 right-4 lg:right-auto lg:w-auto p-3 bg-white/90 backdrop-blur">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sm">Legend</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsLegendCollapsed(!isLegendCollapsed)}
                        className="h-6 w-6 p-0 text-slate-500 hover:text-slate-700"
                      >
                        {isLegendCollapsed ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                      </Button>
                    </div>
                    {!isLegendCollapsed && (
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
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full bg-orange-600 flex-shrink-0"></div>
                          <span>Hot 🔥</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full bg-slate-500 flex-shrink-0"></div>
                          <span>Cold</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full bg-purple-500 flex-shrink-0"></div>
                          <span>Visited</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full bg-gray-500 flex-shrink-0"></div>
                          <span>Not Visited</span>
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              ) : currentView === 'table' ? (
                <div className="flex-1 p-6 overflow-auto">
                  <PermitTableView
                    permits={filteredPermits}
                    onPermitSelect={handlePermitSelect}
                    onStatusChange={handleStatusChange}
                    onConvertToLead={handleConvertToLead}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onGeocode={handleGeocode}
                  />
                </div>
              ) : currentView === 'recommendations' ? (
                <div className="flex-1 p-6 overflow-auto">
                  <VisitRecommendations
                    onPermitSelect={handlePermitSelect}
                    zoneFilter={zoneFilter}
                  />
                </div>
              ) : null}
            </>
          )}
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

      {/* Edit Permit Modal */}
      {editingPermit && (
        <EditPermitForm
          isOpen={isEditFormOpen}
          onClose={() => {
            setIsEditFormOpen(false)
            setEditingPermit(null)
          }}
          onSubmit={handleEditSubmit}
          permit={editingPermit}
        />
      )}

      {/* CSV Upload Modal */}
      <CsvUpload
        isOpen={isCsvUploadOpen}
        onClose={() => setIsCsvUploadOpen(false)}
        onUploadComplete={() => {
          fetchPermits()
          setIsCsvUploadOpen(false)
        }}
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
        onUpdate={handleUpdate}
      />
    </div>
  )
}