"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { DollarSign, TrendingUp, User, Calendar, CheckCircle, Clock } from "lucide-react"
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns"

interface CommissionData {
  userId: string
  salesperson_name: string
  frontend_commission: number
  backend_commission: number
  total_commission: number
  leads_converted: number
  total_revenue: number
  payment_status: 'pending' | 'paid' | 'partial'
  last_payment_date?: string
  pending_amount: number
}

interface CommissionTrackingProps {
  userId?: string
  salespeople?: Array<{ id: string, name: string }>
}

export function CommissionTracking({ userId, salespeople = [] }: CommissionTrackingProps) {
  const [commissions, setCommissions] = useState<CommissionData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<string>(userId || "all")
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())

  useEffect(() => {
    loadCommissionData()
  }, [selectedUser, selectedMonth])

  const loadCommissionData = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        month: selectedMonth.toISOString()
      })
      
      if (selectedUser !== "all") {
        params.append("userId", selectedUser)
      }

      const response = await fetch(`/api/analytics/commission?${params}`)
      const result = await response.json()

      if (result.success) {
        setCommissions(result.data)
      }
    } catch (error) {
      console.error('Error loading commission data:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalCommissions = commissions.reduce((sum, c) => sum + c.total_commission, 0)
  const totalPending = commissions.reduce((sum, c) => sum + c.pending_amount, 0)
  const totalPaid = totalCommissions - totalPending

  const chartData = commissions.map(c => ({
    name: c.salesperson_name,
    frontend: c.frontend_commission,
    backend: c.backend_commission,
    total: c.total_commission
  }))

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'partial': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-red-100 text-red-800'
    }
  }

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
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Commission Tracking
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Monitor sales commissions and payment status
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Total Commission</span>
              </div>
              <div className="text-2xl font-bold text-blue-900">
                ${totalCommissions.toLocaleString()}
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Paid</span>
              </div>
              <div className="text-2xl font-bold text-green-900">
                ${totalPaid.toLocaleString()}
              </div>
            </div>
            
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-900">Pending</span>
              </div>
              <div className="text-2xl font-bold text-red-900">
                ${totalPending.toLocaleString()}
              </div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Salespeople</span>
              </div>
              <div className="text-2xl font-bold text-purple-900">{commissions.length}</div>
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, '']} />
                  <Bar dataKey="frontend" stackId="a" fill="#3b82f6" name="Frontend Commission" />
                  <Bar dataKey="backend" stackId="a" fill="#10b981" name="Backend Commission" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Commission Table */}
      <Card>
        <CardHeader>
          <CardTitle>Commission Details</CardTitle>
        </CardHeader>
        <CardContent>
          {commissions.length > 0 ? (
            <div className="space-y-4">
              {commissions.map((commission) => (
                <div 
                  key={commission.userId} 
                  className="border rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <h3 className="font-semibold">{commission.salesperson_name}</h3>
                        <Badge className={getPaymentStatusColor(commission.payment_status)}>
                          {commission.payment_status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Frontend:</span>
                          <div className="font-semibold">${commission.frontend_commission.toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Backend:</span>
                          <div className="font-semibold">${commission.backend_commission.toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Total:</span>
                          <div className="font-semibold text-lg">${commission.total_commission.toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Leads Converted:</span>
                          <div className="font-semibold">{commission.leads_converted}</div>
                        </div>
                      </div>
                      
                      {commission.pending_amount > 0 && (
                        <div className="mt-2 text-sm text-red-600">
                          Pending: ${commission.pending_amount.toLocaleString()}
                        </div>
                      )}
                      
                      {commission.last_payment_date && (
                        <div className="mt-1 text-xs text-gray-500">
                          Last payment: {format(new Date(commission.last_payment_date), 'MMM dd, yyyy')}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {commission.payment_status === 'pending' && (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          Mark Paid
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <DollarSign className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No commission data</h3>
              <p className="text-gray-600">
                Commission data will appear here once leads start converting
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}