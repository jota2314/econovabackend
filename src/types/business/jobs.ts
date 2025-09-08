import { Tables } from '@/lib/types/database'

export type Job = Tables<'jobs'>
export type JobStatus = 'new' | 'contacted' | 'measurement_scheduled' | 'measured' | 'quoted' | 'proposal_sent' | 'closed_won' | 'closed_lost'
export type WorkflowStatus = 'send_to_customer' | 'awaiting_approval' | null
export type ServiceType = Job['service_type']
export type BuildingType = Job['building_type']
export type MeasurementType = Job['measurement_type']
export type StructuralFraming = Job['structural_framing']

export interface JobWithDetails extends Job {
  lead: {
    id: string
    name: string
    email: string | null
    phone: string
    address: string | null
  }
  measurements?: Array<{
    id: string
    room_name: string
    surface_type: string
    square_feet: number
  }>
  estimates?: Array<{
    id: string
    total_amount: number
    status: string
  }>
}

export interface JobMetrics {
  total_jobs: number
  jobs_by_status: Record<JobStatus, number>
  avg_job_value: number
  total_square_feet: number
  completion_rate: number
}

export interface JobFilters {
  status?: JobStatus[]
  service_type?: ServiceType[]
  building_type?: BuildingType[]
  created_by?: string[]
  date_range?: {
    start: string
    end: string
  }
}

export interface ParsedScopeOfWork {
  project_type?: string | null
  system_type?: string | null
  install_type?: string | null
  tonnage_estimate?: number | null
  plaster_job_type?: string | null
  number_of_rooms?: number | null
  approximate_sqft?: number | null
  job_complexity?: 'standard' | 'complex' | 'simple'
  description?: string
}

export interface EnhancedJob extends Job {
  project_type?: string | null
  system_type?: string | null
  install_type?: string | null
  tonnage_estimate?: number | null
  plaster_job_type?: string | null
  number_of_rooms?: number | null
  approximate_sqft?: number | null
  job_complexity?: 'standard' | 'complex' | 'simple'
}