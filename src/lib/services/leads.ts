import { createClient } from '@/lib/supabase/client'
import type { Lead, TablesInsert, TablesUpdate } from '@/lib/types/database'

export class LeadsService {
  private supabase = createClient()

  async getLeads(options?: {
    status?: string[]
    assignedTo?: string
    limit?: number
    offset?: number
  }) {
    try {
      console.log('🔄 Starting leads query...')
      
      // Build the query step by step
      let query = this.supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

      // Apply filters
      if (options?.status && options.status.length > 0) {
        query = query.in('status', options.status)
      }

      if (options?.assignedTo) {
        query = query.eq('assigned_to', options.assignedTo)
      }

      // Apply pagination with reasonable defaults
      const limit = options?.limit || 100 // Reasonable default
      query = query.limit(limit)

      if (options?.offset) {
        query = query.range(options.offset, options.offset + limit - 1)
      }

      console.log('📡 Executing Supabase query...')
      
      // Execute query with timeout but don't use Promise.race - it can cause issues
      const startTime = Date.now()
      const { data, error } = await query
      const duration = Date.now() - startTime
      
      console.log(`⏱️ Query completed in ${duration}ms`)

      if (error) {
        console.error('❌ Supabase error:', error)
        
        // Handle specific database errors
        if (error.message?.includes('relation "leads" does not exist') || error.code === 'PGRST116') {
          console.warn('⚠️ Leads table does not exist, returning empty array')
          return []
        } else if (error.message?.includes('JWT') || error.code === 'PGRST301') {
          throw new Error('Authentication error. Please refresh the page.')
        } else if (error.message?.includes('timeout') || error.code === 'PGRST000') {
          throw new Error('Query timeout. Please try again.')
        } else {
          throw new Error(`Database error: ${error.message || 'Unknown error'}`)
        }
      }

      console.log(`✅ Successfully fetched ${data?.length || 0} leads`)
      return data || []
      
    } catch (error) {
      console.error('💥 Error in getLeads:', error)
      
      // If it's a network timeout or connection error
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('network')) {
          console.warn('🌐 Network timeout, returning empty array for now')
          return []
        }
      }
      
      // Re-throw for other errors
      throw error
    }
  }

  async getLeadById(id: string) {
    const { data, error } = await this.supabase
      .from('leads')
      .select(`
        *,
        assigned_user:users!assigned_to(full_name, email),
        jobs(*),
        communications(*),
        activities(*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  async createLead(lead: TablesInsert<'leads'>) {
    const { data, error } = await this.supabase
      .from('leads')
      .insert(lead)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async createMultipleLeads(leads: TablesInsert<'leads'>[]) {
    const { data, error } = await this.supabase
      .from('leads')
      .insert(leads)
      .select()

    if (error) throw error
    return data || []
  }

  async updateLead(id: string, updates: TablesUpdate<'leads'>) {
    const { data, error } = await this.supabase
      .from('leads')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteLead(id: string) {
    const { error } = await this.supabase
      .from('leads')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  async getLeadStats() {
    try {
      // Check if Supabase is properly configured
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.warn('⚠️ Supabase not configured, returning default stats')
        return this.getDefaultStats()
      }

      console.log('📊 Fetching lead stats...')
      
      // Use a more efficient query - only select what we need
      const { data: leads, error } = await this.supabase
        .from('leads')
        .select('status, created_at')
        .limit(1000) // Reasonable limit to avoid huge queries

      if (error) {
        console.error('❌ Error fetching lead stats:', error)
        
        // If table doesn't exist, return defaults
        if (error.code === 'PGRST116' || error.message?.includes('relation "leads" does not exist')) {
          console.warn('⚠️ Leads table does not exist, returning default stats')
          return this.getDefaultStats()
        }
        
        // For other errors, still return defaults but log them
        console.warn('⚠️ Using default stats due to error:', error.message)
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

  async updateLeadStatus(id: string, status: Lead['status']) {
    return this.updateLead(id, { status })
  }

  async assignLead(id: string, userId: string) {
    return this.updateLead(id, { assigned_to: userId })
  }
}

export const leadsService = new LeadsService()