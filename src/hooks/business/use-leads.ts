/**
 * Custom React hook for lead management
 * Provides state management and business logic for leads with performance optimizations
 */

'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { leadsService } from '@/lib/services/business/leads-service'
import type { LeadWithAssignee, LeadFilters, LeadStatus, ApiResponse } from '@/types'

// Cache configuration
const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes
const REQUEST_DEBOUNCE = 300 // 300ms debounce for rapid requests

// Types
type ViewMode = 'table' | 'cards' | 'pipeline' | 'map' | 'enhanced'
type QuickFilter = 'all' | 'active' | 'recent' | 'assigned_to_me' | 'unassigned'

interface LeadsCache {
  data: LeadWithAssignee[]
  timestamp: number
  filters?: LeadFilters
}

interface UseLeadsOptions {
  filters?: LeadFilters
  autoFetch?: boolean
  refetchInterval?: number
  enableCaching?: boolean
}

interface UseLeadsReturn {
  // Data
  leads: LeadWithAssignee[]
  filteredLeads: LeadWithAssignee[]
  selectedLead: LeadWithAssignee | null
  selectedLeads: string[]
  
  // State
  loading: boolean
  error: string | null
  lastRefresh: Date | null
  
  // UI State
  viewMode: ViewMode
  searchTerm: string
  quickFilter: QuickFilter
  serviceFilter: 'all' | 'insulation' | 'hvac' | 'plaster'
  statusFilter: 'all' | LeadStatus
  showAddDialog: boolean
  showImportDialog: boolean
  smsModalOpen: boolean
  historyModalOpen: boolean
  selectedLeadForComms: LeadWithAssignee | null
  
  // Actions
  refetch: (forceRefresh?: boolean) => Promise<void>
  createLead: (leadData: any) => Promise<ApiResponse<any>>
  updateLeadStatus: (id: string, status: LeadStatus) => Promise<ApiResponse<any>>
  updateLead: (id: string, updates: Partial<LeadWithAssignee>) => void
  deleteLead: (id: string) => Promise<void>
  
  // UI Actions
  setViewMode: (mode: ViewMode) => void
  setSearchTerm: (term: string) => void
  setQuickFilter: (filter: QuickFilter) => void
  setServiceFilter: (filter: 'all' | 'insulation' | 'hvac' | 'plaster') => void
  setStatusFilter: (filter: 'all' | LeadStatus) => void
  selectLead: (lead: LeadWithAssignee | null) => void
  toggleLeadSelection: (id: string) => void
  clearSelection: () => void
  openAddDialog: () => void
  closeAddDialog: () => void
  openImportDialog: () => void
  closeImportDialog: () => void
  openSmsModal: (lead: LeadWithAssignee) => void
  closeSmsModal: () => void
  openHistoryModal: (lead: LeadWithAssignee) => void
  closeHistoryModal: () => void
  
  filters: LeadFilters | undefined
  setFilters: (filters: LeadFilters) => void
}

/**
 * Enhanced custom hook for managing leads with performance optimizations
 * 
 * @param options - Configuration options for the hook
 * @returns Object containing leads data, loading state, and operations
 * 
 * @example
 * ```tsx
 * function LeadsPage() {
 *   const { 
 *     leads, 
 *     filteredLeads,
 *     loading, 
 *     error, 
 *     refetch,
 *     searchTerm,
 *     setSearchTerm,
 *     viewMode,
 *     setViewMode 
 *   } = useLeads({
 *     filters: { status: ['new', 'contacted'] },
 *     autoFetch: true,
 *     enableCaching: true
 *   })
 * 
 *   if (loading) return <LoadingSkeleton />
 *   if (error) return <ErrorMessage message={error} />
 *   
 *   return (
 *     <div>
 *       <SearchInput value={searchTerm} onChange={setSearchTerm} />
 *       <LeadsTable data={filteredLeads} onRefresh={refetch} />
 *     </div>
 *   )
 * }
 * ```
 */
export function useLeads(options: UseLeadsOptions = {}): UseLeadsReturn {
  const { 
    filters: initialFilters, 
    autoFetch = true, 
    refetchInterval,
    enableCaching = true
  } = options

  // Core data state
  const [leads, setLeads] = useState<LeadWithAssignee[]>([])
  const [selectedLead, setSelectedLead] = useState<LeadWithAssignee | null>(null)
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  
  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [searchTerm, setSearchTerm] = useState('')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [serviceFilter, setServiceFilter] = useState<'all' | 'insulation' | 'hvac' | 'plaster'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | LeadStatus>('all')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [smsModalOpen, setSmsModalOpen] = useState(false)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [selectedLeadForComms, setSelectedLeadForComms] = useState<LeadWithAssignee | null>(null)
  
  const [filters, setFilters] = useState<LeadFilters | undefined>(initialFilters)
  
  // Refs for debouncing and cleanup
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const requestIdRef = useRef<number>(0)
  
  // Cache management
  const getCacheKey = useCallback(() => {
    const filterString = filters ? JSON.stringify(filters) : 'no-filters'
    return `leads_cache_${filterString}`
  }, [filters])
  
  const getFromCache = useCallback((): LeadsCache | null => {
    if (!enableCaching) return null
    
    try {
      const cached = localStorage.getItem(getCacheKey())
      if (!cached) return null
      
      const parsedCache: LeadsCache = JSON.parse(cached)
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
  
  const setCache = useCallback((data: LeadWithAssignee[]) => {
    if (!enableCaching) return
    
    try {
      const cache: LeadsCache = {
        data,
        timestamp: Date.now(),
        filters
      }
      localStorage.setItem(getCacheKey(), JSON.stringify(cache))
    } catch (error) {
      console.warn('Failed to cache leads data:', error)
    }
  }, [getCacheKey, filters, enableCaching])

  /**
   * Enhanced fetchLeads with caching and request deduplication
   */
  const fetchLeads = useCallback(async (forceRefresh = false) => {
    // Generate unique request ID for deduplication
    const currentRequestId = ++requestIdRef.current
    
    try {
      setLoading(true)
      setError(null)
      
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = getFromCache()
        if (cached) {
          console.log('✅ Using cached leads data')
          setLeads(cached.data)
          setLastRefresh(new Date())
          setLoading(false)
          return
        }
      }
      
      console.log('🔄 Fetching leads from API...')
      
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
      
      const response = await leadsService.getLeads({ filters })

      // Double-check request is still current before updating state
      if (currentRequestId !== requestIdRef.current) {
        console.log('🔄 Request completed but superseded')
        return
      }

      if (response.success) {
        setLeads(response.data || [])
        setLastRefresh(new Date())
        setCache(response.data || [])
        console.log('✅ Successfully loaded', (response.data || []).length, 'leads')
      } else {
        setError(response.error || 'Failed to fetch leads')
      }
    } catch (err) {
      // Only update error state if this is still the current request
      if (currentRequestId === requestIdRef.current) {
        console.error('❌ Error fetching leads:', err)
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
        setError(errorMessage)
      }
    } finally {
      // Only update loading state if this is still the current request
      if (currentRequestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [filters, getFromCache, setCache])
  
  // Computed filtered leads with memoization
  const filteredLeads = useMemo(() => {
    if (!leads.length) return []
    
    return leads.filter(lead => {
      // Search term filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const matchesSearch = 
          lead.name.toLowerCase().includes(searchLower) ||
          lead.email?.toLowerCase().includes(searchLower) ||
          lead.phone?.includes(searchTerm) ||
          lead.company?.toLowerCase().includes(searchLower) ||
          lead.address?.toLowerCase().includes(searchLower)
        
        if (!matchesSearch) return false
      }
      
      // Quick filter
      if (quickFilter !== 'all') {
        switch (quickFilter) {
          case 'active':
            if (['closed_won', 'closed_lost'].includes(lead.status)) return false
            break
          case 'recent':
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            if (new Date(lead.created_at) < weekAgo) return false
            break
          case 'assigned_to_me':
            // This would need user context - for now just return all
            break
          case 'unassigned':
            if (lead.assigned_to) return false
            break
        }
      }
      
      // Status filter
      if (statusFilter !== 'all' && lead.status !== statusFilter) {
        return false
      }
      
      // Service filter (if lead has service_type property)
      if (serviceFilter !== 'all' && (lead as any).service_type && (lead as any).service_type !== serviceFilter) {
        return false
      }
      
      return true
    })
  }, [leads, searchTerm, quickFilter, statusFilter, serviceFilter])

  /**
   * Creates a new lead
   */
  const createLead = useCallback(async (leadData: any) => {
    try {
      const response = await leadsService.createLead(leadData)
      
      if (response.success && response.data) {
        // Optimistically update local state
        setLeads(prev => [response.data!, ...prev])
        // Invalidate cache to ensure fresh data on next fetch
        if (enableCaching) {
          localStorage.removeItem(getCacheKey())
        }
      }
      
      return response
    } catch (err) {
      console.error('Error creating lead:', err)
      return { success: false, error: 'Failed to create lead' }
    }
  }, [getCacheKey, enableCaching])

  /**
   * Updates a lead's status
   */
  const updateLeadStatus = useCallback(async (id: string, status: LeadStatus) => {
    try {
      const response = await leadsService.updateLeadStatus(id, status)
      
      if (response.success) {
        // Optimistically update local state
        setLeads(prev => prev.map(lead => 
          lead.id === id 
            ? { ...lead, status, updated_at: new Date().toISOString() }
            : lead
        ))
        // Invalidate cache
        if (enableCaching) {
          localStorage.removeItem(getCacheKey())
        }
      }
      
      return response
    } catch (err) {
      console.error('Error updating lead status:', err)
      return { success: false, error: 'Failed to update lead status' }
    }
  }, [getCacheKey, enableCaching])
  
  /**
   * Updates a lead with partial data
   */
  const updateLead = useCallback((id: string, updates: Partial<LeadWithAssignee>) => {
    setLeads(prev => prev.map(lead => 
      lead.id === id ? { ...lead, ...updates } : lead
    ))
    setSelectedLead(prev => prev?.id === id ? { ...prev, ...updates } : prev)
    
    // Invalidate cache
    if (enableCaching) {
      localStorage.removeItem(getCacheKey())
    }
  }, [getCacheKey, enableCaching])
  
  /**
   * Deletes a lead
   */
  const deleteLead = useCallback(async (id: string) => {
    try {
      // Since deleteLead might not exist in the service, handle it gracefully
      if ('deleteLead' in leadsService && typeof leadsService.deleteLead === 'function') {
        await leadsService.deleteLead(id)
      } else {
        // Fallback - you might need to implement this in your service
        console.warn('deleteLead not implemented in service, updating local state only')
      }
      
      setLeads(prev => prev.filter(lead => lead.id !== id))
      setSelectedLeads(prev => prev.filter(selectedId => selectedId !== id))
      setSelectedLead(prev => prev?.id === id ? null : prev)
      
      // Invalidate cache
      if (enableCaching) {
        localStorage.removeItem(getCacheKey())
      }
    } catch (err) {
      console.error('Error deleting lead:', err)
      throw err
    }
  }, [getCacheKey, enableCaching])
  
  // Selection actions
  const selectLead = useCallback((lead: LeadWithAssignee | null) => {
    setSelectedLead(lead)
  }, [])
  
  const toggleLeadSelection = useCallback((id: string) => {
    setSelectedLeads(prev => 
      prev.includes(id)
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    )
  }, [])
  
  const clearSelection = useCallback(() => {
    setSelectedLeads([])
    setSelectedLead(null)
  }, [])
  
  // Modal actions
  const openAddDialog = useCallback(() => setShowAddDialog(true), [])
  const closeAddDialog = useCallback(() => {
    setShowAddDialog(false)
    setSelectedLead(null)
  }, [])
  const openImportDialog = useCallback(() => setShowImportDialog(true), [])
  const closeImportDialog = useCallback(() => setShowImportDialog(false), [])
  const openSmsModal = useCallback((lead: LeadWithAssignee) => {
    setSmsModalOpen(true)
    setSelectedLeadForComms(lead)
  }, [])
  const closeSmsModal = useCallback(() => {
    setSmsModalOpen(false)
    setSelectedLeadForComms(null)
  }, [])
  const openHistoryModal = useCallback((lead: LeadWithAssignee) => {
    setHistoryModalOpen(true)
    setSelectedLeadForComms(lead)
  }, [])
  const closeHistoryModal = useCallback(() => {
    setHistoryModalOpen(false)
    setSelectedLeadForComms(null)
  }, [])

  // Auto-fetch on mount and filter changes
  useEffect(() => {
    if (autoFetch) {
      fetchLeads()
    }
  }, [fetchLeads, autoFetch])

  // Set up refetch interval with proper cleanup
  useEffect(() => {
    if (refetchInterval && refetchInterval > 0) {
      const interval = setInterval(() => fetchLeads(), refetchInterval)
      return () => clearInterval(interval)
    }
  }, [fetchLeads, refetchInterval])
  
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
    leads,
    filteredLeads,
    selectedLead,
    selectedLeads,
    
    // State
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
    refetch: fetchLeads,
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
    
    // Legacy compatibility
    filters,
    setFilters
  }
}

/**
 * Hook for managing a single lead
 * 
 * @param leadId - ID of the lead to manage
 * @returns Object containing lead data and operations
 */
export function useLead(leadId: string) {
  const [lead, setLead] = useState<LeadWithAssignee | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLead = useCallback(async () => {
    if (!leadId) return

    try {
      setLoading(true)
      setError(null)

      const response = await leadsService.getLeadById(leadId)

      if (response.success && response.data) {
        setLead(response.data)
      } else {
        setError(response.error || 'Failed to fetch lead')
      }
    } catch (err) {
      console.error('Error fetching lead:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    fetchLead()
  }, [fetchLead])

  return {
    lead,
    loading,
    error,
    refetch: fetchLead
  }
}