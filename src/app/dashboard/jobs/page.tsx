"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { JobCreationForm } from "@/components/measurements/job-creation-form"
import { MeasurementInterface } from "@/components/measurements/measurement-interface"
import { Lead } from "@/lib/types/database"
import { createClient } from "@/lib/supabase/client"
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
  Trash2
} from "lucide-react"

interface Job {
  id: string
  job_name: string
  lead_id: string
  measurement_type: 'field' | 'drawings'
  total_square_feet: number
  structural_framing: string
  roof_rafters: string
  scope_of_work?: string
  created_at: string
  updated_at: string
  lead?: {
    name: string
    phone: string
    address?: string
  }
  measurements?: Array<{
    id: string
    room_name: string
    surface_type: 'wall' | 'ceiling'
    square_feet: number
  }>
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedLead, setSelectedLead] = useState<string>("all")
  const [showJobForm, setShowJobForm] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [showMeasurementInterface, setShowMeasurementInterface] = useState(false)

  const supabase = createClient()

  // Load jobs and leads
  useEffect(() => {
    loadJobs()
    loadLeads()
  }, [])

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
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error loading leads:', error)
        return
      }

      setLeads(data || [])
    } catch (error) {
      console.error('Error loading leads:', error)
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

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = searchTerm === "" || 
      job.job_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.lead?.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesLead = selectedLead === "all" || job.lead_id === selectedLead

    return matchesSearch && matchesLead
  })

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
          <h1 className="text-2xl font-bold text-slate-900">Jobs & Measurements</h1>
          <p className="text-slate-600">
            Create and manage field measurement jobs for spray foam installations
          </p>
        </div>
        
        <Button
          onClick={() => setShowJobForm(true)}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Job
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <Briefcase className="h-8 w-8 text-blue-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-slate-900">{jobs.length}</p>
              <p className="text-sm text-slate-600">Total Jobs</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <Calculator className="h-8 w-8 text-green-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {jobs.reduce((sum, job) => sum + (job.total_square_feet || 0), 0).toFixed(1)}
              </p>
              <p className="text-sm text-slate-600">Total Sq Ft</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <Ruler className="h-8 w-8 text-purple-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {jobs.reduce((sum, job) => sum + (job.measurements?.length || 0), 0)}
              </p>
              <p className="text-sm text-slate-600">Total Measurements</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search jobs by name or customer..."
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
              <Button onClick={() => setShowJobForm(true)} className="bg-orange-600 hover:bg-orange-700">
                <Plus className="h-4 w-4 mr-2" />
                Create First Job
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredJobs.map((job) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{job.job_name}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <User className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-600">{job.lead?.name}</span>
                      <Badge 
                        variant="outline" 
                        className={job.measurement_type === 'field' ? 'border-green-300 text-green-700' : 'border-blue-300 text-blue-700'}
                      >
                        {job.measurement_type === 'field' ? 'Field' : 'Drawings'}
                      </Badge>
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
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Ruler className="h-4 w-4 mr-2" />
                    Measure
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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