"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu"
import { JobCreationForm } from "@/components/measurements/job-creation-form"
import React from "react"
import { MeasurementInterface } from "@/components/measurements/measurement-interface"
import { EnhancedJobCards } from "@/components/jobs/enhanced-job-cards"
import { Lead, Job as DatabaseJob } from "@/lib/types/database"
import { createClient } from "@/lib/supabase/client"
import { leadsService } from "@/lib/services/leads"
import { toast } from "sonner"
import { 
  Plus, 
  Briefcase, 
  Calculator, 
  Calendar, 
  User, 
  MapPin,
  Ruler,
  Search,
  Eye,
  Trash2,
  Wind,
  Thermometer,
  Hammer,
  BarChart3,
  PieChart,
  TrendingUp,
  Activity,
  DollarSign,
  Table,
  Grid3x3,
  CheckCircle2,
  Clock,
  XCircle,
  Edit,
  Settings,
  EyeOff,
  ChevronDown
} from "lucide-react"

interface Job extends DatabaseJob {
  lead?: {
    name: string
    phone: string
    address?: string
  }
}

interface User {
  id: string
  full_name: string
  email: string
  role: string
}

type TradeType = 'all' | 'insulation' | 'hvac' | 'plaster'
type ColumnKey = 'jobName' | 'customer' | 'quoteAmount' | 'service' | 'type' | 'building' | 'estimate' | 'squareFeet' | 'created' | 'workflow' | 'actions'

const defaultColumns: Record<ColumnKey, boolean> = {
  jobName: true,
  customer: true,
  quoteAmount: true,
  service: true,
  type: false, // Hidden by default to save space
  building: false, // Hidden by default on mobile
  estimate: true,
  squareFeet: false, // Hidden by default on mobile
  created: false, // Hidden by default on mobile
  workflow: true,
  actions: true
}

const columnLabels: Record<ColumnKey, string> = {
  jobName: 'Job Name',
  customer: 'Customer',
  quoteAmount: 'Quote Amount',
  service: 'Service',
  type: 'Type',
  building: 'Building',
  estimate: 'Estimate',
  squareFeet: 'Square Feet',
  created: 'Date Created',
  workflow: 'Workflow',
  actions: 'Actions'
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [localWorkflowStatus, setLocalWorkflowStatus] = useState<Record<string, string>>({})
  const [selectedLead, setSelectedLead] = useState<string>("all")
  const [selectedService, setSelectedService] = useState<string>("all")
  const [activeTrade, setActiveTrade] = useState<TradeType>('all')
  const [showJobForm, setShowJobForm] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [showMeasurementInterface, setShowMeasurementInterface] = useState(false)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(defaultColumns)

  const supabase = createClient()

  // Load jobs and leads
  useEffect(() => {
    loadUser()
    loadJobs()
    loadLeads()
  }, [])

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

  const loadJobs = async () => {
    try {
      setLoading(true)
      console.log('🔄 Loading jobs...')
      
      const response = await fetch('/api/jobs')
      console.log('Jobs API response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Jobs API error:', errorText)
        toast.error(`Failed to load jobs: ${response.status}`)
        return
      }
      
      const result = await response.json()
      console.log('Jobs API result:', result)

      if (result.success) {
        console.log(`✅ Loaded ${result.data?.length || 0} jobs`)
        setJobs(result.data || [])
      } else {
        console.error('Jobs API returned error:', result.error)
        toast.error(`Failed to load jobs: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('❌ Error loading jobs:', error)
      toast.error('Failed to load jobs - please check console for details')
    } finally {
      setLoading(false)
    }
  }

  const loadLeads = async () => {
    try {
      console.log('🔄 Loading leads with role-based filtering...')
      const leads = await leadsService.getLeads()
      console.log(`✅ Loaded ${leads.length} leads for current user`)
      setLeads(leads)
    } catch (error) {
      console.error('Error loading leads:', error)
      toast.error('Failed to load leads')
    }
  }

  const handleJobCreated = async (jobId: string) => {
    console.log('Job created, ID:', jobId)
    
    try {
      // Always fetch the job directly to ensure we have the latest data
      const response = await fetch(`/api/jobs/${jobId}`)
      const result = await response.json()
      
      if (result.success && result.data) {
        console.log('Job loaded successfully:', result.data)
        setSelectedJob(result.data)
        setShowMeasurementInterface(true)
        // Refresh the jobs list
        await loadJobs()
      } else {
        console.error('Failed to load job:', result.error)
        toast.error('Job created but failed to open measurement interface')
        // Still refresh the jobs list
        await loadJobs()
      }
    } catch (error) {
      console.error('Error loading new job:', error)
      toast.error('Job created but failed to open measurement interface')
      // Still refresh the jobs list
      await loadJobs()
    }
  }

  const handleJobUpdate = (updatedJob: Job) => {
    setJobs(prev => prev.map(job => 
      job.id === updatedJob.id ? updatedJob : job
    ))
  }

  const deleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job? All measurements will be lost.')) {
      return
    }

    try {
      console.log(`Deleting job: ${jobId}`)
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE'
      })

      console.log(`Delete response status: ${response.status}`)
      const result = await response.json()
      console.log(`Delete response:`, result)

      if (result.success) {
        setJobs(prev => prev.filter(job => job.id !== jobId))
        toast.success('Job deleted successfully')
      } else {
        console.error('Delete failed:', result)
        toast.error(`Failed to delete job: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error deleting job:', error)
      toast.error(`Failed to delete job: ${error instanceof Error ? error.message : 'Network error'}`)
    }
  }

  const openMeasurementInterface = (job: Job) => {
    setSelectedJob(job)
    setShowMeasurementInterface(true)
  }

  // Column visibility functions
  const toggleColumn = (column: ColumnKey) => {
    setVisibleColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }))
  }

  const resetColumns = () => {
    setVisibleColumns(defaultColumns)
  }

  const showAllColumns = () => {
    const allVisible = Object.keys(columnLabels).reduce((acc, key) => {
      acc[key as ColumnKey] = true
      return acc
    }, {} as Record<ColumnKey, boolean>)
    setVisibleColumns(allVisible)
  }

  // Trade-specific filtering
  const getTradeJobs = (trade: TradeType) => {
    return jobs.filter(job => {
      if (trade === 'all') return true
      return job.service_type === trade
    })
  }

  const filteredJobs = getTradeJobs(activeTrade).filter(job => {
    const matchesSearch = searchTerm === "" || 
      job.job_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.lead?.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesLead = selectedLead === "all" || job.lead_id === selectedLead
    const matchesService = selectedService === "all" || job.service_type === selectedService

    return matchesSearch && matchesLead && matchesService
  })

  // Calculate workflow metrics
  const calculateWorkflowMetrics = () => {
    const activeJobs = getTradeJobs(activeTrade)
    
    const metrics = {
      send_to_customer: { count: 0, revenue: 0, label: 'Sent to Customer' },
      follow_up_1: { count: 0, revenue: 0, label: 'Follow-up 1' },
      follow_up_2: { count: 0, revenue: 0, label: 'Follow-up 2' },
      follow_up_3: { count: 0, revenue: 0, label: 'Follow-up 3' },
      follow_up_4: { count: 0, revenue: 0, label: 'Follow-up 4' },
      follow_up_5: { count: 0, revenue: 0, label: 'Follow-up 5' },
      mark_won: { count: 0, revenue: 0, label: 'Won Projects' },
      mark_lost: { count: 0, revenue: 0, label: 'Lost Projects' }
    }

    activeJobs.forEach(job => {
      // Use local workflow status if database doesn't have it yet
      const workflowStatus = job.workflow_status || localWorkflowStatus[job.id]
      
      if (workflowStatus && metrics[workflowStatus as keyof typeof metrics]) {
        const metric = metrics[workflowStatus as keyof typeof metrics]
        metric.count += 1
        
        // Calculate revenue - match the display logic in the table (includes 6.25% markup)
        const revenue = (() => {
          // First check if we have an estimate with subtotal (apply 6.25% markup like in table)
          if (job.estimates && job.estimates.length > 0) {
            const latestEstimate = job.estimates[job.estimates.length - 1]
            if (latestEstimate.subtotal) {
              // Apply the same 6.25% markup that's shown in the table
              const totalWithMarkup = latestEstimate.subtotal * 1.0625
              console.log(`Using estimate subtotal with 6.25% markup for job ${job.id}: $${latestEstimate.subtotal} * 1.0625 = $${totalWithMarkup}`)
              return totalWithMarkup
            }
          }
          // Fall back to quote_amount if no estimate
          if (job.quote_amount && job.quote_amount > 0) {
            console.log(`Using quote_amount for job ${job.id}: $${job.quote_amount}`)
            return job.quote_amount
          }
          console.log(`No revenue found for job ${job.id}`)
          return 0
        })()
        
        console.log(`Job ${job.job_name} - Workflow: ${workflowStatus}, Revenue: $${revenue}`)
        metric.revenue += revenue
      }
    })

    return metrics
  }

  const workflowMetrics = calculateWorkflowMetrics()

  // Workflow Metrics Cards Component
  const WorkflowMetricsCards = () => {
    const [expandedCard, setExpandedCard] = useState<string | null>(null)
    
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount)
    }

    const getWorkflowIcon = (workflowKey: string) => {
      const icons = {
        send_to_customer: '📧',
        follow_up_1: '📞',
        follow_up_2: '📞',
        follow_up_3: '📞', 
        follow_up_4: '📞',
        follow_up_5: '📞',
        mark_won: '🎉',
        mark_lost: '❌'
      }
      return icons[workflowKey as keyof typeof icons] || '📋'
    }

    const activeWorkflows = Object.entries(workflowMetrics).filter(([_, data]) => data.count > 0)
    
    if (activeWorkflows.length === 0) {
      return null
    }

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Workflow Status</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {activeWorkflows.map(([workflowKey, data]) => (
            <Card 
              key={workflowKey} 
              className="hover:shadow-md transition-all cursor-pointer"
              onClick={() => setExpandedCard(expandedCard === workflowKey ? null : workflowKey)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getWorkflowIcon(workflowKey)}</span>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{data.label}</p>
                      <p className="text-2xl font-bold text-slate-900">{data.count}</p>
                    </div>
                  </div>
                  <ChevronDown 
                    className={`h-4 w-4 text-slate-400 transition-transform ${
                      expandedCard === workflowKey ? 'rotate-180' : ''
                    }`} 
                  />
                </div>
                {expandedCard === workflowKey && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Total Revenue:</span>
                      <span className="text-lg font-semibold text-green-600">
                        {formatCurrency(data.revenue)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Trade counts for badges
  const tradeCounts = {
    all: jobs.length,
    insulation: jobs.filter(job => job.service_type === 'insulation').length,
    hvac: jobs.filter(job => job.service_type === 'hvac').length,
    plaster: jobs.filter(job => job.service_type === 'plaster').length
  }

  // Trade colors
  const tradeColors = {
    insulation: 'blue',
    hvac: 'green', 
    plaster: 'yellow'
  }

  // Trade icons
  const getTradeIcon = (trade: string) => {
    switch(trade) {
      case 'insulation': return Wind
      case 'hvac': return Thermometer
      case 'plaster': return Hammer
      default: return Briefcase
    }
  }

  // Get estimate status badge
  const getEstimateStatusBadge = (job: Job) => {
    if (!job.estimates || job.estimates.length === 0) {
      return null
    }

    const latestEstimate = job.estimates[job.estimates.length - 1]
    const statusConfig = {
      draft: { color: "bg-gray-100 text-gray-800", icon: Edit, text: "Draft" },
      pending_approval: { color: "bg-yellow-100 text-yellow-800", icon: Clock, text: "Pending" },
      approved: { color: "bg-green-100 text-green-800", icon: CheckCircle2, text: "Approved" },
      rejected: { color: "bg-red-100 text-red-800", icon: XCircle, text: "Rejected" }
    }
    
    const config = statusConfig[latestEstimate.status as keyof typeof statusConfig] || statusConfig.draft
    const IconComponent = config.icon

    return (
      <Badge variant="outline" className={`${config.color} border-none flex items-center gap-1`}>
        <IconComponent className="h-3 w-3" />
        {config.text}
      </Badge>
    )
  }

  // Get workflow dropdown
  const getWorkflowDropdown = (job: Job) => {
    const hasEstimate = job.estimates && job.estimates.length > 0
    const latestEstimate = hasEstimate ? job.estimates[job.estimates.length - 1] : null
    const isApproved = latestEstimate?.status === 'approved'
    
    // Only show dropdown if user is manager or if estimate is approved
    const canAccessWorkflow = user?.role === 'manager' || isApproved
    
    if (!canAccessWorkflow) {
      return (
        <span className="text-sm text-slate-400 italic">
          {!hasEstimate ? 'No estimate' : 'Approval required'}
        </span>
      )
    }

    const workflowOptions = [
      { value: 'send_to_customer', label: 'Send to Customer' },
      { value: 'follow_up_1', label: 'Follow-up 1' },
      { value: 'follow_up_2', label: 'Follow-up 2' },
      { value: 'follow_up_3', label: 'Follow-up 3' },
      { value: 'follow_up_4', label: 'Follow-up 4' },
      { value: 'follow_up_5', label: 'Follow-up 5' },
      { value: 'mark_won', label: 'Mark as Won' },
      { value: 'mark_lost', label: 'Mark as Lost' }
    ]

    return (
      <Select
        value={job.workflow_status || localWorkflowStatus[job.id] || undefined}
        onValueChange={(value) => handleWorkflowChange(job.id, value)}
        disabled={!isApproved}
      >
        <SelectTrigger className="w-[150px] text-sm">
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          {workflowOptions.map((option) => (
            <SelectItem 
              key={option.value} 
              value={option.value}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  // Handle workflow changes
  const handleWorkflowChange = async (jobId: string, workflowStatus: string) => {
    // Update local state immediately for UI responsiveness
    setLocalWorkflowStatus(prev => ({
      ...prev,
      [jobId]: workflowStatus
    }))
    
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow_status: workflowStatus })
      })

      const result = await response.json()
      if (result.success) {
        toast.success(`Workflow updated to: ${workflowStatus.replace(/_/g, ' ')}`)
        loadJobs() // Reload to get updated data
      } else {
        // Keep the local state since database update failed
        toast.warning(`Workflow status saved locally. Database update will occur when schema is updated.`)
      }
    } catch (error) {
      console.error('Error updating workflow:', error)
      // Keep the local state since database update failed
      toast.warning(`Workflow status saved locally. Database update will occur when schema is updated.`)
    }
  }

  if (showMeasurementInterface && selectedJob) {
    return (
      <MeasurementInterface
        job={selectedJob}
        onJobUpdate={handleJobUpdate}
        onClose={() => setShowMeasurementInterface(false)}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Multi-Trade Jobs Dashboard</h1>
          <p className="text-slate-600">
            Manage insulation, HVAC, and plaster jobs with trade-specific insights
          </p>
        </div>
        
        <Button
          onClick={() => setShowJobForm(true)}
          className=""
        >
          <Plus className="h-4 w-4 mr-2" />
          New Job
        </Button>
      </div>

      {/* Trade Selector */}
      <div className="space-y-6">
        {/* Mobile Dropdown */}
        <div className="block lg:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-12 text-left">
                <div className="flex items-center gap-2">
                  {activeTrade === 'all' && <Briefcase className="h-4 w-4" />}
                  {activeTrade === 'insulation' && <Wind className="h-4 w-4" />}
                  {activeTrade === 'hvac' && <Thermometer className="h-4 w-4" />}
                  {activeTrade === 'plaster' && <Hammer className="h-4 w-4" />}
                  <span className="font-medium">
                    {activeTrade === 'all' && 'All Trades'}
                    {activeTrade === 'insulation' && 'Insulation'}
                    {activeTrade === 'hvac' && 'HVAC'}
                    {activeTrade === 'plaster' && 'Plaster'}
                  </span>
                  <Badge variant="secondary" className="ml-2">
                    {activeTrade === 'all' && tradeCounts.all}
                    {activeTrade === 'insulation' && tradeCounts.insulation}
                    {activeTrade === 'hvac' && tradeCounts.hvac}
                    {activeTrade === 'plaster' && tradeCounts.plaster}
                  </Badge>
                </div>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full min-w-[280px]" align="start">
              <DropdownMenuItem 
                onClick={() => setActiveTrade('all')}
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  <span>All Trades</span>
                </div>
                <Badge variant="secondary" className="ml-2">
                  {tradeCounts.all}
                </Badge>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveTrade('insulation')}
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-2">
                  <Wind className="h-4 w-4 text-blue-600" />
                  <span>Insulation</span>
                </div>
                <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">
                  {tradeCounts.insulation}
                </Badge>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveTrade('hvac')}
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-green-600" />
                  <span>HVAC</span>
                </div>
                <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
                  {tradeCounts.hvac}
                </Badge>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveTrade('plaster')}
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-2">
                  <Hammer className="h-4 w-4 text-yellow-600" />
                  <span>Plaster</span>
                </div>
                <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-700">
                  {tradeCounts.plaster}
                </Badge>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Desktop Tabs */}
        <div className="hidden lg:block">
          <Tabs value={activeTrade} onValueChange={(value) => setActiveTrade(value as TradeType)}>
            <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
              <TabsTrigger value="all" className="relative">
                <Briefcase className="h-4 w-4 mr-2" />
                All Trades
                <Badge variant="secondary" className="ml-2 h-5 px-2 text-xs">
                  {tradeCounts.all}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="insulation" className="relative">
                <Wind className="h-4 w-4 mr-2" />
                Insulation
                <Badge variant="secondary" className="ml-2 h-5 px-2 text-xs bg-blue-100 text-blue-700">
                  {tradeCounts.insulation}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="hvac" className="relative">
                <Thermometer className="h-4 w-4 mr-2" />
                HVAC
                <Badge variant="secondary" className="ml-2 h-5 px-2 text-xs bg-green-100 text-green-700">
                  {tradeCounts.hvac}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="plaster" className="relative">
                <Hammer className="h-4 w-4 mr-2" />
                Plaster
                <Badge variant="secondary" className="ml-2 h-5 px-2 text-xs bg-yellow-100 text-yellow-700">
                  {tradeCounts.plaster}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Tab Content */}
      <Tabs value={activeTrade} onValueChange={(value) => setActiveTrade(value as TradeType)} className="space-y-6">

        {/* All Trades Overview */}
        <TabsContent value="all" className="space-y-6">
          <EnhancedJobCards serviceType="all" workflowMetrics={workflowMetrics} />
        </TabsContent>

        {/* Insulation Dashboard */}
        <TabsContent value="insulation" className="space-y-6">
          <EnhancedJobCards serviceType="insulation" workflowMetrics={workflowMetrics} />
        </TabsContent>

        {/* HVAC Dashboard */}
        <TabsContent value="hvac" className="space-y-6">
          <EnhancedJobCards serviceType="hvac" workflowMetrics={workflowMetrics} />
        </TabsContent>

        {/* Plaster Dashboard */}
        <TabsContent value="plaster" className="space-y-6">
          <EnhancedJobCards serviceType="plaster" workflowMetrics={workflowMetrics} />
        </TabsContent>

        {/* Shared Content for All Tabs */}
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={`Search ${activeTrade === 'all' ? 'all' : activeTrade} jobs by name or customer...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedLead} onValueChange={setSelectedLead}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {leads.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeTrade === 'all' && (
              <Select value={selectedService} onValueChange={setSelectedService}>
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
            )}
            
            {/* Column Visibility Toggle - only show in table view */}
            {viewMode === 'table' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="default" className="shrink-0">
                    <Settings className="h-4 w-4 mr-2" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {Object.entries(columnLabels).map(([key, label]) => (
                    <DropdownMenuCheckboxItem
                      key={key}
                      checked={visibleColumns[key as ColumnKey]}
                      onCheckedChange={() => toggleColumn(key as ColumnKey)}
                      disabled={key === 'jobName'} // Always keep job name visible
                    >
                      {label}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={showAllColumns}>
                    <Eye className="h-4 w-4 mr-2" />
                    Show All
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={resetColumns}>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Reset Default
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">
              {filteredJobs.length} {activeTrade === 'all' ? 'jobs' : `${activeTrade} jobs`} found
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

          {/* Jobs List */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
                <p className="mt-4 text-slate-600">Loading jobs...</p>
              </div>
            </div>
          ) : filteredJobs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Briefcase className="mx-auto h-16 w-16 text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  {jobs.length === 0 ? "No jobs yet" : "No jobs match your filters"}
                </h3>
                <p className="text-slate-600 mb-4">
                  {jobs.length === 0 
                    ? "Create your first measurement job to get started"
                    : "Try adjusting your search terms or filters"
                  }
                </p>
                {jobs.length === 0 && (
                  <Button onClick={() => setShowJobForm(true)} className="">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Job
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : viewMode === 'cards' ? (
            // Card View
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {filteredJobs.map((job) => (
                <Card key={job.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{job.job_name}</CardTitle>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <User className="h-4 w-4 text-slate-400" />
                          <span className="text-sm text-slate-600">{job.lead?.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="text-lg font-semibold text-green-600">
                            {(() => {
                              // Try to get estimate total first, fallback to quote_amount
                              const latestEstimate = job.estimates && job.estimates.length > 0 
                                ? job.estimates[job.estimates.length - 1] 
                                : null;
                              if (latestEstimate?.subtotal) {
                                return `$${latestEstimate.subtotal.toLocaleString()}`;
                              } else if (job.quote_amount) {
                                return `$${job.quote_amount.toLocaleString()}`;
                              }
                              return 'Not quoted';
                            })()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge 
                        variant="outline" 
                        className={job.measurement_type === 'field' ? 'border-green-300 text-green-700' : 'border-blue-300 text-blue-700'}
                      >
                        {job.measurement_type === 'field' ? 'Field' : 'Drawings'}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={`capitalize ${
                          job.service_type === 'insulation' ? 'border-blue-300 text-blue-700 bg-blue-50' :
                          job.service_type === 'hvac' ? 'border-green-300 text-green-700 bg-green-50' :
                          job.service_type === 'plaster' ? 'border-yellow-300 text-yellow-700 bg-yellow-50' :
                          'border-purple-300 text-purple-700'
                        }`}
                      >
                        {React.createElement(getTradeIcon(job.service_type), { className: 'h-3 w-3 mr-1' })}
                        {job.service_type}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className="border-orange-300 text-orange-700 capitalize"
                      >
                        {job.building_type}
                      </Badge>
                      {getEstimateStatusBadge(job)}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openMeasurementInterface(job)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteJob(job.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {job.lead?.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                        <span className="text-sm text-slate-600">{job.lead.address}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-slate-500">Total Square Feet</Label>
                        <div className="text-lg font-semibold text-orange-600">
                          {job.total_square_feet?.toFixed(1) || '0.0'} sq ft
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Measurements</Label>
                        <div className="text-lg font-semibold text-slate-900">
                          {job.measurements?.length || 0}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-xs text-slate-500">Structural</Label>
                        <div className="font-medium">{job.structural_framing}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Roof Rafters</Label>
                        <div className="font-medium">{job.roof_rafters}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Calendar className="h-3 w-3" />
                        {new Date(job.created_at).toLocaleDateString()}
                      </div>
                      
                      <Button
                        size="sm"
                        onClick={() => openMeasurementInterface(job)}
                        className=""
                      >
                        <Ruler className="h-4 w-4 mr-2" />
                        Measure
                      </Button>
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
                    width: '1200px',
                    minWidth: '1200px',
                    tableLayout: 'fixed'
                  }}
                >
                  <thead>
                    <tr className="border-b">
                      {visibleColumns.jobName && <th className="text-left p-3 sm:p-4 font-medium text-slate-600 min-w-[150px]">Job Name</th>}
                      {visibleColumns.customer && <th className="text-left p-3 sm:p-4 font-medium text-slate-600 min-w-[120px]">Customer</th>}
                      {visibleColumns.quoteAmount && <th className="text-left p-3 sm:p-4 font-medium text-slate-600 min-w-[120px]">Quote Amount</th>}
                      {visibleColumns.service && <th className="text-left p-3 sm:p-4 font-medium text-slate-600 min-w-[100px]">Service</th>}
                      {visibleColumns.type && <th className="text-left p-3 sm:p-4 font-medium text-slate-600 min-w-[90px]">Type</th>}
                      {visibleColumns.building && <th className="text-left p-3 sm:p-4 font-medium text-slate-600 min-w-[100px]">Building</th>}
                      {visibleColumns.estimate && <th className="text-left p-3 sm:p-4 font-medium text-slate-600 min-w-[100px]">Estimate</th>}
                      {visibleColumns.squareFeet && <th className="text-left p-3 sm:p-4 font-medium text-slate-600 min-w-[100px]">Square Feet</th>}
                      {visibleColumns.created && <th className="text-left p-3 sm:p-4 font-medium text-slate-600 min-w-[90px]">Created</th>}
                      {visibleColumns.workflow && <th className="text-left p-3 sm:p-4 font-medium text-slate-600 min-w-[150px]">Workflow</th>}
                      {visibleColumns.actions && <th className="text-left p-3 sm:p-4 font-medium text-slate-600 min-w-[120px]">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJobs.map((job) => (
                      <tr key={job.id} className="border-b hover:bg-slate-50">
                        {visibleColumns.jobName && (
                          <td className="p-3 sm:p-4">
                            <div className="font-medium text-slate-900">{job.job_name}</div>
                            {job.lead?.address && (
                              <div className="text-sm text-slate-500 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {job.lead.address}
                              </div>
                            )}
                          </td>
                        )}
                        {visibleColumns.customer && (
                          <td className="p-4 text-slate-600">{job.lead?.name}</td>
                        )}
                        {visibleColumns.quoteAmount && (
                          <td className="p-3 sm:p-4">
                            <span className="font-semibold text-green-600">
                              {(() => {
                                // Try to get estimate total first, fallback to quote_amount
                                const latestEstimate = job.estimates && job.estimates.length > 0 
                                  ? job.estimates[job.estimates.length - 1] 
                                  : null;
                                if (latestEstimate?.subtotal) {
                                  return `$${(() => { const total = latestEstimate.subtotal * 1.0625; return total.toLocaleString(); })()}`;
                                } else if (job.quote_amount) {
                                  return `$${job.quote_amount.toLocaleString()}`;
                                }
                                return 'Not quoted';
                              })()}
                            </span>
                          </td>
                        )}
                        {visibleColumns.service && (
                          <td className="p-3 sm:p-4">
                            <Badge 
                              variant="outline" 
                              className={`capitalize ${
                                job.service_type === 'insulation' ? 'border-blue-300 text-blue-700 bg-blue-50' :
                                job.service_type === 'hvac' ? 'border-green-300 text-green-700 bg-green-50' :
                                job.service_type === 'plaster' ? 'border-yellow-300 text-yellow-700 bg-yellow-50' :
                                'border-purple-300 text-purple-700'
                              }`}
                            >
                              {React.createElement(getTradeIcon(job.service_type), { className: 'h-3 w-3 mr-1' })}
                              {job.service_type}
                            </Badge>
                          </td>
                        )}
                        {visibleColumns.type && (
                          <td className="p-3 sm:p-4">
                            <Badge 
                              variant="outline" 
                              className={job.measurement_type === 'field' ? 'border-green-300 text-green-700' : 'border-blue-300 text-blue-700'}
                            >
                              {job.measurement_type === 'field' ? 'Field' : 'Drawings'}
                            </Badge>
                          </td>
                        )}
                        {visibleColumns.building && (
                          <td className="p-3 sm:p-4">
                            <Badge 
                              variant="outline" 
                              className="border-orange-300 text-orange-700 capitalize"
                            >
                              {job.building_type}
                            </Badge>
                          </td>
                        )}
                        {visibleColumns.estimate && (
                          <td className="p-3 sm:p-4">
                            {getEstimateStatusBadge(job) || <span className="text-sm text-slate-500">No estimate</span>}
                          </td>
                        )}
                        {visibleColumns.squareFeet && (
                          <td className="p-4 font-medium text-orange-600">
                            {job.total_square_feet?.toFixed(1) || '0.0'} sq ft
                          </td>
                        )}
                        {visibleColumns.created && (
                          <td className="p-4 text-sm text-slate-500">
                            {new Date(job.created_at).toLocaleDateString()}
                          </td>
                        )}
                        {visibleColumns.workflow && (
                          <td className="p-3 sm:p-4">
                            {getWorkflowDropdown(job)}
                          </td>
                        )}
                        {visibleColumns.actions && (
                          <td className="p-3 sm:p-4">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openMeasurementInterface(job)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteJob(job.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Tabs>

      {/* Job Creation Form */}
      <JobCreationForm
        open={showJobForm}
        onOpenChange={setShowJobForm}
        leads={leads}
        onJobCreated={handleJobCreated}
      />
    </div>
  )
}

function Label({ children, className }: { children: React.ReactNode, className?: string }) {
  return <label className={className}>{children}</label>
}