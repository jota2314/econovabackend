"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Plus, 
  Upload, 
  LayoutGrid, 
  List, 
  MessageCircle,
  MapPin,
  Filter,
  Search,
  Phone,
  Mail,
  Calendar,
  Clock,
  Users,
  TrendingUp,
  CheckSquare,
  Settings,
  AlertCircle,
  RefreshCw
} from "lucide-react"
import { LeadsTable } from "@/components/leads/leads-table"
import { LeadFormDialog } from "@/components/leads/lead-form-dialog"
import { CsvImportDialog } from "@/components/leads/csv-import-dialog"
import { LeadPipeline } from "@/components/leads/lead-pipeline"
import { LeadCommunicationView } from "@/components/leads/lead-communication-view"
import { LeadMapView } from "@/components/leads/lead-map-view"
import { EnhancedLeadsTable } from "@/components/leads/enhanced-leads-table"
import { SMSModal } from "@/components/communications/sms-modal"
import { CommunicationHistorySidebar } from "@/components/communications/communication-history-sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { Lead, TablesInsert } from "@/lib/types/database"
import { leadsService } from "@/lib/services/leads"
import { useAuthContext } from "@/providers/auth-provider"
import { toast } from "sonner"

type ViewMode = 'communication' | 'table' | 'enhanced' | 'pipeline' | 'map'
type QuickFilter = 'all' | 'active' | 'recent' | 'assigned_to_me' | 'unassigned'

interface LeadsCache {
  data: Lead[]
  timestamp: number
  userRole: string
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const MAX_RETRY_ATTEMPTS = 2

export default function LeadsPage() {
  // Core state
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  
  // UI state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('communication')
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [serviceFilter, setServiceFilter] = useState<'all' | 'insulation' | 'hvac' | 'plaster'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | Lead['status']>('all')
  
  // Communication states
  const [smsModalOpen, setSmsModalOpen] = useState(false)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [selectedLeadForComms, setSelectedLeadForComms] = useState<Lead | null>(null)

  const { user } = useAuthContext()

  // Cache management
  const getCacheKey = useCallback(() => `leads_cache_${user?.id || 'anonymous'}`, [user?.id])
  
  const getFromCache = useCallback(() => {
    try {
      const cached = localStorage.getItem(getCacheKey())
      if (!cached) return null
      
      const parsedCache = JSON.parse(cached)
      const isExpired = Date.now() - parsedCache.timestamp > CACHE_DURATION
      
      if (isExpired) {
        localStorage.removeItem(getCacheKey())
        return null
      }
      
      return parsedCache.data
    } catch {
      return null
    }
  }, [getCacheKey])
  
  const setCache = useCallback((data: Lead[]) => {
    try {
      const cache = {
        data,
        timestamp: Date.now()
      }
      localStorage.setItem(getCacheKey(), JSON.stringify(cache))
    } catch (error) {
      console.warn('Failed to cache leads data:', error)
    }
  }, [getCacheKey])

  // Improved load leads function with caching
  const loadLeads = useCallback(async (forceRefresh = false, retryCount = 0) => {
    if (!user) {
      console.log('⚠️ No user, skipping load')
      return
    }
    try {
      setLoading(true)
      setError(null)
      
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = getFromCache()
        if (cached) {
          console.log('✅ Using cached leads data')
          setLeads(cached)
          setLastRefresh(new Date())
          setLoading(false)
          return
        }
      }
      
      console.log(`🔄 Loading leads from API... (attempt ${retryCount + 1})`)
      const data = await leadsService.getLeads()
      console.log('✅ Successfully loaded', data?.length || 0, 'leads')
      setLeads(data || [])
      setLastRefresh(new Date())
      
      // Cache the results
      setCache(data || [])
      
    } catch (error) {
      console.error('❌ Exception loading leads:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Retry logic for network/timeout errors
      if ((errorMessage.includes('timeout') || errorMessage.includes('network')) && retryCount < MAX_RETRY_ATTEMPTS) {
        console.log(`🔄 Retrying leads query in ${(retryCount + 1) * 2} seconds...`)
        setTimeout(() => {
          loadLeads(forceRefresh, retryCount + 1)
        }, (retryCount + 1) * 2000)
        return
      }
      
      // Handle specific errors
      if (errorMessage.includes('Database tables not found') || errorMessage.includes('does not exist')) {
        setError('Database setup required: Please create the leads table in Supabase first.')
        toast.error('Database setup required')
      } else if (errorMessage.includes('Authentication error')) {
        setError('Authentication error. Please refresh the page.')
        toast.error('Please refresh the page to re-authenticate.')
      } else if (errorMessage.includes('timeout')) {
        setError('Query timeout. Click "Retry" to try again.')
        toast.error('Query timeout. Please try again.')
      } else {
        setError('Failed to load leads. Please try refreshing the page.')
        toast.error(errorMessage)
      }
      
      // Set empty array on error so UI can still function
      setLeads([])
      
    } finally {
      setLoading(false)
    }
  }, [user, getFromCache, setCache])

  // Add or update lead
  const handleSubmitLead = async (leadData: TablesInsert<'leads'>) => {
    try {
      if (selectedLead) {
        // Update existing lead
        const updatedLead = await leadsService.updateLead(selectedLead.id, leadData)
        
        setLeads(prev => prev.map(lead => 
          lead.id === selectedLead.id ? updatedLead : lead
        ))
        toast.success('Lead updated successfully')
      } else {
        // Add new lead
        const insertData = {
          ...leadData,
          assigned_to: user?.id || null // Auto-assign to the current user creating the lead
        }
        
        console.log('Attempting to insert lead data:', insertData)
        
        const newLead = await leadsService.createLead(insertData)
        
        setLeads(prev => [newLead, ...prev])
        toast.success('Lead added successfully')
      }

      setSelectedLead(null)
    } catch (error) {
      console.error('Error saving lead:', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      if (errorMsg.includes('does not exist') || errorMsg.includes('PGRST116')) {
        toast.error('Database setup required: Please create the leads table in Supabase first.')
      } else {
        toast.error(`Failed to save lead: ${errorMsg}`)
      }
      throw error
    }
  }

  // Import leads from CSV
  const handleImportLeads = async (leadsData: TablesInsert<'leads'>[]) => {
    try {
      const leadsWithUser = leadsData.map(lead => ({
        ...lead,
        assigned_to: user?.id || null
      }))

      const newLeads = await leadsService.createMultipleLeads(leadsWithUser)

      setLeads(prev => [...newLeads, ...prev])
      toast.success(`Successfully imported ${newLeads.length} leads`)
    } catch (error) {
      console.error('Error importing leads:', error)
      toast.error('Failed to import leads')
      throw error
    }
  }

  // Update lead status
  const handleUpdateStatus = async (leadId: string, status: Lead['status']) => {
    try {
      const updatedLead = await leadsService.updateLeadStatus(leadId, status)
      
      setLeads(prev => prev.map(lead => 
        lead.id === leadId ? updatedLead : lead
      ))
      toast.success('Lead status updated')
    } catch (error) {
      console.error('Error updating lead status:', error)
      toast.error('Failed to update lead status')
    }
  }

  // Delete lead
  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) {
      return
    }

    try {
      await leadsService.deleteLead(leadId)
      
      setLeads(prev => prev.filter(lead => lead.id !== leadId))
      toast.success('Lead deleted successfully')
    } catch (error) {
      console.error('Error deleting lead:', error)
      toast.error('Failed to delete lead')
    }
  }

  // Edit lead
  const handleEditLead = (lead: Lead) => {
    setSelectedLead(lead)
    setShowAddDialog(true)
  }

  // Communication handlers
  const handleCallLead = async (lead: Lead) => {
    try {
      toast.loading(`Calling ${lead.name}...`)
      
      const response = await fetch('/api/twilio/make-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId: lead.id,
          phoneNumber: lead.phone,
          leadName: lead.name,
          userId: user?.id || null
        })
      })

      const result = await response.json()
      
      // Dismiss loading toast
      toast.dismiss()

      if (result.success) {
        toast.success(`📞 Call initiated to ${lead.name} (${lead.phone})`, {
          description: `Call SID: ${result.callSid}`,
          duration: 5000
        })
        
        // Update lead status to contacted if it's currently "new"
        if (lead.status === 'new') {
          await handleUpdateStatus(lead.id, 'contacted')
        }
      } else {
        console.error('Call failed:', result)
        toast.error(`❌ Failed to initiate call to ${lead.name}`, {
          description: result.error || 'Unknown error occurred',
          duration: 10000
        })
        
        // Log detailed error for debugging
        if (result.originalError) {
          console.error('Original Twilio error:', result.originalError)
        }
      }
    } catch (error) {
      toast.dismiss()
      console.error('Error initiating call:', error)
      toast.error('❌ Call failed', {
        description: 'Please check your internet connection and try again',
        duration: 5000
      })
    }
  }

  const handleSMSLead = (lead: Lead) => {
    setSelectedLeadForComms(lead)
    setSmsModalOpen(true)
  }

  const handleViewHistory = (lead: Lead) => {
    setSelectedLeadForComms(lead)
    setHistoryModalOpen(true)
  }

  const handleSMSSent = () => {
    // Reload the history if it's open
    if (historyModalOpen) {
      // The history component will handle its own refresh
    }
    // Update lead status to contacted if it's currently "new"
    if (selectedLeadForComms?.status === 'new') {
      handleUpdateStatus(selectedLeadForComms.id, 'contacted')
    }
  }



  // Bulk actions
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedLeads(filteredLeads.map(lead => lead.id))
    } else {
      setSelectedLeads([])
    }
  }

  const handleSelectLead = (leadId: string, selected: boolean) => {
    if (selected) {
      setSelectedLeads(prev => [...prev, leadId])
    } else {
      setSelectedLeads(prev => prev.filter(id => id !== leadId))
    }
  }

  const handleBulkAssign = async (userId: string) => {
    try {
      await Promise.all(
        selectedLeads.map(leadId =>
          leadsService.updateLead(leadId, { assigned_to: userId })
        )
      )
      
      setLeads(prev => prev.map(lead =>
        selectedLeads.includes(lead.id)
          ? { ...lead, assigned_to: userId }
          : lead
      ))
      
      setSelectedLeads([])
      toast.success(`${selectedLeads.length} leads assigned successfully`)
    } catch (error) {
      console.error('Error bulk assigning leads:', error)
      toast.error('Failed to assign leads')
    }
  }

  const handleBulkStatusUpdate = async (status: Lead['status']) => {
    try {
      await Promise.all(
        selectedLeads.map(leadId =>
          leadsService.updateLeadStatus(leadId, status)
        )
      )
      
      setLeads(prev => prev.map(lead =>
        selectedLeads.includes(lead.id)
          ? { ...lead, status }
          : lead
      ))
      
      setSelectedLeads([])
      toast.success(`${selectedLeads.length} leads updated successfully`)
    } catch (error) {
      console.error('Error bulk updating leads:', error)
      toast.error('Failed to update leads')
    }
  }

  // Optimized filtering with memoization
  const filteredLeads = useMemo(() => {
    if (!leads.length) return []
    
    return leads.filter(lead => {
      // Search term filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const matchesSearch = 
          lead.name.toLowerCase().includes(searchLower) ||
          lead.email?.toLowerCase().includes(searchLower) ||
          lead.phone?.includes(searchTerm) ||
          lead.company?.toLowerCase().includes(searchLower) ||
          lead.address?.toLowerCase().includes(searchLower)
        
        if (!matchesSearch) return false
      }
      
      // Quick filter
      if (quickFilter !== 'all') {
        switch (quickFilter) {
          case 'active':
            if (['closed_won', 'closed_lost'].includes(lead.status)) return false
            break
          case 'recent':
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            if (new Date(lead.created_at) < weekAgo) return false
            break
          case 'assigned_to_me':
            if (lead.assigned_to !== user?.id) return false
            break
          case 'unassigned':
            if (lead.assigned_to) return false
            break
        }
      }
      
      // Status filter
      if (statusFilter !== 'all' && lead.status !== statusFilter) {
        return false
      }
      
      // Service filter (if lead has service_type property)
      if (serviceFilter !== 'all' && (lead as any).service_type && (lead as any).service_type !== serviceFilter) {
        return false
      }
      
      return true
    })
  }, [leads, searchTerm, quickFilter, statusFilter, serviceFilter, user?.id])

  // Refresh handler
  const handleRefresh = useCallback(() => {
    loadLeads(true) // Force refresh
  }, [loadLeads])

  // Load leads on component mount when user is authenticated
  useEffect(() => {
    if (user) {
      loadLeads()
    } else {
      console.log('⚠️ Waiting for authentication...')
    }
  }, [user])

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto" />
          <p className="mt-4 text-slate-600">Please log in to view leads</p>
        </div>
      </div>
    )
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
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Failed to Load Leads</h3>
          <p className="text-slate-600 mb-4">{error}</p>
          <Button 
            onClick={() => loadLeads()} 
            className="bg-orange-600 hover:bg-orange-700"
          >
            Retry Loading
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads Management</h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <p className="text-slate-600">
              Multi-view lead management with communication tracking and sales pipeline
            </p>
            {lastRefresh && (
              <span className="text-xs text-slate-500">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImportDialog(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          
          <Button
            onClick={() => {
              setSelectedLead(null)
              setShowAddDialog(true)
            }}
            className=""
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* View Mode Selector */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="transition-all"
          >
            <List className="h-4 w-4 mr-2" />
            List View
          </Button>
          <Button
            variant={viewMode === 'communication' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('communication')}
            className="transition-all"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Communication View
          </Button>
          <Button
            variant={viewMode === 'pipeline' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('pipeline')}
            className="transition-all"
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Pipeline View
          </Button>
          <Button
            variant={viewMode === 'map' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('map')}
            className="transition-all"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Map View
          </Button>
          <Button
            variant={viewMode === 'enhanced' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('enhanced')}
            className="transition-all"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Enhanced View
          </Button>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Badge variant="secondary">{filteredLeads.length} of {leads.length} leads</Badge>
          {selectedLeads.length > 0 && (
            <Badge variant="default">{selectedLeads.length} selected</Badge>
          )}
        </div>
      </div>

      {/* Quick Filters Bar */}
      <div className="flex flex-col lg:flex-row gap-4 p-4 bg-slate-50 rounded-lg border">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Quick Filters:</span>
          <div className="flex gap-1 flex-wrap">
            {[
              { key: 'all', label: 'All Leads', icon: Users },
              { key: 'hot', label: 'Hot Leads', icon: TrendingUp },
              { key: 'follow-up-today', label: 'Follow-up Today', icon: Calendar },
              { key: 'no-contact-7days', label: 'No Contact >7 Days', icon: Clock },
              { key: 'my-leads', label: 'My Leads', icon: Users },
              { key: 'unassigned', label: 'Unassigned', icon: Users },
            ].map(filter => (
              <Button
                key={filter.key}
                variant={quickFilter === filter.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setQuickFilter(filter.key as QuickFilter)}
                className="h-8 text-xs"
              >
                <filter.icon className="h-3 w-3 mr-1" />
                {filter.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search leads by name, phone, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="measurement_scheduled">Scheduled</SelectItem>
              <SelectItem value="measured">Measured</SelectItem>
              <SelectItem value="quoted">Quoted</SelectItem>
              <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
              <SelectItem value="closed_won">Closed Won</SelectItem>
              <SelectItem value="closed_lost">Closed Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedLeads.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              {selectedLeads.length} lead{selectedLeads.length !== 1 ? 's' : ''} selected
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Select onValueChange={handleBulkStatusUpdate}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Update Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contacted">Mark Contacted</SelectItem>
                <SelectItem value="measurement_scheduled">Schedule Meeting</SelectItem>
                <SelectItem value="quoted">Mark Quoted</SelectItem>
                <SelectItem value="closed_lost">Mark Lost</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedLeads([])}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Content Views */}
      <div className="transition-all duration-300">
        {viewMode === 'table' && (
          <LeadsTable
            leads={filteredLeads}
            selectedLeads={selectedLeads}
            onEditLead={handleEditLead}
            onDeleteLead={handleDeleteLead}
            onUpdateStatus={handleUpdateStatus}
            onCallLead={handleCallLead}
            onSMSLead={handleSMSLead}
            onViewHistory={handleViewHistory}
            onSelectLead={handleSelectLead}
            onSelectAll={handleSelectAll}
          />
        )}

        {viewMode === 'communication' && (
          <LeadCommunicationView
            leads={filteredLeads}
            onCallLead={handleCallLead}
            onSMSLead={handleSMSLead}
            onEmailLead={(lead) => window.open(`mailto:${lead.email}`, '_blank')}
            onViewHistory={handleViewHistory}
            onUpdateStatus={handleUpdateStatus}
          />
        )}

        {viewMode === 'pipeline' && (
          <LeadPipeline
            leads={filteredLeads}
            onUpdateStatus={handleUpdateStatus}
            onEditLead={handleEditLead}
          />
        )}

        {viewMode === 'map' && (
          <LeadMapView
            leads={filteredLeads}
            onSelectLead={(lead) => {
              setSelectedLead(lead)
              setShowAddDialog(true)
            }}
          />
        )}

        {viewMode === 'enhanced' && (
          <EnhancedLeadsTable />
        )}
      </div>

      {/* Dialogs */}
      <LeadFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        lead={selectedLead}
        onSubmit={handleSubmitLead}
      />

      <CsvImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImport={handleImportLeads}
      />

      {/* Communication Modals */}
      <SMSModal
        open={smsModalOpen}
        onOpenChange={setSmsModalOpen}
        lead={selectedLeadForComms}
        onSMSSent={handleSMSSent}
      />

      <CommunicationHistorySidebar
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        lead={selectedLeadForComms}
      />
    </div>
  )
}