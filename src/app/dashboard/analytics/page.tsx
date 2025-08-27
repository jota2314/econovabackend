"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DailyMetricsChart } from "@/components/analytics/daily-metrics-chart"
import { PipelineConversionChart } from "@/components/analytics/pipeline-conversion-chart"
import { CommissionTracking } from "@/components/analytics/commission-tracking"
import { RevenueBySourceChart } from "@/components/analytics/revenue-by-source-chart"
import { PerformanceLeaderboard } from "@/components/analytics/performance-leaderboard"
import { createClient } from "@/lib/supabase/client"
import { User } from "@/lib/types/database"
import { BarChart3, TrendingUp, Users, DollarSign, Trophy, Activity } from "lucide-react"

interface Salesperson {
  id: string
  name: string
  email: string
  role: string
}

export default function AnalyticsPage() {
  const [salespeople, setSalespeople] = useState<Salesperson[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState("overview")

  const supabase = createClient()

  const tabOptions = [
    { value: "overview", label: "Overview", icon: "📊" },
    { value: "activity", label: "Activity", icon: "📈" },
    { value: "pipeline", label: "Pipeline", icon: "👥" },
    { value: "revenue", label: "Revenue", icon: "💰" },
    { value: "performance", label: "Performance", icon: "🎯" }
  ]

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) {
        console.error('Error getting user:', userError)
        return
      }

      if (user) {
        // Get user profile
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()
        
        setCurrentUser(profile)
      }

      // Load salespeople - assuming we have a users table with role field
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, role')
        .eq('role', 'salesperson')
        .order('name')

      if (!usersError && usersData) {
        setSalespeople(usersData.map(u => ({
          id: u.id,
          name: u.name || u.email,
          email: u.email,
          role: u.role
        })))
      }

    } catch (error) {
      console.error('Error loading initial data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading analytics...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics & Reports</h1>
          <p className="text-slate-600">
            Comprehensive business intelligence and performance tracking
          </p>
        </div>
      </div>

      {/* Mobile Tab Selector - Compact Dropdown for small screens */}
      <div className="md:hidden mb-4">
        <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
          <span className="text-sm font-medium text-slate-700 pl-2">View:</span>
          <Select value={selectedTab} onValueChange={setSelectedTab}>
            <SelectTrigger className="w-[200px] border-0 shadow-none focus:ring-0">
              <SelectValue>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{tabOptions.find(t => t.value === selectedTab)?.icon}</span>
                  <span className="font-medium">{tabOptions.find(t => t.value === selectedTab)?.label}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {tabOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} className="py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{option.icon}</span>
                    <span className="font-medium">{option.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        {/* Desktop Tabs */}
        <TabsList className="hidden md:grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="revenue" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Performance
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DailyMetricsChart 
              userId={currentUser?.id} 
              salespeople={salespeople}
            />
            <PipelineConversionChart />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueBySourceChart />
            <PerformanceLeaderboard />
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <DailyMetricsChart 
            userId={currentUser?.id} 
            salespeople={salespeople}
          />
        </TabsContent>

        {/* Pipeline Tab */}
        <TabsContent value="pipeline" className="space-y-6">
          <PipelineConversionChart />
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueBySourceChart />
            <Card>
              <CardHeader>
                <CardTitle>Revenue Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center py-12">
                  Additional revenue metrics and forecasting will be added here
                </p>
              </CardContent>
            </Card>
          </div>
          
          <CommissionTracking 
            userId={currentUser?.id}
            salespeople={salespeople}
          />
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <PerformanceLeaderboard />
          
          <Card>
            <CardHeader>
              <CardTitle>Team Performance Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-center py-12">
                Advanced performance analytics and goal tracking will be added here
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}