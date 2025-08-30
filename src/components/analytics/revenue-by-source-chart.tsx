"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { DollarSign, TrendingUp, Target, Globe } from "lucide-react"
import { format, subMonths } from "date-fns"

interface RevenueBySource {
  lead_source: string
  total_revenue: number
  lead_count: number
  avg_deal_size: number
  conversion_rate: number
}

interface RevenueBySourceChartProps {
  className?: string
}

export function RevenueBySourceChart({ className }: RevenueBySourceChartProps) {
  const [data, setData] = useState<RevenueBySource[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())
  const [viewType, setViewType] = useState<'pie' | 'bar'>('pie')

  useEffect(() => {
    loadRevenueData()
  }, [selectedMonth])

  const loadRevenueData = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        month: selectedMonth.toISOString()
      })

      const response = await fetch(`/api/analytics/revenue-by-source?${params}`)
      const result = await response.json()

      if (result.success) {
        // Ensure data is an array before setting state
        const validData = Array.isArray(result.data) ? result.data : []
        setData(validData)
      }
    } catch (error) {
      console.error('Error loading revenue data:', error)
    } finally {
      setLoading(false)
    }
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16']
  
  const totalRevenue = Array.isArray(data) ? data.reduce((sum, item) => sum + item.total_revenue, 0) : 0
  const totalLeads = Array.isArray(data) ? data.reduce((sum, item) => sum + item.lead_count, 0) : 0
  const avgDealSize = totalLeads > 0 ? totalRevenue / totalLeads : 0

  const pieData = Array.isArray(data) ? data.map(item => ({
    name: item.lead_source,
    value: item.total_revenue,
    percentage: totalRevenue > 0 ? ((item.total_revenue / totalRevenue) * 100).toFixed(1) : '0'
  })) : []

  const barData = Array.isArray(data) ? data.map(item => ({
    source: item.lead_source.length > 15 ? item.lead_source.substring(0, 15) + '...' : item.lead_source,
    revenue: item.total_revenue,
    leads: item.lead_count,
    avgDeal: item.avg_deal_size
  })) : []

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
              Revenue by Lead Source
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Track revenue performance across different lead sources
            </p>
          </div>
          
          <div className="flex gap-2">
            <Select 
              value={viewType} 
              onValueChange={(value: 'pie' | 'bar') => setViewType(value)}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pie">Pie Chart</SelectItem>
                <SelectItem value="bar">Bar Chart</SelectItem>
              </SelectContent>
            </Select>
            
            <Select 
              value={format(selectedMonth, 'yyyy-MM')} 
              onValueChange={(value) => setSelectedMonth(new Date(value + '-01'))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => {
                  const month = subMonths(new Date(), i)
                  return (
                    <SelectItem key={i} value={format(month, 'yyyy-MM')}>
                      {format(month, 'MMM yyyy')}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Total Revenue</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">
              ${totalRevenue.toLocaleString()}
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">Lead Sources</span>
            </div>
            <div className="text-2xl font-bold text-green-900">{Array.isArray(data) ? data.length : 0}</div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Avg Deal Size</span>
            </div>
            <div className="text-2xl font-bold text-purple-900">
              ${avgDealSize.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Charts */}
        {Array.isArray(data) && data.length > 0 ? (
          <div className="space-y-6">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {viewType === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Array.isArray(pieData) ? pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      )) : []}
                    </Pie>
                    <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']} />
                    <Legend />
                  </PieChart>
                ) : (
                  <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="source" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'revenue' ? `$${Number(value).toLocaleString()}` : value,
                        name === 'revenue' ? 'Revenue' : name === 'leads' ? 'Leads' : 'Avg Deal'
                      ]}
                    />
                    <Bar dataKey="revenue" fill="#3b82f6" name="revenue" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Detailed Table */}
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900 mb-3">Source Breakdown</h4>
              <div className="overflow-x-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' }}>
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 min-w-[120px]">Source</th>
                      <th className="text-right py-2 px-3 min-w-[100px]">Revenue</th>
                      <th className="text-right py-2 px-3 min-w-[80px]">Leads</th>
                      <th className="text-right py-2 px-3 min-w-[100px]">Avg Deal</th>
                      <th className="text-right py-2 px-3 min-w-[100px]">Conversion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(data) ? data.map((source, index) => (
                      <tr key={source.lead_source} className="border-b">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            {source.lead_source}
                          </div>
                        </td>
                        <td className="text-right py-3 px-3 font-semibold">
                          ${source.total_revenue.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-3">{source.lead_count}</td>
                        <td className="text-right py-3 px-3">
                          ${source.avg_deal_size.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-3">
                          {source.conversion_rate.toFixed(1)}%
                        </td>
                      </tr>
                    )) : []}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Target className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No revenue data</h3>
            <p className="text-gray-600">
              Revenue data will appear here once deals start closing
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}