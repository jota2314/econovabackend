"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, AlertCircle, RefreshCw, Eye } from "lucide-react"
import { toast } from "sonner"

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
  const [summary, setSummary] = useState<EstimateSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      const response = await fetch(`/api/estimates/${id}/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
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
      const response = await fetch(`/api/estimates/${id}/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' })
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

  useEffect(() => {
    fetchEstimates()
  }, [])

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'draft': 'outline',
      'pending_approval': 'default',
      'sent': 'secondary',
      'approved': 'default',
      'rejected': 'destructive'
    }
    
    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    )
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Estimate Approvals</h1>
          <p className="text-slate-600">
            Review and approve pending estimates
          </p>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={fetchEstimates}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{summary?.pending_count || 0}</div>
            <p className="text-xs text-muted-foreground">Pending Approval</p>
            <p className="text-sm text-muted-foreground">${summary?.pending_amount?.toLocaleString() || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{summary?.approved_count || 0}</div>
            <p className="text-xs text-muted-foreground">Approved</p>
            <p className="text-sm text-muted-foreground">${summary?.approved_amount?.toLocaleString() || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{summary?.total_count || 0}</div>
            <p className="text-xs text-muted-foreground">Total Estimates</p>
            <p className="text-sm text-muted-foreground">${summary?.total_amount?.toLocaleString() || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">${summary?.average_amount?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">Average Value</p>
          </CardContent>
        </Card>
      </div>

      {/* Estimates List */}
      <div className="grid gap-4">
        {estimates.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-slate-500">No estimates found</p>
            </CardContent>
          </Card>
        ) : (
          estimates.map((estimate) => (
            <Card key={estimate.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div 
                    className="space-y-2 flex-1 cursor-pointer"
                    onClick={() => handleViewEstimate(estimate.id)}
                  >
                    <div className="flex items-center gap-4">
                      <h3 className="font-semibold hover:text-orange-600 transition-colors">
                        {estimate.estimate_number}
                      </h3>
                      {getStatusBadge(estimate.status)}
                    </div>
                    <div className="text-sm text-slate-600">
                      <div>Job: {estimate.jobs.job_name}</div>
                      <div>Customer: {estimate.jobs.lead?.name}</div>
                      <div>Created by: {estimate.created_by_user?.full_name || 'Unknown'}</div>
                      <div>Amount: ${estimate.total_amount?.toLocaleString() || 'N/A'}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleViewEstimate(estimate.id)
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    
                    {estimate.status === 'pending_approval' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleReject(estimate.id)
                          }}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleApprove(estimate.id)
                          }}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}