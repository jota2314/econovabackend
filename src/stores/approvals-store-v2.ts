/**
 * Scalable Estimate Approvals Store V2
 * 
 * Features:
 * - Pagination with cursor-based fetching
 * - Server-side filtering for large datasets
 * - Client-side filtering for small datasets
 * - Optimistic updates with server reconciliation
 * - Memoized computed values
 * - Incremental data loading
 * - Realtime subscriptions via Supabase
 */

import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { logger } from '@/lib/services/logger'
import { shallow } from 'zustand/shallow'
import { useEffect, useCallback } from 'react'

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

interface PaginationState {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasMore: boolean
  cursor?: string | null
}

interface FilterState {
  searchTerm: string
  statusFilter: 'all' | 'pending_approval' | 'approved' | 'rejected' | 'draft'
  serviceFilter: 'all' | 'insulation' | 'hvac' | 'plaster'
  sortBy: 'created_at' | 'total_amount' | 'estimate_number'
  sortOrder: 'asc' | 'desc'
}

interface ComputedMetrics {
  pendingCount: number
  approvedCount: number
  rejectedCount: number
  pendingValue: number
  approvedValue: number
  totalValue: number
  lastComputed: number
}

interface ApprovalsStoreV2 {
  // Data
  approvals: Map<string, Approval>  // Using Map for O(1) lookups
  displayedApprovals: string[]      // Array of IDs for current view
  
  // Loading states
  isInitialLoading: boolean
  isLoadingMore: boolean
  isRefreshing: boolean
  error?: string
  
  // Pagination
  pagination: PaginationState
  
  // Filters
  filters: FilterState
  useServerFiltering: boolean  // Switch based on data size
  
  // Computed metrics (memoized)
  metrics: ComputedMetrics
  metricsStale: boolean
  
  // Realtime
  _chan?: any | null
  _interval?: number | null
  _initialized: boolean
  _displayedApprovalsCache?: { key: string, result: Approval[] }
  
  // View
  viewMode: 'cards' | 'table' | 'virtual'  // Add virtual for large lists
  
  // Actions
  init: () => void
  loadPage: (page: number) => Promise<void>
  loadMore: () => Promise<void>
  refresh: (opts?: { silent?: boolean }) => Promise<void>
  approve: (id: string) => Promise<void>
  reject: (id: string) => Promise<void>
  stop: () => void
  
  // Filter Actions
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void
  applyFilters: () => void
  clearFilters: () => void
  
  // View Actions
  setViewMode: (mode: 'cards' | 'table' | 'virtual') => void
  setPageSize: (size: number) => void
  
  // Computed Actions
  computeMetrics: () => void
  getApproval: (id: string) => Approval | undefined
  getDisplayedApprovals: () => Approval[]
  
  // Internal
  _fetchData: (opts: FetchOptions) => Promise<void>
  _mergeApprovals: (newApprovals: Approval[]) => void
  _setupRealtime: () => void
  _cleanupRealtime: () => void
}

interface FetchOptions {
  page?: number
  pageSize?: number
  filters?: FilterState
  append?: boolean
  silent?: boolean
}

const DEFAULT_PAGE_SIZE = 50
const LARGE_DATASET_THRESHOLD = 500
const VIRTUAL_LIST_THRESHOLD = 200
const METRICS_CACHE_DURATION = 30000 // 30 seconds
const REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes
const FETCH_TIMEOUT = 15000 // 15 seconds

export const useApprovalsStoreV2 = create<ApprovalsStoreV2>()(
  subscribeWithSelector(
    devtools(
      (set, get) => ({
        // Initial state
        approvals: new Map(),
        displayedApprovals: [],
        isInitialLoading: false,
        isLoadingMore: false,
        isRefreshing: false,
        error: undefined,
        
        pagination: {
          page: 1,
          pageSize: DEFAULT_PAGE_SIZE,
          totalCount: 0,
          totalPages: 0,
          hasMore: false,
          cursor: null
        },
        
        filters: {
          searchTerm: '',
          statusFilter: 'all',
          serviceFilter: 'all',
          sortBy: 'created_at',
          sortOrder: 'desc'
        },
        
        useServerFiltering: false,
        
        metrics: {
          pendingCount: 0,
          approvedCount: 0,
          rejectedCount: 0,
          pendingValue: 0,
          approvedValue: 0,
          totalValue: 0,
          lastComputed: 0
        },
        
        metricsStale: true,
        _chan: null,
        _interval: null,
        _initialized: false,
        viewMode: 'cards',

        // Initialize
        init: () => {
          const state = get()
          if (state._initialized) {
            logger.debug('Approvals store V2 already initialized')
            return
          }

          logger.info('Initializing approvals store V2')
          set({ _initialized: true })

          // Initial load
          get()._fetchData({ page: 1, silent: false })

          // Set up realtime
          get()._setupRealtime()

          // Set up polling
          const interval = window.setInterval(() => {
            logger.debug('Polling approvals refresh')
            get().refresh({ silent: true })
          }, REFRESH_INTERVAL)

          set({ _interval: interval })

          // Listen for estimate updates
          const handleEstimateUpdated = () => {
            logger.debug('Estimate updated event received')
            get().refresh({ silent: true })
          }

          window.addEventListener('estimateUpdated', handleEstimateUpdated)
          ;(window as any).__approvalsV2Cleanup = () => {
            window.removeEventListener('estimateUpdated', handleEstimateUpdated)
          }
        },

        // Load specific page
        loadPage: async (page: number) => {
          await get()._fetchData({ page, append: false })
        },

        // Load more (for infinite scroll)
        loadMore: async () => {
          const { pagination } = get()
          if (!pagination.hasMore || get().isLoadingMore) return
          
          await get()._fetchData({ 
            page: pagination.page + 1, 
            append: true 
          })
        },

        // Refresh data
        refresh: async (opts = {}) => {
          const state = get()
          if (state.isRefreshing && !opts.silent) return
          
          await get()._fetchData({ 
            page: 1, 
            append: false, 
            silent: opts.silent 
          })
        },

        // Fetch data implementation
        _fetchData: async (opts: FetchOptions) => {
          const state = get()
          const {
            page = 1,
            pageSize = state.pagination.pageSize,
            filters = state.filters,
            append = false,
            silent = false
          } = opts

          // Set loading states
          if (!silent) {
            if (append) {
              set({ isLoadingMore: true, error: undefined })
            } else if (state.approvals.size === 0) {
              set({ isInitialLoading: true, error: undefined })
            } else {
              set({ isRefreshing: true, error: undefined })
            }
          }

          try {
            const supabase = createClient()
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

            // Build query params
            const params = new URLSearchParams({
              page: page.toString(),
              limit: pageSize.toString(),
              sort_by: filters.sortBy,
              sort_order: filters.sortOrder
            })

            // Add filters if using server-side filtering
            if (state.useServerFiltering || state.approvals.size > LARGE_DATASET_THRESHOLD) {
              if (filters.searchTerm) params.append('search', filters.searchTerm)
              if (filters.statusFilter !== 'all') params.append('status', filters.statusFilter)
              if (filters.serviceFilter !== 'all') params.append('service_type', filters.serviceFilter)
            }

            logger.debug('Fetching approvals', { page, pageSize, filters })

            const response = await fetch(`/api/estimates?${params}`, {
              signal: controller.signal,
              headers: {
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                'Content-Type': 'application/json'
              }
            })

            clearTimeout(timeoutId)

            if (!response.ok) {
              if (response.status === 401) {
                logger.warn('Got 401, refreshing session')
                await supabase.auth.refreshSession()
                // Retry once
                return get()._fetchData(opts)
              }
              throw new Error(`HTTP ${response.status}`)
            }

            const data = await response.json()
            
            if (!data.success) {
              throw new Error(data.error || 'Failed to fetch approvals')
            }

            const approvals = data.data?.estimates || []
            const totalCount = data.data?.summary?.total_count || approvals.length
            
            logger.debug(`Fetched ${approvals.length} approvals, total: ${totalCount}`)

            // Update state
            if (append) {
              get()._mergeApprovals(approvals)
            } else {
              // Replace all approvals
              const newMap = new Map<string, Approval>()
              approvals.forEach((a: Approval) => newMap.set(a.id, a))
              set({ approvals: newMap })
            }

            // Update pagination
            const totalPages = Math.ceil(totalCount / pageSize)
            set({
              pagination: {
                page,
                pageSize,
                totalCount,
                totalPages,
                hasMore: page < totalPages,
                cursor: approvals.length > 0 ? approvals[approvals.length - 1].id : null
              }
            })

            // Update display
            get().applyFilters()
            
            // Mark metrics as stale
            set({ metricsStale: true })

            // Determine if we should use server filtering
            set({ useServerFiltering: totalCount > LARGE_DATASET_THRESHOLD })

            // Auto-switch to virtual view for large lists
            if (totalCount > VIRTUAL_LIST_THRESHOLD && state.viewMode === 'cards') {
              set({ viewMode: 'virtual' })
              logger.info('Switched to virtual view for performance', { totalCount })
            }

          } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
              logger.debug('Fetch aborted')
              return
            }

            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch approvals'
            logger.error('Failed to fetch approvals', err)
            
            if (!silent) {
              set({ error: errorMessage })
              toast.error(`Failed to load approvals: ${errorMessage}`)
            }
          } finally {
            set({ 
              isInitialLoading: false, 
              isLoadingMore: false, 
              isRefreshing: false 
            })
          }
        },

        // Merge new approvals into existing map
        _mergeApprovals: (newApprovals: Approval[]) => {
          set(state => {
            const updated = new Map(state.approvals)
            newApprovals.forEach(approval => {
              updated.set(approval.id, approval)
            })
            return { approvals: updated }
          })
        },

        // Apply filters (client-side for small datasets)
        applyFilters: () => {
          const state = get()
          const { filters, useServerFiltering } = state
          
          // If using server filtering, displayed approvals are all approvals
          if (useServerFiltering) {
            set({ 
              displayedApprovals: Array.from(state.approvals.keys()),
              _displayedApprovalsCache: undefined  // Invalidate cache
            })
            return
          }

          // Client-side filtering
          let filtered = Array.from(state.approvals.values())

          // Search filter
          if (filters.searchTerm.trim()) {
            const search = filters.searchTerm.toLowerCase()
            filtered = filtered.filter(approval =>
              approval.estimate_number?.toLowerCase().includes(search) ||
              approval.jobs?.job_name?.toLowerCase().includes(search) ||
              approval.jobs?.lead?.name?.toLowerCase().includes(search) ||
              approval.created_by_user?.full_name?.toLowerCase().includes(search)
            )
          }

          // Status filter
          if (filters.statusFilter !== 'all') {
            filtered = filtered.filter(a => a.status === filters.statusFilter)
          }

          // Service filter
          if (filters.serviceFilter !== 'all') {
            filtered = filtered.filter(a => a.jobs?.service_type === filters.serviceFilter)
          }

          // Sort
          filtered.sort((a, b) => {
            let aVal: any, bVal: any
            
            switch (filters.sortBy) {
              case 'total_amount':
                aVal = a.total_amount || a.subtotal || 0
                bVal = b.total_amount || b.subtotal || 0
                break
              case 'estimate_number':
                aVal = a.estimate_number
                bVal = b.estimate_number
                break
              default:
                aVal = a.created_at
                bVal = b.created_at
            }

            if (filters.sortOrder === 'asc') {
              return aVal > bVal ? 1 : -1
            } else {
              return aVal < bVal ? 1 : -1
            }
          })

          set({ 
            displayedApprovals: filtered.map(a => a.id),
            _displayedApprovalsCache: undefined  // Invalidate cache
          })
        },

        // Set filter
        setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
          set(state => ({
            filters: { ...state.filters, [key]: value }
          }))
          
          // For server filtering, trigger a new fetch
          if (get().useServerFiltering) {
            get()._fetchData({ page: 1 })
          } else {
            // For client filtering, just reapply filters
            get().applyFilters()
          }
          
          set({ metricsStale: true })
        },

        // Clear filters
        clearFilters: () => {
          set({
            filters: {
              searchTerm: '',
              statusFilter: 'all',
              serviceFilter: 'all',
              sortBy: 'created_at',
              sortOrder: 'desc'
            }
          })
          get().applyFilters()
          set({ metricsStale: true })
        },

        // Compute metrics (memoized)
        computeMetrics: () => {
          const state = get()
          
          // Check if metrics are fresh
          if (!state.metricsStale && 
              Date.now() - state.metrics.lastComputed < METRICS_CACHE_DURATION) {
            return
          }

          const approvals = Array.from(state.approvals.values())
          
          const metrics: ComputedMetrics = {
            pendingCount: 0,
            approvedCount: 0,
            rejectedCount: 0,
            pendingValue: 0,
            approvedValue: 0,
            totalValue: 0,
            lastComputed: Date.now()
          }

          approvals.forEach(a => {
            const amount = a.total_amount || a.subtotal || 0
            
            switch (a.status) {
              case 'pending_approval':
                metrics.pendingCount++
                metrics.pendingValue += amount
                break
              case 'approved':
                metrics.approvedCount++
                metrics.approvedValue += amount
                break
              case 'rejected':
                metrics.rejectedCount++
                break
            }
            
            metrics.totalValue += amount
          })

          set({ metrics, metricsStale: false })
        },

        // Get single approval
        getApproval: (id: string) => {
          return get().approvals.get(id)
        },

        // Get displayed approvals (memoized)
        getDisplayedApprovals: () => {
          const state = get()
          // Create a cache key based on displayed approval IDs and approval data
          const cacheKey = state.displayedApprovals.join(',') + '_' + state.approvals.size
          
          // Simple memoization - in a real implementation you might use a more sophisticated cache
          if (!state._displayedApprovalsCache || state._displayedApprovalsCache.key !== cacheKey) {
            const result = state.displayedApprovals
              .map(id => state.approvals.get(id))
              .filter((a): a is Approval => a !== undefined)
            
            // Store in cache
            ;(state as any)._displayedApprovalsCache = { key: cacheKey, result }
            return result
          }
          
          return state._displayedApprovalsCache.result
        },

        // Optimistic approve
        approve: async (id: string) => {
          const state = get()
          const approval = state.approvals.get(id)
          
          if (!approval) {
            toast.error('Approval not found')
            return
          }

          // Optimistic update
          const updated = { ...approval, status: 'approved' as const }
          state.approvals.set(id, updated)
          set({ approvals: new Map(state.approvals), metricsStale: true })
          toast.success('Estimate approved')

          try {
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
              throw new Error(data.error || 'Failed to approve')
            }

            logger.info('Estimate approved', { id })

          } catch (err) {
            logger.error('Failed to approve', err, { id })
            
            // Rollback
            state.approvals.set(id, approval)
            set({ approvals: new Map(state.approvals), metricsStale: true })
            toast.error('Failed to approve estimate')
          }
        },

        // Optimistic reject
        reject: async (id: string) => {
          const state = get()
          const approval = state.approvals.get(id)
          
          if (!approval) {
            toast.error('Approval not found')
            return
          }

          // Optimistic update
          const updated = { ...approval, status: 'rejected' as const }
          state.approvals.set(id, updated)
          set({ approvals: new Map(state.approvals), metricsStale: true })
          toast.success('Estimate rejected')

          try {
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
              throw new Error(data.error || 'Failed to reject')
            }

            logger.info('Estimate rejected', { id })

          } catch (err) {
            logger.error('Failed to reject', err, { id })
            
            // Rollback
            state.approvals.set(id, approval)
            set({ approvals: new Map(state.approvals), metricsStale: true })
            toast.error('Failed to reject estimate')
          }
        },

        // View mode
        setViewMode: (mode: 'cards' | 'table' | 'virtual') => {
          set({ viewMode: mode })
        },

        // Page size
        setPageSize: (size: number) => {
          set(state => ({
            pagination: { ...state.pagination, pageSize: size }
          }))
          get()._fetchData({ page: 1, pageSize: size })
        },

        // Setup realtime
        _setupRealtime: () => {
          try {
            const supabase = createClient()
            
            const channel = supabase
              .channel('estimates-changes-v2')
              .on(
                'postgres_changes',
                {
                  event: '*',
                  schema: 'public',
                  table: 'estimates'
                },
                (payload) => {
                  logger.debug('Realtime change', payload)
                  
                  const { eventType, new: newRecord, old: oldRecord } = payload
                  
                  switch (eventType) {
                    case 'INSERT':
                    case 'UPDATE':
                      // For inserts and updates, fetch the full record
                      get().refresh({ silent: true })
                      break
                      
                    case 'DELETE':
                      if (oldRecord) {
                        const state = get()
                        state.approvals.delete(oldRecord.id)
                        set({ 
                          approvals: new Map(state.approvals),
                          metricsStale: true
                        })
                        get().applyFilters()
                      }
                      break
                  }
                }
              )
              .subscribe()

            set({ _chan: channel })
          } catch (err) {
            logger.error('Failed to setup realtime', err)
          }
        },

        // Cleanup realtime
        _cleanupRealtime: () => {
          const state = get()
          if (state._chan) {
            createClient().removeChannel(state._chan)
            set({ _chan: null })
          }
        },

        // Stop
        stop: () => {
          const state = get()
          
          logger.info('Stopping approvals store V2')
          
          get()._cleanupRealtime()
          
          if (state._interval) {
            window.clearInterval(state._interval)
            set({ _interval: null })
          }

          if ((window as any).__approvalsV2Cleanup) {
            ;(window as any).__approvalsV2Cleanup()
            delete (window as any).__approvalsV2Cleanup
          }

          set({ _initialized: false })
        }
      }),
      {
        name: 'approvals-store-v2',
        enabled: process.env.NODE_ENV === 'development'
      }
    )
  )
)

// Optimized selectors with shallow equality checks
export const useApprovalsPagination = () => 
  useApprovalsStoreV2(state => state.pagination, shallow)

export const useApprovalsFilters = () => 
  useApprovalsStoreV2(state => state.filters, shallow)

export const useApprovalsMetrics = () => {
  const metrics = useApprovalsStoreV2(state => state.metrics, shallow)
  const metricsStale = useApprovalsStoreV2(state => state.metricsStale)
  const computeMetrics = useApprovalsStoreV2(state => state.computeMetrics)
  
  // Use useEffect to compute metrics when they become stale
  useEffect(() => {
    if (metricsStale) {
      computeMetrics()
    }
  }, [metricsStale, computeMetrics])
  
  return metrics
}

export const useApprovalsLoading = () => 
  useApprovalsStoreV2(useCallback((state) => ({
    isInitialLoading: state.isInitialLoading,
    isLoadingMore: state.isLoadingMore,
    isRefreshing: state.isRefreshing
  }), []), shallow)

export const useApprovalsViewMode = () => 
  useApprovalsStoreV2(state => state.viewMode)

export const useDisplayedApprovals = () => 
  useApprovalsStoreV2(state => state.getDisplayedApprovals(), shallow)

export const useApprovalById = (id: string) => 
  useApprovalsStoreV2(state => state.getApproval(id))

// Action hooks
export const useApprovalsActions = () => 
  useApprovalsStoreV2(useCallback((state) => ({
    init: state.init,
    loadPage: state.loadPage,
    loadMore: state.loadMore,
    refresh: state.refresh,
    approve: state.approve,
    reject: state.reject,
    setFilter: state.setFilter,
    clearFilters: state.clearFilters,
    setViewMode: state.setViewMode,
    setPageSize: state.setPageSize,
    stop: state.stop
  }), []), shallow)