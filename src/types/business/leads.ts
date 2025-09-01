import { Tables } from '@/lib/types/database'

export type Lead = Tables<'leads'>
export type LeadStatus = Lead['status']
export type LeadSource = Lead['lead_source']

export interface LeadWithAssignee extends Lead {
  assigned_user?: {
    id: string
    full_name: string | null
    email: string
  }
}

export interface LeadFilters {
  status?: LeadStatus[]
  source?: LeadSource[]
  assigned_to?: string[]
  state?: ('MA' | 'NH')[]
  date_range?: {
    start: string
    end: string
  }
}

export interface LeadMetrics {
  total_leads: number
  new_leads: number
  contacted_leads: number
  conversion_rate: number
  avg_response_time_hours: number
}

export interface LeadImportResult {
  success_count: number
  error_count: number
  errors: Array<{
    row: number
    field: string
    message: string
  }>
}