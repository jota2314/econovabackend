import { createClient } from '@/lib/supabase/server'
import { startOfMonth, subMonths, formatISO } from 'date-fns'

export class OptimizedAnalyticsService {

  constructor() {
    // No client initialization here since server client is async
  }

  private async getClient() {
    return await createClient()
  }

  // Optimized Performance Leaderboard - Single Query Instead of N+1
  async getPerformanceLeaderboard() {
    try {
      const supabase = await this.getClient()
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const startDate = formatISO(thirtyDaysAgo)

      // Single query with JOINs to get all data at once
      const { data: performanceData, error } = await supabase.rpc(
        'get_performance_leaderboard',
        { start_date: startDate }
      )

      if (error) {
        console.error('Error fetching performance leaderboard:', error)
        // Fallback to individual queries if RPC fails
        return this.getFallbackPerformanceData(startDate)
      }

      return {
        success: true,
        data: performanceData?.map((row: {
          salesperson: string
          leads_created: number
          jobs_created: number
          estimates_created: number
          calls_made: number
          sms_sent: number
          appointments_set: number
        }) => ({
          userId: row.user_id,
          name: row.full_name,
          callsMade: row.calls_made || 0,
          leadsConverted: row.leads_converted || 0,
          revenueGenerated: row.revenue_generated || 0,
          score: (row.calls_made || 0) + ((row.leads_converted || 0) * 10) + ((row.revenue_generated || 0) / 1000)
        })).sort((a: { score: number }, b: { score: number }) => b.score - a.score) || []
      }
    } catch (error) {
      console.error('Error in getPerformanceLeaderboard:', error)
      return { success: false, error: 'Internal error' }
    }
  }

  // Fallback method using optimized individual queries
  private async getFallbackPerformanceData(startDate: string) {
    try {
      const supabase = await this.getClient()
      // Get all users first
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('role', 'salesperson')

      if (usersError || !users) {
        return { success: false, error: usersError?.message || 'No users found' }
      }

      const userIds = users.map(u => u.id)

      // Batch queries for better performance
      const [callsResult, leadsResult, jobsResult] = await Promise.allSettled([
        // Calls by user
        supabase
          .from('communications')
          .select('user_id')
          .in('user_id', userIds)
          .eq('type', 'call')
          .eq('direction', 'outbound')
          .gte('created_at', startDate),
        
        // Leads by user
        supabase
          .from('leads')
          .select('assigned_to')
          .in('assigned_to', userIds)
          .eq('status', 'closed_won')
          .gte('updated_at', startDate),
        
        // Jobs with revenue by user
        supabase
          .from('jobs')
          .select(`
            quote_amount,
            lead:leads!inner(assigned_to)
          `)
          .in('lead.assigned_to', userIds)
          .not('quote_amount', 'is', null)
          .gte('updated_at', startDate)
      ])

      // Process results
      const calls = callsResult.status === 'fulfilled' ? callsResult.value.data || [] : []
      const leads = leadsResult.status === 'fulfilled' ? leadsResult.value.data || [] : []
      const jobs = jobsResult.status === 'fulfilled' ? jobsResult.value.data || [] : []

      // Aggregate data by user
      const userStats = users.map(user => {
        const userCalls = calls.filter(c => c.user_id === user.id).length
        const userLeads = leads.filter(l => l.assigned_to === user.id).length
        const userRevenue = jobs
          .filter(j => j.lead?.assigned_to === user.id)
          .reduce((sum, job) => sum + (job.quote_amount || 0), 0)

        return {
          userId: user.id,
          name: user.full_name,
          callsMade: userCalls,
          leadsConverted: userLeads,
          revenueGenerated: userRevenue,
          score: userCalls + (userLeads * 10) + (userRevenue / 1000)
        }
      }).sort((a, b) => b.score - a.score)

      return { success: true, data: userStats }
    } catch (error) {
      console.error('Error in fallback performance data:', error)
      return { success: false, error: 'Internal error' }
    }
  }

  // Optimized Dashboard Stats with Parallel Queries
  async getDashboardStats() {
    try {
      const supabase = await this.getClient()
      const now = new Date()
      const startOfCurrentMonth = formatISO(startOfMonth(now))
      const startOfLastMonth = formatISO(startOfMonth(subMonths(now, 1)))

      // Parallel queries for better performance
      const queries = await Promise.allSettled([
        // Total jobs count
        supabase.from('jobs').select('id', { count: 'exact' }),
        
        // Total commissions
        supabase.from('commissions').select('amount'),
        
        // Pipeline value (leads in progress)
        supabase
          .from('leads')
          .select('revenue_generated')
          .not('revenue_generated', 'is', null)
          .in('status', ['contacted', 'measurement_scheduled', 'measured', 'quoted', 'proposal_sent']),
        
        // Estimates this month
        supabase
          .from('estimates')
          .select('id', { count: 'exact' })
          .gte('created_at', startOfCurrentMonth),
        
        // Estimates last month
        supabase
          .from('estimates')
          .select('id', { count: 'exact' })
          .gte('created_at', startOfLastMonth)
          .lt('created_at', startOfCurrentMonth),
        
        // Conversion rate data
        supabase
          .from('leads')
          .select('status', { count: 'exact' })
          .in('status', ['closed_won', 'closed_lost'])
      ])

      // Process results with fallbacks
      const [
        jobsResult,
        commissionsResult,
        pipelineResult,
        estimatesCurrentResult,
        estimatesLastResult,
        conversionResult
      ] = queries

      const totalJobs = jobsResult.status === 'fulfilled' 
        ? (jobsResult.value.data as any)?.count || 0 
        : 0

      const totalCommissions = commissionsResult.status === 'fulfilled'
        ? (commissionsResult.value.data || []).reduce((sum: number, c: { amount?: number }) => sum + (c.amount || 0), 0)
        : 0

      const pipelineValue = pipelineResult.status === 'fulfilled'
        ? (pipelineResult.value.data || []).reduce((sum: number, l: { revenue_generated?: number }) => sum + (l.revenue_generated || 0), 0)
        : 0

      const estimatesSent = estimatesCurrentResult.status === 'fulfilled'
        ? (estimatesCurrentResult.value.data as any)?.count || 0
        : 0

      const estimatesSentLastMonth = estimatesLastResult.status === 'fulfilled'
        ? (estimatesLastResult.value.data as any)?.count || 0
        : 0

      // Calculate conversion rate
      const conversionData = conversionResult.status === 'fulfilled' 
        ? conversionResult.value.data || []
        : []
      
      const totalLeads = conversionData.length
      const wonLeads = conversionData.filter((l: { status: string }) => l.status === 'closed_won').length
      const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0

      // Calculate growth percentages
      const estimateGrowth = estimatesSentLastMonth > 0
        ? ((estimatesSent - estimatesSentLastMonth) / estimatesSentLastMonth) * 100
        : 0

      return {
        success: true,
        data: {
          commissions: totalCommissions,
          totalJobs,
          conversionRate: Number(conversionRate.toFixed(1)),
          pipelineValue,
          estimatesSent,
          estimatesSentLastMonth,
          growth: {
            commissions: 0, // Would need historical data
            jobs: 0, // Would need historical data
            estimates: Number(estimateGrowth.toFixed(1))
          }
        }
      }
    } catch (error) {
      console.error('Error in getDashboardStats:', error)
      return {
        success: false,
        error: 'Failed to fetch dashboard statistics'
      }
    }
  }

  // Optimized Commission Tracking
  async getCommissionTracking(period: 'week' | 'month' | 'quarter') {
    try {
      const supabase = await this.getClient()
      const now = new Date()
      let startDate: Date

      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = startOfMonth(now)
          break
        case 'quarter':
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
          break
        default:
          startDate = startOfMonth(now)
      }

      // Single query with JOIN for commission data
      const { data: commissionData, error } = await supabase
        .from('commissions')
        .select(`
          amount,
          commission_type,
          paid,
          created_at,
          user:users(full_name, role),
          job:jobs(
            quote_amount,
            lead:leads(name)
          )
        `)
        .gte('created_at', formatISO(startDate))
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching commission data:', error)
        return { success: false, error: error.message }
      }

      // Process and aggregate data
      const processedData = (commissionData || []).map(commission => ({
        id: commission.created_at, // Using timestamp as ID
        salesperson: commission.user?.full_name || 'Unknown',
        amount: commission.amount,
        type: commission.commission_type,
        jobName: commission.job?.lead?.name || 'Unknown Job',
        jobValue: commission.job?.quote_amount || 0,
        paid: commission.paid,
        date: commission.created_at
      }))

      const totalCommissions = processedData.reduce((sum, c) => sum + (c.amount || 0), 0)
      const paidCommissions = processedData.filter(c => c.paid).reduce((sum, c) => sum + (c.amount || 0), 0)

      return {
        success: true,
        data: {
          commissions: processedData,
          summary: {
            total: totalCommissions,
            paid: paidCommissions,
            unpaid: totalCommissions - paidCommissions,
            count: processedData.length
          }
        }
      }
    } catch (error) {
      console.error('Error in getCommissionTracking:', error)
      return { success: false, error: 'Internal error' }
    }
  }
}