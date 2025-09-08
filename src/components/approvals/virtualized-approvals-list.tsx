"use client"

import React, { useCallback, useMemo } from 'react'
import { List } from 'react-window'
import InfiniteLoader from 'react-window-infinite-loader'
import AutoSizer from 'react-virtualized-auto-sizer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Edit, 
  DollarSign, 
  Calendar,
  User,
  Clock
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Approval } from '@/stores/approvals-store-v2'

interface VirtualizedApprovalsListProps {
  approvals: Approval[]
  isManager: boolean
  onApprove: (id: string) => void
  onReject: (id: string) => void
  hasMore: boolean
  loadMore: () => Promise<void>
  isLoadingMore: boolean
}

const ITEM_HEIGHT = 180 // Height of each card in pixels
const LOADING_ITEM_HEIGHT = 60

export const VirtualizedApprovalsList: React.FC<VirtualizedApprovalsListProps> = ({
  approvals,
  isManager,
  onApprove,
  onReject,
  hasMore,
  loadMore,
  isLoadingMore
}) => {
  const router = useRouter()

  // Count including loading indicator
  const itemCount = hasMore ? approvals.length + 1 : approvals.length

  // Check if item is loaded
  const isItemLoaded = useCallback((index: number) => {
    return !hasMore || index < approvals.length
  }, [hasMore, approvals.length])

  // Load more items
  const loadMoreItems = useCallback(() => {
    if (!isLoadingMore) {
      return loadMore()
    }
    return Promise.resolve()
  }, [isLoadingMore, loadMore])

  // View estimate
  const viewEstimate = useCallback((estimateId: string) => {
    router.push(`/dashboard/estimate-approvals/${estimateId}/summary`)
  }, [router])

  // Get status badge
  const getStatusBadge = useCallback((status: string) => {
    const statusConfig = {
      draft: { color: "bg-gray-100 text-gray-800", icon: Edit, text: "Draft" },
      pending_approval: { color: "bg-yellow-100 text-yellow-800", icon: Clock, text: "Pending" },
      approved: { color: "bg-green-100 text-green-800", icon: CheckCircle2, text: "Approved" },
      rejected: { color: "bg-red-100 text-red-800", icon: XCircle, text: "Rejected" }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
    const IconComponent = config.icon

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <IconComponent className="h-3 w-3" />
        {config.text}
      </Badge>
    )
  }, [])

  // Get service badge
  const getServiceBadge = useCallback((serviceType?: string) => {
    const colors = {
      insulation: "bg-blue-100 text-blue-800",
      hvac: "bg-green-100 text-green-800", 
      plaster: "bg-yellow-100 text-yellow-800"
    }
    
    if (!serviceType) return null
    
    return (
      <Badge className={colors[serviceType as keyof typeof colors] || "bg-gray-100 text-gray-800"}>
        {serviceType.charAt(0).toUpperCase() + serviceType.slice(1)}
      </Badge>
    )
  }, [])

  // Format currency
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }, [])

  // Row renderer
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    // Loading row
    if (!isItemLoaded(index)) {
      return (
        <div style={style} className="p-4">
          <div className="animate-pulse bg-gray-200 rounded h-8 w-full"></div>
        </div>
      )
    }

    const approval = approvals[index]
    if (!approval) return null

    return (
      <div style={style} className="p-2">
        <Card className="hover:shadow-md transition-shadow h-full">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg">{approval.jobs.job_name}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-3 w-3 text-slate-400" />
                  <span className="text-sm text-slate-600">
                    {approval.jobs.lead?.name || 'N/A'}
                  </span>
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => viewEstimate(approval.id)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-lg font-semibold text-green-600">
                  {formatCurrency(approval.total_amount || approval.subtotal || 0)}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {getStatusBadge(approval.status)}
                {getServiceBadge(approval.jobs.service_type)}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(approval.created_at).toLocaleDateString()}
              </div>
              
              <div className="text-right">
                {approval.estimate_number}
              </div>
            </div>

            {isManager && approval.status === 'pending_approval' && (
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={() => onApprove(approval.id)}
                  className="bg-green-600 hover:bg-green-700 flex-1"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReject(approval.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-1"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }, [approvals, isItemLoaded, isManager, onApprove, onReject, viewEstimate, getStatusBadge, getServiceBadge, formatCurrency])

  return (
    <div className="h-[calc(100vh-300px)] min-h-[400px] w-full">
      <AutoSizer>
        {({ height, width }) => (
          <InfiniteLoader
            isItemLoaded={isItemLoaded}
            itemCount={itemCount}
            loadMoreItems={loadMoreItems}
          >
            {({ onItemsRendered, ref }) => (
              <List
                listRef={ref}
                style={{ height, width }}
                rowCount={itemCount}
                rowHeight={ITEM_HEIGHT}
                onRowsRendered={({ startIndex, stopIndex }) => 
                  onItemsRendered({ startIndex, stopIndex, visibleStartIndex: startIndex, visibleStopIndex: stopIndex })
                }
                rowComponent={Row}
                className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
              />
            )}
          </InfiniteLoader>
        )}
      </AutoSizer>
    </div>
  )
}

// Virtualized Table Component
interface VirtualizedApprovalsTableProps extends VirtualizedApprovalsListProps {}

export const VirtualizedApprovalsTable: React.FC<VirtualizedApprovalsTableProps> = ({
  approvals,
  isManager,
  onApprove,
  onReject,
  hasMore,
  loadMore,
  isLoadingMore
}) => {
  const router = useRouter()
  
  const TABLE_ROW_HEIGHT = 60

  const itemCount = hasMore ? approvals.length + 1 : approvals.length

  const isItemLoaded = useCallback((index: number) => {
    return !hasMore || index < approvals.length
  }, [hasMore, approvals.length])

  const loadMoreItems = useCallback(() => {
    if (!isLoadingMore) {
      return loadMore()
    }
    return Promise.resolve()
  }, [isLoadingMore, loadMore])

  const viewEstimate = useCallback((estimateId: string) => {
    router.push(`/dashboard/estimate-approvals/${estimateId}/summary`)
  }, [router])

  const TableRow = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    if (!isItemLoaded(index)) {
      return (
        <div style={style} className="flex items-center px-4 border-b">
          <div className="animate-pulse bg-gray-200 rounded h-4 w-full"></div>
        </div>
      )
    }

    const approval = approvals[index]
    if (!approval) return null

    return (
      <div style={style} className="flex items-center border-b hover:bg-slate-50">
        <div className="flex-1 px-3 py-2 truncate font-medium">
          {approval.estimate_number}
        </div>
        <div className="flex-1 px-3 py-2 truncate">
          {approval.jobs.job_name}
        </div>
        <div className="flex-1 px-3 py-2 truncate">
          {approval.jobs.lead?.name || 'N/A'}
        </div>
        <div className="w-32 px-3 py-2 text-right font-semibold text-green-600">
          ${(approval.total_amount || approval.subtotal || 0).toLocaleString()}
        </div>
        <div className="w-32 px-3 py-2">
          <Badge 
            variant={approval.status === 'approved' ? 'default' : 
                    approval.status === 'pending_approval' ? 'secondary' : 'outline'}
            className="text-xs"
          >
            {approval.status.replace('_', ' ')}
          </Badge>
        </div>
        <div className="w-40 px-3 py-2 flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => viewEstimate(approval.id)}
          >
            <Eye className="h-3 w-3" />
          </Button>
          
          {isManager && approval.status === 'pending_approval' && (
            <>
              <Button
                size="sm"
                onClick={() => onApprove(approval.id)}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReject(approval.id)}
                className="text-red-600"
              >
                <XCircle className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>
    )
  }, [approvals, isItemLoaded, isManager, onApprove, onReject, viewEstimate])

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Table Header */}
      <div className="flex items-center bg-slate-50 border-b font-medium text-sm">
        <div className="flex-1 px-3 py-3">Estimate #</div>
        <div className="flex-1 px-3 py-3">Job Name</div>
        <div className="flex-1 px-3 py-3">Customer</div>
        <div className="w-32 px-3 py-3 text-right">Amount</div>
        <div className="w-32 px-3 py-3">Status</div>
        <div className="w-40 px-3 py-3">Actions</div>
      </div>
      
      {/* Table Body */}
      <div className="h-[calc(100vh-400px)] min-h-[300px]">
        <AutoSizer>
          {({ height, width }) => (
            <InfiniteLoader
              isItemLoaded={isItemLoaded}
              itemCount={itemCount}
              loadMoreItems={loadMoreItems}
            >
              {({ onItemsRendered, ref }) => (
                <List
                  listRef={ref}
                  style={{ height, width }}
                  rowCount={itemCount}
                  rowHeight={TABLE_ROW_HEIGHT}
                  onRowsRendered={({ startIndex, stopIndex }) => 
                    onItemsRendered({ startIndex, stopIndex, visibleStartIndex: startIndex, visibleStopIndex: stopIndex })
                  }
                  rowComponent={TableRow}
                />
              )}
            </InfiniteLoader>
          )}
        </AutoSizer>
      </div>
    </div>
  )
}