"use client"

import { useState, useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Lead } from "@/lib/types/database"
import { 
  ArrowUpDown, 
  Search, 
  Phone, 
  Mail, 
  MapPin,
  Edit,
  MoreHorizontal,
  MessageSquare,
  PhoneCall,
  History
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type SortField = 'name' | 'status' | 'created_at'
type SortDirection = 'asc' | 'desc'

interface LeadsTableProps {
  leads: Lead[]
  onEditLead: (lead: Lead) => void
  onDeleteLead: (leadId: string) => void
  onUpdateStatus: (leadId: string, status: Lead['status']) => void
  onCallLead?: (lead: Lead) => void
  onSMSLead?: (lead: Lead) => void
  onViewHistory?: (lead: Lead) => void
}

const statusConfig = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  contacted: { label: 'Contacted', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  measurement_scheduled: { label: 'Scheduled', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  measured: { label: 'Measured', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  quoted: { label: 'Quoted', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  proposal_sent: { label: 'Proposal Sent', color: 'bg-pink-100 text-pink-800 border-pink-200' },
  closed_won: { label: 'Closed Won', color: 'bg-green-100 text-green-800 border-green-200' },
  closed_lost: { label: 'Closed Lost', color: 'bg-red-100 text-red-800 border-red-200' },
}

export function LeadsTable({ leads, onEditLead, onDeleteLead, onUpdateStatus, onCallLead, onSMSLead, onViewHistory }: LeadsTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const filteredAndSortedLeads = useMemo(() => {
    const filtered = leads.filter(lead => {
      const matchesSearch = searchTerm === "" || 
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone.includes(searchTerm) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.company?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === "all" || lead.status === statusFilter
      
      return matchesSearch && matchesStatus
    })

    filtered.sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      if (sortField === 'name') {
        aValue = aValue?.toLowerCase() || ''
        bValue = bValue?.toLowerCase() || ''
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [leads, searchTerm, statusFilter, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search leads by name, phone, email, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(statusConfig).map(([value, config]) => (
              <SelectItem key={value} value={value}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-600">
        Showing {filteredAndSortedLeads.length} of {leads.length} leads
      </div>

      {/* Table */}
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('name')}
                  className="h-auto p-0 font-medium"
                >
                  Name
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('status')}
                  className="h-auto p-0 font-medium"
                >
                  Status
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Source</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('created_at')}
                  className="h-auto p-0 font-medium"
                >
                  Date Added
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-[140px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedLeads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell className="font-medium">
                  <div>
                    <div className="font-semibold text-slate-900">
                      {lead.name}
                    </div>
                    {lead.company && (
                      <div className="text-xs text-slate-500">
                        {lead.company}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-sm">
                      <Phone className="h-3 w-3 text-slate-400" />
                      <a 
                        href={`tel:${lead.phone}`}
                        className="hover:text-orange-600 transition-colors"
                      >
                        {lead.phone}
                      </a>
                    </div>
                    {lead.email && (
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3 text-slate-400" />
                        <a 
                          href={`mailto:${lead.email}`}
                          className="hover:text-orange-600 transition-colors"
                        >
                          {lead.email}
                        </a>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {lead.address && (
                    <div className="flex items-start gap-1">
                      <MapPin className="h-3 w-3 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <div>{lead.address}</div>
                        {(lead.city && lead.state) && (
                          <div className="text-slate-500">
                            {lead.city}, {lead.state}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Select
                    value={lead.status}
                    onValueChange={(value) => onUpdateStatus(lead.id, value as Lead['status'])}
                  >
                    <SelectTrigger className="w-[120px] h-auto">
                      <Badge variant="outline" className={statusConfig[lead.status].color}>
                        {statusConfig[lead.status].label}
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([value, config]) => (
                        <SelectItem key={value} value={value}>
                          <Badge variant="outline" className={config.color}>
                            {config.label}
                          </Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {lead.lead_source && (
                    <Badge variant="outline" className="text-xs">
                      {lead.lead_source.replace('_', ' ')}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm text-slate-600">
                    {formatDate(lead.created_at)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {/* Communication buttons */}
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      onClick={() => onCallLead?.(lead)}
                      title="Call"
                    >
                      <PhoneCall className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => onSMSLead?.(lead)}
                      title="Send SMS"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                      onClick={() => onViewHistory?.(lead)}
                      title="View History"
                    >
                      <History className="h-4 w-4" />
                    </Button>

                    {/* More actions dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditLead(lead)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDeleteLead(lead.id)}
                          className="text-red-600"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {filteredAndSortedLeads.length === 0 && (
          <div className="text-center py-10 text-slate-500">
            {searchTerm || statusFilter !== "all" 
              ? "No leads match your current filters." 
              : "No leads found. Add your first lead to get started."}
          </div>
        )}
      </div>
    </div>
  )
}