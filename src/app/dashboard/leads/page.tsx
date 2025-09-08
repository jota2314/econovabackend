"use client"

import { useEffect } from "react"
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
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  Plus, 
  Download, 
  Search,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  MapPin,
  MoreHorizontal,
  RefreshCw
} from "lucide-react"
import { useLeadsStore } from "@/stores/leads-store"
import { LeadForm } from "@/components/leads/lead-form"
import { useAuth } from "@/hooks/use-auth"

// Lead type definition
type Lead = {
  id: string
  name: string
  email: string
  phone: string
  company: string
  lead_source: string
  followup_priority: 'hot' | 'warm' | 'cold'
  status: 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'closed_won' | 'closed_lost'
  assigned_to: string
  lead_score: number
}

type User = {
  id: string
  full_name: string
  email: string
  role: string
}

export default function LeadsPage() {
  const { profile } = useAuth()
  const { 
    leads,
    users,
    loading,
    error,
    searchTerm,
    priorityFilter,
    sourceFilter,
    assignedFilter,
    selectedLeads,
    filteredLeads,
    fetchLeads,
    fetchUsers,
    setSearchTerm,
    setPriorityFilter,
    setSourceFilter,
    setAssignedFilter,
    setSelectedLeads,
    updateLeadStatus,
    updateLeadPriority,
    updateLeadAssignment,
    openAddDialog,
    openEditDialog
  } = useLeadsStore()

  const isManager = profile?.role === 'manager'

  useEffect(() => {
    fetchLeads()
    fetchUsers() // Also fetch users for assignment dropdown
  }, [fetchLeads, fetchUsers])

  // Action handlers
  const handleCall = (lead: Lead) => {
    window.open(`tel:${lead.phone}`)
  }

  const handleSMS = (lead: Lead) => {
    window.open(`sms:${lead.phone}`)
  }

  const handleEmail = (lead: Lead) => {
    window.open(`mailto:${lead.email}`)
  }

  const handleSchedule = (lead: Lead) => {
    // TODO: Open schedule modal
    console.log('Schedule meeting with:', lead)
  }

  // Export to CSV - TODO: Will rebuild this to use Zustand properly
  const exportToCSV = () => {
    alert('CSV export will be rebuilt - coming soon!')
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'hot': 'bg-red-50 text-red-700 border-red-200',
      'warm': 'bg-orange-50 text-orange-700 border-orange-200',
      'cold': 'bg-blue-50 text-blue-700 border-blue-200'
    }
    return colors[priority] || 'bg-gray-50 text-gray-700 border-gray-200'
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'new': 'bg-slate-50 text-slate-700 border-slate-200',
      'contacted': 'bg-blue-50 text-blue-700 border-blue-200',
      'qualified': 'bg-green-50 text-green-700 border-green-200',
      'proposal_sent': 'bg-purple-50 text-purple-700 border-purple-200',
      'closed_won': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'closed_lost': 'bg-red-50 text-red-700 border-red-200'
    }
    return colors[status] || 'bg-gray-50 text-gray-700 border-gray-200'
  }

  const getLeadSourceIcon = (source: string) => {
    switch (source) {
      case 'website': return '🌐'
      case 'referral': return '👥'
      case 'drive_by': return '🚗'
      case 'permit': return '📋'
      default: return '📝'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'hot': return '🔥'
      case 'warm': return '🔸'
      case 'cold': return '❄️'
      default: return '📊'
    }
  }

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId)
    return user?.full_name || 'Unassigned'
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading leads...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600">Error: {error}</p>
          <Button 
            onClick={() => fetchLeads()}
            className="mt-4"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-100">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            🎯 Leads Management
          </h1>
          <p className="text-slate-600 mt-1">
            Manage and track your leads efficiently with advanced filtering and actions
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLeads()}
            className="border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            className="border-green-200 text-green-700 hover:bg-green-50 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          
          <Button 
            onClick={() => openAddDialog()}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4 p-5 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="🔍 Search leads by name, email, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
            />
          </div>
          
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[130px] bg-white border-slate-300 shadow-sm hover:shadow-md transition-shadow">
              <SelectValue placeholder="🎯 Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">🎯 All Priority</SelectItem>
              <SelectItem value="hot" className="text-red-700">🔥 Hot</SelectItem>
              <SelectItem value="warm" className="text-orange-700">🔸 Warm</SelectItem>
              <SelectItem value="cold" className="text-blue-700">❄️ Cold</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[150px] bg-white border-slate-300 shadow-sm hover:shadow-md transition-shadow">
              <SelectValue placeholder="📍 Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">📍 All Sources</SelectItem>
              <SelectItem value="website">🌐 Website</SelectItem>
              <SelectItem value="referral">👥 Referral</SelectItem>
              <SelectItem value="drive_by">🚗 Drive By</SelectItem>
              <SelectItem value="permit">📋 Permit</SelectItem>
              <SelectItem value="other">📝 Other</SelectItem>
            </SelectContent>
          </Select>

          <Select value={assignedFilter} onValueChange={setAssignedFilter}>
            <SelectTrigger className="w-[150px] bg-white border-slate-300 shadow-sm hover:shadow-md transition-shadow">
              <SelectValue placeholder="👥 Assigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">👥 All Users</SelectItem>
              {users.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  👤 {user.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="px-3 py-1 bg-blue-100 text-blue-800 border-blue-200">
            📊 {filteredLeads.length} of {leads.length} leads
          </Badge>
          {selectedLeads.length > 0 && (
            <Badge variant="default" className="px-3 py-1 bg-green-100 text-green-800 border-green-200">
              ✅ {selectedLeads.length} selected
            </Badge>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="font-semibold text-slate-700">👤 Lead</TableHead>
              <TableHead className="font-semibold text-slate-700">📞 Contact</TableHead>
              <TableHead className="font-semibold text-slate-700">🎯 Priority</TableHead>
              <TableHead className="font-semibold text-slate-700">📊 Status</TableHead>
              <TableHead className="font-semibold text-slate-700">🏢 Company</TableHead>
              <TableHead className="font-semibold text-slate-700">📍 Source</TableHead>
              <TableHead className="font-semibold text-slate-700">👥 Assigned To</TableHead>
              <TableHead className="text-right font-semibold text-slate-700">⚡ Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.map((lead) => (
              <TableRow key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium text-slate-900">{lead.name}</div>
                      <div className="text-xs text-slate-500">Lead Score: {lead.lead_score || 50}/100</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-3 w-3 text-slate-400" />
                      <span className="font-mono text-slate-700">{lead.phone || 'No phone'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-3 w-3 text-slate-400" />
                      <span className="text-slate-600">{lead.email || 'No email'}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Select
                    value={lead.followup_priority || 'warm'}
                    onValueChange={(value) => updateLeadPriority(lead.id, value as Lead['followup_priority'])}
                  >
                    <SelectTrigger className={`w-[110px] h-8 border ${getPriorityColor(lead.followup_priority)} hover:shadow-sm transition-all`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hot" className="text-red-700">🔥 Hot</SelectItem>
                      <SelectItem value="warm" className="text-orange-700">🔸 Warm</SelectItem>
                      <SelectItem value="cold" className="text-blue-700">❄️ Cold</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={lead.status || 'new'}
                    onValueChange={(value) => updateLeadStatus(lead.id, value as Lead['status'])}
                  >
                    <SelectTrigger className={`w-[140px] h-8 border ${getStatusColor(lead.status)} hover:shadow-sm transition-all`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">🆕 New</SelectItem>
                      <SelectItem value="contacted">📞 Contacted</SelectItem>
                      <SelectItem value="qualified">✅ Qualified</SelectItem>
                      <SelectItem value="proposal_sent">📄 Proposal Sent</SelectItem>
                      <SelectItem value="closed_won">🎉 Closed Won</SelectItem>
                      <SelectItem value="closed_lost">❌ Closed Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-slate-100 rounded flex items-center justify-center text-xs">
                      🏢
                    </div>
                    <span className="text-slate-700 font-medium">{lead.company || 'No company'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getLeadSourceIcon(lead.lead_source)}</span>
                    <span className="capitalize text-slate-600">{lead.lead_source || 'N/A'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {isManager ? (
                    <Select
                      value={lead.assigned_to || 'unassigned'}
                      onValueChange={(value) => updateLeadAssignment(lead.id, value === 'unassigned' ? '' : value)}
                    >
                      <SelectTrigger className="w-[140px] h-8 bg-white border-slate-200 hover:bg-slate-50 hover:shadow-sm transition-all">
                        <SelectValue placeholder="👤 Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">👤 Unassigned</SelectItem>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            👤 {user.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        👤
                      </div>
                      <span className="text-slate-700">{getUserName(lead.assigned_to)}</span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCall(lead)}
                      className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-700 transition-colors"
                      title="Call Lead"
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSMS(lead)}
                      className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                      title="Send SMS"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEmail(lead)}
                      className="h-8 w-8 p-0 hover:bg-purple-100 hover:text-purple-700 transition-colors"
                      title="Send Email"
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSchedule(lead)}
                      className="h-8 w-8 p-0 hover:bg-orange-100 hover:text-orange-700 transition-colors"
                      title="Schedule Meeting"
                    >
                      <Calendar className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(lead)}
                      className="h-8 w-8 p-0 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                      title="Edit Lead"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {/* Add/Edit Lead Form */}
      <LeadForm />
    </div>
  )
}