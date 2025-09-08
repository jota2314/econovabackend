/**
 * Enhanced custom React hook for jobs management
 * Provides state management and business logic for jobs with performance optimizations
 */

'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { leadsService } from '@/lib/services/business/leads-service'
import { Lead, Job as DatabaseJob } from '@/lib/types/database'
import { toast } from 'sonner'
import { logger } from '@/lib/services/logger'

// Cache configuration
const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes
const REQUEST_DEBOUNCE = 300 // 300ms debounce for rapid requests

// Types
type TradeType = 'all' | 'insulation' | 'hvac' | 'plaster'
type ViewMode = 'cards' | 'table'
type ColumnKey = 'jobName' | 'customer' | 'quoteAmount' | 'service' | 'type' | 'building' | 'estimate' | 'pdf' | 'squareFeet' | 'created' | 'workflow' | 'actions'

interface Job extends DatabaseJob {
  lead?: {
    name: string
    phone: string
    address?: string
  }
  estimates?: any[]
  measurements?: any[]
}

interface User {
  id: string
  full_name: string | null
  email: string
  role: string
}

interface JobsCache {
  data: Job[]
  timestamp: number
}

interface LeadsCache {
  data: Lead[]
  timestamp: number
}

interface UseJobsOptions {
  autoFetch?: boolean
  refetchInterval?: number
  enableCaching?: boolean
}

interface UseJobsReturn {
  // Data
  jobs: Job[]
  leads: Lead[]
  filteredJobs: Job[]
  selectedJob: Job | null
  user: User | null
  
  // State
  loading: boolean
  error: string | null
  lastRefresh: Date | null
  
  // UI State  
  searchTerm: string
  selectedLead: string
  selectedService: string
  activeTrade: TradeType
  showJobForm: boolean
  showMeasurementInterface: boolean
  viewMode: ViewMode
  visibleColumns: Record<ColumnKey, boolean>
  localWorkflowStatus: Record<string, string>
  
  // Actions
  refetch: (forceRefresh?: boolean) => Promise<void>
  refetchLeads: (forceRefresh?: boolean) => Promise<void>
  createJob: (jobData: any) => Promise<any>
  updateJob: (id: string, updates: Partial<Job>) => void
  deleteJob: (id: string) => Promise<void>
  
  // UI Actions
  setSearchTerm: (term: string) => void
  setSelectedLead: (leadId: string) => void
  setSelectedService: (service: string) => void
  setActiveTrade: (trade: TradeType) => void
  setShowJobForm: (show: boolean) => void
  setShowMeasurementInterface: (show: boolean) => void
  setViewMode: (mode: ViewMode) => void
  setVisibleColumns: (columns: Record<ColumnKey, boolean> | ((prev: Record<ColumnKey, boolean>) => Record<ColumnKey, boolean>)) => void
  setLocalWorkflowStatus: (status: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void
  selectJob: (job: Job | null) => void
}

const defaultColumns: Record<ColumnKey, boolean> = {
  jobName: true,
  customer: true,
  quoteAmount: true,
  service: true,
  type: false,
  building: false,
  estimate: true,
  pdf: true,
  squareFeet: false,
  created: false,
  workflow: true,
  actions: true
}

/**
 * Enhanced custom hook for managing jobs with performance optimizations
 * 
 * @param options - Configuration options for the hook
 * @returns Object containing jobs data, loading state, and operations
 */
export function useJobs(options: UseJobsOptions = {}): UseJobsReturn {
  const { 
    autoFetch = true, 
    refetchInterval,
    enableCaching = true
  } = options

  // Core data state
  const [jobs, setJobs] = useState<Job[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  
  // UI state
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedLead, setSelectedLead] = useState<string>("all")
  const [selectedService, setSelectedService] = useState<string>("all")
  const [activeTrade, setActiveTrade] = useState<TradeType>('all')
  const [showJobForm, setShowJobForm] = useState(false)
  const [showMeasurementInterface, setShowMeasurementInterface] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(defaultColumns)
  const [localWorkflowStatus, setLocalWorkflowStatus] = useState<Record<string, string>>({})
  
  // Refs for debouncing and cleanup
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const requestIdRef = useRef<number>(0)
  
  const supabase = createClient()
  
  // Cache management
  const getJobsCacheKey = useCallback(() => 'jobs_cache', [])
  const getLeadsCacheKey = useCallback(() => 'leads_cache', [])
  
  const getJobsFromCache = useCallback((): JobsCache | null => {
    if (!enableCaching) return null
    
    try {
      const cached = localStorage.getItem(getJobsCacheKey())
      if (!cached) return null
      
      const parsedCache: JobsCache = JSON.parse(cached)
      const isExpired = Date.now() - parsedCache.timestamp > CACHE_DURATION
      
      if (isExpired) {
        localStorage.removeItem(getJobsCacheKey())
        return null
      }
      
      return parsedCache
    } catch {
      return null
    }
  }, [getJobsCacheKey, enableCaching])
  
  const setJobsCache = useCallback((data: Job[]) => {
    if (!enableCaching) return
    
    try {
      const cache: JobsCache = {
        data,
        timestamp: Date.now()
      }
      localStorage.setItem(getJobsCacheKey(), JSON.stringify(cache))
    } catch (error) {
      logger.warn('Failed to cache jobs data', { error })
    }
  }, [getJobsCacheKey, enableCaching])
  
  const getLeadsFromCache = useCallback((): LeadsCache | null => {
    if (!enableCaching) return null
    
    try {
      const cached = localStorage.getItem(getLeadsCacheKey())
      if (!cached) return null
      
      const parsedCache: LeadsCache = JSON.parse(cached)
      const isExpired = Date.now() - parsedCache.timestamp > CACHE_DURATION
      
      if (isExpired) {
        localStorage.removeItem(getLeadsCacheKey())
        return null
      }
      
      return parsedCache
    } catch {
      return null
    }
  }, [getLeadsCacheKey, enableCaching])
  
  const setLeadsCache = useCallback((data: Lead[]) => {
    if (!enableCaching) return
    
    try {
      const cache: LeadsCache = {
        data,
        timestamp: Date.now()
      }
      localStorage.setItem(getLeadsCacheKey(), JSON.stringify(cache))
    } catch (error) {
      logger.warn('Failed to cache leads data', { error })
    }
  }, [getLeadsCacheKey, enableCaching])

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
      logger.error('Error loading user in useJobs hook', error)
    }
  }, [supabase])

  /**
   * Enhanced fetchJobs with caching and request deduplication
   */
  const fetchJobs = useCallback(async (forceRefresh = false) => {
    // Generate unique request ID for deduplication
    const currentRequestId = ++requestIdRef.current
    
    try {
      setLoading(true)
      setError(null)
      
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = getJobsFromCache()
        if (cached) {
          logger.debug('Using cached jobs data', { count: cached.data.length })
          setJobs(cached.data)
          setLastRefresh(new Date())
          setLoading(false)
          return
        }
      }
      
      logger.debug('Fetching jobs from API')
      
      // Debounce rapid requests
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      
      await new Promise(resolve => {
        debounceRef.current = setTimeout(resolve, REQUEST_DEBOUNCE)
      })
      
      // Check if this request is still current
      if (currentRequestId !== requestIdRef.current) {
        logger.debug('Request superseded, cancelling jobs fetch')
        return
      }
      
      const response = await fetch('/api/jobs')
      
      // Double-check request is still current before updating state
      if (currentRequestId !== requestIdRef.current) {
        logger.debug('Jobs fetch request completed but superseded')
        return
      }

      if (!response.ok) {
        throw new Error(`Failed to load jobs: ${response.status}`)
      }
      
      const result = await response.json()

      if (result.success) {
        setJobs(result.data || [])
        setLastRefresh(new Date())
        setJobsCache(result.data || [])
        logger.info('Successfully loaded jobs', { count: (result.data || []).length })
      } else {
        throw new Error(result.error || 'Failed to fetch jobs')
      }
    } catch (err) {
      // Only update error state if this is still the current request
      if (currentRequestId === requestIdRef.current) {
        logger.error('Error fetching jobs in useJobs hook', err)
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
        setError(errorMessage)
        toast.error('Failed to load jobs')
      }
    } finally {
      // Only update loading state if this is still the current request
      if (currentRequestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [getJobsFromCache, setJobsCache])
  
  /**
   * Enhanced fetchLeads with caching
   */
  const fetchLeads = useCallback(async (forceRefresh = false) => {
    try {
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = getLeadsFromCache()
        if (cached) {
          logger.debug('Using cached leads data', { count: cached.data.length })
          setLeads(cached.data)
          return
        }
      }
      
      logger.debug('Fetching leads from API')
      const result = await leadsService.getLeads()
      
      if (result.success && result.data) {
        setLeads(result.data)
        setLeadsCache(result.data)
        logger.info('Successfully loaded leads', { count: result.data.length })
      } else {
        logger.warn('Failed to load leads', { error: result.error })
        setLeads([])
      }
    } catch (err) {
      logger.error('Error fetching leads in useJobs hook', err)
    }
  }, [getLeadsFromCache, setLeadsCache])
  
  // Computed filtered jobs with memoization
  const filteredJobs = useMemo(() => {
    if (!jobs.length) return []
    
    return jobs.filter(job => {
      // Search term filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const matchesSearch = 
          job.job_name.toLowerCase().includes(searchLower) ||
          job.lead?.name?.toLowerCase().includes(searchLower) ||
          job.lead?.phone?.includes(searchTerm)
        
        if (!matchesSearch) return false
      }
      
      // Lead filter
      if (selectedLead !== 'all' && job.lead_id !== selectedLead) {
        return false
      }
      
      // Service filter
      if (selectedService !== 'all' && job.service_type !== selectedService) {
        return false
      }
      
      // Trade filter
      if (activeTrade !== 'all' && job.service_type !== activeTrade) {
        return false
      }
      
      return true
    })
  }, [jobs, searchTerm, selectedLead, selectedService, activeTrade])
  
  /**
   * Creates a new job
   */
  const createJob = useCallback(async (jobData: any) => {
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData)
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Optimistically update local state
        setJobs(prev => [result.data, ...prev])
        // Invalidate cache to ensure fresh data on next fetch
        if (enableCaching) {
          localStorage.removeItem(getJobsCacheKey())
        }
        toast.success('Job created successfully')
      }
      
      return result
    } catch (err) {
      logger.error('Error creating job in useJobs hook', err)
      toast.error('Failed to create job')
      return { success: false, error: 'Failed to create job' }
    }
  }, [getJobsCacheKey, enableCaching])
  
  /**
   * Updates a job with partial data
   */
  const updateJob = useCallback((id: string, updates: Partial<Job>) => {
    setJobs(prev => prev.map(job => 
      job.id === id ? { ...job, ...updates } : job
    ))
    setSelectedJob(prev => prev?.id === id ? { ...prev, ...updates } : prev)
    
    // Invalidate cache
    if (enableCaching) {
      localStorage.removeItem(getJobsCacheKey())
    }
  }, [getJobsCacheKey, enableCaching])
  
  /**
   * Deletes a job
   */
  const deleteJob = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/jobs/${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setJobs(prev => prev.filter(job => job.id !== id))
        setSelectedJob(prev => prev?.id === id ? null : prev)
        
        // Invalidate cache
        if (enableCaching) {
          localStorage.removeItem(getJobsCacheKey())
        }
        toast.success('Job deleted successfully')
      } else {
        throw new Error('Failed to delete job')
      }
    } catch (err) {
      logger.error('Error deleting job in useJobs hook', err, { jobId: id })
      toast.error('Failed to delete job')
      throw err
    }
  }, [getJobsCacheKey, enableCaching])
  
  // Selection actions
  const selectJob = useCallback((job: Job | null) => {
    setSelectedJob(job)
  }, [])
  
  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      loadUser()
      fetchJobs()
      fetchLeads()
    }
  }, [autoFetch, loadUser, fetchJobs, fetchLeads])

  // Set up refetch interval with proper cleanup
  useEffect(() => {
    if (refetchInterval && refetchInterval > 0) {
      const interval = setInterval(() => {
        fetchJobs()
        fetchLeads()
      }, refetchInterval)
      return () => clearInterval(interval)
    }
  }, [fetchJobs, fetchLeads, refetchInterval])
  
  // Listen for estimate updates
  useEffect(() => {
    const handleEstimateUpdate = (event: CustomEvent) => {
      logger.debug('Estimate updated event received, refreshing jobs data', { eventDetail: event.detail })
      fetchJobs(true) // Force refresh jobs to show updated estimate totals
    }
    
    window.addEventListener('estimateUpdated', handleEstimateUpdate as EventListener)
    
    return () => {
      window.removeEventListener('estimateUpdated', handleEstimateUpdate as EventListener)
    }
  }, [fetchJobs])
  
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
    jobs,
    leads,
    filteredJobs,
    selectedJob,
    user,
    
    // State
    loading,
    error,
    lastRefresh,
    
    // UI State
    searchTerm,
    selectedLead,
    selectedService,
    activeTrade,
    showJobForm,
    showMeasurementInterface,
    viewMode,
    visibleColumns,
    localWorkflowStatus,
    
    // Actions
    refetch: fetchJobs,
    refetchLeads: fetchLeads,
    createJob,
    updateJob,
    deleteJob,
    
    // UI Actions
    setSearchTerm,
    setSelectedLead,
    setSelectedService,
    setActiveTrade,
    setShowJobForm,
    setShowMeasurementInterface,
    setViewMode,
    setVisibleColumns,
    setLocalWorkflowStatus,
    selectJob
  }
}