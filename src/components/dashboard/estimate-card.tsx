"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DollarSign, TrendingUp, FileText, Clock } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface EstimateCardProps {
  serviceType?: 'insulation' | 'hvac' | 'plaster' | null
  title?: string
}

export function EstimateCard({ serviceType = null, title = "Estimate Value" }: EstimateCardProps) {
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [periodFilter, setPeriodFilter] = useState('month')
  const [estimateData, setEstimateData] = useState({
    total_amount: 0,
    total_count: 0,
    pending_amount: 0,
    pending_count: 0,
    approved_amount: 0,
    approved_count: 0,
    average_amount: 0
  })

  const fetchEstimates = useCallback(async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (serviceType) params.append('service_type', serviceType)
      params.append('period', periodFilter)

      const response = await fetch(`/api/estimates?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        setEstimateData(result.data.summary)
      }
    } catch (error) {
      console.error('Error fetching estimates:', error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, periodFilter, serviceType])

  useEffect(() => {
    fetchEstimates()
  }, [fetchEstimates])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getDisplayAmount = () => {
    switch (statusFilter) {
      case 'pending_approval':
        return estimateData.pending_amount
      case 'approved':
        return estimateData.approved_amount
      default:
        return estimateData.total_amount
    }
  }

  const getDisplayCount = () => {
    switch (statusFilter) {
      case 'pending_approval':
        return estimateData.pending_count
      case 'approved':
        return estimateData.approved_count
      default:
        return estimateData.total_count
    }
  }

  const getPeriodLabel = () => {
    switch (periodFilter) {
      case 'today':
        return 'Today'
      case 'week':
        return 'This Week'
      case 'month':
        return 'This Month'
      case 'year':
        return 'This Year'
      default:
        return ''
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            {title}
          </CardTitle>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Estimates</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending_approval">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="h-8 w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="year">Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-40" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-bold text-slate-900">
                {formatCurrency(getDisplayAmount())}
              </h2>
              {estimateData.average_amount > 0 && (
                <span className="text-sm text-green-600 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {formatCurrency(estimateData.average_amount)} avg
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {getDisplayCount()} {getDisplayCount() === 1 ? 'estimate' : 'estimates'}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {getPeriodLabel()}
              </span>
            </div>

            {statusFilter === 'all' && (
              <div className="pt-3 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Pending Approval:</span>
                  <span className="font-medium">
                    {formatCurrency(estimateData.pending_amount)} 
                    <span className="text-slate-400 ml-1">({estimateData.pending_count})</span>
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Approved:</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(estimateData.approved_amount)}
                    <span className="text-slate-400 ml-1">({estimateData.approved_count})</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}