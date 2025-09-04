'use client'

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { createClient } from '@/lib/supabase/client'
import type { LeadWithAssignee, LeadFilters, LeadStatus } from '@/types'

export type ViewMode = 'communication' | 'pipeline' | 'map' | 'enhanced'
export type QuickFilter = 'all' | 'new' | 'active' | 'recent'

interface LeadsState {
  // Core Data
  leads: LeadWithAssignee[]
  selectedLead: LeadWithAssignee | null
  selectedLeads: string[]
  
  // UI State
  loading: boolean
  error: string | null
  lastRefresh: Date | null
  
  // View State
  viewMode: ViewMode
  searchTerm: string
  quickFilter: QuickFilter
  serviceFilter: 'all' | 'insulation' | 'hvac' | 'plaster'
  statusFilter: 'all' | LeadStatus
  
  // Modal/Dialog State
  showAddDialog: boolean
  showImportDialog: boolean
  smsModalOpen: boolean
  historyModalOpen: boolean
  selectedLeadForComms: LeadWithAssignee | null
}

interface LeadsActions {
  // Data Actions
  setLeads: (leads: LeadWithAssignee[]) => void
  addLead: (lead: LeadWithAssignee) => void
  updateLead: (id: string, updates: Partial<LeadWithAssignee>) => void
  removeLead: (id: string) => void
  
  // Selection Actions
  selectLead: (lead: LeadWithAssignee | null) => void
  toggleLeadSelection: (id: string) => void
  clearSelection: () => void
  
  // Filter Actions
  setSearchTerm: (term: string) => void
  setQuickFilter: (filter: QuickFilter) => void
  setServiceFilter: (filter: 'all' | 'insulation' | 'hvac' | 'plaster') => void
  setStatusFilter: (filter: 'all' | LeadStatus) => void
  clearFilters: () => void
  
  // View Actions
  setViewMode: (mode: ViewMode) => void
  
  // Modal Actions
  openAddDialog: () => void
  closeAddDialog: () => void
  openImportDialog: () => void
  closeImportDialog: () => void
  openSmsModal: (lead: LeadWithAssignee) => void
  closeSmsModal: () => void
  openHistoryModal: (lead: LeadWithAssignee) => void
  closeHistoryModal: () => void
  
  // Async Actions
  fetchLeads: (forceRefresh?: boolean) => Promise<void>
  createLead: (leadData: any) => Promise<LeadWithAssignee>
  updateLeadStatus: (id: string, status: LeadStatus) => Promise<void>
  importLeads: (leadsData: any[]) => Promise<LeadWithAssignee[]>
  
  // Utility Actions
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

interface LeadsSelectors {
  filteredLeads: LeadWithAssignee[]
  totalLeads: number
  leadsByStatus: Record<string, LeadWithAssignee[]>
}

export type LeadsStore = LeadsState & LeadsActions & LeadsSelectors

export const useLeadsStore = create<LeadsStore>()(
  devtools(
    (set, get) => ({
      // Initial State
      leads: [],
      selectedLead: null,
      selectedLeads: [],
      loading: true,
      error: null,
      lastRefresh: null,
      viewMode: 'communication',
      searchTerm: '',
      quickFilter: 'all',
      serviceFilter: 'all',
      statusFilter: 'all',
      showAddDialog: false,
      showImportDialog: false,
      smsModalOpen: false,
      historyModalOpen: false,
      selectedLeadForComms: null,

      // Computed Selectors
      get filteredLeads() {
        const state = get()
        let filtered = state.leads

        // Apply search filter
        if (state.searchTerm) {
          const term = state.searchTerm.toLowerCase()
          filtered = filtered.filter(lead =>
            lead.name.toLowerCase().includes(term) ||
            lead.email?.toLowerCase().includes(term) ||
            lead.phone?.toLowerCase().includes(term) ||
            lead.company?.toLowerCase().includes(term)
          )
        }

        // Apply quick filter
        if (state.quickFilter !== 'all') {
          const now = new Date()
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          
          switch (state.quickFilter) {
            case 'new':
              filtered = filtered.filter(lead => lead.status === 'new')
              break
            case 'active':
              filtered = filtered.filter(lead => 
                ['contacted', 'measurement_scheduled', 'measured', 'quoted', 'proposal_sent'].includes(lead.status)
              )
              break
            case 'recent':
              filtered = filtered.filter(lead => new Date(lead.created_at) > oneWeekAgo)
              break
          }
        }

        // Apply status filter
        if (state.statusFilter !== 'all') {
          filtered = filtered.filter(lead => lead.status === state.statusFilter)
        }

        return filtered
      },

      get totalLeads() {
        return get().leads.length
      },

      get leadsByStatus() {
        const leads = get().leads
        return leads.reduce((acc, lead) => {
          acc[lead.status] = acc[lead.status] || []
          acc[lead.status].push(lead)
          return acc
        }, {} as Record<string, LeadWithAssignee[]>)
      },

      // Data Actions
      setLeads: (leads) => 
        set({ leads, lastRefresh: new Date() }, false, 'setLeads'),

      addLead: (lead) => 
        set(
          (state) => ({ leads: [lead, ...state.leads] }),
          false,
          'addLead'
        ),

      updateLead: (id, updates) => 
        set(
          (state) => ({
            leads: state.leads.map(lead => 
              lead.id === id ? { ...lead, ...updates } : lead
            ),
            selectedLead: state.selectedLead?.id === id 
              ? { ...state.selectedLead, ...updates } 
              : state.selectedLead
          }),
          false,
          'updateLead'
        ),

      removeLead: (id) => 
        set(
          (state) => ({
            leads: state.leads.filter(lead => lead.id !== id),
            selectedLeads: state.selectedLeads.filter(selectedId => selectedId !== id),
            selectedLead: state.selectedLead?.id === id ? null : state.selectedLead
          }),
          false,
          'removeLead'
        ),

      // Selection Actions
      selectLead: (lead) => 
        set({ selectedLead: lead }, false, 'selectLead'),

      toggleLeadSelection: (id) => 
        set(
          (state) => ({
            selectedLeads: state.selectedLeads.includes(id)
              ? state.selectedLeads.filter(selectedId => selectedId !== id)
              : [...state.selectedLeads, id]
          }),
          false,
          'toggleLeadSelection'
        ),

      clearSelection: () => 
        set({ selectedLeads: [], selectedLead: null }, false, 'clearSelection'),

      // Filter Actions
      setSearchTerm: (searchTerm) => 
        set({ searchTerm }, false, 'setSearchTerm'),

      setQuickFilter: (quickFilter) => 
        set({ quickFilter }, false, 'setQuickFilter'),

      setServiceFilter: (serviceFilter) => 
        set({ serviceFilter }, false, 'setServiceFilter'),

      setStatusFilter: (statusFilter) => 
        set({ statusFilter }, false, 'setStatusFilter'),

      clearFilters: () => 
        set({
          searchTerm: '',
          quickFilter: 'all',
          serviceFilter: 'all',
          statusFilter: 'all'
        }, false, 'clearFilters'),

      // View Actions
      setViewMode: (viewMode) => 
        set({ viewMode }, false, 'setViewMode'),

      // Modal Actions
      openAddDialog: () => 
        set({ showAddDialog: true }, false, 'openAddDialog'),

      closeAddDialog: () => 
        set({ showAddDialog: false, selectedLead: null }, false, 'closeAddDialog'),

      openImportDialog: () => 
        set({ showImportDialog: true }, false, 'openImportDialog'),

      closeImportDialog: () => 
        set({ showImportDialog: false }, false, 'closeImportDialog'),

      openSmsModal: (lead) => 
        set({ smsModalOpen: true, selectedLeadForComms: lead }, false, 'openSmsModal'),

      closeSmsModal: () => 
        set({ smsModalOpen: false, selectedLeadForComms: null }, false, 'closeSmsModal'),

      openHistoryModal: (lead) => 
        set({ historyModalOpen: true, selectedLeadForComms: lead }, false, 'openHistoryModal'),

      closeHistoryModal: () => 
        set({ historyModalOpen: false, selectedLeadForComms: null }, false, 'closeHistoryModal'),

      // Utility Actions
      setLoading: (loading) => 
        set({ loading }, false, 'setLoading'),

      setError: (error) => 
        set({ error }, false, 'setError'),

      // Async Actions
      fetchLeads: async (forceRefresh = false) => {
        try {
          set({ loading: true, error: null }, false, 'fetchLeads:start')
          
          console.log('🔄 Fetching leads via Zustand store...')
          
          // Use client-side Supabase directly
          const supabase = createClient()
          const { data: leads, error } = await supabase
            .from('leads')
            .select(`
              *,
              assigned_user:users!assigned_to(id, full_name, email)
            `)
            .order('created_at', { ascending: false })
            .limit(100)
          
          if (error) {
            throw new Error(error.message)
          }
          
          set({
            leads: leads || [],
            loading: false,
            lastRefresh: new Date()
          }, false, 'fetchLeads:success')
          
          console.log('✅ Fetched', leads?.length || 0, 'leads via Zustand')
          
        } catch (error) {
          console.error('❌ Error fetching leads via Zustand:', error)
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch leads'
          
          set({
            error: errorMessage,
            loading: false,
            leads: []
          }, false, 'fetchLeads:error')
        }
      },

      createLead: async (leadData) => {
        try {
          set({ error: null }, false, 'createLead:start')
          
          const supabase = createClient()
          const { data: newLead, error } = await supabase
            .from('leads')
            .insert({
              ...leadData,
              status: leadData.status || 'new'
            })
            .select()
            .single()
          
          if (error) {
            throw new Error(error.message)
          }
          
          set((state) => ({
            ...state,
            leads: [newLead, ...state.leads]
          }), false, 'createLead:success')
          
          return newLead
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create lead'
          set({ error: errorMessage }, false, 'createLead:error')
          throw error
        }
      },

      updateLeadStatus: async (id, status) => {
        // Temporarily disabled for build fix
        set({ error: 'Service temporarily disabled for build fix' }, false, 'updateLeadStatus:disabled')
        throw new Error('Service temporarily disabled')
      },

      importLeads: async (leadsData) => {
        // Temporarily disabled for build fix
        set({ error: 'Service temporarily disabled for build fix' }, false, 'importLeads:disabled')
        throw new Error('Service temporarily disabled')
      },
    }),
    {
      name: 'leads-store',
    }
  )
)