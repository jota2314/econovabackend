import { createClient } from '@/lib/supabase/client'
import { addDays, subDays, startOfMonth, endOfMonth, format } from 'date-fns'

export class AnalyticsService {
  private supabase = createClient()

  // Daily Activity Metrics per Salesperson
  async getDailyActivityMetrics(startDate: Date, endDate: Date, userId?: string) {
    try {
      // Get calls made
      let callsQuery = this.supabase
        .from('communications')
        .select(`
          created_at,
          user_id,
          type,
          direction,
          status,
          users!user_id(full_name)
        `)
        .eq('type', 'call')
        .eq('direction', 'outbound')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      if (userId) {
        callsQuery = callsQuery.eq('user_id', userId)
      }

      const { data: calls, error: callsError } = await callsQuery

      // Get SMS sent
      let smsQuery = this.supabase
        .from('communications')
        .select(`
          created_at,
          user_id,
          type,
          direction,
          users!user_id(full_name)
        `)
        .eq('type', 'sms')
        .eq('direction', 'outbound')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      if (userId) {
        smsQuery = smsQuery.eq('user_id', userId)
      }

      const { data: sms, error: smsError } = await smsQuery

      // Get measurements completed
      let measurementsQuery = this.supabase
        .from('measurements')
        .select(`
          created_at,
          job_id,
          jobs!job_id(
            created_by,
            users!created_by(full_name)
          )
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      const { data: measurements, error: measurementsError } = await measurementsQuery

      // Get leads contacted (first time contact)
      let leadsQuery = this.supabase
        .from('leads')
        .select(`
          created_at,
          status,
          assigned_to,
          users!assigned_to(full_name)
        `)
        .neq('status', 'new')
        .gte('updated_at', startDate.toISOString())
        .lte('updated_at', endDate.toISOString())

      if (userId) {
        leadsQuery = leadsQuery.eq('assigned_to', userId)
      }

      const { data: leadsContacted, error: leadsError } = await leadsQuery

      if (callsError || smsError || measurementsError || leadsError) {
        console.error('Error fetching daily metrics:', { callsError, smsError, measurementsError, leadsError })
        return { success: false, error: 'Failed to fetch activity metrics' }
      }

      return {
        success: true,
        data: {
          calls: calls || [],
          sms: sms || [],
          measurements: measurements || [],
          leadsContacted: leadsContacted || []
        }
      }

    } catch (error) {
      console.error('Error in getDailyActivityMetrics:', error)
      return { success: false, error: 'Internal error' }
    }
  }

  // Pipeline Conversion Rates
  async getPipelineConversion(dateRange?: { start: Date, end: Date }) {
    try {
      let query = this.supabase
        .from('leads')
        .select('status, created_at, lead_source')

      if (dateRange) {
        query = query.gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString())
      }

      const { data: leads, error } = await query

      if (error) {
        console.error('Error fetching pipeline data:', error)
        return { success: false, error: error.message }
      }

      // Calculate conversion rates
      const totalLeads = leads?.length || 0
      const statusCounts = leads?.reduce((acc: Record<string, number>, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1
        return acc
      }, {}) || {}

      const conversionRates = {
        new_to_contacted: totalLeads > 0 ? ((statusCounts.contacted || 0) / totalLeads) * 100 : 0,
        contacted_to_scheduled: totalLeads > 0 ? ((statusCounts.measurement_scheduled || 0) / totalLeads) * 100 : 0,
        scheduled_to_measured: totalLeads > 0 ? ((statusCounts.measured || 0) / totalLeads) * 100 : 0,
        measured_to_quoted: totalLeads > 0 ? ((statusCounts.quoted || 0) / totalLeads) * 100 : 0,
        quoted_to_won: totalLeads > 0 ? ((statusCounts.closed_won || 0) / totalLeads) * 100 : 0,
        overall_conversion: totalLeads > 0 ? ((statusCounts.closed_won || 0) / totalLeads) * 100 : 0
      }

      return {
        success: true,
        data: {
          totalLeads,
          statusCounts,
          conversionRates,
          pipelineData: leads || []
        }
      }

    } catch (error) {
      console.error('Error in getPipelineConversion:', error)
      return { success: false, error: 'Internal error' }
    }
  }

  // Commission Tracking
  async getCommissionData(userId?: string, month?: Date) {
    try {
      const startOfMonthDate = month ? startOfMonth(month) : startOfMonth(new Date())
      const endOfMonthDate = month ? endOfMonth(month) : endOfMonth(new Date())

      // Get won deals for commission calculation
      let query = this.supabase
        .from('jobs')
        .select(`
          *,
          lead:leads!lead_id(
            name,
            assigned_to,
            users!assigned_to(full_name, commission_rate)
          )
        `)
        .gte('updated_at', startOfMonthDate.toISOString())
        .lte('updated_at', endOfMonthDate.toISOString())
        .not('quote_amount', 'is', null)

      if (userId) {
        query = query.eq('lead.assigned_to', userId)
      }

      const { data: jobs, error } = await query

      if (error) {
        console.error('Error fetching commission data:', error)
        return { success: false, error: error.message }
      }

      // Calculate commissions
      const commissionData = jobs?.map(job => {
        const quoteAmount = job.quote_amount || 0
        const commissionRate = job.lead?.users?.commission_rate || 0.05
        const commissionEarned = quoteAmount * commissionRate
        
        return {
          jobId: job.id,
          jobName: job.job_name,
          customerName: job.lead?.name,
          quoteAmount,
          commissionRate,
          commissionEarned,
          salesperson: job.lead?.users?.full_name,
          userId: job.lead?.assigned_to,
          date: job.updated_at
        }
      }) || []

      // Group by salesperson
      const commissionBySalesperson = commissionData.reduce((acc: Record<string, any>, item) => {
        const key = item.userId || 'unassigned'
        if (!acc[key]) {
          acc[key] = {
            salesperson: item.salesperson || 'Unassigned',
            totalRevenue: 0,
            totalCommission: 0,
            dealCount: 0,
            deals: []
          }
        }
        
        acc[key].totalRevenue += item.quoteAmount
        acc[key].totalCommission += item.commissionEarned
        acc[key].dealCount += 1
        acc[key].deals.push(item)
        
        return acc
      }, {})

      return {
        success: true,
        data: {
          commissionData,
          commissionBySalesperson,
          totalRevenue: commissionData.reduce((sum, item) => sum + item.quoteAmount, 0),
          totalCommission: commissionData.reduce((sum, item) => sum + item.commissionEarned, 0)
        }
      }

    } catch (error) {
      console.error('Error in getCommissionData:', error)
      return { success: false, error: 'Internal error' }
    }
  }

  // Revenue Reporting by Lead Source
  async getRevenueByLeadSource(month?: Date) {
    try {
      const startOfMonthDate = month ? startOfMonth(month) : startOfMonth(new Date())
      const endOfMonthDate = month ? endOfMonth(month) : endOfMonth(new Date())

      const { data: jobs, error } = await this.supabase
        .from('jobs')
        .select(`
          quote_amount,
          quote_sent_at,
          lead:leads!lead_id(
            lead_source,
            status
          )
        `)
        .eq('lead.status', 'closed_won')
        .gte('quote_sent_at', startOfMonthDate.toISOString())
        .lte('quote_sent_at', endOfMonthDate.toISOString())
        .not('quote_amount', 'is', null)

      if (error) {
        console.error('Error fetching revenue data:', error)
        return { success: false, error: error.message }
      }

      // Group by lead source
      const revenueBySource = jobs?.reduce((acc: Record<string, any>, job) => {
        const source = job.lead?.lead_source || 'unknown'
        if (!acc[source]) {
          acc[source] = {
            source,
            revenue: 0,
            jobCount: 0,
            averageJobValue: 0
          }
        }
        
        acc[source].revenue += job.quote_amount || 0
        acc[source].jobCount += 1
        acc[source].averageJobValue = acc[source].revenue / acc[source].jobCount
        
        return acc
      }, {}) || {}

      return {
        success: true,
        data: {
          revenueBySource,
          totalRevenue: Object.values(revenueBySource).reduce((sum: number, item: any) => sum + item.revenue, 0),
          totalJobs: Object.values(revenueBySource).reduce((sum: number, item: any) => sum + item.jobCount, 0)
        }
      }

    } catch (error) {
      console.error('Error in getRevenueByLeadSource:', error)
      return { success: false, error: 'Internal error' }
    }
  }

  // Performance Leaderboards
  async getPerformanceLeaderboard(timeframe: 'week' | 'month' | 'quarter') {
    try {
      const now = new Date()
      let startDate: Date
      
      switch (timeframe) {
        case 'week':
          startDate = subDays(now, 7)
          break
        case 'month':
          startDate = startOfMonth(now)
          break
        case 'quarter':
          startDate = subDays(now, 90)
          break
        default:
          startDate = startOfMonth(now)
      }

      // Get all salespeople performance data
      const { data: users, error: usersError } = await this.supabase
        .from('users')
        .select('id, full_name, role')
        .eq('role', 'salesperson')

      if (usersError) {
        console.error('Error fetching users:', usersError)
        return { success: false, error: usersError.message }
      }

      const performanceData = await Promise.all(
        users?.map(async (user) => {
          // Get calls made
          const { data: calls } = await this.supabase
            .from('communications')
            .select('id')
            .eq('user_id', user.id)
            .eq('type', 'call')
            .eq('direction', 'outbound')
            .gte('created_at', startDate.toISOString())

          // Get leads converted
          const { data: leads } = await this.supabase
            .from('leads')
            .select('id')
            .eq('assigned_to', user.id)
            .eq('status', 'closed_won')
            .gte('updated_at', startDate.toISOString())

          // Get revenue generated
          const { data: jobs } = await this.supabase
            .from('jobs')
            .select('quote_amount, lead:leads!lead_id(assigned_to)')
            .eq('lead.assigned_to', user.id)
            .not('quote_amount', 'is', null)
            .gte('updated_at', startDate.toISOString())

          const totalRevenue = jobs?.reduce((sum, job) => sum + (job.quote_amount || 0), 0) || 0

          return {
            userId: user.id,
            name: user.full_name,
            callsMade: calls?.length || 0,
            leadsConverted: leads?.length || 0,
            revenueGenerated: totalRevenue,
            score: (calls?.length || 0) + ((leads?.length || 0) * 10) + (totalRevenue / 1000)
          }
        }) || []
      )

      // Sort by score descending
      performanceData.sort((a, b) => b.score - a.score)

      return {
        success: true,
        data: performanceData
      }

    } catch (error) {
      console.error('Error in getPerformanceLeaderboard:', error)
      return { success: false, error: 'Internal error' }
    }
  }

  // Dashboard Summary Stats
  async getDashboardStats() {
    try {
      const now = new Date()
      const startOfCurrentMonth = startOfMonth(now)
      const startOfLastMonth = startOfMonth(subDays(startOfCurrentMonth, 1))
      const endOfLastMonth = endOfMonth(subDays(startOfCurrentMonth, 1))

      // Get current month stats
      const [
        totalLeadsResult,
        activeJobsResult,
        monthlyRevenueResult,
        leadsThisMonthResult
      ] = await Promise.all([
        this.supabase.from('leads').select('id', { count: 'exact' }),
        this.supabase.from('jobs').select('id', { count: 'exact' }),
        this.supabase
          .from('jobs')
          .select(`
            quote_amount,
            leads!lead_id(status)
          `)
          .eq('leads.status', 'closed_won')
          .gte('updated_at', startOfCurrentMonth.toISOString())
          .not('quote_amount', 'is', null),
        this.supabase
          .from('leads')
          .select('id', { count: 'exact' })
          .gte('created_at', startOfCurrentMonth.toISOString())
      ])

      // Get last month stats for comparison
      const [lastMonthRevenueResult, lastMonthLeadsResult] = await Promise.all([
        this.supabase
          .from('jobs')
          .select(`
            quote_amount,
            leads!lead_id(status)
          `)
          .eq('leads.status', 'closed_won')
          .gte('updated_at', startOfLastMonth.toISOString())
          .lte('updated_at', endOfLastMonth.toISOString())
          .not('quote_amount', 'is', null),
        this.supabase
          .from('leads')
          .select('id', { count: 'exact' })
          .gte('created_at', startOfLastMonth.toISOString())
          .lte('created_at', endOfLastMonth.toISOString())
      ])

      const currentMonthRevenue = monthlyRevenueResult.data?.reduce((sum, job) => sum + (job.quote_amount || 0), 0) || 0
      const lastMonthRevenue = lastMonthRevenueResult.data?.reduce((sum, job) => sum + (job.quote_amount || 0), 0) || 0
      const currentMonthLeads = leadsThisMonthResult.count || 0
      const lastMonthLeads = lastMonthLeadsResult.count || 0

      return {
        success: true,
        data: {
          totalRevenue: currentMonthRevenue,
          totalJobs: activeJobsResult.count || 0,
          totalMeasurements: 0, // Will need separate query if needed
          callsMade: 0, // Will need separate query if needed
          smsSent: 0, // Will need separate query if needed
          growth: {
            revenue: lastMonthRevenue > 0 ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0,
            jobs: 0, // Calculate if needed
            measurements: 0 // Calculate if needed
          }
        }
      }

    } catch (error) {
      console.error('Error in getDashboardStats:', error)
      return { success: false, error: 'Internal error' }
    }
  }

  // Recent Activity Feed
  async getRecentActivity(limit = 10) {
    try {
      // Get recent communications
      const { data: recentComms, error: commsError } = await this.supabase
        .from('communications')
        .select(`
          id,
          type,
          direction,
          created_at,
          lead:leads!lead_id(name),
          user:users!user_id(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      // Get recent leads
      const { data: recentLeads, error: leadsError } = await this.supabase
        .from('leads')
        .select('id, name, status, created_at')
        .order('created_at', { ascending: false })
        .limit(limit)

      // Get recent jobs
      const { data: recentJobs, error: jobsError } = await this.supabase
        .from('jobs')
        .select(`
          id,
          job_name,
          total_square_feet,
          created_at,
          lead:leads!lead_id(name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (commsError || leadsError || jobsError) {
        console.error('Error fetching recent activity:', { commsError, leadsError, jobsError })
        return { success: false, error: 'Failed to fetch recent activity' }
      }

      return {
        success: true,
        data: {
          communications: recentComms || [],
          leads: recentLeads || [],
          jobs: recentJobs || []
        }
      }

    } catch (error) {
      console.error('Error in getRecentActivity:', error)
      return { success: false, error: 'Internal error' }
    }
  }
}

export const analyticsService = new AnalyticsService()