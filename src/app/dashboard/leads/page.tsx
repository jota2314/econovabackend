"use client"

import { useEffect } from "react"
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
import { leadsService } from "@/lib/services/business/leads-service"
import { useAuthContext } from "@/providers/auth-provider"
import { useLeads } from "@/hooks/business/use-leads"
import { toast } from "sonner"

// Types moved to store
type ViewMode = 'table' | 'cards' | 'pipeline' | 'map' | 'enhanced'
type QuickFilter = 'all' | 'active' | 'recent' | 'assigned_to_me' | 'unassigned'

export default function LeadsPage() {
  const { user } = useAuthContext()
  
  // Enhanced custom hooks - replaces all useState and Zustand!
  const {
    // Data
    leads,
    filteredLeads,
    selectedLead,
    selectedLeads,
    loading,
    error,
    lastRefresh,
    
    // UI State
    viewMode,
    searchTerm,
    quickFilter,
    serviceFilter,
    statusFilter,
    showAddDialog,
    showImportDialog,
    smsModalOpen,
    historyModalOpen,
    selectedLeadForComms,
    
    // Actions
    refetch,
    createLead,
    updateLeadStatus,
    updateLead,
    deleteLead,
    
    // UI Actions
    setViewMode,
    setSearchTerm,
    setQuickFilter,
    setServiceFilter,
    setStatusFilter,
    selectLead,
    toggleLeadSelection,
    clearSelection,
    openAddDialog,
    closeAddDialog,
    openImportDialog,
    closeImportDialog,
    openSmsModal,
    closeSmsModal,
    openHistoryModal,
    closeHistoryModal,
  } = useLeads({
    autoFetch: true,
    enableCaching: true,
    refetchInterval: 5 * 60 * 1000 // 5 minutes
  })

  // Add or update lead
  const handleSubmitLead = async (leadData: TablesInsert<'leads'>) => {
    try {
      if (selectedLead) {
        // Update existing lead
        const updatedLead = await leadsService.updateLead(selectedLead.id, leadData)
        if (updatedLead.success) {
          updateLead(selectedLead.id, updatedLead.data)
          toast.success('Lead updated successfully')
        } else {
          throw new Error(updatedLead.error || 'Failed to update lead')
        }
      } else {
        // Create new lead  
        const insertData = {
          ...leadData,
          assigned_to: user?.id || null
        }
        
        console.log('Attempting to insert lead data:', insertData)
        const response = await createLead(insertData)
        if (response.success) {
          toast.success('Lead added successfully')
        } else {
          throw new Error(response.error || 'Failed to create lead')
        }
      }

      selectLead(null)
      closeAddDialog()
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

      const results = await Promise.all(
        leadsWithUser.map(leadData => createLead(leadData))
      )
      
      const successful = results.filter(r => r.success)
      toast.success(`Successfully imported ${successful.length} leads`)
    } catch (error) {
      console.error('Error importing leads:', error)
      toast.error('Failed to import leads')
      throw error
    }
  }

  // Update lead status
  const handleUpdateStatus = async (leadId: string, status: Lead['status']) => {
    try {
      const response = await updateLeadStatus(leadId, status)
      if (response.success) {
        toast.success('Lead status updated')
      } else {
        throw new Error(response.error || 'Failed to update status')
      }
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
      await deleteLead(leadId)
      toast.success('Lead deleted successfully')
    } catch (error) {
      console.error('Error deleting lead:', error)
      toast.error('Failed to delete lead')
    }
  }

  // Edit lead
  const handleEditLead = (lead: Lead) => {
    selectLead(lead)
    openAddDialog()
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
    openSmsModal(lead)
  }

  const handleViewHistory = (lead: Lead) => {
    openHistoryModal(lead)
  }

  const handleSMSSent = () => {
    // Update lead status to contacted if it's currently "new"
    if (selectedLeadForComms?.status === 'new') {
      handleUpdateStatus(selectedLeadForComms.id, 'contacted')
    }
  }



  // Bulk actions
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      // Select all filtered leads
      filteredLeads.forEach(lead => {
        if (!selectedLeads.includes(lead.id)) {
          toggleLeadSelection(lead.id)
        }
      })
    } else {
      clearSelection()
    }
  }

  const handleSelectLead = (leadId: string, selected: boolean) => {
    toggleLeadSelection(leadId)
  }

  const handleBulkAssign = async (userId: string) => {
    try {
      await Promise.all(
        selectedLeads.map(async leadId => {
          const response = await leadsService.updateLead(leadId, { assigned_to: userId })
          if (response.success) {
            // Update each lead in local state
            updateLead(leadId, { assigned_to: userId })
          }
          return response
        })
      )
      
      clearSelection()
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
      
      // Update each lead in local state
      selectedLeads.forEach(leadId => {
        updateLead(leadId, { status })
      })
      
      clearSelection()
      toast.success(`${selectedLeads.length} leads updated successfully`)
    } catch (error) {
      console.error('Error bulk updating leads:', error)
      toast.error('Failed to update leads')
    }
  }

  // Auto-fetch when user is available
  useEffect(() => {
    if (user) {
      // The useLeads hook handles auto-fetching
      console.log('✅ User authenticated, leads will auto-fetch')
    }
  }, [user])

  // Refresh handler
  const handleRefresh = () => {
    refetch(true) // Force refresh
  }

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
            onClick={() => refetch(true)} 
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
            onClick={() => openImportDialog()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          
          <Button
            onClick={() => {
              selectLead(null)
              openAddDialog()
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
            Table View
          </Button>
          <Button
            variant={viewMode === 'cards' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('cards')}
            className="transition-all"
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Card View
          </Button>
          <Button
            variant={viewMode === 'pipeline' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('pipeline')}
            className="transition-all"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
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
              { key: 'active', label: 'Active Leads', icon: TrendingUp },
              { key: 'recent', label: 'Recent Leads', icon: Calendar },
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
              onClick={() => clearSelection()}
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

        {viewMode === 'cards' && (
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
              selectLead(lead)
              openAddDialog()
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
        onOpenChange={closeAddDialog}
        lead={selectedLead}
        onSubmit={handleSubmitLead}
      />

      <CsvImportDialog
        open={showImportDialog}
        onOpenChange={closeImportDialog}
        onImport={handleImportLeads}
      />

      {/* Communication Modals */}
      <SMSModal
        open={smsModalOpen}
        onOpenChange={closeSmsModal}
        lead={selectedLeadForComms}
        onSMSSent={handleSMSSent}
      />

      <CommunicationHistorySidebar
        open={historyModalOpen}
        onOpenChange={closeHistoryModal}
        lead={selectedLeadForComms}
      />
    </div>
  )
}