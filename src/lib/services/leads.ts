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
      // Simplified query to avoid timeouts - remove the join for now
      let query = this.supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (options?.status && options.status.length > 0) {
        query = query.in('status', options.status)
      }

      if (options?.assignedTo) {
        query = query.eq('assigned_to', options.assignedTo)
      }

      if (options?.limit) {
        query = query.limit(options.limit)
      }

      if (options?.offset) {
        query = query.range(options.offset, (options.offset + (options.limit || 50)) - 1)
      }

      console.log('Fetching leads...')
      const result = await Promise.race([
        query,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Leads query timeout')), 4000))
      ])

      const { data, error } = result as any

      if (error) {
        console.error('Error fetching leads:', error)
        
        // Handle specific database errors
        if (error.message?.includes('relation "leads" does not exist')) {
          throw new Error('Database tables not found. Please run the SQL setup first.')
        } else if (error.message?.includes('JWT')) {
          throw new Error('Authentication error. Please refresh the page.')
        } else {
          throw new Error(`Failed to fetch leads: ${error.message}`)
        }
      }
      return data || []
    } catch (error) {
      console.error('Error in getLeads:', error)
      // Re-throw the error so the UI can handle it properly
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
        console.warn('Supabase not configured, returning default stats')
        return {
          totalLeads: 0,
          activeLeads: 0,
          thisMonthLeads: 0,
          lastMonthLeads: 0,
          statusBreakdown: {}
        }
      }

      console.log('Fetching lead stats...')
      const result = await Promise.race([
        this.supabase
          .from('leads')
          .select('status, created_at'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Lead stats query timeout')), 3000))
      ])

      const { data: leads, error } = result as any

      if (error) {
        console.error('Error fetching lead stats:', error)
        // Return default stats if table doesn't exist or other error
        return {
          totalLeads: 0,
          activeLeads: 0,
          thisMonthLeads: 0,
          lastMonthLeads: 0,
          statusBreakdown: {}
        }
      }

      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()

      const thisMonth = leads?.filter(lead => {
        const leadDate = new Date(lead.created_at)
        return leadDate.getMonth() === currentMonth && leadDate.getFullYear() === currentYear
      }) || []

      const lastMonth = leads?.filter(lead => {
        const leadDate = new Date(lead.created_at)
        const lastMonthDate = new Date(currentYear, currentMonth - 1)
        return leadDate.getMonth() === lastMonthDate.getMonth() && leadDate.getFullYear() === lastMonthDate.getFullYear()
      }) || []

      return {
        totalLeads: leads?.length || 0,
        activeLeads: leads?.filter(lead => !['closed_won', 'closed_lost'].includes(lead.status)).length || 0,
        thisMonthLeads: thisMonth.length,
        lastMonthLeads: lastMonth.length,
        statusBreakdown: leads?.reduce((acc, lead) => {
          acc[lead.status] = (acc[lead.status] || 0) + 1
          return acc
        }, {} as Record<string, number>) || {}
      }
    } catch (error) {
      console.error('Error in getLeadStats:', error)
      return {
        totalLeads: 0,
        activeLeads: 0,
        thisMonthLeads: 0,
        lastMonthLeads: 0,
        statusBreakdown: {}
      }
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