/**
 * Enhanced custom React hook for estimates management
 * Provides state management and business logic for estimates with performance optimizations
 */

'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { 
  estimatesService, 
  type EstimateListItem, 
  type EstimatesListResponse 
} from '@/lib/services/business/estimates-service'
import { logger } from '@/lib/services/logger'
import { useAuth } from '@/hooks/use-auth'

// Cache configuration
const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes
const REQUEST_DEBOUNCE = 300 // 300ms debounce for rapid requests

// Type aliases for better compatibility
type Estimate = EstimateListItem
type EstimateStatus = 'draft' | 'pending_approval' | 'sent' | 'approved' | 'rejected' | 'all'
type ServiceType = 'insulation' | 'hvac' | 'plaster' | 'all'

interface UseEstimatesOptions {
  status?: EstimateStatus
  serviceType?: ServiceType
  page?: number
  limit?: number
  autoRefresh?: boolean
  refreshInterval?: number
  // Legacy support for EstimateApprovalsPage
  autoFetch?: boolean
  enableCaching?: boolean
  refetchInterval?: number
}

interface UseEstimatesReturn {
  // Data
  estimates: Estimate[]
  filteredEstimates: Estimate[]
  selectedEstimate: Estimate | null
  user: { role: string; full_name: string } | null
  loading: boolean
  error: string | null
  total: number
  page: number
  limit: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  lastRefresh: Date | null
  
  // UI State
  searchTerm: string
  statusFilter: EstimateStatus
  serviceFilter: ServiceType
  viewMode: 'cards' | 'table'
  
  // Computed metrics
  pendingValue: number
  approvedValue: number
  totalValue: number
  pendingCount: number
  approvedCount: number
  totalCount: number
  
  // Cache info
  lastFetch: Date | null
  isStale: boolean
  
  // Actions
  refetch: (immediate?: boolean) => Promise<void>
  refetchIfStale: () => Promise<void>
  approveEstimate: (estimateId: string) => Promise<boolean>
  rejectEstimate: (estimateId: string) => Promise<boolean>
  updateEstimate?: (estimateId: string, data: any) => Promise<boolean>
  goToPage: (page: number) => Promise<void>
  setFilters: (filters: { status?: EstimateStatus; serviceType?: ServiceType }) => void
  clearCache: () => void
  
  // UI Actions
  setSearchTerm: (term: string) => void
  setStatusFilter: (status: EstimateStatus) => void
  setServiceFilter: (service: ServiceType) => void
  setViewMode: (mode: 'cards' | 'table') => void
  selectEstimate: (estimate: Estimate | null) => void
}

// Cache management
interface CacheEntry {
  data: Estimate[]
  total: number
  timestamp: Date
  key: string
}

const cache = new Map<string, CacheEntry>()

export function useEstimates(options: UseEstimatesOptions = {}): UseEstimatesReturn {
  const {
    status = 'all',
    serviceType = 'all',
    page: initialPage = 1,
    limit = 50,
    autoRefresh = false,
    refreshInterval = 30000, // 30 seconds
    // Legacy support
    autoFetch = false,
    enableCaching = false,
    refetchInterval
  } = options

  // Use refetchInterval if provided, otherwise fall back to refreshInterval
  const actualRefreshInterval = refetchInterval || refreshInterval
  const actualAutoRefresh = autoRefresh || autoFetch

  // State
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(initialPage)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)
  const [currentFilters, setCurrentFilters] = useState({ status, serviceType })
  
  // UI State
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilterState] = useState<EstimateStatus>('all')
  const [serviceFilter, setServiceFilterState] = useState<ServiceType>('all')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null)
  const [user, setUser] = useState<{ role: string; full_name: string } | null>(null)

  // Refs for cleanup and debouncing
  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Cache key generation
  const cacheKey = useMemo(() => {
    return `estimates_${currentFilters.status}_${currentFilters.serviceType}_${page}_${limit}`
  }, [currentFilters.status, currentFilters.serviceType, page, limit])

  // Check if cache is stale
  const isStale = useMemo(() => {
    const cached = cache.get(cacheKey)
    if (!cached) return true
    return Date.now() - cached.timestamp.getTime() > CACHE_DURATION
  }, [cacheKey, lastFetch])

  // Pagination helpers
  const hasNextPage = useMemo(() => {
    return page * limit < total
  }, [page, limit, total])

  const hasPreviousPage = useMemo(() => {
    return page > 1
  }, [page])

  // Debounced fetch function
  const debouncedFetch = useCallback(async (immediate = false) => {
    // Clear existing debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    const executeFetch = async () => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Check cache first
      const cached = cache.get(cacheKey)
      if (cached && !isStale && !immediate) {
        logger.debug('Using cached estimates data', { cacheKey })
        setEstimates(cached.data)
        setTotal(cached.total)
        setLastFetch(cached.timestamp)
        setError(null)
        return
      }

      setLoading(true)
      setError(null)

      try {
        abortControllerRef.current = new AbortController()
        
        logger.info('Fetching estimates', { 
          filters: currentFilters, 
          page, 
          limit,
          cacheKey 
        })

        const response = await estimatesService.getEstimates({
          status: currentFilters.status === 'all' ? undefined : currentFilters.status,
          serviceType: currentFilters.serviceType === 'all' ? undefined : currentFilters.serviceType,
          page,
          limit
        })

        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch estimates')
        }

        const fetchTime = new Date()
        
        // Update state
        setEstimates(response.data?.estimates || [])
        setTotal(response.data?.total || 0)
        setLastFetch(fetchTime)

        // Update cache
        cache.set(cacheKey, {
          data: response.data?.estimates || [],
          total: response.data?.total || 0,
          timestamp: fetchTime,
          key: cacheKey
        })

        logger.debug('Estimates fetched successfully', { 
          count: response.data?.estimates?.length || 0,
          total: response.data?.total || 0,
          cacheKey 
        })

      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          logger.debug('Estimates fetch aborted', { cacheKey })
          return
        }

        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch estimates'
        logger.error('Failed to fetch estimates', err, { 
          filters: currentFilters, 
          page, 
          limit 
        })
        
        setError(errorMessage)
        toast.error(errorMessage)
      } finally {
        setLoading(false)
        abortControllerRef.current = null
      }
    }

    if (immediate) {
      await executeFetch()
    } else {
      debounceTimeoutRef.current = setTimeout(executeFetch, REQUEST_DEBOUNCE)
    }
  }, [cacheKey, currentFilters, page, limit, isStale])

  // Get current user from auth hook
  const { profile } = useAuth()
  
  useEffect(() => {
    if (profile) {
      setUser({ 
        role: profile.role || 'user', 
        full_name: profile.full_name || profile.email || 'User' 
      })
    }
  }, [profile])

  // Filtered estimates based on search and filters
  const filteredEstimates = useMemo(() => {
    let filtered = estimates

    // Apply search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(estimate => 
        estimate.estimate_number?.toLowerCase().includes(searchLower) ||
        estimate.jobs?.job_name?.toLowerCase().includes(searchLower) ||
        estimate.jobs?.lead?.name?.toLowerCase().includes(searchLower) ||
        estimate.created_by_user?.full_name?.toLowerCase().includes(searchLower)
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(estimate => estimate.status === statusFilter)
    }

    // Apply service filter
    if (serviceFilter !== 'all') {
      filtered = filtered.filter(estimate => estimate.jobs?.service_type === serviceFilter)
    }

    return filtered
  }, [estimates, searchTerm, statusFilter, serviceFilter])

  // Computed metrics
  const pendingValue = useMemo(() => {
    return estimates
      .filter(e => e.status === 'pending_approval')
      .reduce((sum, e) => sum + (e.total_amount || e.subtotal || 0), 0)
  }, [estimates])

  const approvedValue = useMemo(() => {
    return estimates
      .filter(e => e.status === 'approved')
      .reduce((sum, e) => sum + (e.total_amount || e.subtotal || 0), 0)
  }, [estimates])

  const totalValue = useMemo(() => {
    return estimates
      .reduce((sum, e) => sum + (e.total_amount || e.subtotal || 0), 0)
  }, [estimates])

  const pendingCount = useMemo(() => {
    return estimates.filter(e => e.status === 'pending_approval').length
  }, [estimates])

  const approvedCount = useMemo(() => {
    return estimates.filter(e => e.status === 'approved').length
  }, [estimates])

  const totalCount = useMemo(() => {
    return estimates.length
  }, [estimates])

  // UI Action handlers
  const setStatusFilter = useCallback((status: EstimateStatus) => {
    setStatusFilterState(status)
    setCurrentFilters(prev => ({ ...prev, status }))
  }, [])

  const setServiceFilter = useCallback((service: ServiceType) => {
    setServiceFilterState(service)
    setCurrentFilters(prev => ({ ...prev, serviceType: service }))
  }, [])

  const selectEstimate = useCallback((estimate: Estimate | null) => {
    setSelectedEstimate(estimate)
  }, [])

  // Refetch functions
  const refetch = useCallback(async (immediate?: boolean) => {
    await debouncedFetch(immediate || true)
  }, [debouncedFetch])

  const refetchIfStale = useCallback(async () => {
    if (isStale) {
      await refetch()
    }
  }, [isStale, refetch])

  // Estimate actions
  const approveEstimate = useCallback(async (estimateId: string): Promise<boolean> => {
    try {
      logger.info('Approving estimate', { estimateId })
      
      const response = await estimatesService.approveEstimate(estimateId)
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to approve estimate')
      }

      toast.success('Estimate approved successfully')
      
      // Clear cache and refetch
      cache.delete(cacheKey)
      await refetch()
      
      logger.info('Estimate approved successfully', { estimateId })
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve estimate'
      logger.error('Failed to approve estimate', err, { estimateId })
      toast.error(errorMessage)
      return false
    }
  }, [cacheKey, refetch])

  const rejectEstimate = useCallback(async (estimateId: string): Promise<boolean> => {
    try {
      logger.info('Rejecting estimate', { estimateId })
      
      const response = await estimatesService.rejectEstimate(estimateId)
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to reject estimate')
      }

      toast.success('Estimate rejected successfully')
      
      // Clear cache and refetch
      cache.delete(cacheKey)
      await refetch()
      
      logger.info('Estimate rejected successfully', { estimateId })
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject estimate'
      logger.error('Failed to reject estimate', err, { estimateId })
      toast.error(errorMessage)
      return false
    }
  }, [cacheKey, refetch])

  // Navigation
  const goToPage = useCallback(async (newPage: number) => {
    if (newPage === page || newPage < 1) return
    
    logger.debug('Navigating to page', { from: page, to: newPage })
    setPage(newPage)
  }, [page])

  // Filter management
  const setFilters = useCallback((filters: { status?: EstimateStatus; serviceType?: ServiceType }) => {
    logger.debug('Setting filters', { 
      old: currentFilters, 
      new: filters 
    })
    
    setCurrentFilters(prev => ({
      status: filters.status ?? prev.status,
      serviceType: filters.serviceType ?? prev.serviceType
    }))
    
    // Reset to first page when filters change
    setPage(1)
  }, [currentFilters])

  // Cache management
  const clearCache = useCallback(() => {
    logger.debug('Clearing estimates cache')
    cache.clear()
    setLastFetch(null)
  }, [])

  // Auto-refresh setup
  useEffect(() => {
    if (actualAutoRefresh && actualRefreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        logger.debug('Auto-refreshing estimates')
        refetchIfStale()
      }, actualRefreshInterval)

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current)
        }
      }
    }
  }, [actualAutoRefresh, actualRefreshInterval, refetchIfStale])

  // Fetch on mount and when key dependencies change
  useEffect(() => {
    debouncedFetch()
  }, [currentFilters.status, currentFilters.serviceType, page, limit])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [])

  return {
    // Data
    estimates,
    filteredEstimates,
    selectedEstimate,
    user,
    loading,
    error,
    total,
    page,
    limit,
    hasNextPage,
    hasPreviousPage,
    lastRefresh: lastFetch,
    
    // UI State
    searchTerm,
    statusFilter,
    serviceFilter,
    viewMode,
    
    // Computed metrics
    pendingValue,
    approvedValue,
    totalValue,
    pendingCount,
    approvedCount,
    totalCount,
    
    // Cache info
    lastFetch,
    isStale,
    
    // Actions
    refetch,
    refetchIfStale,
    approveEstimate,
    rejectEstimate,
    updateEstimate: undefined, // Not implemented in current hook
    goToPage,
    setFilters,
    clearCache,
    
    // UI Actions
    setSearchTerm,
    setStatusFilter,
    setServiceFilter,
    setViewMode,
    selectEstimate
  }
}

export default useEstimates