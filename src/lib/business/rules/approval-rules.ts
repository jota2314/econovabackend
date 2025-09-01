/**
 * Business rules for estimate approval workflow
 */

import { BUSINESS_RULES } from '@/lib/constants/business'
import type { Estimate, EstimateApprovalFlow } from '@/types'

/**
 * Determines if an estimate requires approval based on business rules
 */
export function requiresApproval(estimate: Estimate): boolean {
  return estimate.total_amount >= BUSINESS_RULES.ESTIMATES.AUTO_APPROVAL_THRESHOLD
}

/**
 * Checks if a user can approve an estimate based on their role
 */
export function canApproveEstimate(userRole: string, estimateAmount: number): boolean {
  if (userRole === 'admin') return true
  if (userRole === 'manager') return true
  if (userRole === 'salesperson' && estimateAmount < BUSINESS_RULES.ESTIMATES.AUTO_APPROVAL_THRESHOLD) {
    return true
  }
  return false
}

/**
 * Gets the approval flow configuration for an estimate
 */
export function getApprovalFlow(
  estimate: Estimate, 
  currentUserRole: string
): EstimateApprovalFlow {
  const needsApproval = requiresApproval(estimate)
  const canApprove = canApproveEstimate(currentUserRole, estimate.total_amount)
  
  return {
    requires_approval: needsApproval,
    approval_threshold: BUSINESS_RULES.ESTIMATES.AUTO_APPROVAL_THRESHOLD,
    current_user_can_approve: canApprove,
    approval_message: needsApproval && !canApprove 
      ? `Estimates over $${BUSINESS_RULES.ESTIMATES.AUTO_APPROVAL_THRESHOLD.toLocaleString()} require manager approval`
      : undefined
  }
}

/**
 * Validates markup percentage is within business rules
 */
export function validateMarkup(markupPercentage: number): { valid: boolean; message?: string } {
  const { MIN, MAX } = BUSINESS_RULES.ESTIMATES
  
  if (markupPercentage < MIN) {
    return {
      valid: false,
      message: `Markup percentage must be at least ${MIN}%`
    }
  }
  
  if (markupPercentage > MAX) {
    return {
      valid: false,
      message: `Markup percentage cannot exceed ${MAX}%`
    }
  }
  
  return { valid: true }
}