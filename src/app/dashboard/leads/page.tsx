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
import { createClient } from "@/lib/supabase/client"
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
  const supabase = createClient()

  // Load leads from Supabase
  const loadLeads = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading leads:', error)
        toast.error('Failed to load leads')
        return
      }

      setLeads(data || [])
    } catch (error) {
      console.error('Error loading leads:', error)
      toast.error('Failed to load leads')
    } finally {
      setLoading(false)
    }
  }

  // Add or update lead
  const handleSubmitLead = async (leadData: TablesInsert<'leads'>) => {
    try {
      if (selectedLead) {
        // Update existing lead
        const { data, error } = await supabase
          .from('leads')
          .update({
            ...leadData,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedLead.id)
          .select()
          .single()

        if (error) throw error

        setLeads(prev => prev.map(lead => 
          lead.id === selectedLead.id ? data : lead
        ))
        toast.success('Lead updated successfully')
      } else {
        // Add new lead
        const insertData = {
          ...leadData,
          assigned_to: null // Set to null for now since users table is empty
        }
        
        console.log('Attempting to insert lead data:', insertData)
        
        const { data, error } = await supabase
          .from('leads')
          .insert([insertData])
          .select()
          .single()

        if (error) {
          console.error('Database error details:', {
            error,
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          })
          
          if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
            toast.error('Database tables not set up yet. Please run the SQL schema first.')
            return
          }
          
          // Check for RLS or permission errors
          if (error.code === '42501' || error.message?.includes('permission denied')) {
            toast.error('Permission denied. Check your RLS policies in Supabase.')
            return
          }
          
          // Check for column mismatch
          if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
            toast.error('Database schema mismatch. Please check the table structure.')
            return
          }
          
          throw error
        }

        setLeads(prev => [data, ...prev])
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

      const { data, error } = await supabase
        .from('leads')
        .insert(leadsWithUser)
        .select()

      if (error) throw error

      setLeads(prev => [...data, ...prev])
      toast.success(`Successfully imported ${data.length} leads`)
    } catch (error) {
      console.error('Error importing leads:', error)
      toast.error('Failed to import leads')
      throw error
    }
  }

  // Update lead status
  const handleUpdateStatus = async (leadId: string, status: Lead['status']) => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId)
        .select()
        .single()

      if (error) throw error

      setLeads(prev => prev.map(lead => 
        lead.id === leadId ? data : lead
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
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId)

      if (error) throw error

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
      const response = await fetch('/api/communications/call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId: lead.id,
          phoneNumber: lead.phone,
          userId: user?.id || null
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`Call initiated to ${lead.name}`)
        // Update lead status to contacted if it's currently "new"
        if (lead.status === 'new') {
          await handleUpdateStatus(lead.id, 'contacted')
        }
      } else {
        toast.error(`Failed to initiate call: ${result.error}`)
      }
    } catch (error) {
      console.error('Error initiating call:', error)
      toast.error('Failed to initiate call')
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
            className="bg-orange-600 hover:bg-orange-700"
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