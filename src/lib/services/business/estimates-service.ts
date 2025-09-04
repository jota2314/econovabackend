/**
 * Estimates Business Service
 * Provides standardized API response format and error handling for estimates operations
 * Following the established business service layer pattern
 */

import { createClient } from '@/lib/supabase/client'
import type { ApiResponse } from '@/types/api/responses'

export interface EstimateDetail {
  id: string
  estimate_number: string
  subtotal: number
  total_amount: number
  status: string
  created_at: string
  markup_percentage: number
  jobs: {
    id: string
    job_name: string
    service_type: string
    total_square_feet?: number
    lead: {
      id: string
      name: string
      email: string
      phone: string
      address: string
      city: string
      state: string
    }
  }
  created_by_user: {
    id: string
    full_name: string
    email: string
  }
  estimate_line_items: {
    id: string
    description: string
    quantity: number
    unit_price: number
    line_total: number
    unit?: string
    service_type: string
  }[]
}

export interface EstimateListItem {
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

export interface EstimatesListResponse {
  estimates: EstimateListItem[]
  total: number
  page: number
  limit: number
}

class EstimatesService {
  private supabase = createClient()

  /**
   * Get a specific estimate by ID with all related data
   */
  async getEstimate(estimateId: string): Promise<ApiResponse<EstimateDetail>> {
    try {
      console.log('🔍 EstimatesService: Getting estimate', estimateId)

      // Get authenticated user first
      const { data: { user }, error: authError } = await this.supabase.auth.getUser()
      
      if (authError || !user) {
        return {
          success: false,
          error: 'Authentication required',
          data: null
        }
      }

      // Single optimized query with all related data
      const { data: estimate, error } = await this.supabase
        .from('estimates')
        .select(`
          *,
          jobs!inner (
            id,
            job_name,
            service_type,
            total_square_feet,
            lead:leads!lead_id (
              id,
              name,
              email,
              phone,
              address,
              city,
              state
            )
          ),
          created_by_user:users!estimates_created_by_fkey (
            id,
            full_name,
            email
          ),
          estimate_line_items (
            id,
            description,
            quantity,
            unit_price,
            line_total,
            unit,
            service_type
          )
        `)
        .eq('id', estimateId)
        .single()

      if (error) {
        console.error('❌ EstimatesService: Database error:', error)
        return {
          success: false,
          error: error.code === 'PGRST116' ? 'Estimate not found' : 'Failed to load estimate',
          data: null
        }
      }

      if (!estimate) {
        return {
          success: false,
          error: 'Estimate not found',
          data: null
        }
      }

      console.log('✅ EstimatesService: Successfully loaded estimate')
      return {
        success: true,
        data: estimate as EstimateDetail,
        error: null
      }
    } catch (error) {
      console.error('❌ EstimatesService: Unexpected error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        data: null
      }
    }
  }

  /**
   * Get all estimates with filtering options
   */
  async getEstimates(options: {
    status?: string
    serviceType?: string
    page?: number
    limit?: number
  } = {}): Promise<ApiResponse<EstimatesListResponse>> {
    try {
      console.log('🔍 EstimatesService: Getting estimates list', options)

      // Get authenticated user first
      const { data: { user }, error: authError } = await this.supabase.auth.getUser()
      
      if (authError || !user) {
        return {
          success: false,
          error: 'Authentication required',
          data: null
        }
      }

      // Build query with filters
      let query = this.supabase
        .from('estimates')
        .select(`
          id,
          estimate_number,
          status,
          total_amount,
          subtotal,
          created_at,
          jobs!inner (
            id,
            job_name,
            service_type,
            lead:leads!lead_id (
              id,
              name,
              email,
              phone,
              address,
              city,
              state
            )
          ),
          created_by_user:users!estimates_created_by_fkey (
            id,
            full_name,
            email
          )
        `, { count: 'exact' })

      // Apply filters
      if (options.status && options.status !== 'all') {
        console.log('🔍 EstimatesService: Applying status filter:', options.status)
        query = query.eq('status', options.status)
      }

      if (options.serviceType && options.serviceType !== 'all') {
        console.log('🔍 EstimatesService: Applying service type filter:', options.serviceType)
        query = query.eq('jobs.service_type', options.serviceType)
      }

      // Apply pagination
      const page = options.page || 1
      const limit = options.limit || 50
      const offset = (page - 1) * limit

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      const { data: estimates, error, count } = await query

      if (error) {
        console.error('❌ EstimatesService: Database error:', error)
        return {
          success: false,
          error: 'Failed to load estimates',
          data: null
        }
      }

      console.log('✅ EstimatesService: Successfully loaded', estimates?.length || 0, 'estimates')
      return {
        success: true,
        data: {
          estimates: estimates as EstimateListItem[] || [],
          total: count || 0,
          page,
          limit
        },
        error: null
      }
    } catch (error) {
      console.error('❌ EstimatesService: Unexpected error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        data: null
      }
    }
  }

  /**
   * Approve an estimate (manager only)
   */
  async approveEstimate(estimateId: string): Promise<ApiResponse<{ message: string }>> {
    try {
      console.log('🔍 EstimatesService: Approving estimate', estimateId)

      // Get authenticated user and check role
      const { data: { user }, error: authError } = await this.supabase.auth.getUser()
      
      if (authError || !user) {
        return {
          success: false,
          error: 'Authentication required',
          data: null
        }
      }

      // Get user role
      const { data: userProfile } = await this.supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (userProfile?.role !== 'manager') {
        return {
          success: false,
          error: 'Only managers can approve estimates',
          data: null
        }
      }

      // Get estimate with job details first
      const { data: estimate, error: estimateError } = await this.supabase
        .from('estimates')
        .select(`
          *,
          jobs!inner (
            id,
            job_name,
            service_type
          )
        `)
        .eq('id', estimateId)
        .single()

      if (estimateError || !estimate) {
        return {
          success: false,
          error: 'Estimate not found',
          data: null
        }
      }

      // Update estimate status
      const { error: updateError } = await this.supabase
        .from('estimates')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.id
        })
        .eq('id', estimateId)

      if (updateError) {
        console.error('❌ EstimatesService: Failed to approve estimate:', updateError)
        return {
          success: false,
          error: 'Failed to approve estimate',
          data: null
        }
      }

      // Update job workflow status to allow workflow progression
      const { error: jobUpdateError } = await this.supabase
        .from('jobs')
        .update({
          workflow_status: 'send_to_customer'
        })
        .eq('id', estimate.jobs.id)

      if (jobUpdateError) {
        console.warn('⚠️ EstimatesService: Failed to update job workflow status:', jobUpdateError)
      }

      console.log('✅ EstimatesService: Successfully approved estimate')
      return {
        success: true,
        data: { message: 'Estimate approved successfully' },
        error: null
      }
    } catch (error) {
      console.error('❌ EstimatesService: Unexpected error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        data: null
      }
    }
  }

  /**
   * Reject an estimate (manager only)
   */
  async rejectEstimate(estimateId: string): Promise<ApiResponse<{ message: string }>> {
    try {
      console.log('🔍 EstimatesService: Rejecting estimate', estimateId)

      // Get authenticated user and check role
      const { data: { user }, error: authError } = await this.supabase.auth.getUser()
      
      if (authError || !user) {
        return {
          success: false,
          error: 'Authentication required',
          data: null
        }
      }

      // Get user role
      const { data: userProfile } = await this.supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (userProfile?.role !== 'manager') {
        return {
          success: false,
          error: 'Only managers can reject estimates',
          data: null
        }
      }

      // Update estimate status
      const { error: updateError } = await this.supabase
        .from('estimates')
        .update({ 
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejected_by: user.id
        })
        .eq('id', estimateId)

      if (updateError) {
        console.error('❌ EstimatesService: Failed to reject estimate:', updateError)
        return {
          success: false,
          error: 'Failed to reject estimate',
          data: null
        }
      }

      console.log('✅ EstimatesService: Successfully rejected estimate')
      return {
        success: true,
        data: { message: 'Estimate rejected successfully' },
        error: null
      }
    } catch (error) {
      console.error('❌ EstimatesService: Unexpected error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        data: null
      }
    }
  }
}

// Export a singleton instance
export const estimatesService = new EstimatesService()
export default estimatesService