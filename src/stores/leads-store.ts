import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

// Types matching your current working system
interface Lead {
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

interface User {
  id: string
  full_name: string
  email: string
  role: string
}

interface LeadsStore {
  // State
  leads: Lead[]
  users: User[]
  loading: boolean
  error: string | null
  initialized: boolean
  searchTerm: string
  priorityFilter: string
  sourceFilter: string
  assignedFilter: string
  selectedLeads: string[]
  
  // Form State
  showAddDialog: boolean
  editingLead: Lead | null
  
  // Computed (as regular property that updates when filters change)
  filteredLeads: Lead[]
  
  // Actions
  setLeads: (leads: Lead[]) => void
  setUsers: (users: User[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSearchTerm: (term: string) => void
  setPriorityFilter: (filter: string) => void
  setSourceFilter: (filter: string) => void
  setAssignedFilter: (filter: string) => void
  setSelectedLeads: (ids: string[]) => void
  fetchLeads: () => Promise<void>
  fetchUsers: () => Promise<void>
  updateFilteredLeads: () => void
  updateLeadStatus: (id: string, status: Lead['status']) => Promise<void>
  updateLeadPriority: (id: string, priority: Lead['followup_priority']) => Promise<void>
  updateLeadAssignment: (id: string, assignedTo: string) => Promise<void>
  init: () => Promise<void>
  
  // Form Actions
  openAddDialog: () => void
  openEditDialog: (lead: Lead) => void
  closeDialog: () => void
  createLead: (leadData: Omit<Lead, 'id'>) => Promise<void>
  updateLead: (id: string, leadData: Partial<Lead>) => Promise<void>
}

const filterLeads = (leads: Lead[], searchTerm: string, priorityFilter: string, sourceFilter: string, assignedFilter: string): Lead[] => {
  return leads.filter(lead => {
    const matchesSearch = !searchTerm || 
      lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesPriority = priorityFilter === 'all' || lead.followup_priority === priorityFilter
    const matchesSource = sourceFilter === 'all' || lead.lead_source === sourceFilter
    const matchesAssigned = assignedFilter === 'all' || lead.assigned_to === assignedFilter
    
    return matchesSearch && matchesPriority && matchesSource && matchesAssigned
  })
}

export const useLeadsStore = create<LeadsStore>()(
  typeof window !== 'undefined'
    ? devtools<LeadsStore>(
        (set, get) => ({
          // Initial state
          leads: [],
          users: [],
          loading: true,
          error: null,
          initialized: false,
          searchTerm: '',
          priorityFilter: 'all',
          sourceFilter: 'all',
          assignedFilter: 'all',
          selectedLeads: [],
          filteredLeads: [],
          
          // Form state
          showAddDialog: false,
          editingLead: null,

          // Actions
          setLeads: (leads) => {
            const state = get()
            const filteredLeads = filterLeads(leads, state.searchTerm, state.priorityFilter, state.sourceFilter, state.assignedFilter)
            set({ leads, filteredLeads })
          },
          
          setUsers: (users) => set({ users }),
          setLoading: (loading) => set({ loading }),
          setError: (error) => set({ error }),
          
          setSearchTerm: (searchTerm) => {
            const state = get()
            const filteredLeads = filterLeads(state.leads, searchTerm, state.priorityFilter, state.sourceFilter, state.assignedFilter)
            set({ searchTerm, filteredLeads })
          },
          
          setPriorityFilter: (priorityFilter) => {
            const state = get()
            const filteredLeads = filterLeads(state.leads, state.searchTerm, priorityFilter, state.sourceFilter, state.assignedFilter)
            set({ priorityFilter, filteredLeads })
          },
          
          setSourceFilter: (sourceFilter) => {
            const state = get()
            const filteredLeads = filterLeads(state.leads, state.searchTerm, state.priorityFilter, sourceFilter, state.assignedFilter)
            set({ sourceFilter, filteredLeads })
          },
          
          setAssignedFilter: (assignedFilter) => {
            const state = get()
            const filteredLeads = filterLeads(state.leads, state.searchTerm, state.priorityFilter, state.sourceFilter, assignedFilter)
            set({ assignedFilter, filteredLeads })
          },
          
          setSelectedLeads: (selectedLeads) => set({ selectedLeads }),

          updateFilteredLeads: () => {
            const state = get()
            const filteredLeads = filterLeads(state.leads, state.searchTerm, state.priorityFilter, state.sourceFilter, state.assignedFilter)
            set({ filteredLeads })
          },

          // Idempotent initializer to ensure data is loaded once
          init: async () => {
            const state = get()
            if (state.initialized) return
            await get().fetchLeads()
            set({ initialized: true })
          },

          // Form Actions
          openAddDialog: () => set({ showAddDialog: true, editingLead: null }),
          
          openEditDialog: (lead: Lead) => set({ showAddDialog: true, editingLead: lead }),
          
          closeDialog: () => set({ showAddDialog: false, editingLead: null }),

          // Create Lead
          createLead: async (leadData: Omit<Lead, 'id'>) => {
            set({ loading: true, error: null })
            
            try {
              const response = await fetch('/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(leadData)
              })
              
              const data = await response.json()
              
              if (!response.ok) {
                throw new Error(data.error || 'Failed to create lead')
              }
              
              // Add new lead to the list and update filters
              const state = get()
              const newLeads = [data.lead, ...state.leads]
              const filteredLeads = filterLeads(newLeads, state.searchTerm, state.priorityFilter, state.sourceFilter, state.assignedFilter)
              
              set({ 
                leads: newLeads,
                filteredLeads,
                loading: false,
                showAddDialog: false,
                editingLead: null
              })
              
            } catch (error) {
              console.error('❌ Error creating lead:', error)
              set({ 
                error: error instanceof Error ? error.message : 'Unknown error',
                loading: false 
              })
              throw error
            }
          },

          // Update Lead
          updateLead: async (id: string, leadData: Partial<Lead>) => {
            set({ loading: true, error: null })
            
            try {
              const response = await fetch(`/api/leads/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(leadData)
              })
              
              const data = await response.json()
              
              if (!response.ok) {
                throw new Error(data.error || 'Failed to update lead')
              }
              
              // Update lead in the list and refresh filters
              const state = get()
              const updatedLeads = state.leads.map(lead => 
                lead.id === id ? { ...lead, ...data.lead } : lead
              )
              const filteredLeads = filterLeads(updatedLeads, state.searchTerm, state.priorityFilter, state.sourceFilter, state.assignedFilter)
              
              set({ 
                leads: updatedLeads,
                filteredLeads,
                loading: false,
                showAddDialog: false,
                editingLead: null
              })
              
            } catch (error) {
              console.error('❌ Error updating lead:', error)
              set({ 
                error: error instanceof Error ? error.message : 'Unknown error',
                loading: false 
              })
              throw error
            }
          },

          // Fetch leads (same API call as your working version)
          fetchLeads: async () => {
            set({ loading: true, error: null })
            
            try {
              console.log('🔄 Fetching leads via Zustand...')
              const response = await fetch('/api/leads')
              const data = await response.json()
              
              if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch leads')
              }
              
              console.log('✅ Fetched leads:', data.data?.length || 0)
              const leads = data.data || []
              const state = get()
              const filteredLeads = filterLeads(leads, state.searchTerm, state.priorityFilter, state.sourceFilter, state.assignedFilter)
              
              set({ 
                leads, 
                filteredLeads,
                loading: false,
                initialized: true
              })
            } catch (error) {
              console.error('❌ Error fetching leads:', error)
              set({ 
                error: error instanceof Error ? error.message : 'Unknown error',
                loading: false,
                leads: [],
                filteredLeads: []
              })
            }
          },

          // Fetch users (all users for assignment)
          fetchUsers: async () => {
            try {
              const response = await fetch('/api/users')
              const data = await response.json()
              
              if (!response.ok) {
                console.warn('Failed to fetch users:', data.error || 'Unknown error')
                set({ users: [] })
                return
              }
              
              set({ users: data.users || [] })
            } catch (error) {
              console.warn('❌ Error fetching users:', error)
              set({ users: [] })
            }
          },

          // Update lead status
          updateLeadStatus: async (id: string, status: Lead['status']) => {
            try {
              const response = await fetch(`/api/leads/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
              })
              
              if (!response.ok) {
                throw new Error('Failed to update lead status')
              }
              
              // Update local state
              const state = get()
              const updatedLeads = state.leads.map(lead => 
                lead.id === id ? { ...lead, status } : lead
              )
              const filteredLeads = filterLeads(updatedLeads, state.searchTerm, state.priorityFilter, state.sourceFilter, state.assignedFilter)
              set({ leads: updatedLeads, filteredLeads })
              
            } catch (error) {
              console.error('❌ Error updating lead status:', error)
              set({ error: error instanceof Error ? error.message : 'Unknown error' })
            }
          },

          // Update lead priority
          updateLeadPriority: async (id: string, priority: Lead['followup_priority']) => {
            try {
              const response = await fetch(`/api/leads/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ followup_priority: priority })
              })
              
              if (!response.ok) {
                throw new Error('Failed to update lead priority')
              }
              
              // Update local state
              const state = get()
              const updatedLeads = state.leads.map(lead => 
                lead.id === id ? { ...lead, followup_priority: priority } : lead
              )
              const filteredLeads = filterLeads(updatedLeads, state.searchTerm, state.priorityFilter, state.sourceFilter, state.assignedFilter)
              set({ leads: updatedLeads, filteredLeads })
              
            } catch (error) {
              console.error('❌ Error updating lead priority:', error)
              set({ error: error instanceof Error ? error.message : 'Unknown error' })
            }
          },

          // Update lead assignment
          updateLeadAssignment: async (id: string, assignedTo: string) => {
            try {
              const response = await fetch(`/api/leads/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assigned_to: assignedTo })
              })
              
              if (!response.ok) {
                throw new Error('Failed to update lead assignment')
              }
              
              // Update local state
              const state = get()
              const updatedLeads = state.leads.map(lead => 
                lead.id === id ? { ...lead, assigned_to: assignedTo } : lead
              )
              const filteredLeads = filterLeads(updatedLeads, state.searchTerm, state.priorityFilter, state.sourceFilter, state.assignedFilter)
              set({ leads: updatedLeads, filteredLeads })
              
            } catch (error) {
              console.error('❌ Error updating lead assignment:', error)
              set({ error: error instanceof Error ? error.message : 'Unknown error' })
            }
          }
        }) as LeadsStore,
        {
          name: 'leads-store',
          enabled: process.env.NODE_ENV === 'development'
        }
      )
    : // Server-side fallback
      ((set, get) => ({
        leads: [],
        users: [],
        loading: true,
        error: null,
        initialized: false,
        searchTerm: '',
        priorityFilter: 'all',
        sourceFilter: 'all',
        assignedFilter: 'all',
        selectedLeads: [],
        filteredLeads: [],
        showAddDialog: false,
        editingLead: null,
        setLeads: () => {},
        setUsers: () => {},
        setLoading: () => {},
        setError: () => {},
        setSearchTerm: () => {},
        setPriorityFilter: () => {},
        setSourceFilter: () => {},
        setAssignedFilter: () => {},
        setSelectedLeads: () => {},
        updateFilteredLeads: () => {},
        fetchLeads: async () => {},
        fetchUsers: async () => {},
        updateLeadStatus: async () => {},
        updateLeadAssignment: async () => {},
        init: async () => {},
        openAddDialog: () => {},
        openEditDialog: () => {},
        closeDialog: () => {},
        createLead: async () => {},
        updateLead: async () => {},
      })) as unknown as LeadsStore
)