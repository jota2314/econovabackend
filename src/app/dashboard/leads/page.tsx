"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Upload, LayoutGrid, List } from "lucide-react"
import { LeadsTable } from "@/components/leads/leads-table"
import { LeadFormDialog } from "@/components/leads/lead-form-dialog"
import { CsvImportDialog } from "@/components/leads/csv-import-dialog"
import { LeadPipeline } from "@/components/leads/lead-pipeline"
import { SMSModal } from "@/components/communications/sms-modal"
import { CommunicationHistorySidebar } from "@/components/communications/communication-history-sidebar"
import { Lead, TablesInsert } from "@/lib/types/database"
import { leadsService } from "@/lib/services/leads"
import { useAuthContext } from "@/providers/auth-provider"
import { toast } from "sonner"

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [view, setView] = useState<'table' | 'pipeline'>('table')
  
  // Communication modal states
  const [smsModalOpen, setSmsModalOpen] = useState(false)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [selectedLeadForComms, setSelectedLeadForComms] = useState<Lead | null>(null)
  
  const { user } = useAuthContext()

  // Load leads using service
  const loadLeads = async () => {
    try {
      console.log('🔄 Loading leads...')
      setLoading(true)
      
      const data = await leadsService.getLeads()
      console.log('✅ Successfully loaded', data?.length || 0, 'leads')
      setLeads(data || [])
      
    } catch (error) {
      console.error('❌ Exception loading leads:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load leads. Please try refreshing the page.'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

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
          assigned_to: null // Set to null for now since users table is empty
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

  // Load leads on component mount
  useEffect(() => {
    loadLeads()
  }, [])

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
          <p className="text-slate-600">
            Manage your spray foam insulation leads and track them through the sales pipeline
          </p>
        </div>
        
        <div className="flex items-center gap-2">
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

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={view === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('table')}
          >
            <List className="h-4 w-4 mr-2" />
            Table View
          </Button>
          <Button
            variant={view === 'pipeline' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('pipeline')}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Pipeline View
          </Button>
        </div>
        
        <div className="text-sm text-slate-600">
          {leads.length} leads total
        </div>
      </div>

      {/* Content */}
      {view === 'table' ? (
        <LeadsTable
          leads={leads}
          onEditLead={handleEditLead}
          onDeleteLead={handleDeleteLead}
          onUpdateStatus={handleUpdateStatus}
          onCallLead={handleCallLead}
          onSMSLead={handleSMSLead}
          onViewHistory={handleViewHistory}
        />
      ) : (
        <LeadPipeline
          leads={leads}
          onUpdateStatus={handleUpdateStatus}
          onEditLead={handleEditLead}
        />
      )}

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