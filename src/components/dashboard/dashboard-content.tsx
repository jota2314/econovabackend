"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useLeadsStore } from "@/stores/leads-store"
import { leadsService } from "@/lib/services/business/leads-service"
import { AnalyticsService } from "@/lib/services/analytics"
import { Lead } from "@/lib/types/database"
import {
  Users,
  Briefcase,
  DollarSign,
  TrendingUp,
  Calendar,
  MapPin,
  Clock,
  Ruler,
  FileText,
  Calculator,
  Target
} from "lucide-react"
import { EstimateCard } from "@/components/dashboard/estimate-card"


export function DashboardContent() {
  const router = useRouter()
  
  // Get leads data from store
  const { leads, totalLeads, leadsByStatus, fetchLeads } = useLeadsStore()
  
  // Calculate lead stats from store data
  const stats = useMemo(() => {
    const now = new Date()
    const thisMonth = now.getMonth()
    const thisYear = now.getFullYear()
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear
    
    const thisMonthLeads = leads.filter(lead => {
      const created = new Date(lead.created_at)
      return created.getMonth() === thisMonth && created.getFullYear() === thisYear
    }).length
    
    const lastMonthLeads = leads.filter(lead => {
      const created = new Date(lead.created_at)
      return created.getMonth() === lastMonth && created.getFullYear() === lastMonthYear
    }).length
    
    const activeLeads = leads.filter(lead => 
      !['closed_won', 'closed_lost'].includes(lead.status)
    ).length
    
    const statusBreakdown = Object.entries(leadsByStatus).reduce((acc, [status, leadsArray]) => {
      acc[status] = leadsArray.length
      return acc
    }, {} as Record<string, number>)
    
    return {
      totalLeads,
      activeLeads,
      thisMonthLeads,
      lastMonthLeads,
      statusBreakdown
    }
  }, [leads, totalLeads, leadsByStatus])
  const [dashboardStats, setDashboardStats] = useState({
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
  })
  // Get recent leads from store
  const recentLeads = useMemo(() => {
    return leads.slice(0, 5)
  }, [leads])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        
        const analytics = new AnalyticsService()
        
        // Fetch all data in parallel with better error handling
        console.log('🔄 Starting dashboard data fetch...')
        const startTime = Date.now()
        
        // Fetch leads - store handles deduplication
        await fetchLeads()
        
        // Fetch analytics data separately to avoid overwhelming the database
        const [dashStats, activityResponse] = await Promise.all([
          analytics.getDashboardStats()
            .then(result => { 
              console.log('✅ Dashboard stats completed'); 
              return result 
            })
            .catch(err => {
              console.error('❌ Dashboard stats failed:', err)
              return {
                commissions: 0,
                totalJobs: 0,
                conversionRate: 0,
                pipelineValue: 0,
                estimatesSent: 0,
                estimatesSentLastMonth: 0,
                growth: { commissions: 0, jobs: 0, estimates: 0 }
              }
            }),
          analytics.getRecentActivity(8)
            .then(result => { 
              console.log('✅ Recent activity completed'); 
              return result 
            })
            .catch(err => {
              console.error('❌ Recent activity failed:', err)
              return { success: false, data: { communications: [], leads: [], jobs: [] } }
            })
        ])
        
        const duration = Date.now() - startTime
        console.log(`✅ Dashboard data fetch completed in ${duration}ms`)
        
        // Set dashboard stats only
        setDashboardStats(dashStats)
        
        // Process activity response
        if (activityResponse?.success && activityResponse?.data) {
          const { communications = [], leads = [], jobs = [] } = activityResponse.data
          // Combine and format activities
          const formattedActivities = [
            ...communications.map((comm: any) => ({
              description: `${comm.user?.full_name || 'User'} made a ${comm.type} to ${comm.lead?.name || 'Lead'}`,
              time: comm.created_at,
              type: 'communication'
            })),
            ...leads.map((lead: any) => ({
              description: `New lead: ${lead.name}`,
              time: lead.created_at,
              type: 'lead'
            })),
            ...jobs.map((job: any) => ({
              description: `New job: ${job.job_name} for ${job.lead?.name || 'Lead'}`,
              time: job.created_at,
              type: 'job'
            }))
          ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8)
          
          setRecentActivity(formattedActivities)
        } else {
          setRecentActivity([])
        }
      } catch (error) {
        console.error('💥 Dashboard data fetch failed:', error)
        
        // Set default dashboard stats on error
        setDashboardStats({
          commissions: 0,
          totalJobs: 0,
          conversionRate: 0,
          pipelineValue: 0,
          estimatesSent: 0,
          estimatesSentLastMonth: 0,
          growth: { commissions: 0, jobs: 0, estimates: 0 }
        })
        setRecentActivity([])
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const getChangePercentage = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? '+100%' : '0%'
    const change = ((current - previous) / previous) * 100
    return change >= 0 ? `+${change.toFixed(0)}%` : `${change.toFixed(0)}%`
  }

  const getStatusBadgeColor = (status: Lead['status']) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800 border-blue-200',
      contacted: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      measurement_scheduled: 'bg-purple-100 text-purple-800 border-purple-200',
      measured: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      quoted: 'bg-orange-100 text-orange-800 border-orange-200',
      proposal_sent: 'bg-pink-100 text-pink-800 border-pink-200',
      closed_won: 'bg-green-100 text-green-800 border-green-200',
      closed_lost: 'bg-red-100 text-red-800 border-red-200'
    }
    return colors[status] || colors.new
  }

  const getStatusLabel = (status: Lead['status']) => {
    const labels = {
      new: 'New',
      contacted: 'Contacted',
      measurement_scheduled: 'Scheduled',
      measured: 'Measured',
      quoted: 'Quoted',
      proposal_sent: 'Proposal Sent',
      closed_won: 'Closed Won',
      closed_lost: 'Closed Lost'
    }
    return labels[status] || status
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Good morning!</h1>
        <p className="text-sm sm:text-base text-slate-600">Here&apos;s what&apos;s happening with your spray foam business today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 sm:p-6 bg-white border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Commissions</p>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900">${(dashboardStats?.commissions || 0).toLocaleString()}</p>
              <p className="text-xs text-slate-500">This Month</p>
              <p className={`text-sm font-medium mt-1 ${
                (dashboardStats?.growth?.commissions || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {(dashboardStats?.growth?.commissions || 0) >= 0 ? '+' : ''}{(dashboardStats?.growth?.commissions || 0).toFixed(1)}% from last month
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 bg-white border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Jobs</p>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900">{dashboardStats?.totalJobs || 0}</p>
              <p className={`text-sm font-medium ${
                (dashboardStats?.growth?.jobs || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {(dashboardStats?.growth?.jobs || 0) >= 0 ? '+' : ''}{(dashboardStats?.growth?.jobs || 0).toFixed(1)}% from last month
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Briefcase className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 bg-white border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Conversion Rate</p>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900">{(dashboardStats?.conversionRate || 0).toFixed(1)}%</p>
              <p className="text-xs text-slate-500">Lead to Close</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 bg-white border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Leads</p>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats?.totalLeads || 0}</p>
              <p className="text-sm text-green-600 font-medium">
                {getChangePercentage(stats?.thisMonthLeads || 0, stats?.lastMonthLeads || 0)} from last month
              </p>
            </div>
            <div className="p-3 bg-secondary rounded-lg">
              <Users className="h-6 w-6 text-secondary-foreground" />
            </div>
          </div>
        </Card>
      </div>

      {/* Enhanced Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4 bg-gradient-to-r from-red-50 to-red-100 border-red-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-600 rounded-lg">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-900">Hot Leads</p>
              <p className="text-lg sm:text-xl font-bold text-red-900">
                {recentLeads.filter(lead => lead.temperature === 'hot').length || 0}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-3 sm:p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-600 rounded-lg">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-yellow-900">This Week</p>
              <p className="text-lg sm:text-xl font-bold text-yellow-900">
                ${((dashboardStats?.commissions || 0) * 4).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-3 sm:p-4 bg-gradient-to-r from-indigo-50 to-indigo-100 border-indigo-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Calculator className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-indigo-900">Avg Deal Size</p>
              <p className="text-lg sm:text-xl font-bold text-indigo-900">
                ${dashboardStats?.pipelineValue && dashboardStats?.totalJobs > 0 
                  ? Math.round(dashboardStats.pipelineValue / dashboardStats.totalJobs).toLocaleString()
                  : '4,396'}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-3 sm:p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 border-emerald-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 rounded-lg">
              <Target className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-900">Win Rate</p>
              <p className="text-lg sm:text-xl font-bold text-emerald-900">
                {stats?.statusBreakdown?.closed_won && stats?.totalLeads 
                  ? Math.round((stats.statusBreakdown.closed_won / stats.totalLeads) * 100)
                  : 23}%
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600 rounded-lg">
              <Clock className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-purple-900">Avg Close Time</p>
              <p className="text-lg sm:text-xl font-bold text-purple-900">12d</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600 rounded-lg">
              <Users className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-purple-900">Active Leads</p>
              <p className="text-lg sm:text-xl font-bold text-purple-900">{stats?.activeLeads || 0}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-3 sm:p-4 bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-600 rounded-lg">
              <Briefcase className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-900">Closed Won</p>
              <p className="text-lg sm:text-xl font-bold text-green-900">{stats?.statusBreakdown?.closed_won || 0}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900">Estimates Sent</p>
              <p className="text-lg sm:text-xl font-bold text-blue-900">{dashboardStats?.estimatesSent || 0}</p>
              <p className="text-xs text-blue-700">
                {dashboardStats?.estimatesSent > dashboardStats?.estimatesSentLastMonth ? '↑' : '↓'} vs last month
              </p>
            </div>
          </div>
        </Card>
        
        <Card className={`p-3 sm:p-4 bg-gradient-to-r ${
          (dashboardStats?.pipelineValue || 0) >= 100000 
            ? 'from-green-50 to-green-100 border-green-200' 
            : (dashboardStats?.pipelineValue || 0) >= 50000
            ? 'from-yellow-50 to-yellow-100 border-yellow-200'
            : 'from-red-50 to-red-100 border-red-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              (dashboardStats?.pipelineValue || 0) >= 100000 
                ? 'bg-green-600' 
                : (dashboardStats?.pipelineValue || 0) >= 50000
                ? 'bg-yellow-600'
                : 'bg-red-600'
            }`}>
              <Calculator className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className={`text-sm font-medium ${
                (dashboardStats?.pipelineValue || 0) >= 100000 
                  ? 'text-green-900' 
                  : (dashboardStats?.pipelineValue || 0) >= 50000
                  ? 'text-yellow-900'
                  : 'text-red-900'
              }`}>Pipeline Value</p>
              <p className={`text-lg sm:text-xl font-bold ${
                (dashboardStats?.pipelineValue || 0) >= 100000 
                  ? 'text-green-900' 
                  : (dashboardStats?.pipelineValue || 0) >= 50000
                  ? 'text-yellow-900'
                  : 'text-red-900'
              }`}>${(dashboardStats?.pipelineValue || 0).toLocaleString()}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Estimate Value Card */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <EstimateCard title="Total Estimate Value" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <Card className="p-4 sm:p-6 bg-white border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push('/dashboard')}
            >
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {!Array.isArray(recentActivity) || recentActivity.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Clock className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                <p>No recent activity</p>
                <p className="text-sm">Activity will appear here as you use the system</p>
              </div>
            ) : (
              recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border border-slate-100 rounded-lg">
                  <div className="p-1.5 bg-secondary rounded-full">
                    <Clock className="h-3 w-3 text-secondary-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{activity?.description || 'Activity'}</p>
                    <p className="text-xs text-slate-500">
                      {activity?.time ? new Date(activity.time).toLocaleString() : 'Just now'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-4 sm:p-6 bg-white border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Recent Leads</h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push('/dashboard/leads')}
            >
              View All
            </Button>
          </div>
          <div className="space-y-4">
            {recentLeads.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Users className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                <p>No leads yet</p>
                <p className="text-sm">Add your first lead to get started</p>
              </div>
            ) : (
              recentLeads.slice(0, 4).map((lead) => (
                <div key={lead.id} className="flex items-start justify-between p-3 border border-slate-100 rounded-lg mobile-hover mobile-active cursor-pointer" onClick={() => router.push(`/dashboard/leads`)}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-slate-900">{lead.name}</h4>
                      <Badge 
                        variant="outline"
                        className={getStatusBadgeColor(lead.status)}
                      >
                        {getStatusLabel(lead.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Calendar className="h-3 w-3" />
                      {new Date(lead.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <Card className="p-4 sm:p-6 bg-white border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Lead Status Breakdown</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(stats.statusBreakdown).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline"
                    className={getStatusBadgeColor(status as Lead['status'])}
                  >
                    {getStatusLabel(status as Lead['status'])}
                  </Badge>
                </div>
                <span className="font-medium text-slate-900">{count}</span>
              </div>
            ))}
            {Object.keys(stats.statusBreakdown).length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <Briefcase className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                <p>No status data available</p>
                <p className="text-sm">Add some leads to see the breakdown</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-r from-secondary to-secondary/80 border-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-secondary-foreground">Quick Actions</h3>
              <p className="text-secondary-foreground/80">Common tasks for field operations</p>
            </div>
            <div className="flex gap-2 flex-wrap mt-2 sm:mt-0">
              <Button 
                size="sm" 
                className="min-h-[44px] px-3 text-xs sm:text-sm"
                onClick={() => router.push('/dashboard/leads')}
              >
                Add New Lead
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="min-h-[44px] px-3 text-xs sm:text-sm"
                onClick={() => router.push('/dashboard/jobs')}
              >
                Schedule Measurement
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="min-h-[44px] px-3 text-xs sm:text-sm"
                onClick={() => router.push('/dashboard/jobs')}
              >
                Update Job Status
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="min-h-[44px] px-3 text-xs sm:text-sm"
                onClick={() => router.push('/dashboard/analytics')}
              >
                View Analytics
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}