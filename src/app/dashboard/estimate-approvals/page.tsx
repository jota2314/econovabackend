"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Edit, 
  DollarSign, 
  Calendar,
  User,
  Building2,
  Search,
  Table,
  Grid3x3,
  Clock,
  AlertCircle,
  TrendingUp,
  FileText,
  Timer
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"

interface Estimate {
  id: string
  estimate_number: string
  subtotal: number
  total_amount: number
  status: string
  created_at: string
  jobs: {
    id: string
    job_name: string
    service_type: string
    lead_id: string
    lead?: {
      name: string
    }
  }
  created_by_user: {
    id: string
    full_name: string
    email: string
  }
}

interface User {
  id: string
  full_name: string
  email: string
  role: string
}

export default function EstimateApprovalsPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("pending_approval")
  const [serviceFilter, setServiceFilter] = useState("all")
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [selectedEstimate, setSelectedEstimate] = useState<any>(null)
  const [showEstimateDialog, setShowEstimateDialog] = useState(false)
  const [editingEstimate, setEditingEstimate] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadUser()
    loadEstimates()
  }, [statusFilter, serviceFilter])

  const loadUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()
        
        if (profile) {
          setUser(profile)
        }
      }
    } catch (error) {
      console.error('Error loading user:', error)
    }
  }

  const loadEstimates = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (serviceFilter !== 'all') params.append('service_type', serviceFilter)
      
      const response = await fetch(`/api/estimates?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        setEstimates(result.data.estimates || [])
      } else {
        toast.error('Failed to load estimates')
      }
    } catch (error) {
      console.error('Error loading estimates:', error)
      toast.error('Failed to load estimates')
    } finally {
      setLoading(false)
    }
  }

  const approveEstimate = async (estimateId: string) => {
    if (user?.role !== 'manager') {
      toast.error('Only managers can approve estimates')
      return
    }

    try {
      const response = await fetch(`/api/estimates/${estimateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'approved',
          approved_at: new Date().toISOString()
        })
      })

      const result = await response.json()
      if (result.success) {
        toast.success('Estimate approved successfully')
        loadEstimates()
      } else {
        toast.error('Failed to approve estimate')
      }
    } catch (error) {
      console.error('Error approving estimate:', error)
      toast.error('Failed to approve estimate')
    }
  }

  const rejectEstimate = async (estimateId: string) => {
    if (user?.role !== 'manager') {
      toast.error('Only managers can reject estimates')
      return
    }

    try {
      const response = await fetch(`/api/estimates/${estimateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'rejected'
        })
      })

      const result = await response.json()
      if (result.success) {
        toast.success('Estimate rejected')
        loadEstimates()
      } else {
        toast.error('Failed to reject estimate')
      }
    } catch (error) {
      console.error('Error rejecting estimate:', error)
      toast.error('Failed to reject estimate')
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: "bg-gray-100 text-gray-800", icon: Edit },
      pending_approval: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
      approved: { color: "bg-green-100 text-green-800", icon: CheckCircle2 },
      rejected: { color: "bg-red-100 text-red-800", icon: XCircle }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
    const IconComponent = config.icon

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <IconComponent className="h-3 w-3" />
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
      </Badge>
    )
  }

  const getServiceBadge = (serviceType: string) => {
    const colors = {
      insulation: "bg-blue-100 text-blue-800",
      hvac: "bg-green-100 text-green-800", 
      plaster: "bg-yellow-100 text-yellow-800"
    }
    
    return (
      <Badge className={colors[serviceType as keyof typeof colors] || "bg-gray-100 text-gray-800"}>
        {serviceType.charAt(0).toUpperCase() + serviceType.slice(1)}
      </Badge>
    )
  }

  const filteredEstimates = estimates.filter(estimate => {
    const matchesSearch = searchTerm === "" || 
      estimate.jobs.job_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      estimate.jobs.lead?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      estimate.created_by_user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      estimate.estimate_number.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })

  // Check if user is manager for functionality
  const isManager = user?.role === 'manager'

  const viewEstimate = async (estimateId: string) => {
    try {
      // Get the session to include in the request
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`/api/estimates/${estimateId}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      const result = await response.json()
      
      if (result.success) {
        setSelectedEstimate(result.data)
        setShowEstimateDialog(true)
      } else {
        toast.error('Failed to load estimate details')
      }
    } catch (error) {
      console.error('Error loading estimate:', error)
      toast.error('Failed to load estimate details')
    }
  }

  const updateEstimate = async (estimateId: string, updates: any) => {
    try {
      // Get the session to include in the request
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`/api/estimates/${estimateId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast.success('Estimate updated successfully')
        setEditingEstimate(false)
        loadEstimates() // Refresh the list
        setShowEstimateDialog(false)
      } else {
        toast.error(result.error || 'Failed to update estimate')
      }
    } catch (error) {
      console.error('Error updating estimate:', error)
      toast.error('Failed to update estimate')
    }
  }

  // Calculate dashboard metrics
  const calculateMetrics = () => {
    const pendingValue = estimates
      .filter(est => est.status === 'pending_approval')
      .reduce((sum, est) => sum + (est.total_amount || est.subtotal || 0), 0)
    
    const approvedValue = estimates
      .filter(est => est.status === 'approved')
      .reduce((sum, est) => sum + (est.total_amount || est.subtotal || 0), 0)
    
    const totalValue = estimates
      .reduce((sum, est) => sum + (est.total_amount || est.subtotal || 0), 0)

    const pendingCount = estimates.filter(est => est.status === 'pending_approval').length
    const approvedCount = estimates.filter(est => est.status === 'approved').length
    const totalCount = estimates.length

    return {
      pendingValue,
      approvedValue,
      totalValue,
      pendingCount,
      approvedCount,
      totalCount
    }
  }

  const metrics = calculateMetrics()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Estimate Approvals</h1>
          <p className="text-slate-600">
            {isManager ? 'Review and approve estimates submitted by your team' : 'View estimate approval status'}
          </p>
        </div>
        
        {!isManager && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Manager approval required for estimates</span>
          </div>
        )}
      </div>

      {/* Dashboard Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Pending Value */}
        <Card>
          <CardContent className="flex items-center p-6">
            <Timer className="h-8 w-8 text-yellow-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {loading ? '...' : formatCurrency(metrics.pendingValue)}
              </p>
              <p className="text-sm text-slate-600">Pending Estimates</p>
              <p className="text-xs text-slate-400">
                {metrics.pendingCount} estimate{metrics.pendingCount !== 1 ? 's' : ''} awaiting approval
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Approved Value */}
        <Card>
          <CardContent className="flex items-center p-6">
            <CheckCircle2 className="h-8 w-8 text-green-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {loading ? '...' : formatCurrency(metrics.approvedValue)}
              </p>
              <p className="text-sm text-slate-600">Approved Estimates</p>
              <p className="text-xs text-slate-400">
                {metrics.approvedCount} estimate{metrics.approvedCount !== 1 ? 's' : ''} approved
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total Value */}
        <Card>
          <CardContent className="flex items-center p-6">
            <TrendingUp className="h-8 w-8 text-blue-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {loading ? '...' : formatCurrency(metrics.totalValue)}
              </p>
              <p className="text-sm text-slate-600">Total Estimates</p>
              <p className="text-xs text-slate-400">
                {metrics.totalCount} total estimate{metrics.totalCount !== 1 ? 's' : ''}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Average Estimate Value */}
        <Card>
          <CardContent className="flex items-center p-6">
            <FileText className="h-8 w-8 text-purple-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {loading ? '...' : formatCurrency(metrics.totalCount > 0 ? metrics.totalValue / metrics.totalCount : 0)}
              </p>
              <p className="text-sm text-slate-600">Average Value</p>
              <p className="text-xs text-slate-400">
                {metrics.approvedCount > 0 ? 
                  `${((metrics.approvedCount / metrics.totalCount) * 100).toFixed(1)}% approval rate` : 
                  'No approved estimates yet'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by customer, job, salesperson, or estimate number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending_approval">Pending Approval</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>

        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            <SelectItem value="insulation">Insulation</SelectItem>
            <SelectItem value="hvac">HVAC</SelectItem>
            <SelectItem value="plaster">Plaster</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* View Toggle */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">
          {filteredEstimates.length} estimates found
        </h2>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'cards' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('cards')}
          >
            <Grid3x3 className="h-4 w-4 mr-2" />
            Cards
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            <Table className="h-4 w-4 mr-2" />
            Table
          </Button>
        </div>
      </div>

      {/* Estimates List */}
      {filteredEstimates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle2 className="mx-auto h-16 w-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No estimates found
            </h3>
            <p className="text-slate-600">
              {estimates.length === 0 
                ? "No estimates have been submitted yet"
                : "Try adjusting your search terms or filters"
              }
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'cards' ? (
        // Card View
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredEstimates.map((estimate) => (
            <Card key={estimate.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{estimate.jobs.job_name}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <User className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-600">{estimate.jobs.lead?.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-lg font-semibold text-green-600">
                        ${estimate.total_amount?.toLocaleString() || estimate.subtotal.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {getStatusBadge(estimate.status)}
                      {getServiceBadge(estimate.jobs.service_type)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewEstimate(estimate.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Estimate Number</p>
                    <p className="font-medium">{estimate.estimate_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Salesperson</p>
                    <p className="font-medium">{estimate.created_by_user.full_name}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Calendar className="h-3 w-3" />
                    {new Date(estimate.created_at).toLocaleDateString()}
                  </div>
                  
                  {isManager && estimate.status === 'pending_approval' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => approveEstimate(estimate.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rejectEstimate(estimate.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // Table View
        <div className="w-full border border-gray-200 rounded-lg bg-white">
          <div 
            style={{ 
              overflowX: 'scroll',
              overflowY: 'hidden',
              width: '100%',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'auto'
            }}
          >
            <table 
              className="border-collapse"
              style={{ 
                width: '1300px',
                minWidth: '1300px',
                tableLayout: 'fixed'
              }}
            >
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 sm:p-4 font-medium text-slate-600 min-w-[140px]">Estimate #</th>
                  <th className="text-left p-3 sm:p-4 font-medium text-slate-600 min-w-[180px]">Job Name</th>
                  <th className="text-left p-3 sm:p-4 font-medium text-slate-600 min-w-[140px]">Customer</th>
                  <th className="text-left p-3 sm:p-4 font-medium text-slate-600 min-w-[160px]">Salesperson</th>
                  <th className="text-left p-3 sm:p-4 font-medium text-slate-600 min-w-[130px]">Amount</th>
                  <th className="text-left p-3 sm:p-4 font-medium text-slate-600 min-w-[110px]">Service</th>
                  <th className="text-left p-3 sm:p-4 font-medium text-slate-600 min-w-[120px]">Status</th>
                  <th className="text-left p-3 sm:p-4 font-medium text-slate-600 min-w-[110px]">Date</th>
                  <th className="text-left p-3 sm:p-4 font-medium text-slate-600 min-w-[160px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEstimates.map((estimate) => (
                  <tr key={estimate.id} className="border-b hover:bg-slate-50">
                    <td className="p-3 sm:p-4 font-medium text-slate-900 truncate">{estimate.estimate_number}</td>
                    <td className="p-3 sm:p-4 truncate">{estimate.jobs.job_name}</td>
                    <td className="p-3 sm:p-4 truncate">{estimate.jobs.lead?.name}</td>
                    <td className="p-3 sm:p-4 truncate">
                      <div className="max-w-[150px] truncate" title={estimate.created_by_user.full_name}>
                        {estimate.created_by_user.full_name}
                      </div>
                    </td>
                    <td className="p-3 sm:p-4">
                      <span className="font-semibold text-green-600 whitespace-nowrap">
                        ${estimate.total_amount?.toLocaleString() || estimate.subtotal.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-3 sm:p-4">{getServiceBadge(estimate.jobs.service_type)}</td>
                    <td className="p-3 sm:p-4">{getStatusBadge(estimate.status)}</td>
                    <td className="p-3 sm:p-4 text-sm text-slate-500">
                      {new Date(estimate.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3 sm:p-4">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewEstimate(estimate.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {isManager && estimate.status === 'pending_approval' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => approveEstimate(estimate.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rejectEstimate(estimate.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Estimate Details Dialog */}
      <Dialog open={showEstimateDialog} onOpenChange={setShowEstimateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Estimate Details</span>
              {selectedEstimate && (
                <div className="flex items-center gap-2">
                  <Badge variant={
                    selectedEstimate.status === 'approved' ? 'default' :
                    selectedEstimate.status === 'rejected' ? 'destructive' :
                    selectedEstimate.status === 'pending_approval' ? 'secondary' : 'outline'
                  }>
                    {selectedEstimate.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                  {!editingEstimate && isManager && (
                    <Button size="sm" variant="outline" onClick={() => setEditingEstimate(true)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedEstimate?.estimate_number} - {selectedEstimate?.jobs?.job_name}
            </DialogDescription>
          </DialogHeader>

          {selectedEstimate && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6 p-1">
                {/* Job Information */}
                <div>
                  <h4 className="font-semibold mb-3">Job Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-slate-600">Customer</Label>
                      <p className="font-medium">{selectedEstimate.jobs?.lead?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">Service Type</Label>
                      <p className="font-medium capitalize">{selectedEstimate.jobs?.service_type}</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">Created By</Label>
                      <p className="font-medium">{selectedEstimate.created_by_user?.full_name}</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">Created Date</Label>
                      <p className="font-medium">{new Date(selectedEstimate.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Pricing Information */}
                <div>
                  <h4 className="font-semibold mb-3">Pricing Details</h4>
                  <div className="space-y-3">
                    {editingEstimate ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Subtotal</Label>
                          <Input
                            type="number"
                            step="0.01"
                            defaultValue={selectedEstimate.subtotal}
                            id="edit-subtotal"
                          />
                        </div>
                        <div>
                          <Label>Markup %</Label>
                          <Input
                            type="number"
                            step="0.01"
                            defaultValue={selectedEstimate.markup_percentage || 6.25}
                            id="edit-markup"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <Label className="text-slate-600">Subtotal</Label>
                          <p className="font-medium text-lg">${selectedEstimate.subtotal?.toLocaleString() || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-slate-600">Markup</Label>
                          <p className="font-medium">{selectedEstimate.markup_percentage || 6.25}%</p>
                        </div>
                        <div>
                          <Label className="text-slate-600">Total Amount</Label>
                          <p className="font-medium text-lg text-green-600">${selectedEstimate.total_amount?.toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Line Items */}
                {selectedEstimate.estimate_line_items && selectedEstimate.estimate_line_items.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-3">Line Items</h4>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="text-left p-3 font-medium">Description</th>
                              <th className="text-right p-3 font-medium">Qty</th>
                              <th className="text-right p-3 font-medium">Unit Price</th>
                              <th className="text-right p-3 font-medium">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedEstimate.estimate_line_items.map((item: any, index: number) => (
                              <tr key={item.id || index} className="border-t">
                                <td className="p-3">{item.description}</td>
                                <td className="p-3 text-right">{item.quantity}</td>
                                <td className="p-3 text-right">${item.unit_price?.toFixed(2)}</td>
                                <td className="p-3 text-right font-medium">${item.line_total?.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            {editingEstimate ? (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditingEstimate(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  const subtotalEl = document.getElementById('edit-subtotal') as HTMLInputElement
                  const markupEl = document.getElementById('edit-markup') as HTMLInputElement
                  
                  const subtotal = parseFloat(subtotalEl.value)
                  const markup = parseFloat(markupEl.value)
                  const total = subtotal * (1 + markup / 100)
                  
                  updateEstimate(selectedEstimate.id, {
                    subtotal,
                    markup_percentage: markup,
                    total_amount: total
                  })
                }}>
                  Save Changes
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setShowEstimateDialog(false)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}