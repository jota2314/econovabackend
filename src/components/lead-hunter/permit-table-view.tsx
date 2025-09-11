"use client"

import { useState } from 'react'
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
  Download
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
      setSelectedPermits(paginatedPermits.map(p => p.id))
    } else {
      setSelectedPermits([])
    }
  }

  const handleSelectPermit = (permitId: string, checked: boolean) => {
    if (checked) {
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

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {selectedPermits.length > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedPermits.length} permits selected
              </span>
              <div className="flex items-center space-x-2">
                <Select onValueChange={handleBulkStatusChange}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Change status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="converted_to_lead">Converted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
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
    </div>
  )
}