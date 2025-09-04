/**
 * Enhanced custom React hook for estimates management
 * Provides state management and business logic for estimates with performance optimizations
 */

'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import estimatesService from '@/lib/services/business/estimates-service'

// Cache configuration
const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes
const REQUEST_DEBOUNCE = 300 // 300ms debounce for rapid requests

// Types
interface Estimate {
  id: string
  estimate_number: string
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected'
  total_amount?: number
  subtotal?: number
  created_at: string
  jobs: {
    id: string
    job_name: string
    service_type?: string
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

interface User {
  id: string
  full_name: string | null
  email: string
  role: string
}

interface EstimatesCache {
  data: Estimate[]
  timestamp: number
  filters?: {
    statusFilter?: string
    serviceFilter?: string
  }
}

interface UseEstimatesOptions {
  autoFetch?: boolean
  refetchInterval?: number
  enableCaching?: boolean
}

interface UseEstimatesReturn {
  // Data
  estimates: Estimate[]
  filteredEstimates: Estimate[]
  selectedEstimate: Estimate | null
  user: User | null
  
  // State
  loading: boolean
  error: string | null
  lastRefresh: Date | null
  
  // UI State
  searchTerm: string
  statusFilter: string
  serviceFilter: string
  viewMode: 'cards' | 'table'
  
  // Computed metrics
  pendingValue: number
  approvedValue: number
  totalValue: number
  pendingCount: number
  approvedCount: number
  totalCount: number
  
  // Actions
  refetch: (forceRefresh?: boolean) => Promise<void>
  approveEstimate: (estimateId: string) => Promise<void>
  rejectEstimate: (estimateId: string) => Promise<void>
  updateEstimate: (id: string, updates: Partial<Estimate>) => void
  
  // UI Actions
  setSearchTerm: (term: string) => void
  setStatusFilter: (status: string) => void
  setServiceFilter: (service: string) => void
  setViewMode: (mode: 'cards' | 'table') => void
  selectEstimate: (estimate: Estimate | null) => void
}

/**
 * Enhanced custom hook for managing estimates with performance optimizations
 * 
 * @param options - Configuration options for the hook
 * @returns Object containing estimates data, loading state, and operations
 */
export function useEstimates(options: UseEstimatesOptions = {}): UseEstimatesReturn {
  const { 
    autoFetch = true, 
    refetchInterval,
    enableCaching = true
  } = options

  // Core data state
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  
  // UI state
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("pending_approval")
  const [serviceFilter, setServiceFilter] = useState("all")
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  
  // Refs for debouncing and cleanup
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const requestIdRef = useRef<number>(0)
  
  const supabase = createClient()
  
  // Cache management
  const getCacheKey = useCallback(() => {
    const filterString = JSON.stringify({ statusFilter, serviceFilter })
    return `estimates_cache_${filterString}`
  }, [statusFilter, serviceFilter])
  
  const getFromCache = useCallback((): EstimatesCache | null => {
    if (!enableCaching) return null
    
    try {
      const cached = localStorage.getItem(getCacheKey())
      if (!cached) return null
      
      const parsedCache: EstimatesCache = JSON.parse(cached)
      const isExpired = Date.now() - parsedCache.timestamp > CACHE_DURATION
      
      if (isExpired) {
        localStorage.removeItem(getCacheKey())
        return null
      }
      
      return parsedCache
    } catch {
      return null
    }
  }, [getCacheKey, enableCaching])
  
  const setCache = useCallback((data: Estimate[]) => {
    if (!enableCaching) return
    
    try {
      const cache: EstimatesCache = {
        data,
        timestamp: Date.now(),
        filters: { statusFilter, serviceFilter }
      }
      localStorage.setItem(getCacheKey(), JSON.stringify(cache))
    } catch (error) {
      console.warn('Failed to cache estimates data:', error)
    }
  }, [getCacheKey, statusFilter, serviceFilter, enableCaching])

  /**
   * Load user profile
   */
  const loadUser = useCallback(async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()
        
        if (profile) {
          setUser(profile)
        }
      }
    } catch (error) {
      console.error('Error loading user:', error)
    }
  }, [supabase])

  /**
   * Enhanced fetchEstimates with caching and request deduplication
   */
  const fetchEstimates = useCallback(async (forceRefresh = false) => {
    // Generate unique request ID for deduplication
    const currentRequestId = ++requestIdRef.current
    
    try {
      setLoading(true)
      setError(null)
      
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = getFromCache()
        if (cached) {
          console.log('✅ Using cached estimates data')
          setEstimates(cached.data)
          setLastRefresh(new Date())
          setLoading(false)
          return
        }
      }
      
      console.log('🔄 Fetching estimates from API...')
      console.log('🔍 Current filters:', { statusFilter, serviceFilter })
      
      // Debounce rapid requests
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      
      await new Promise(resolve => {
        debounceRef.current = setTimeout(resolve, REQUEST_DEBOUNCE)
      })
      
      // Check if this request is still current
      if (currentRequestId !== requestIdRef.current) {
        console.log('🔄 Request superseded, cancelling...')
        return
      }
      
      // Use business service layer instead of direct API calls
      const result = await estimatesService.getEstimates({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        serviceType: serviceFilter !== 'all' ? serviceFilter : undefined
      })
      
      // Double-check request is still current before updating state
      if (currentRequestId !== requestIdRef.current) {
        console.log('🔄 Request completed but superseded')
        return
      }

      if (result.success) {
        setEstimates(result.data?.estimates || [])
        setLastRefresh(new Date())
        setCache(result.data?.estimates || [])
        console.log('✅ Successfully loaded', (result.data?.estimates || []).length, 'estimates')
        console.log('🔍 Status breakdown:', {
          pending: result.data?.estimates?.filter(e => e.status === 'pending_approval').length || 0,
          approved: result.data?.estimates?.filter(e => e.status === 'approved').length || 0,
          rejected: result.data?.estimates?.filter(e => e.status === 'rejected').length || 0,
          draft: result.data?.estimates?.filter(e => e.status === 'draft').length || 0
        })
      } else {
        throw new Error(result.error || 'Failed to fetch estimates')
      }
    } catch (err) {
      // Only update error state if this is still the current request
      if (currentRequestId === requestIdRef.current) {
        console.error('❌ Error fetching estimates:', err)
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
        setError(errorMessage)
        toast.error('Failed to load estimates')
      }
    } finally {
      // Only update loading state if this is still the current request
      if (currentRequestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [getFromCache, setCache, statusFilter, serviceFilter])
  
  // Computed filtered estimates with memoization
  const filteredEstimates = useMemo(() => {
    if (!estimates.length) return []
    
    return estimates.filter(estimate => {
      // Search term filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const matchesSearch = 
          estimate.jobs.job_name.toLowerCase().includes(searchLower) ||
          estimate.jobs.lead?.name?.toLowerCase().includes(searchLower) ||
          estimate.created_by_user.full_name.toLowerCase().includes(searchLower) ||
          estimate.estimate_number.toLowerCase().includes(searchLower)
        
        if (!matchesSearch) return false
      }
      
      return true
    })
  }, [estimates, searchTerm])
  
  // Computed metrics with memoization
  const { pendingValue, approvedValue, totalValue, pendingCount, approvedCount, totalCount } = useMemo(() => {
    const pending = estimates.filter(est => est.status === 'pending_approval')
    const approved = estimates.filter(est => est.status === 'approved')
    
    return {
      pendingValue: pending.reduce((sum, est) => sum + (est.total_amount || est.subtotal || 0), 0),
      approvedValue: approved.reduce((sum, est) => sum + (est.total_amount || est.subtotal || 0), 0),
      totalValue: estimates.reduce((sum, est) => sum + (est.total_amount || est.subtotal || 0), 0),
      pendingCount: pending.length,
      approvedCount: approved.length,
      totalCount: estimates.length
    }
  }, [estimates])
  
  /**
   * Approve an estimate using business service
   */
  const approveEstimate = useCallback(async (estimateId: string) => {
    try {
      const result = await estimatesService.approveEstimate(estimateId)
      
      if (result.success) {
        toast.success('Estimate approved successfully')
        // Update local state
        setEstimates(prev => prev.map(est => 
          est.id === estimateId ? { ...est, status: 'approved' as const } : est
        ))
        // Invalidate cache
        if (enableCaching) {
          localStorage.removeItem(getCacheKey())
        }
      } else {
        toast.error(result.error || 'Failed to approve estimate')
      }
    } catch (error) {
      console.error('Error approving estimate:', error)
      toast.error('Failed to approve estimate')
    }
  }, [getCacheKey, enableCaching])

  /**
   * Reject an estimate using business service
   */
  const rejectEstimate = useCallback(async (estimateId: string) => {
    try {
      const result = await estimatesService.rejectEstimate(estimateId)
      
      if (result.success) {
        toast.success('Estimate rejected')
        // Update local state
        setEstimates(prev => prev.map(est => 
          est.id === estimateId ? { ...est, status: 'rejected' as const } : est
        ))
        // Invalidate cache
        if (enableCaching) {
          localStorage.removeItem(getCacheKey())
        }
      } else {
        toast.error(result.error || 'Failed to reject estimate')
      }
    } catch (error) {
      console.error('Error rejecting estimate:', error)
      toast.error('Failed to reject estimate')
    }
  }, [getCacheKey, enableCaching])
  
  /**
   * Updates an estimate with partial data
   */
  const updateEstimate = useCallback((id: string, updates: Partial<Estimate>) => {
    setEstimates(prev => prev.map(estimate => 
      estimate.id === id ? { ...estimate, ...updates } : estimate
    ))
    setSelectedEstimate(prev => prev?.id === id ? { ...prev, ...updates } : prev)
    
    // Invalidate cache
    if (enableCaching) {
      localStorage.removeItem(getCacheKey())
    }
  }, [getCacheKey, enableCaching])
  
  // Selection actions
  const selectEstimate = useCallback((estimate: Estimate | null) => {
    setSelectedEstimate(estimate)
  }, [])
  
  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      loadUser()
      fetchEstimates()
    }
  }, [autoFetch, loadUser, fetchEstimates])

  // Re-fetch when filters change
  useEffect(() => {
    console.log('🔍 useEstimates: Filter changed, re-fetching...', { statusFilter, serviceFilter })
    if (autoFetch) {
      fetchEstimates(true) // Force refresh when filters change
    }
  }, [statusFilter, serviceFilter, autoFetch, fetchEstimates])

  // Set up refetch interval with proper cleanup
  useEffect(() => {
    if (refetchInterval && refetchInterval > 0) {
      const interval = setInterval(() => fetchEstimates(), refetchInterval)
      return () => clearInterval(interval)
    }
  }, [fetchEstimates, refetchInterval])
  
  // Listen for estimate updates from other parts of the app
  useEffect(() => {
    const handleEstimateUpdate = (event: CustomEvent) => {
      console.log('🔄 Estimate updated from jobs page, refreshing estimate approvals...', event.detail)
      fetchEstimates(true)
    }
    
    window.addEventListener('estimateUpdated', handleEstimateUpdate as EventListener)
    
    return () => {
      window.removeEventListener('estimateUpdated', handleEstimateUpdate as EventListener)
    }
  }, [fetchEstimates])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return {
    // Data
    estimates,
    filteredEstimates,
    selectedEstimate,
    user,
    
    // State
    loading,
    error,
    lastRefresh,
    
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
    
    // Actions
    refetch: fetchEstimates,
    approveEstimate,
    rejectEstimate,
    updateEstimate,
    
    // UI Actions
    setSearchTerm,
    setStatusFilter,
    setServiceFilter,
    setViewMode,
    selectEstimate
  }
}