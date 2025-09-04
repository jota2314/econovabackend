/**
 * Business-focused Leads Service
 * Handles lead management, status transitions, and business logic
 */

import { createClient } from '@/lib/supabase/client'
import { canTransitionTo, getWorkflowProgress } from '@/lib/business/workflows/lead-workflow'
import type { 
  Lead, 
  LeadStatus, 
  LeadWithAssignee, 
  LeadFilters, 
  LeadMetrics, 
  LeadImportResult,
  ApiResponse,
  TablesInsert, 
  TablesUpdate 
} from '@/types'

export class LeadsService {
  private supabase = createClient()

  /**
   * Gets leads with filtering and role-based access control
   */
  async getLeads(options?: {
    filters?: LeadFilters
    limit?: number
    offset?: number
  }): Promise<ApiResponse<LeadWithAssignee[]>> {
    try {
      console.log('🔄 Starting leads query...')
      
      // Get current user context
      const userContext = await this.getCurrentUserContext()
      
      // Build query with role-based filtering
      let query = this.supabase
        .from('leads')
        .select(`
          *,
          assigned_user:users!assigned_to(id, full_name, email)
        `)
        .order('created_at', { ascending: false })

      // Apply role-based access control
      query = this.applyRoleBasedFiltering(query, userContext)

      // Apply business filters
      if (options?.filters) {
        query = this.applyLeadFilters(query, options.filters)
      }

      // Apply pagination
      const limit = Math.min(options?.limit || 100, 1000) // Max 1000 for performance
      query = query.limit(limit)

      if (options?.offset) {
        query = query.range(options.offset, options.offset + limit - 1)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Supabase error:', error)
        return this.handleLeadsError(error)
      }

      console.log(`✅ Successfully fetched ${data?.length || 0} leads`)
      return {
        success: true,
        data: data || []
      }
    } catch (error) {
      console.error('💥 Error in getLeads:', error)
      return {
        success: false,
        error: 'Failed to fetch leads',
        data: []
      }
    }
  }

  /**
   * Gets detailed lead information by ID
   */
  async getLeadById(id: string): Promise<ApiResponse<LeadWithAssignee>> {
    try {
      const { data, error } = await this.supabase
        .from('leads')
        .select(`
          *,
          assigned_user:users!assigned_to(id, full_name, email),
          jobs(id, job_name, service_type, total_square_feet, job_status),
          communications(id, type, direction, status, created_at)
        `)
        .eq('id', id)
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Error fetching lead by ID:', error)
      return { success: false, error: 'Failed to fetch lead' }
    }
  }

  /**
   * Creates a new lead with business validation
   */
  async createLead(leadData: TablesInsert<'leads'>): Promise<ApiResponse<Lead>> {
    try {
      // Validate business rules
      const validation = await this.validateLeadData(leadData)
      if (!validation.valid) {
        return { success: false, error: validation.message }
      }

      // Auto-assign if not specified
      if (!leadData.assigned_to) {
        leadData.assigned_to = await this.getNextAvailableSalesperson()
      }

      const { data, error } = await this.supabase
        .from('leads')
        .insert({
          ...leadData,
          status: leadData.status || 'new'
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Error creating lead:', error)
      return { success: false, error: 'Failed to create lead' }
    }
  }

  /**
   * Updates lead status with workflow validation
   */
  async updateLeadStatus(
    id: string, 
    newStatus: LeadStatus,
    notes?: string
  ): Promise<ApiResponse<Lead>> {
    try {
      // Get current lead
      const { data: currentLead, error: fetchError } = await this.supabase
        .from('leads')
        .select('status')
        .eq('id', id)
        .single()

      if (fetchError) {
        return { success: false, error: fetchError.message }
      }

      // Validate status transition
      if (!canTransitionTo(currentLead.status, newStatus)) {
        return {
          success: false,
          error: `Invalid status transition from ${currentLead.status} to ${newStatus}`
        }
      }

      // Update the lead
      const updateData: TablesUpdate<'leads'> = {
        status: newStatus,
        updated_at: new Date().toISOString()
      }

      if (notes) {
        updateData.notes = notes
      }

      const { data, error } = await this.supabase
        .from('leads')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Error updating lead status:', error)
      return { success: false, error: 'Failed to update lead status' }
    }
  }

  /**
   * Updates a lead with partial data
   */
  async updateLead(id: string, updates: TablesUpdate<'leads'>): Promise<ApiResponse<Lead>> {
    try {
      const { data, error } = await this.supabase
        .from('leads')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Error updating lead:', error)
      return { success: false, error: 'Failed to update lead' }
    }
  }

  /**
   * Bulk import leads from CSV data
   */
  async importLeads(leadsData: TablesInsert<'leads'>[]): Promise<LeadImportResult> {
    const results: LeadImportResult = {
      success_count: 0,
      error_count: 0,
      errors: []
    }

    // Process in batches for better performance
    const batchSize = 50
    for (let i = 0; i < leadsData.length; i += batchSize) {
      const batch = leadsData.slice(i, i + batchSize)
      
      try {
        const { data, error } = await this.supabase
          .from('leads')
          .insert(batch)
          .select('id')

        if (error) {
          batch.forEach((_, index) => {
            results.error_count++
            results.errors.push({
              row: i + index + 1,
              field: 'general',
              message: error.message
            })
          })
        } else {
          results.success_count += data?.length || 0
        }
      } catch (error) {
        console.error(`Error importing batch ${i}:`, error)
        batch.forEach((_, index) => {
          results.error_count++
          results.errors.push({
            row: i + index + 1,
            field: 'general',
            message: 'Import failed'
          })
        })
      }
    }

    return results
  }

  /**
   * Gets lead metrics and analytics
   */
  async getLeadMetrics(filters?: LeadFilters): Promise<ApiResponse<LeadMetrics>> {
    try {
      const userContext = await this.getCurrentUserContext()
      
      let query = this.supabase
        .from('leads')
        .select('status, created_at, updated_at')

      // Apply role-based filtering
      if (userContext.role === 'salesperson' && userContext.userId) {
        query = query.eq('assigned_to', userContext.userId)
      }

      // Apply filters
      if (filters) {
        query = this.applyLeadFilters(query, filters)
      }

      const { data: leads, error } = await query

      if (error) {
        return { success: false, error: error.message }
      }

      // Calculate metrics
      const totalLeads = leads?.length || 0
      const newLeads = leads?.filter(l => l.status === 'new').length || 0
      const contactedLeads = leads?.filter(l => l.status !== 'new').length || 0
      const closedWon = leads?.filter(l => l.status === 'closed_won').length || 0
      const conversionRate = totalLeads > 0 ? (closedWon / totalLeads) * 100 : 0

      // Calculate average response time (simplified)
      const avgResponseTime = this.calculateAverageResponseTime(leads || [])

      return {
        success: true,
        data: {
          total_leads: totalLeads,
          new_leads: newLeads,
          contacted_leads: contactedLeads,
          conversion_rate: Number(conversionRate.toFixed(2)),
          avg_response_time_hours: avgResponseTime
        }
      }
    } catch (error) {
      console.error('Error getting lead metrics:', error)
      return { success: false, error: 'Failed to calculate metrics' }
    }
  }

  // Private helper methods
  private async getCurrentUserContext() {
    const { data: { user } } = await this.supabase.auth.getUser()
    
    if (!user) {
      return { userId: null, role: 'salesperson' }
    }

    const { data: userProfile } = await this.supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    return {
      userId: user.id,
      role: userProfile?.role || 'salesperson'
    }
  }

  private applyRoleBasedFiltering(query: any, userContext: any) {
    if (userContext.role === 'salesperson' && userContext.userId) {
      return query.eq('assigned_to', userContext.userId)
    }
    return query // Managers and admins see all leads
  }

  private applyLeadFilters(query: any, filters: LeadFilters) {
    if (filters.status?.length) {
      query = query.in('status', filters.status)
    }
    
    if (filters.source?.length) {
      query = query.in('lead_source', filters.source)
    }
    
    if (filters.assigned_to?.length) {
      query = query.in('assigned_to', filters.assigned_to)
    }
    
    if (filters.state?.length) {
      query = query.in('state', filters.state)
    }
    
    if (filters.date_range) {
      query = query
        .gte('created_at', filters.date_range.start)
        .lte('created_at', filters.date_range.end)
    }
    
    return query
  }

  private handleLeadsError(error: any): ApiResponse<LeadWithAssignee[]> {
    if (error.message?.includes('relation "leads" does not exist')) {
      console.warn('⚠️ Leads table does not exist')
      return { success: true, data: [] }
    }
    
    if (error.message?.includes('JWT') || error.code === 'PGRST301') {
      return { success: false, error: 'Authentication error. Please refresh the page.' }
    }
    
    return { success: false, error: `Database error: ${error.message}` }
  }

  private async validateLeadData(leadData: TablesInsert<'leads'>): Promise<{ valid: boolean; message?: string }> {
    // Phone number validation
    if (!leadData.phone || leadData.phone.length < 10) {
      return { valid: false, message: 'Valid phone number is required' }
    }

    // Service area validation (MA, NH only)
    if (leadData.state && !['MA', 'NH'].includes(leadData.state)) {
      return { valid: false, message: 'Service area limited to MA and NH' }
    }

    // Duplicate check (simplified - could be more sophisticated)
    const { data: existing } = await this.supabase
      .from('leads')
      .select('id')
      .eq('phone', leadData.phone)
      .limit(1)

    if (existing && existing.length > 0) {
      return { valid: false, message: 'Lead with this phone number already exists' }
    }

    return { valid: true }
  }

  private async getNextAvailableSalesperson(): Promise<string | null> {
    // Simple round-robin assignment
    const { data: salespeople } = await this.supabase
      .from('users')
      .select('id')
      .eq('role', 'salesperson')
      .limit(1)

    return salespeople?.[0]?.id || null
  }

  /**
   * Gets lead statistics for dashboard
   */
  async getLeadStats(): Promise<{
    totalLeads: number
    activeLeads: number
    thisMonthLeads: number
    lastMonthLeads: number
    statusBreakdown: Record<string, number>
  }> {
    try {
      console.log('📊 Fetching lead stats...')
      
      // Simplified query for better performance
      const { data: leads, error } = await this.supabase
        .from('leads')
        .select('status, created_at')
        .limit(1000) // Reasonable limit for performance
      
      if (error) {
        console.error('❌ Error fetching lead stats:', error)
        return this.getDefaultStats()
      }
      
      // Calculate stats efficiently
      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()
      const lastMonthDate = new Date(currentYear, currentMonth - 1)
      
      let totalLeads = 0
      let activeLeads = 0
      let thisMonthLeads = 0
      let lastMonthLeads = 0
      const statusBreakdown: Record<string, number> = {}
      
      // Single pass through the data for efficiency
      leads?.forEach(lead => {
        totalLeads++
        
        // Count active leads
        if (!['closed_won', 'closed_lost'].includes(lead.status)) {
          activeLeads++
        }
        
        // Count by month
        const leadDate = new Date(lead.created_at)
        if (leadDate.getMonth() === currentMonth && leadDate.getFullYear() === currentYear) {
          thisMonthLeads++
        } else if (leadDate.getMonth() === lastMonthDate.getMonth() && leadDate.getFullYear() === lastMonthDate.getFullYear()) {
          lastMonthLeads++
        }
        
        // Status breakdown
        statusBreakdown[lead.status] = (statusBreakdown[lead.status] || 0) + 1
      })
      
      console.log(`✅ Calculated stats for ${totalLeads} leads`)
      
      return {
        totalLeads,
        activeLeads,
        thisMonthLeads,
        lastMonthLeads,
        statusBreakdown
      }
    } catch (error) {
      console.error('💥 Error in getLeadStats:', error)
      return this.getDefaultStats()
    }
  }
  
  private getDefaultStats() {
    return {
      totalLeads: 0,
      activeLeads: 0,
      thisMonthLeads: 0,
      lastMonthLeads: 0,
      statusBreakdown: {}
    }
  }

  private calculateAverageResponseTime(leads: any[]): number {
    // Simplified calculation - in reality would need communication data
    const contactedLeads = leads.filter(l => l.status !== 'new')
    if (contactedLeads.length === 0) return 0

    const totalHours = contactedLeads.reduce((sum, lead) => {
      const created = new Date(lead.created_at)
      const updated = new Date(lead.updated_at)
      const hoursDiff = (updated.getTime() - created.getTime()) / (1000 * 60 * 60)
      return sum + hoursDiff
    }, 0)

    return Number((totalHours / contactedLeads.length).toFixed(1))
  }
}

export const leadsService = new LeadsService()