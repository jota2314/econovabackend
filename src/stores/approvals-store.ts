/**
 * Estimate Approvals Store with Realtime Updates
 * 
 * Features:
 * - Optimistic updates with server reconciliation
 * - Realtime subscriptions via Supabase postgres_changes
 * - Polling fallback for reliability
 * - 401 handling with session refresh + retry
 * - Proper cleanup and idempotent initialization
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { logger } from '@/lib/services/logger'

// Types
export interface Approval {
  id: string
  estimate_number: string
  status: 'draft' | 'pending_approval' | 'sent' | 'approved' | 'rejected'
  total_amount?: number
  subtotal?: number
  created_at: string
  jobs: {
    id: string
    job_name: string
    service_type?: 'insulation' | 'hvac' | 'plaster'
    lead?: {
      id: string
      name: string
      email?: string
      phone?: string
      address?: string
      city?: string
      state?: string
    }
  }
  created_by_user: {
    id: string
    full_name: string
    email: string
  }
}

interface ApprovalFilters {
  searchTerm: string
  statusFilter: 'all' | 'pending_approval' | 'approved' | 'rejected' | 'draft'
  serviceFilter: 'all' | 'insulation' | 'hvac' | 'plaster'
  viewMode: 'cards' | 'table'
}

interface ApprovalsStore {
  // State
  approvals: Approval[]
  isInitialLoading: boolean
  isRefreshing: boolean
  error?: string
  _chan?: any | null  // Supabase channel handle
  _interval?: number | null  // polling id
  _initialized: boolean

  // Filters & UI State
  filters: ApprovalFilters

  // Computed (will be derived in selectors)
  filteredApprovals: Approval[]
  
  // Actions
  init: () => void
  refresh: (opts?: { signal?: AbortSignal }) => Promise<void>
  approve: (id: string) => Promise<void>
  reject: (id: string) => Promise<void>
  stop: () => void
  
  // Filter Actions
  setSearchTerm: (term: string) => void
  setStatusFilter: (status: ApprovalFilters['statusFilter']) => void
  setServiceFilter: (service: ApprovalFilters['serviceFilter']) => void
  setViewMode: (mode: ApprovalFilters['viewMode']) => void
  
  // Internal actions
  _setApprovals: (approvals: Approval[]) => void
  _updateApproval: (id: string, updates: Partial<Approval>) => void
  _removeApproval: (id: string) => void
  _mergeApproval: (approval: Approval) => void
  _updateFiltered: () => void
  _setupRealtime: () => void
}

const REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes
const FETCH_TIMEOUT = 15000 // 15 seconds

export const useApprovalsStore = create<ApprovalsStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      approvals: [],
      isInitialLoading: false,
      isRefreshing: false,
      error: undefined,
      _chan: null,
      _interval: null,
      _initialized: false,

      // Filters
      filters: {
        searchTerm: '',
        statusFilter: 'all',
        serviceFilter: 'all',
        viewMode: 'cards'
      },

      // Computed - will be updated when approvals or filters change
      filteredApprovals: [],

      // Initialize (idempotent)
      init: () => {
        const state = get()
        if (state._initialized) {
          logger.debug('Approvals store already initialized')
          return
        }

        logger.info('Initializing approvals store')
        set({ _initialized: true, isInitialLoading: true })

        // Initial fetch
        get().refresh()

        // Set up realtime subscription
        get()._setupRealtime()

        // Set up polling fallback
        const interval = window.setInterval(() => {
          logger.debug('Polling approvals refresh')
          get().refresh({ signal: undefined })
        }, REFRESH_INTERVAL)

        // Set up window event listener for estimate updates
        const handleEstimateUpdated = () => {
          logger.debug('Estimate updated event received, refreshing')
          get().refresh()
        }

        window.addEventListener('estimateUpdated', handleEstimateUpdated)

        set({ 
          _interval: interval,
        })

        // Store cleanup function for later
        const cleanup = () => {
          window.removeEventListener('estimateUpdated', handleEstimateUpdated)
        }
        
        // We'll store this cleanup in a way we can call it later
        ;(window as any).__approvalsCleanup = cleanup
      },

      // Refresh data from server
      refresh: async (opts = {}) => {
        const state = get()
        const { signal } = opts

        // Don't show initial loading if we already have data
        if (state.approvals.length === 0) {
          set({ isInitialLoading: true, error: undefined })
        } else {
          set({ isRefreshing: true, error: undefined })
        }

        let retryCount = 0
        const maxRetries = 1

        const doFetch = async (): Promise<void> => {
          try {
            const supabase = createClient()
            
            // Create abort controller for timeout
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
            
            // Use provided signal or our timeout signal
            const fetchSignal = signal || controller.signal

            logger.debug('Fetching approvals from API')

            const response = await fetch('/api/estimates', {
              signal: fetchSignal,
              headers: {
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                'Content-Type': 'application/json'
              }
            })

            clearTimeout(timeoutId)

            if (!response.ok) {
              if (response.status === 401 && retryCount < maxRetries) {
                logger.warn('Got 401, refreshing session and retrying')
                retryCount++
                
                // Refresh session
                const { error: refreshError } = await supabase.auth.refreshSession()
                if (refreshError) {
                  throw new Error(`Session refresh failed: ${refreshError.message}`)
                }
                
                // Retry the fetch
                return await doFetch()
              }
              
              throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }

            const data = await response.json()
            
            if (!data.success) {
              throw new Error(data.error || 'API request failed')
            }

            const approvals = data.data?.estimates || []
            logger.debug(`Fetched ${approvals.length} approvals`)

            // Update state
            get()._setApprovals(approvals)
            set({ 
              isInitialLoading: false, 
              isRefreshing: false, 
              error: undefined 
            })

          } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
              logger.debug('Approvals fetch aborted')
              return
            }

            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch approvals'
            logger.error('Failed to fetch approvals', err)
            
            set({ 
              isInitialLoading: false, 
              isRefreshing: false, 
              error: errorMessage 
            })

            // Only show toast for non-401 errors (401s are handled above)
            if (!errorMessage.includes('401')) {
              toast.error(`Failed to load approvals: ${errorMessage}`)
            }
          }
        }

        await doFetch()
      },

      // Optimistic approve
      approve: async (id: string) => {
        const state = get()
        const approval = state.approvals.find(a => a.id === id)
        
        if (!approval) {
          toast.error('Approval not found')
          return
        }

        // Optimistic update
        get()._updateApproval(id, { status: 'approved' })
        toast.success('Estimate approved')

        try {
          logger.info('Approving estimate', { id })
          
          const supabase = createClient()
          const response = await fetch(`/api/estimates/${id}/approve`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
              'Content-Type': 'application/json'
            }
          })

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
          }

          const data = await response.json()
          if (!data.success) {
            throw new Error(data.error || 'Failed to approve estimate')
          }

          logger.info('Estimate approved successfully', { id })

          // Dispatch custom event
          window.dispatchEvent(new CustomEvent('estimateUpdated', { detail: { id, status: 'approved' } }))

        } catch (err) {
          logger.error('Failed to approve estimate', err, { id })
          
          // Rollback optimistic update
          get()._updateApproval(id, approval)
          toast.error('Failed to approve estimate')
        }
      },

      // Optimistic reject
      reject: async (id: string) => {
        const state = get()
        const approval = state.approvals.find(a => a.id === id)
        
        if (!approval) {
          toast.error('Approval not found')
          return
        }

        // Optimistic update
        get()._updateApproval(id, { status: 'rejected' })
        toast.success('Estimate rejected')

        try {
          logger.info('Rejecting estimate', { id })
          
          const supabase = createClient()
          const response = await fetch(`/api/estimates/${id}/reject`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
              'Content-Type': 'application/json'
            }
          })

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
          }

          const data = await response.json()
          if (!data.success) {
            throw new Error(data.error || 'Failed to reject estimate')
          }

          logger.info('Estimate rejected successfully', { id })

          // Dispatch custom event
          window.dispatchEvent(new CustomEvent('estimateUpdated', { detail: { id, status: 'rejected' } }))

        } catch (err) {
          logger.error('Failed to reject estimate', err, { id })
          
          // Rollback optimistic update
          get()._updateApproval(id, approval)
          toast.error('Failed to reject estimate')
        }
      },


      // Stop all subscriptions and intervals
      stop: () => {
        const state = get()
        
        logger.info('Stopping approvals store')
        
        // Clean up realtime subscription
        if (state._chan) {
          createClient().removeChannel(state._chan)
          set({ _chan: null })
        }
        
        // Clean up polling interval
        if (state._interval) {
          window.clearInterval(state._interval)
          set({ _interval: null })
        }

        // Clean up window listeners
        if ((window as any).__approvalsCleanup) {
          ;(window as any).__approvalsCleanup()
          delete (window as any).__approvalsCleanup
        }

        set({ _initialized: false })
      },

      // Filter actions
      setSearchTerm: (term: string) => {
        set(state => ({
          filters: { ...state.filters, searchTerm: term }
        }))
        get()._updateFiltered()
      },

      setStatusFilter: (status: ApprovalFilters['statusFilter']) => {
        set(state => ({
          filters: { ...state.filters, statusFilter: status }
        }))
        get()._updateFiltered()
      },

      setServiceFilter: (service: ApprovalFilters['serviceFilter']) => {
        set(state => ({
          filters: { ...state.filters, serviceFilter: service }
        }))
        get()._updateFiltered()
      },

      setViewMode: (mode: ApprovalFilters['viewMode']) => {
        set(state => ({
          filters: { ...state.filters, viewMode: mode }
        }))
      },

      // Internal actions
      _setApprovals: (approvals: Approval[]) => {
        set({ approvals })
        get()._updateFiltered()
      },

      _updateApproval: (id: string, updates: Partial<Approval>) => {
        set(state => ({
          approvals: state.approvals.map(approval => 
            approval.id === id ? { ...approval, ...updates } : approval
          )
        }))
        get()._updateFiltered()
      },

      _removeApproval: (id: string) => {
        set(state => ({
          approvals: state.approvals.filter(approval => approval.id !== id)
        }))
        get()._updateFiltered()
      },

      _mergeApproval: (newApproval: Approval) => {
        set(state => {
          const existingIndex = state.approvals.findIndex(a => a.id === newApproval.id)
          if (existingIndex >= 0) {
            // Update existing
            const updated = [...state.approvals]
            updated[existingIndex] = newApproval
            return { approvals: updated }
          } else {
            // Add new (prepend to maintain order)
            return { approvals: [newApproval, ...state.approvals] }
          }
        })
        get()._updateFiltered()
      },

      // Update filtered approvals based on current filters
      _updateFiltered: () => {
        const state = get()
        let filtered = state.approvals

        // Apply search
        if (state.filters.searchTerm.trim()) {
          const search = state.filters.searchTerm.toLowerCase()
          filtered = filtered.filter(approval =>
            approval.estimate_number?.toLowerCase().includes(search) ||
            approval.jobs?.job_name?.toLowerCase().includes(search) ||
            approval.jobs?.lead?.name?.toLowerCase().includes(search) ||
            approval.created_by_user?.full_name?.toLowerCase().includes(search)
          )
        }

        // Apply status filter
        if (state.filters.statusFilter !== 'all') {
          filtered = filtered.filter(approval => approval.status === state.filters.statusFilter)
        }

        // Apply service filter  
        if (state.filters.serviceFilter !== 'all') {
          filtered = filtered.filter(approval => approval.jobs?.service_type === state.filters.serviceFilter)
        }

        set({ filteredApprovals: filtered })
      },

      // Set up realtime subscription (internal)
      _setupRealtime: () => {
        try {
          const supabase = createClient()
          
          logger.debug('Setting up realtime subscription for estimates')
          
          const channel = supabase
            .channel('estimates-changes')
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'estimates'
              },
              (payload) => {
                logger.debug('Realtime estimate change', payload)
                
                const { eventType, new: newRecord, old: oldRecord } = payload
                
                switch (eventType) {
                  case 'INSERT':
                    if (newRecord) {
                      logger.debug('Realtime INSERT - will refresh to get full data')
                      // For inserts, refresh to get full joined data
                      get().refresh()
                    }
                    break
                    
                  case 'UPDATE':
                    if (newRecord) {
                      logger.debug('Realtime UPDATE', { id: newRecord.id, status: newRecord.status })
                      // For updates, we can partially update if we have the data
                      const existing = get().approvals.find(a => a.id === newRecord.id)
                      if (existing) {
                        get()._updateApproval(newRecord.id, {
                          status: newRecord.status,
                          total_amount: newRecord.total_amount,
                          subtotal: newRecord.subtotal
                        })
                      } else {
                        // If we don't have it, refresh to get full data
                        get().refresh()
                      }
                    }
                    break
                    
                  case 'DELETE':
                    if (oldRecord) {
                      logger.debug('Realtime DELETE', { id: oldRecord.id })
                      get()._removeApproval(oldRecord.id)
                    }
                    break
                }
              }
            )
            .subscribe((status) => {
              logger.debug('Realtime subscription status', status)
            })

          set({ _chan: channel })
        } catch (err) {
          logger.error('Failed to set up realtime subscription', err)
        }
      }
    }),
    {
      name: 'approvals-store',
      enabled: process.env.NODE_ENV === 'development'
    }
  )
)

// Selectors for optimized re-renders
export const useApprovals = () => useApprovalsStore(state => state.approvals)
export const useFilteredApprovals = () => useApprovalsStore(state => state.filteredApprovals)
export const useIsInitialLoading = () => useApprovalsStore(state => state.isInitialLoading)
export const useIsRefreshing = () => useApprovalsStore(state => state.isRefreshing)
export const useApprovalsError = () => useApprovalsStore(state => state.error)
export const useApprovalsFilters = () => useApprovalsStore(state => state.filters)

// Action selectors
export const useApprovalsActions = () => useApprovalsStore(state => ({
  init: state.init,
  refresh: state.refresh,
  approve: state.approve,
  reject: state.reject,
  stop: state.stop,
  setSearchTerm: state.setSearchTerm,
  setStatusFilter: state.setStatusFilter,
  setServiceFilter: state.setServiceFilter,
  setViewMode: state.setViewMode
}))

// Computed selectors
export const useApprovalsMetrics = () => useApprovalsStore(state => {
  const approvals = state.approvals
  
  const pendingValue = approvals
    .filter(a => a.status === 'pending_approval')
    .reduce((sum, a) => sum + (a.total_amount || a.subtotal || 0), 0)
    
  const approvedValue = approvals
    .filter(a => a.status === 'approved')
    .reduce((sum, a) => sum + (a.total_amount || a.subtotal || 0), 0)
    
  const totalValue = approvals
    .reduce((sum, a) => sum + (a.total_amount || a.subtotal || 0), 0)
    
  const pendingCount = approvals.filter(a => a.status === 'pending_approval').length
  const approvedCount = approvals.filter(a => a.status === 'approved').length
  const totalCount = approvals.length

  return {
    pendingValue,
    approvedValue, 
    totalValue,
    pendingCount,
    approvedCount,
    totalCount
  }
})