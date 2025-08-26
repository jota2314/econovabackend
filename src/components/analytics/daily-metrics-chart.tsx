"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { CalendarIcon, TrendingUp, Phone, MessageSquare, Ruler } from "lucide-react"
import { format, subDays } from "date-fns"

interface DailyMetric {
  date: string
  calls_made: number
  sms_sent: number
  leads_contacted: number
  measurements_completed: number
  salesperson_name?: string
}

interface DailyMetricsChartProps {
  userId?: string
  salespeople?: Array<{ id: string, name: string }>
}

export function DailyMetricsChart({ userId, salespeople = [] }: DailyMetricsChartProps) {
  const [metrics, setMetrics] = useState<DailyMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<string>(userId || "all")
  const [dateRange, setDateRange] = useState<"7days" | "30days" | "90days">("30days")

  useEffect(() => {
    loadMetrics()
  }, [selectedUser, dateRange])

  const loadMetrics = async () => {
    try {
      setLoading(true)
      
      const days = dateRange === "7days" ? 7 : dateRange === "30days" ? 30 : 90
      const endDate = new Date()
      const startDate = subDays(endDate, days)
      
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })
      
      if (selectedUser !== "all") {
        params.append("userId", selectedUser)
      }

      const response = await fetch(`/api/analytics/daily-metrics?${params}`)
      const result = await response.json()

      if (result.success) {
        const formattedData = result.data.map((item: DailyMetric) => ({
          ...item,
          date: format(new Date(item.date), "MMM dd")
        }))
        setMetrics(formattedData)
      }
    } catch (error) {
      console.error('Error loading daily metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalMetrics = metrics.reduce(
    (acc, day) => ({
      calls: acc.calls + day.calls_made,
      sms: acc.sms + day.sms_sent,
      leads: acc.leads + day.leads_contacted,
      measurements: acc.measurements + day.measurements_completed
    }),
    { calls: 0, sms: 0, leads: 0, measurements: 0 }
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Daily Activity Metrics
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Track daily performance across key activities
            </p>
          </div>
          
          <div className="flex gap-2">
            {salespeople.length > 0 && (
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Salespeople</SelectItem>
                  {salespeople.map(person => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Select value={dateRange} onValueChange={(value: "7days" | "30days" | "90days") => setDateRange(value)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">7 Days</SelectItem>
                <SelectItem value="30days">30 Days</SelectItem>
                <SelectItem value="90days">90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Calls</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">{totalMetrics.calls}</div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">SMS</span>
            </div>
            <div className="text-2xl font-bold text-green-900">{totalMetrics.sms}</div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Leads</span>
            </div>
            <div className="text-2xl font-bold text-purple-900">{totalMetrics.leads}</div>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-900">Measurements</span>
            </div>
            <div className="text-2xl font-bold text-orange-900">{totalMetrics.measurements}</div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metrics} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="calls_made" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Calls Made"
              />
              <Line 
                type="monotone" 
                dataKey="sms_sent" 
                stroke="#10b981" 
                strokeWidth={2}
                name="SMS Sent"
              />
              <Line 
                type="monotone" 
                dataKey="leads_contacted" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                name="Leads Contacted"
              />
              <Line 
                type="monotone" 
                dataKey="measurements_completed" 
                stroke="#f59e0b" 
                strokeWidth={2}
                name="Measurements"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}