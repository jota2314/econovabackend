"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Ruler,
  Briefcase,
  DollarSign,
  TrendingUp,
  Target,
  Wind,
  Layers,
  PaintBucket,
  Calculator
} from 'lucide-react'

interface JobStats {
  total_jobs: number
  total_square_feet: number
  service_specific_count: number
  won_jobs: number
  lost_jobs: number
  pending_jobs: number
  in_progress_jobs: number
  total_quote_amount: number
  won_quote_amount: number
  total_commissions: number
  win_rate: number
  // Estimate metrics
  total_estimates: number
  pending_estimates: number
  approved_estimates: number
  rejected_estimates: number
  draft_estimates: number
  total_estimate_value: number
  approved_estimate_value: number
  pending_estimate_value: number
  average_estimate_value: number
}

interface WorkflowMetric {
  count: number
  revenue: number
  label: string
}

interface EnhancedJobCardsProps {
  serviceType: 'all' | 'insulation' | 'hvac' | 'plaster'
  workflowMetrics?: Record<string, WorkflowMetric>
}

export function EnhancedJobCards({ serviceType, workflowMetrics }: EnhancedJobCardsProps) {
  console.log('🎯 EnhancedJobCards mounting with serviceType:', serviceType)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [periodFilter, setPeriodFilter] = useState('year')
  const [estimateToggle, setEstimateToggle] = useState<'count' | 'revenue'>('count')
  const supabase = createClient()
  const [jobStats, setJobStats] = useState<JobStats>({
    total_jobs: 0,
    total_square_feet: 0,
    service_specific_count: 0,
    won_jobs: 0,
    lost_jobs: 0,
    pending_jobs: 0,
    in_progress_jobs: 0,
    total_quote_amount: 0,
    won_quote_amount: 0,
    total_commissions: 0,
    win_rate: 0,
    // Estimate metrics
    total_estimates: 0,
    pending_estimates: 0,
    approved_estimates: 0,
    rejected_estimates: 0,
    draft_estimates: 0,
    total_estimate_value: 0,
    approved_estimate_value: 0,
    pending_estimate_value: 0,
    average_estimate_value: 0
  })

  const fetchJobStats = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('🎯 fetchJobStats called with serviceType:', serviceType, 'period:', periodFilter)
      
      const params = new URLSearchParams()
      if (serviceType !== 'all') params.append('service_type', serviceType)
      params.append('period', periodFilter)

      console.log('🎯 Making stats API call to:', `/api/jobs/stats?${params.toString()}`)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const response = await fetch(`/api/jobs/stats?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      console.log('🎯 Stats API response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`)
      }
      
      const result = await response.json()
      console.log('🔍 Stats API response:', result)

      if (result.success) {
        console.log('📊 Setting job stats:', result.data)
        setJobStats(result.data)
      } else {
        console.error('Stats API error:', result.error)
        setError(result.error || 'Failed to load job statistics')
      }
    } catch (error) {
      console.error('Error fetching job stats:', error)
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setError('Request timed out. Please try again.')
        } else {
          setError(error.message)
        }
      } else {
        setError('Failed to load job statistics')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log('🎯 useEffect triggered with serviceType:', serviceType, 'periodFilter:', periodFilter)
    fetchJobStats()
  }, [serviceType, periodFilter])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getServiceSpecificIcon = () => {
    switch (serviceType) {
      case 'hvac':
        return <Wind className="h-8 w-8 text-blue-600 mr-4" />
      case 'insulation':
        return <Layers className="h-8 w-8 text-green-600 mr-4" />
      case 'plaster':
        return <PaintBucket className="h-8 w-8 text-orange-600 mr-4" />
      default:
        return <Briefcase className="h-8 w-8 text-purple-600 mr-4" />
    }
  }

  const getServiceSpecificLabel = () => {
    switch (serviceType) {
      case 'hvac':
        return 'Systems Quoted'
      case 'insulation':
        return 'Areas Insulated'
      case 'plaster':
        return 'Repairs Completed'
      default:
        return 'Total Projects'
    }
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
            <p className="font-medium">Error loading job statistics</p>
            <p className="text-sm mt-1">{error}</p>
            <button 
              onClick={fetchJobStats}
              className="mt-2 px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
            >
              Retry
            </button>
          </div>
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-[120px]">
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
        {/* Show skeleton cards even with error */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="opacity-50">
              <CardContent className="flex items-center p-6">
                <div className="h-8 w-8 bg-gray-300 rounded mr-4 animate-pulse" />
                <div>
                  <div className="h-8 w-20 bg-gray-300 rounded animate-pulse mb-2" />
                  <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Time Period Filter */}
      <div className="flex justify-end">
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-[120px]">
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

      {/* Cards Grid */}
      {serviceType === 'all' ? (
        // All Trades - Revenue Focused Cards
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* 1. Total Estimate (All Estimates Created) */}
          <Card>
            <CardContent className="flex items-center p-6">
              <DollarSign className="h-8 w-8 text-green-600 mr-4" />
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {loading ? '...' : formatCurrency(jobStats.total_estimate_value)}
                </p>
                <p className="text-sm text-slate-600">Total Estimate</p>
                <p className="text-xs text-slate-400">
                  {jobStats.total_estimates} estimates created
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 2. Estimates Sent (Toggleable) - Uses workflow sent to customer if available */}
          <Card 
            className="cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => setEstimateToggle(prev => prev === 'count' ? 'revenue' : 'count')}
          >
            <CardContent className="flex items-center p-6">
              <Calculator className="h-8 w-8 text-blue-600 mr-4" />
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {loading ? '...' : 
                    estimateToggle === 'count' 
                      ? workflowMetrics?.send_to_customer?.count 
                        ? `${workflowMetrics.send_to_customer.count} Sent`
                        : `${jobStats.total_estimates}`
                      : workflowMetrics?.send_to_customer?.revenue
                        ? formatCurrency(workflowMetrics.send_to_customer.revenue)
                        : formatCurrency(jobStats.total_estimate_value)
                  }
                </p>
                <p className="text-sm text-slate-600">
                  {estimateToggle === 'count' ? 'Estimates Sent' : 'Total Value'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {jobStats.pending_estimates} pending • {jobStats.approved_estimates} approved
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 3. Jobs Won (Toggleable) - Uses workflow metrics if available */}
          <Card 
            className="cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => setEstimateToggle(prev => prev === 'count' ? 'revenue' : 'count')}
          >
            <CardContent className="flex items-center p-6">
              <Target className="h-8 w-8 text-green-600 mr-4" />
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {loading ? '...' : 
                    estimateToggle === 'count' 
                      ? workflowMetrics?.mark_won?.count 
                        ? `${workflowMetrics.mark_won.count} Won`
                        : `${jobStats.won_jobs} Won`
                      : workflowMetrics?.mark_won?.revenue
                        ? formatCurrency(workflowMetrics.mark_won.revenue)
                        : formatCurrency(jobStats.won_quote_amount)
                  }
                </p>
                <p className="text-sm text-slate-600">Jobs Won</p>
                <p className="text-xs text-slate-400 mt-1">Click to toggle</p>
              </div>
            </CardContent>
          </Card>

          {/* 4. Commissions */}
          <Card>
            <CardContent className="flex items-center p-6">
              <DollarSign className="h-8 w-8 text-green-600 mr-4" />
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {loading ? '...' : formatCurrency(jobStats.total_commissions)}
                </p>
                <p className="text-sm text-slate-600">Commissions</p>
                <p className="text-xs text-slate-400">5% on won jobs</p>
              </div>
            </CardContent>
          </Card>

        </div>
      ) : (
        // Service-Specific Cards - Same as All Trades (Revenue Focused)
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* 1. Total Estimate (All Estimates) */}
          <Card>
            <CardContent className="flex items-center p-6">
              <DollarSign className="h-8 w-8 text-green-600 mr-4" />
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {loading ? '...' : formatCurrency(jobStats.total_estimate_value)}
                </p>
                <p className="text-sm text-slate-600">Total Estimate</p>
                <p className="text-xs text-slate-400">All estimates created</p>
              </div>
            </CardContent>
          </Card>

          {/* 2. Estimates Sent (Toggleable) */}
          <Card 
            className="cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => setEstimateToggle(prev => prev === 'count' ? 'revenue' : 'count')}
          >
            <CardContent className="flex items-center p-6">
              <Calculator className="h-8 w-8 text-blue-600 mr-4" />
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {loading ? '...' : 
                    estimateToggle === 'count' 
                      ? `${jobStats.total_jobs} Sent`
                      : formatCurrency(jobStats.total_quote_amount)
                  }
                </p>
                <p className="text-sm text-slate-600">Estimates</p>
                <p className="text-xs text-slate-400 mt-1">Click to toggle</p>
              </div>
            </CardContent>
          </Card>

          {/* 3. Jobs Won (Toggleable) */}
          <Card 
            className="cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => setEstimateToggle(prev => prev === 'count' ? 'revenue' : 'count')}
          >
            <CardContent className="flex items-center p-6">
              <Target className="h-8 w-8 text-green-600 mr-4" />
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {loading ? '...' : 
                    estimateToggle === 'count' 
                      ? `${jobStats.won_jobs} Won`
                      : formatCurrency(jobStats.won_quote_amount)
                  }
                </p>
                <p className="text-sm text-slate-600">Jobs Won</p>
                <p className="text-xs text-slate-400 mt-1">Click to toggle</p>
              </div>
            </CardContent>
          </Card>

          {/* 4. Commissions */}
          <Card>
            <CardContent className="flex items-center p-6">
              <DollarSign className="h-8 w-8 text-green-600 mr-4" />
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {loading ? '...' : formatCurrency(jobStats.total_commissions)}
                </p>
                <p className="text-sm text-slate-600">Commissions</p>
                <p className="text-xs text-slate-400">5% on won jobs</p>
              </div>
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  )
}