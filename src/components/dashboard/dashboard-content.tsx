"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { leadsService } from "@/lib/services/leads"
import { Lead } from "@/lib/types/database"
import {
  Users,
  Briefcase,
  DollarSign,
  TrendingUp,
  Calendar,
  Phone,
  MapPin,
  Clock
} from "lucide-react"


export function DashboardContent() {
  const [stats, setStats] = useState({
    totalLeads: 0,
    activeLeads: 0,
    thisMonthLeads: 0,
    lastMonthLeads: 0,
    statusBreakdown: {} as Record<string, number>
  })
  const [recentLeads, setRecentLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        
        // Fetch lead stats with timeout
        const statsPromise = leadsService.getLeadStats()
        const recentPromise = leadsService.getLeads({ limit: 5 })
        
        // Add timeout to prevent infinite loading
        const timeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        )
        
        const [leadStats, recent] = await Promise.race([
          Promise.all([statsPromise, recentPromise]),
          timeout
        ]) as [any, any]
        
        setStats(leadStats)
        setRecentLeads(recent || [])
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        // Set default empty state
        setStats({
          totalLeads: 0,
          activeLeads: 0,
          thisMonthLeads: 0,
          lastMonthLeads: 0,
          statusBreakdown: {}
        })
        setRecentLeads([])
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Good morning!</h1>
        <p className="text-slate-600">Here&apos;s what&apos;s happening with your spray foam business today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-white border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Leads</p>
              <p className="text-3xl font-bold text-slate-900">{stats.totalLeads}</p>
              <p className="text-sm text-green-600 font-medium">
                {getChangePercentage(stats.thisMonthLeads, stats.lastMonthLeads)} from last month
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Active Leads</p>
              <p className="text-3xl font-bold text-slate-900">{stats.activeLeads}</p>
              <p className="text-sm text-slate-600">
                In progress
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">This Month</p>
              <p className="text-3xl font-bold text-slate-900">{stats.thisMonthLeads}</p>
              <p className="text-sm text-slate-600">
                New leads added
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Closed Won</p>
              <p className="text-3xl font-bold text-slate-900">{stats.statusBreakdown.closed_won || 0}</p>
              <p className="text-sm text-green-600">
                Successful deals
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <Briefcase className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-white border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Recent Leads</h3>
            <Button variant="outline" size="sm">View All</Button>
          </div>
          <div className="space-y-4">
            {recentLeads.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Users className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                <p>No leads yet</p>
                <p className="text-sm">Add your first lead to get started</p>
              </div>
            ) : (
              recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-start justify-between p-4 border border-slate-100 rounded-lg">
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
                    {lead.company && (
                      <p className="text-sm text-slate-600 mb-1">{lead.company}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      {lead.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {lead.city && lead.state ? `${lead.city}, ${lead.state}` : lead.address}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {lead.phone}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                      <Calendar className="h-3 w-3" />
                      {new Date(lead.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-6 bg-white border-slate-200">
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
      </div>

      <Card className="p-6 bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-orange-900">Quick Actions</h3>
            <p className="text-orange-700">Common tasks for field operations</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
              Add New Lead
            </Button>
            <Button variant="outline" size="sm" className="border-orange-300 text-orange-700 hover:bg-orange-50">
              Schedule Measurement
            </Button>
            <Button variant="outline" size="sm" className="border-orange-300 text-orange-700 hover:bg-orange-50">
              Update Job Status
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}