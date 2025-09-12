"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckCircle2, AlertCircle, RefreshCw, Eye, Search, Filter, TrendingUp, Clock, DollarSign, FileText } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

interface Estimate {
  id: string
  estimate_number: string
  status: 'draft' | 'pending_approval' | 'sent' | 'approved' | 'rejected'
  total_amount?: number
  created_at: string
  jobs: {
    job_name: string
    service_type?: string
    lead?: {
      name: string
      email?: string
      phone?: string
    }
  }
  created_by_user: {
    full_name: string
  }
}

interface EstimateSummary {
  total_count: number
  total_amount: number
  pending_count: number
  pending_amount: number
  approved_count: number
  approved_amount: number
  average_amount: number
}

export default function EstimateApprovalsPage() {
  const router = useRouter()
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [filteredEstimates, setFilteredEstimates] = useState<Estimate[]>([])
  const [summary, setSummary] = useState<EstimateSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_approval' | 'approved' | 'rejected'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchEstimates = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/estimates')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch estimates')
      }
      
      setEstimates(data.data?.estimates || [])
      setSummary(data.data?.summary || null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Error fetching estimates:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch(`/api/estimates/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve estimate')
      }
      
      toast.success('Estimate approved successfully')
      fetchEstimates() // Refresh the list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      toast.error(`Failed to approve: ${errorMessage}`)
    }
  }

  const handleReject = async (id: string) => {
    try {
      const supabase = createClient()
      const session = await supabase.auth.getSession()
      
      const response = await fetch(`/api/estimates/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session?.access_token}`
        }
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject estimate')
      }
      
      toast.success('Estimate rejected')
      fetchEstimates() // Refresh the list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      toast.error(`Failed to reject: ${errorMessage}`)
    }
  }

  const handleViewEstimate = (estimateId: string) => {
    router.push(`/dashboard/estimates/${estimateId}`)
  }

  // Filter estimates based on status and search query
  useEffect(() => {
    let filtered = estimates

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(estimate => estimate.status === statusFilter)
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(estimate =>
        estimate.estimate_number.toLowerCase().includes(query) ||
        estimate.jobs.job_name.toLowerCase().includes(query) ||
        estimate.jobs.lead?.name?.toLowerCase().includes(query) ||
        estimate.created_by_user.full_name.toLowerCase().includes(query)
      )
    }

    setFilteredEstimates(filtered)
  }, [estimates, statusFilter, searchQuery])

  useEffect(() => {
    fetchEstimates()
  }, [])

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'draft': { variant: 'outline' as const, color: 'bg-gray-100 text-gray-700 border-gray-300', icon: FileText },
      'pending_approval': { variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
      'sent': { variant: 'secondary' as const, color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Eye },
      'approved': { variant: 'default' as const, color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle2 },
      'rejected': { variant: 'destructive' as const, color: 'bg-red-100 text-red-800 border-red-300', icon: AlertCircle }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
    const Icon = config.icon
    
    return (
      <Badge className={`${config.color} flex items-center gap-1.5 px-2.5 py-1`}>
        <Icon className="h-3.5 w-3.5" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }

  const getFilteredSummary = () => {
    const filtered = filteredEstimates
    return {
      total: filtered.length,
      pending: filtered.filter(e => e.status === 'pending_approval').length,
      approved: filtered.filter(e => e.status === 'approved').length,
      rejected: filtered.filter(e => e.status === 'rejected').length,
      totalValue: filtered.reduce((sum, e) => sum + (e.total_amount || 0), 0),
      pendingValue: filtered.filter(e => e.status === 'pending_approval').reduce((sum, e) => sum + (e.total_amount || 0), 0),
      approvedValue: filtered.filter(e => e.status === 'approved').reduce((sum, e) => sum + (e.total_amount || 0), 0),
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading estimates...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">Error: {error}</p>
          <Button onClick={fetchEstimates}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  const filteredSummary = getFilteredSummary()

  return (
    <div className="space-y-8 p-6">
      {/* Enhanced Header with gradient background */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-accent p-8 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight">Estimate Approvals</h1>
              <p className="text-white/90 text-lg">
                Review, filter, and approve pending estimates with enhanced visibility
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={fetchEstimates}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search estimates, jobs, customers, or creators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-base"
            />
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'All Estimates', icon: FileText },
            { key: 'pending_approval', label: 'Pending Approval', icon: Clock },
            { key: 'approved', label: 'Approved', icon: CheckCircle2 },
            { key: 'rejected', label: 'Rejected', icon: AlertCircle },
          ].map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              variant={statusFilter === key ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(key as any)}
              className={`h-10 px-4 ${
                statusFilter === key 
                  ? 'bg-primary text-white shadow-lg' 
                  : 'hover:bg-muted border-2'
              }`}
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
              {key !== 'all' && (
                <Badge 
                  variant="secondary" 
                  className={`ml-2 px-2 py-0.5 text-xs ${
                    statusFilter === key ? 'bg-white/20 text-white' : ''
                  }`}
                >
                  {key === 'pending_approval' ? filteredSummary.pending :
                   key === 'approved' ? filteredSummary.approved :
                   key === 'rejected' ? filteredSummary.rejected : 0}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden border-l-4 border-l-yellow-400 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-yellow-600">{filteredSummary.pending}</div>
                <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
                <p className="text-lg font-semibold text-green-600 mt-1">
                  ${filteredSummary.pendingValue.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <TrendingUp className="h-4 w-4 text-yellow-600 mr-1" />
              <span className="text-xs text-muted-foreground">Awaiting review</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-green-400 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-green-600">{filteredSummary.approved}</div>
                <p className="text-sm font-medium text-muted-foreground">Approved</p>
                <p className="text-lg font-semibold text-green-600 mt-1">
                  ${filteredSummary.approvedValue.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-xs text-muted-foreground">Ready to send</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-red-400 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-red-600">{filteredSummary.rejected}</div>
                <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                <p className="text-sm text-muted-foreground mt-1">Needs revision</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <AlertCircle className="h-4 w-4 text-red-600 mr-1" />
              <span className="text-xs text-muted-foreground">Requires attention</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-blue-400 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-blue-600">{filteredSummary.total}</div>
                <p className="text-sm font-medium text-muted-foreground">Total Filtered</p>
                <p className="text-lg font-semibold text-green-600 mt-1">
                  ${filteredSummary.totalValue.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <DollarSign className="h-4 w-4 text-blue-600 mr-1" />
              <span className="text-xs text-muted-foreground">Current view</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Estimates List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Estimates ({filteredEstimates.length})
          </h2>
        </div>

        {filteredEstimates.length === 0 ? (
          <Card className="border-2 border-dashed border-muted-foreground/25">
            <CardContent className="p-12 text-center">
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-medium">No estimates found</h3>
                  <p className="text-muted-foreground mt-1">
                    {searchQuery || statusFilter !== 'all' 
                      ? 'Try adjusting your search or filters to see more results.'
                      : 'No estimates available at this time.'}
                  </p>
                </div>
                {(searchQuery || statusFilter !== 'all') && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('')
                      setStatusFilter('all')
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredEstimates.map((estimate) => (
              <Card key={estimate.id} className="group hover:shadow-xl hover:scale-[1.02] transition-all duration-300 border border-border/50 hover:border-primary/30">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div 
                      className="space-y-3 flex-1 cursor-pointer"
                      onClick={() => handleViewEstimate(estimate.id)}
                    >
                      {/* Header */}
                      <div className="flex items-center gap-4 flex-wrap">
                        <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                          {estimate.estimate_number}
                        </h3>
                        {getStatusBadge(estimate.status)}
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Job:</span>
                            <span className="text-foreground">{estimate.jobs.job_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Customer:</span>
                            <span className="text-foreground">{estimate.jobs.lead?.name || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="font-medium">Amount:</span>
                            <span className="text-2xl font-bold text-green-600">
                              ${estimate.total_amount ? Math.ceil(estimate.total_amount).toLocaleString() : 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Created by: {estimate.created_by_user?.full_name || 'Unknown'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="hover:bg-primary hover:text-white transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewEstimate(estimate.id)
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      
                      {estimate.status === 'pending_approval' && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleReject(estimate.id)
                            }}
                          >
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 shadow-lg"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleApprove(estimate.id)
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}