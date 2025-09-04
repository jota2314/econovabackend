/**
 * Consolidated Analytics Service
 * Handles all analytics, reporting, and dashboard statistics
 */

import { createClient } from '@/lib/supabase/server'
import { startOfMonth, endOfMonth, subDays, subMonths, formatISO } from 'date-fns'
import type { ApiResponse } from '@/types'

export interface DashboardStats {
  commissions: number
  totalJobs: number
  conversionRate: number
  pipelineValue: number
  estimatesSent: number
  estimatesSentLastMonth: number
  growth: {
    commissions: number
    jobs: number
    estimates: number
  }
}

export interface PerformanceData {
  userId: string
  name: string | null
  callsMade: number
  leadsConverted: number
  revenueGenerated: number
  score: number
}

export interface CommissionData {
  salesperson: string
  amount: number
  type: string
  jobName: string
  jobValue: number
  paid: boolean
  date: string
}

export class AnalyticsService {
  private supabase: any
  
  constructor() {
    this.supabase = createClient()
  }
  
  private readonly COMMISSION_RATE = 0.10
  private readonly QUERY_TIMEOUT = 10000 // Increased to 10 seconds for complex queries

  /**
   * Creates a timeout promise for query operations
   */
  private createTimeout(ms: number = this.QUERY_TIMEOUT) {
    return new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), ms)
    )
  }

  /**
   * Executes a query with timeout and error handling
   */
  private async executeWithTimeout<T>(
    queryPromise: Promise<T>, 
    timeoutMs?: number
  ): Promise<T | null> {
    try {
      // Use AbortController for better timeout handling
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs || this.QUERY_TIMEOUT)
      
      const result = await queryPromise
      clearTimeout(timeoutId)
      return result
    } catch (error) {
      // Log the actual error for debugging
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Query timed out after', timeoutMs || this.QUERY_TIMEOUT, 'ms')
      } else {
        console.warn('Query failed:', error)
      }
      return null
    }
  }

  /**
   * Helper method to extract count from query results
   */
  private extractCount(result: PromiseSettledResult<any>): number {
    if (result.status === 'fulfilled' && result.value?.data) {
      return result.value.count || result.value.data.length || 0
    }
    return 0
  }

  /**
   * Helper method to extract commission value
   */
  private extractCommissionValue(result: PromiseSettledResult<any>): number {
    if (result.status === 'fulfilled' && result.value?.data) {
      const totalRevenue = result.value.data.reduce(
        (sum: number, job: any) => sum + (job.quote_amount || 0), 0
      )
      return totalRevenue * this.COMMISSION_RATE
    }
    return 0
  }

  /**
   * Helper method to calculate conversion rate
   */
  private calculateConversionRate(result: PromiseSettledResult<any>): number {
    if (result.status === 'fulfilled' && result.value?.data) {
      const leads = result.value.data
      const totalLeads = leads.length
      const closedWon = leads.filter((lead: any) => lead.status === 'closed_won').length
      return totalLeads > 0 ? (closedWon / totalLeads) * 100 : 0
    }
    return 0
  }

  /**
   * Helper method to extract pipeline value
   */
  private extractPipelineValue(result: PromiseSettledResult<any>): number {
    if (result.status === 'fulfilled' && result.value?.data) {
      return result.value.data.reduce(
        (sum: number, job: any) => sum + (job.quote_amount || 0), 0
      )
    }
    return 0
  }

  /**
   * Returns default dashboard statistics
   */
  private getDefaultDashboardStats(): DashboardStats {
    return {
      commissions: 0,
      totalJobs: 0,
      conversionRate: 0,
      pipelineValue: 0,
      estimatesSent: 0,
      estimatesSentLastMonth: 0,
      growth: {
        commissions: 0,
        jobs: 0,
        estimates: 0
      }
    }
  }

  /**
   * Gets comprehensive dashboard statistics
   */
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    try {
      const now = new Date()
      const startOfCurrentMonth = startOfMonth(now)
      const startOfLastMonth = startOfMonth(subMonths(now, 1))
      const endOfLastMonth = endOfMonth(subMonths(now, 1))

      // Execute all queries in parallel with timeouts
      const [
        totalJobsResult,
        commissionJobsResult,
        leadsForConversionResult,
        estimatesThisMonthResult,
        estimatesLastMonthResult,
        pipelineJobsResult
      ] = await Promise.allSettled([
        this.executeWithTimeout(
          this.supabase.from('jobs').select('id', { count: 'exact' })
        ),
        this.executeWithTimeout(
          this.supabase
            .from('jobs')
            .select('quote_amount, leads!lead_id(status)')
            .eq('leads.status', 'closed_won')
            .not('quote_amount', 'is', null)
            .gte('updated_at', startOfCurrentMonth.toISOString())
        ),
        this.executeWithTimeout(
          this.supabase
            .from('leads')
            .select('status')
            .in('status', ['closed_won', 'closed_lost'])
        ),
        this.executeWithTimeout(
          this.supabase
            .from('jobs')
            .select('id', { count: 'exact' })
            .not('quote_amount', 'is', null)
            .gte('quote_sent_at', startOfCurrentMonth.toISOString())
        ),
        this.executeWithTimeout(
          this.supabase
            .from('jobs')
            .select('id', { count: 'exact' })
            .not('quote_amount', 'is', null)
            .gte('quote_sent_at', startOfLastMonth.toISOString())
            .lte('quote_sent_at', endOfLastMonth.toISOString())
        ),
        this.executeWithTimeout(
          this.supabase
            .from('jobs')
            .select('quote_amount, leads!lead_id(status)')
            .not('quote_amount', 'is', null)
            .not('leads.status', 'in', '("closed_won","closed_lost")')
        )
      ])

      // Process results with fallbacks
      const totalJobs = this.extractCount(totalJobsResult) || 0
      
      const commissions = this.extractCommissionValue(commissionJobsResult) || 0
      
      const conversionRate = this.calculateConversionRate(leadsForConversionResult)
      
      const estimatesSent = this.extractCount(estimatesThisMonthResult) || 0
      const estimatesSentLastMonth = this.extractCount(estimatesLastMonthResult) || 0
      
      const pipelineValue = this.extractPipelineValue(pipelineJobsResult) || 0

      const estimateGrowth = estimatesSentLastMonth > 0
        ? ((estimatesSent - estimatesSentLastMonth) / estimatesSentLastMonth) * 100
        : 0

      return {
        success: true,
        data: {
          commissions,
          totalJobs,
          conversionRate,
          pipelineValue,
          estimatesSent,
          estimatesSentLastMonth,
          growth: {
            commissions: 0, // TODO: Implement historical commission tracking
            jobs: 0, // TODO: Implement historical job tracking
            estimates: Number(estimateGrowth.toFixed(1))
          }
        }
      }
    } catch (error) {
      console.error('Error in getDashboardStats:', error)
      return {
        success: false,
        error: 'Failed to fetch dashboard statistics',
        data: this.getDefaultDashboardStats()
      }
    }
  }

  /**
   * Gets performance leaderboard for salespeople
   */
  async getPerformanceLeaderboard(
    timeframe: 'week' | 'month' | 'quarter' = 'month'
  ): Promise<ApiResponse<PerformanceData[]>> {
    try {
      const startDate = this.getStartDateForTimeframe(timeframe)
      
      // First try optimized RPC function if available
      try {
        const { data: performanceData, error } = await this.supabase.rpc(
          'get_performance_leaderboard',
          { start_date: formatISO(startDate) }
        )

        if (!error && performanceData) {
          return {
            success: true,
            data: this.processPerformanceData(performanceData)
          }
        }
      } catch (error) {
        console.warn('RPC function not available, using fallback method')
      }

      // Fallback to individual queries
      return await this.getFallbackPerformanceData(startDate)
    } catch (error) {
      console.error('Error in getPerformanceLeaderboard:', error)
      return {
        success: false,
        error: 'Failed to fetch performance leaderboard'
      }
    }
  }

  /**
   * Gets commission tracking data
   */
  async getCommissionTracking(
    period: 'week' | 'month' | 'quarter' = 'month'
  ): Promise<ApiResponse<{ commissions: CommissionData[], summary: any }>> {
    try {
      const startDate = this.getStartDateForTimeframe(period)

      const { data: commissionData, error } = await this.supabase
        .from('jobs')
        .select(`
          quote_amount,
          updated_at,
          leads!lead_id(
            name,
            status,
            assigned_to,
            users!assigned_to(full_name, commission_rate)
          )
        `)
        .eq('leads.status', 'closed_won')
        .not('quote_amount', 'is', null)
        .gte('updated_at', formatISO(startDate))
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error fetching commission data:', error)
        return { success: false, error: error.message }
      }

      const processedData = (commissionData || []).map(job => {
        const commissionRate = job.leads?.users?.commission_rate || 0.05
        const amount = (job.quote_amount || 0) * commissionRate

        return {
          salesperson: job.leads?.users?.full_name || 'Unknown',
          amount,
          type: 'frontend', // Assuming frontend commission for closed_won
          jobName: job.leads?.name || 'Unknown Job',
          jobValue: job.quote_amount || 0,
          paid: false, // Would need additional tracking
          date: job.updated_at
        }
      })

      const totalCommissions = processedData.reduce((sum, c) => sum + c.amount, 0)

      return {
        success: true,
        data: {
          commissions: processedData,
          summary: {
            total: totalCommissions,
            paid: 0, // Would need additional tracking
            unpaid: totalCommissions,
            count: processedData.length
          }
        }
      }
    } catch (error) {
      console.error('Error in getCommissionTracking:', error)
      return { success: false, error: 'Internal error' }
    }
  }

  // Helper methods
  private extractCount(result: PromiseSettledResult<any>): number {
    if (result.status === 'fulfilled' && result.value) {
      return (result.value as any)?.count || 0
    }
    return 0
  }

  private extractCommissionValue(result: PromiseSettledResult<any>): number {
    if (result.status === 'fulfilled' && result.value?.data) {
      const totalRevenue = result.value.data.reduce(
        (sum: number, job: any) => sum + (job.quote_amount || 0), 
        0
      )
      return totalRevenue * this.COMMISSION_RATE
    }
    return 0
  }

  private calculateConversionRate(result: PromiseSettledResult<any>): number {
    if (result.status === 'fulfilled' && result.value?.data) {
      const leads = result.value.data
      const totalLeads = leads.length
      const wonLeads = leads.filter((l: any) => l.status === 'closed_won').length
      return totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0
    }
    return 0
  }

  private extractPipelineValue(result: PromiseSettledResult<any>): number {
    if (result.status === 'fulfilled' && result.value?.data) {
      return result.value.data.reduce(
        (sum: number, job: any) => sum + (job.quote_amount || 0),
        0
      )
    }
    return 0
  }

  private getStartDateForTimeframe(timeframe: string): Date {
    const now = new Date()
    switch (timeframe) {
      case 'week':
        return subDays(now, 7)
      case 'month':
        return startOfMonth(now)
      case 'quarter':
        return subDays(now, 90)
      default:
        return startOfMonth(now)
    }
  }

  private async getFallbackPerformanceData(startDate: Date): Promise<ApiResponse<PerformanceData[]>> {
    const { data: users } = await this.supabase
      .from('users')
      .select('id, full_name')
      .eq('role', 'salesperson')

    if (!users) {
      return { success: false, error: 'No users found' }
    }

    const userIds = users.map(u => u.id)
    const startDateISO = formatISO(startDate)

    const [callsResult, leadsResult, jobsResult] = await Promise.allSettled([
      this.supabase
        .from('communications')
        .select('user_id')
        .in('user_id', userIds)
        .eq('type', 'call')
        .eq('direction', 'outbound')
        .gte('created_at', startDateISO),
      
      this.supabase
        .from('leads')
        .select('assigned_to')
        .in('assigned_to', userIds)
        .eq('status', 'closed_won')
        .gte('updated_at', startDateISO),
      
      this.supabase
        .from('jobs')
        .select('quote_amount, leads!inner(assigned_to)')
        .in('leads.assigned_to', userIds)
        .not('quote_amount', 'is', null)
        .gte('updated_at', startDateISO)
    ])

    const calls = callsResult.status === 'fulfilled' ? callsResult.value.data || [] : []
    const leads = leadsResult.status === 'fulfilled' ? leadsResult.value.data || [] : []
    const jobs = jobsResult.status === 'fulfilled' ? jobsResult.value.data || [] : []

    const performanceData = users.map(user => {
      const userCalls = calls.filter(c => c.user_id === user.id).length
      const userLeads = leads.filter(l => l.assigned_to === user.id).length
      const userRevenue = jobs
        .filter(j => (j as any).leads?.assigned_to === user.id)
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

    return { success: true, data: performanceData }
  }

  private processPerformanceData(data: any[]): PerformanceData[] {
    return data.map(row => ({
      userId: row.user_id,
      name: row.full_name,
      callsMade: row.calls_made || 0,
      leadsConverted: row.leads_converted || 0,
      revenueGenerated: row.revenue_generated || 0,
      score: (row.calls_made || 0) + ((row.leads_converted || 0) * 10) + ((row.revenue_generated || 0) / 1000)
    })).sort((a, b) => b.score - a.score)
  }

  private getDefaultDashboardStats(): DashboardStats {
    return {
      commissions: 0,
      totalJobs: 0,
      conversionRate: 0,
      pipelineValue: 0,
      estimatesSent: 0,
      estimatesSentLastMonth: 0,
      growth: {
        commissions: 0,
        jobs: 0,
        estimates: 0
      }
    }
  }
}

export const analyticsService = new AnalyticsService()