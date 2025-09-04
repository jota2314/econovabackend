"use client"

import { useEffect } from "react"
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
  Timer,
  Calculator,
  RefreshCw
} from "lucide-react"
import { toast } from "sonner"
import { useEstimates } from "@/hooks/business/use-estimates"


// Types are now imported from the custom hook - no need for local definitions

export default function EstimateApprovalsPage() {
  // Enhanced custom hook - replaces all useState hooks!
  const {
    // Data
    estimates,
    filteredEstimates,
    selectedEstimate,
    user,
    loading,
    error,
    lastRefresh,
    
    // UI State
    searchTerm,
    statusFilter,
    serviceFilter,
    viewMode,
    
    // Computed metrics
    pendingValue,
    approvedValue,
    totalValue,
    pendingCount,
    approvedCount,
    totalCount,
    
    // Actions
    refetch,
    approveEstimate,
    rejectEstimate,
    updateEstimate,
    
    // UI Actions
    setSearchTerm,
    setStatusFilter,
    setServiceFilter,
    setViewMode,
    selectEstimate
  } = useEstimates({
    autoFetch: true,
    enableCaching: true,
    refetchInterval: 5 * 60 * 1000 // 5 minutes
  })

  const router = useRouter()

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

  // All filtering and metrics are now handled by the custom hook!
  // No need for local filtering - use filteredEstimates from hook

  // Check if user is manager for functionality
  const isManager = user?.role === 'manager'
  


  const viewEstimate = (estimateId: string) => {
    // Navigate to the summary page (no measurements, just estimate summary)
    router.push(`/dashboard/estimate-approvals/${estimateId}/summary`)
  }

  // Update function removed - editing happens in the detail page

  // All metrics calculations are now handled by the custom hook!
  // Use: pendingValue, approvedValue, totalValue, pendingCount, approvedCount, totalCount

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

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Failed to Load Estimates</h3>
          <p className="text-slate-600 mb-4">{error}</p>
          <Button 
            onClick={() => refetch(true)} 
            className="bg-orange-600 hover:bg-orange-700"
          >
            Retry Loading
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
            {isManager ? 'Review and approve estimates submitted by your team' : 'View estimate approval status'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => refetch(true)}
            variant="outline"
            size="sm"
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          {lastRefresh && (
            <span className="text-xs text-slate-500">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
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
                {loading ? '...' : formatCurrency(pendingValue)}
              </p>
              <p className="text-sm text-slate-600">Pending Estimates</p>
              <p className="text-xs text-slate-400">
                {pendingCount} estimate{pendingCount !== 1 ? 's' : ''} awaiting approval
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
                {loading ? '...' : formatCurrency(approvedValue)}
              </p>
              <p className="text-sm text-slate-600">Approved Estimates</p>
              <p className="text-xs text-slate-400">
                {approvedCount} estimate{approvedCount !== 1 ? 's' : ''} approved
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
                {loading ? '...' : formatCurrency(totalValue)}
              </p>
              <p className="text-sm text-slate-600">Total Estimates</p>
              <p className="text-xs text-slate-400">
                {totalCount} total estimate{totalCount !== 1 ? 's' : ''}
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
                {loading ? '...' : formatCurrency(totalCount > 0 ? totalValue / totalCount : 0)}
              </p>
              <p className="text-sm text-slate-600">Average Value</p>
              <p className="text-xs text-slate-400">
                {approvedCount > 0 ? 
                  `${((approvedCount / totalCount) * 100).toFixed(1)}% approval rate` : 
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
                        ${estimate.total_amount?.toLocaleString() || estimate.subtotal?.toLocaleString() || '0'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {getStatusBadge(estimate.status)}
                      {getServiceBadge(estimate.jobs.service_type || 'general')}
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
                        ${estimate.total_amount?.toLocaleString() || estimate.subtotal?.toLocaleString() || '0'}
                      </span>
                    </td>
                    <td className="p-3 sm:p-4">{getServiceBadge(estimate.jobs.service_type || 'general')}</td>
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


    </div>
  )
}
