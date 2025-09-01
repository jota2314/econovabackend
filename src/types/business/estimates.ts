import { Tables } from '@/lib/types/database'

export type Estimate = Tables<'estimates'>
export type EstimateLineItem = Tables<'estimate_line_items'>
export type EstimateStatus = Estimate['status']

export interface EstimateWithDetails extends Estimate {
  job: {
    id: string
    job_name: string
    lead: {
      name: string
      email: string | null
      phone: string
    }
  }
  line_items: EstimateLineItem[]
  created_by_user: {
    full_name: string | null
    email: string
  }
  approved_by_user?: {
    full_name: string | null
    email: string
  }
}

export interface EstimateCalculation {
  subtotal: number
  markup_percentage: number
  markup_amount: number
  total_amount: number
  line_items: Array<{
    description: string
    quantity: number
    unit_price: number
    total: number
  }>
}

export interface EstimateApprovalFlow {
  requires_approval: boolean
  approval_threshold: number
  current_user_can_approve: boolean
  approval_message?: string
}