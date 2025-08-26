"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FunnelChart, Funnel, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { TrendingUp, Users, Target, CheckCircle } from "lucide-react"
import { format, subDays, startOfMonth, endOfMonth } from "date-fns"

interface ConversionData {
  stage: string
  count: number
  percentage: number
  conversionRate?: number
}

interface PipelineConversionChartProps {
  className?: string
}

export function PipelineConversionChart({ className }: PipelineConversionChartProps) {
  const [data, setData] = useState<ConversionData[]>([])
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState<"30days" | "thisMonth" | "90days">("30days")

  useEffect(() => {
    loadConversionData()
  }, [timeframe])

  const loadConversionData = async () => {
    try {
      setLoading(true)
      
      let startDate, endDate
      
      if (timeframe === "thisMonth") {
        startDate = startOfMonth(new Date())
        endDate = endOfMonth(new Date())
      } else if (timeframe === "30days") {
        endDate = new Date()
        startDate = subDays(endDate, 30)
      } else {
        endDate = new Date()
        startDate = subDays(endDate, 90)
      }
      
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })

      const response = await fetch(`/api/analytics/pipeline-conversion?${params}`)
      const result = await response.json()

      if (result.success && Array.isArray(result.data)) {
        setData(result.data)
      } else {
        setData([])
        console.error('Invalid data format from API:', result)
      }
    } catch (error) {
      console.error('Error loading conversion data:', error)
    } finally {
      setLoading(false)
    }
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  const totalLeads = Array.isArray(data) && data.length > 0 ? data[0]?.count || 0 : 0
  const closedWon = Array.isArray(data) ? data.find(item => item?.stage?.toLowerCase()?.includes('won'))?.count || 0 : 0
  const overallConversion = totalLeads > 0 ? ((closedWon / totalLeads) * 100).toFixed(1) : '0.0'

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Sales Pipeline Conversion
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Track lead progression through sales stages
            </p>
          </div>
          
          <Select value={timeframe} onValueChange={(value: typeof timeframe) => setTimeframe(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Total Leads</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">{totalLeads}</div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">Closed Won</span>
            </div>
            <div className="text-2xl font-bold text-green-900">{closedWon}</div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Conversion Rate</span>
            </div>
            <div className="text-2xl font-bold text-purple-900">{overallConversion}%</div>
          </div>
        </div>

        {/* Funnel Chart */}
        {data.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <FunnelChart>
                <Tooltip 
                  content={({ payload }) => {
                    if (payload && payload.length > 0) {
                      const data = payload[0].payload as ConversionData
                      return (
                        <div className="bg-white border rounded-lg shadow-lg p-3">
                          <p className="font-semibold">{data.stage}</p>
                          <p className="text-sm text-gray-600">Count: {data.count}</p>
                          <p className="text-sm text-gray-600">
                            Percentage: {data.percentage.toFixed(1)}%
                          </p>
                          {data.conversionRate && (
                            <p className="text-sm text-gray-600">
                              Conversion: {data.conversionRate.toFixed(1)}%
                            </p>
                          )}
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Funnel
                  dataKey="count"
                  data={data}
                  isAnimationActive
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-12">
            <Target className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No conversion data</h3>
            <p className="text-gray-600">
              Create some leads to see pipeline conversion analytics
            </p>
          </div>
        )}

        {/* Stage Breakdown */}
        {data.length > 0 && (
          <div className="mt-6 space-y-2">
            <h4 className="font-semibold text-gray-900 mb-3">Stage Breakdown</h4>
            {data.map((stage, index) => (
              <div key={stage.stage} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="font-medium">{stage.stage}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{stage.count}</div>
                  <div className="text-sm text-gray-500">{stage.percentage.toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}