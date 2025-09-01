/**
 * Lead workflow and status transition logic
 */

import type { LeadStatus } from '@/types'

/**
 * Defines valid status transitions for leads
 */
const VALID_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  'new': ['contacted', 'closed_lost'],
  'contacted': ['measurement_scheduled', 'closed_lost'],
  'measurement_scheduled': ['measured', 'contacted', 'closed_lost'],
  'measured': ['quoted', 'closed_lost'],
  'quoted': ['proposal_sent', 'closed_lost'],
  'proposal_sent': ['closed_won', 'quoted', 'closed_lost'],
  'closed_won': [], // Final state
  'closed_lost': ['new'] // Can restart the process
}

/**
 * Checks if a status transition is valid
 */
export function canTransitionTo(currentStatus: LeadStatus, newStatus: LeadStatus): boolean {
  return VALID_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false
}

/**
 * Gets all valid next statuses from current status
 */
export function getValidNextStatuses(currentStatus: LeadStatus): LeadStatus[] {
  return VALID_TRANSITIONS[currentStatus] || []
}

/**
 * Gets the typical next status in the workflow
 */
export function getNextWorkflowStatus(currentStatus: LeadStatus): LeadStatus | null {
  const nextStatuses = getValidNextStatuses(currentStatus)
  if (nextStatuses.length === 0) return null
  
  // Return the first non-closed status as the typical next step
  return nextStatuses.find(status => !status.startsWith('closed_')) || nextStatuses[0]
}

/**
 * Calculates the completion percentage of the lead workflow
 */
export function getWorkflowProgress(status: LeadStatus): number {
  const progressMap: Record<LeadStatus, number> = {
    'new': 10,
    'contacted': 25,
    'measurement_scheduled': 40,
    'measured': 60,
    'quoted': 75,
    'proposal_sent': 90,
    'closed_won': 100,
    'closed_lost': 0
  }
  
  return progressMap[status] || 0
}

/**
 * Checks if a lead is in an active (non-closed) state
 */
export function isActiveStatus(status: LeadStatus): boolean {
  return !status.startsWith('closed_')
}

/**
 * Gets user-friendly status labels
 */
export function getStatusLabel(status: LeadStatus): string {
  const labels: Record<LeadStatus, string> = {
    'new': 'New Lead',
    'contacted': 'Contacted',
    'measurement_scheduled': 'Measurement Scheduled',
    'measured': 'Measured',
    'quoted': 'Quote Prepared',
    'proposal_sent': 'Proposal Sent',
    'closed_won': 'Won',
    'closed_lost': 'Lost'
  }
  
  return labels[status] || status
}