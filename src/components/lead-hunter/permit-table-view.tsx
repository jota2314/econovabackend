"use client"

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  MapPin, 
  Building, 
  Phone, 
  Calendar,
  MoreVertical,
  ArrowUpDown,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  Download,
  Route,
  AlertCircle
} from 'lucide-react'
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
  latitude: number
  longitude: number
  created_at: string
  photo_urls?: string[]
  created_by?: {
    full_name: string
  }
}

interface PermitTableViewProps {
  permits: Permit[]
  onPermitSelect: (permit: Permit) => void
  onStatusChange: (permitId: string, newStatus: Permit['status']) => void
  onConvertToLead: (permit: Permit) => void
  onEdit: (permit: Permit) => void
  onDelete: (permitId: string) => void
}

type SortField = 'address' | 'builder_name' | 'permit_type' | 'status' | 'created_at' | 'city'
type SortOrder = 'asc' | 'desc'

export function PermitTableView({
  permits,
  onPermitSelect,
  onStatusChange,
  onConvertToLead,
  onEdit,
  onDelete
}: PermitTableViewProps) {
  const [selectedPermits, setSelectedPermits] = useState<string[]>([])
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [pageSize, setPageSize] = useState(25)
  const [currentPage, setCurrentPage] = useState(1)
  
  // Route planning dialog state
  const [isRoutePlannerOpen, setIsRoutePlannerOpen] = useState(false)
  const [startPointType, setStartPointType] = useState<'current' | 'first' | 'custom'>('current')
  const [customStartAddress, setCustomStartAddress] = useState('')
  const [endPointType, setEndPointType] = useState<'last' | 'start' | 'custom'>('last')
  const [customEndAddress, setCustomEndAddress] = useState('')

  // Sort permits
  const sortedPermits = [...permits].sort((a, b) => {
    let aValue: any = a[sortField]
    let bValue: any = b[sortField]

    // Handle special cases
    if (sortField === 'created_at') {
      aValue = new Date(aValue).getTime()
      bValue = new Date(bValue).getTime()
    } else if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase()
      bValue = bValue.toLowerCase()
    }

    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  // Paginate permits
  const totalPages = Math.ceil(sortedPermits.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedPermits = sortedPermits.slice(startIndex, startIndex + pageSize)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Limit to first 20 permits for route planning
      const permitsToSelect = paginatedPermits.slice(0, 20).map(p => p.id)
      if (paginatedPermits.length > 20) {
        toast.info('Selected first 20 permits (maximum for route planning)')
      }
      setSelectedPermits(permitsToSelect)
    } else {
      setSelectedPermits([])
    }
  }

  const handleSelectPermit = (permitId: string, checked: boolean) => {
    if (checked) {
      // Enforce 20 permit limit for route planning
      if (selectedPermits.length >= 20) {
        toast.warning('Maximum 20 permits can be selected for route planning')
        return
      }
      setSelectedPermits(prev => [...prev, permitId])
    } else {
      setSelectedPermits(prev => prev.filter(id => id !== permitId))
    }
  }

  const handleBulkStatusChange = async (newStatus: Permit['status']) => {
    try {
      // Update all selected permits
      await Promise.all(
        selectedPermits.map(permitId => onStatusChange(permitId, newStatus))
      )
      setSelectedPermits([])
      toast.success(`Updated ${selectedPermits.length} permits to ${newStatus}`)
    } catch (error) {
      toast.error('Failed to update permits')
    }
  }

  const handleOpenRoutePlanner = () => {
    const selectedData = permits.filter(p => selectedPermits.includes(p.id))
    
    if (selectedData.length === 0) {
      toast.error('No permits selected')
      return
    }
    
    if (selectedData.length > 20) {
      toast.error('Too many permits selected. Maximum is 20.')
      return
    }
    
    // Reset form and open dialog
    setStartPointType('current')
    setEndPointType('last')
    setCustomStartAddress('')
    setCustomEndAddress('')
    setIsRoutePlannerOpen(true)
  }
  
  // Route optimization using server-side API
  const optimizeRouteWithAPI = async (
    permits: Permit[],
    startLocation: string,
    endLocation: string
  ): Promise<Permit[]> => {
    if (permits.length <= 1) return permits

    try {
      // Prepare all permit addresses
      const permitAddresses = permits.map(permit =>
        `${permit.address}, ${permit.city || ''}, ${permit.state || 'MA'} ${permit.zip_code || ''}`.trim()
      )

      // Call our server-side optimization API
      const response = await fetch('/api/routes/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin: startLocation,
          destination: endLocation,
          permits: permitAddresses,
          optimizeWaypoints: true
        })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      // Reorder permits based on optimized waypoint order
      if (data.waypoint_order && Array.isArray(data.waypoint_order)) {
        const optimizedPermits: Permit[] = []
        data.waypoint_order.forEach((index: number) => {
          if (index < permits.length) {
            optimizedPermits.push(permits[index])
          }
        })
        return optimizedPermits.length > 0 ? optimizedPermits : permits
      }

      return permits
    } catch (error) {
      console.warn('Route optimization failed, using original order:', error)
      return permits
    }
  }

  const handleCreateRoute = async () => {
    const selectedData = permits.filter(p => selectedPermits.includes(p.id))

    try {
      // Determine actual start and end locations based on UI selections
      let actualStartLocation: string
      let actualEndLocation: string

      // Handle start location
      if (startPointType === 'current') {
        // For now, use a default business location instead of trying to get user's location
        // TODO: Implement geolocation API for actual current location
        actualStartLocation = 'Wilmington, MA 01887' // Default business location
      } else if (startPointType === 'first' && selectedData.length > 0) {
        const firstPermit = selectedData[0]
        actualStartLocation = `${firstPermit.address}, ${firstPermit.city || ''}, ${firstPermit.state || 'MA'} ${firstPermit.zip_code || ''}`
      } else if (startPointType === 'custom' && customStartAddress) {
        actualStartLocation = customStartAddress.trim()
      } else {
        actualStartLocation = 'Wilmington, MA 01887' // Fallback to business location
      }

      // Handle end location
      if (endPointType === 'start') {
        // Round trip - same as start
        actualEndLocation = actualStartLocation
      } else if (endPointType === 'last' && selectedData.length > 0) {
        const lastPermit = selectedData[selectedData.length - 1]
        actualEndLocation = `${lastPermit.address}, ${lastPermit.city || ''}, ${lastPermit.state || 'MA'} ${lastPermit.zip_code || ''}`
      } else if (endPointType === 'custom' && customEndAddress) {
        actualEndLocation = customEndAddress.trim()
      } else {
        actualEndLocation = actualStartLocation // Fallback to round trip
      }

      // Get optimized route from Google API with proper start/end points
      const optimizedPermits = await optimizeRouteWithAPI(selectedData, actualStartLocation, actualEndLocation)

      // Build Google Maps URL with optimized order
      let mapsUrl = 'https://www.google.com/maps/dir/'

      // Add starting point
      mapsUrl += encodeURIComponent(actualStartLocation) + '/'

      // Add optimized permits in order
      optimizedPermits.forEach(permit => {
        const address = `${permit.address}, ${permit.city || ''}, ${permit.state || 'MA'} ${permit.zip_code || ''}`
        mapsUrl += encodeURIComponent(address.trim()) + '/'
      })

      // Add ending point
      if (actualStartLocation !== actualEndLocation) {
        // Different end location
        mapsUrl += encodeURIComponent(actualEndLocation)
      } else {
        // Round trip - add starting location again to complete the loop
        mapsUrl += encodeURIComponent(actualStartLocation)
      }

      // Close dialog and open route
      setIsRoutePlannerOpen(false)
      window.open(mapsUrl, '_blank')
      toast.success(`Opening optimized route with ${selectedData.length} stops`)

    } catch (error) {
      console.error('Route creation failed:', error)
      toast.error('Failed to create optimized route. Please try again.')
    }
  }

  const handleExportSelected = () => {
    const selectedData = permits.filter(p => selectedPermits.includes(p.id))
    const csvContent = [
      'Address,City,Builder Name,Phone,Type,Status,Created Date',
      ...selectedData.map(p => 
        `"${p.address}","${p.city || ''}","${p.builder_name}","${p.builder_phone || ''}","${p.permit_type}","${p.status}","${new Date(p.created_at).toLocaleDateString()}"`
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `permits-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)

    toast.success(`Exported ${selectedPermits.length} permits`)
  }

  const getStatusColor = (status: Permit['status']) => {
    switch (status) {
      case 'new': return 'bg-green-100 text-green-800 border-green-200'
      case 'contacted': return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'converted_to_lead': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
      case 'hot': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'cold': return 'bg-slate-100 text-slate-800 border-slate-200'
      case 'visited': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'not_visited': return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const SortButton = ({ field, children }: { field: SortField, children: React.ReactNode }) => (
    <Button
      variant="ghost"
      onClick={() => handleSort(field)}
      className="h-auto p-0 font-semibold hover:bg-transparent flex items-center space-x-1"
    >
      <span>{children}</span>
      <ArrowUpDown className="w-3 h-3" />
    </Button>
  )

  // Get selected permit data for the dialog
  const selectedPermitData = permits.filter(p => selectedPermits.includes(p.id))
  const firstPermit = selectedPermitData[0]
  const lastPermit = selectedPermitData[selectedPermitData.length - 1]

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {selectedPermits.length > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-blue-900">
                  {selectedPermits.length} permits selected
                </span>
                {selectedPermits.length > 20 && (
                  <div className="flex items-center space-x-1 text-amber-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs">Max 20 for routes</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={handleOpenRoutePlanner}
                  disabled={selectedPermits.length > 20}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  size="sm"
                >
                  <Route className="w-4 h-4 mr-2" />
                  Create Route
                </Button>
                <Select onValueChange={handleBulkStatusChange}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Change status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">🆕 New</SelectItem>
                    <SelectItem value="contacted">📞 Contacted</SelectItem>
                    <SelectItem value="converted_to_lead">✅ Converted</SelectItem>
                    <SelectItem value="rejected">❌ Rejected</SelectItem>
                    <SelectItem value="hot">🔥 Hot</SelectItem>
                    <SelectItem value="cold">❄️ Cold</SelectItem>
                    <SelectItem value="visited">👥 Visited</SelectItem>
                    <SelectItem value="not_visited">📍 Not Visited</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportSelected}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedPermits([])}
            >
              Clear Selection
            </Button>
          </div>
        </Card>
      )}

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedPermits.length === paginatedPermits.length && paginatedPermits.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>
                <SortButton field="address">Address</SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="city">City</SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="builder_name">Builder</SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="permit_type">Type</SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="status">Status</SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="created_at">Date Added</SortButton>
              </TableHead>
              <TableHead className="w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPermits.map((permit) => (
              <TableRow key={permit.id} className="hover:bg-slate-50">
                <TableCell>
                  <Checkbox
                    checked={selectedPermits.includes(permit.id)}
                    onCheckedChange={(checked) => handleSelectPermit(permit.id, checked as boolean)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-start space-x-2">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">{permit.address}</div>
                      {permit.zip_code && (
                        <div className="text-sm text-slate-500">{permit.zip_code}</div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {permit.city && <div>{permit.city}</div>}
                    {permit.county && <div className="text-slate-500">{permit.county}</div>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-start space-x-2">
                    <Building className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">{permit.builder_name}</div>
                      {permit.builder_phone && (
                        <div className="text-sm text-slate-500 flex items-center">
                          <Phone className="w-3 h-3 mr-1" />
                          {permit.builder_phone}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {permit.permit_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(permit.status)} variant="outline">
                    {permit.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1 text-sm text-slate-600">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(permit.created_at)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onPermitSelect(permit)}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(permit)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onConvertToLead(permit)}>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Convert to Lead
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => onDelete(permit.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="p-4 border-t flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-slate-600">
              Showing {startIndex + 1} to {Math.min(startIndex + pageSize, sortedPermits.length)} of {sortedPermits.length} permits
            </div>
            <Select value={pageSize.toString()} onValueChange={(value) => {
              setPageSize(parseInt(value))
              setCurrentPage(1)
            }}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="text-sm text-slate-600">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* Route Planning Dialog */}
      <Dialog open={isRoutePlannerOpen} onOpenChange={setIsRoutePlannerOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Plan Your Route</DialogTitle>
            <DialogDescription>
              Configure your route for {selectedPermitData.length} selected permit{selectedPermitData.length > 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Starting Point */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Starting Point</Label>
              <RadioGroup value={startPointType} onValueChange={(value: any) => setStartPointType(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="current" id="start-current" />
                  <Label htmlFor="start-current" className="font-normal cursor-pointer">
                    My Current Location
                  </Label>
                </div>
                {firstPermit && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="first" id="start-first" />
                    <Label htmlFor="start-first" className="font-normal cursor-pointer">
                      First Permit ({firstPermit.address}, {firstPermit.city})
                    </Label>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="start-custom" />
                  <Label htmlFor="start-custom" className="font-normal cursor-pointer">
                    Custom Address
                  </Label>
                </div>
              </RadioGroup>
              {startPointType === 'custom' && (
                <Input
                  placeholder="Enter starting address..."
                  value={customStartAddress}
                  onChange={(e) => setCustomStartAddress(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            {/* Ending Point */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Ending Point</Label>
              <RadioGroup value={endPointType} onValueChange={(value: any) => setEndPointType(value)}>
                {lastPermit && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="last" id="end-last" />
                    <Label htmlFor="end-last" className="font-normal cursor-pointer">
                      Last Permit ({lastPermit.address}, {lastPermit.city})
                    </Label>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="start" id="end-start" />
                  <Label htmlFor="end-start" className="font-normal cursor-pointer">
                    Return to Start (Round Trip)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="end-custom" />
                  <Label htmlFor="end-custom" className="font-normal cursor-pointer">
                    Custom Address
                  </Label>
                </div>
              </RadioGroup>
              {endPointType === 'custom' && (
                <Input
                  placeholder="Enter ending address..."
                  value={customEndAddress}
                  onChange={(e) => setCustomEndAddress(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            {/* Route Info */}
            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-sm text-blue-900">
                <strong>Route will include:</strong> {selectedPermitData.length} permit stop{selectedPermitData.length > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Google Maps will optimize the order for the shortest travel time
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoutePlannerOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateRoute}
              className="bg-orange-600 hover:bg-orange-700"
              disabled={
                (startPointType === 'custom' && !customStartAddress) ||
                (endPointType === 'custom' && !customEndAddress)
              }
            >
              <Route className="w-4 h-4 mr-2" />
              Create Route
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}