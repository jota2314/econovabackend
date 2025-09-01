/**
 * Custom React hook for lead management
 * Provides state management and business logic for leads
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { leadsService } from '@/lib/services/business/leads-service'
import type { LeadWithAssignee, LeadFilters, LeadStatus, ApiResponse } from '@/types'

interface UseLeadsOptions {
  filters?: LeadFilters
  autoFetch?: boolean
  refetchInterval?: number
}

interface UseLeadsReturn {
  leads: LeadWithAssignee[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  createLead: (leadData: any) => Promise<ApiResponse<any>>
  updateLeadStatus: (id: string, status: LeadStatus) => Promise<ApiResponse<any>>
  filters: LeadFilters | undefined
  setFilters: (filters: LeadFilters) => void
}

/**
 * Custom hook for managing leads data and operations
 * 
 * @param options - Configuration options for the hook
 * @returns Object containing leads data, loading state, and operations
 * 
 * @example
 * ```tsx
 * function LeadsPage() {
 *   const { leads, loading, error, refetch } = useLeads({
 *     filters: { status: ['new', 'contacted'] },
 *     autoFetch: true
 *   })
 * 
 *   if (loading) return <LoadingSkeleton />
 *   if (error) return <ErrorMessage message={error} />
 *   
 *   return <LeadsTable data={leads} onRefresh={refetch} />
 * }
 * ```
 */
export function useLeads(options: UseLeadsOptions = {}): UseLeadsReturn {
  const { 
    filters: initialFilters, 
    autoFetch = true, 
    refetchInterval 
  } = options

  const [leads, setLeads] = useState<LeadWithAssignee[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<LeadFilters | undefined>(initialFilters)

  /**
   * Fetches leads from the service
   */
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await leadsService.getLeads({
        filters
      })

      if (response.success) {
        setLeads(response.data)
      } else {
        setError(response.error || 'Failed to fetch leads')
      }
    } catch (err) {
      console.error('Error fetching leads:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }, [filters])

  /**
   * Creates a new lead
   */
  const createLead = useCallback(async (leadData: any) => {
    try {
      const response = await leadsService.createLead(leadData)
      
      if (response.success) {
        // Optimistically update local state
        setLeads(prev => [response.data, ...prev])
      }
      
      return response
    } catch (err) {
      console.error('Error creating lead:', err)
      return { success: false, error: 'Failed to create lead' }
    }
  }, [])

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
      }
      
      return response
    } catch (err) {
      console.error('Error updating lead status:', err)
      return { success: false, error: 'Failed to update lead status' }
    }
  }, [])

  // Auto-fetch on mount and filter changes
  useEffect(() => {
    if (autoFetch) {
      fetchLeads()
    }
  }, [fetchLeads, autoFetch])

  // Set up refetch interval
  useEffect(() => {
    if (refetchInterval && refetchInterval > 0) {
      const interval = setInterval(fetchLeads, refetchInterval)
      return () => clearInterval(interval)
    }
  }, [fetchLeads, refetchInterval])

  return {
    leads,
    loading,
    error,
    refetch: fetchLeads,
    createLead,
    updateLeadStatus,
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

      if (response.success) {
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