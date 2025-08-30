import { createClient } from '@/lib/supabase/server'

export type UserRole = 'manager' | 'salesperson' | 'lead_hunter'
export type EstimateStatus = 'draft' | 'pending_approval' | 'sent' | 'approved' | 'rejected'

export class PermissionsService {
  async getUserRole(userId: string): Promise<UserRole | null> {
    const supabase = await createClient()
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()
    
    return userProfile?.role || null
  }

  async getMeasurementLockStatus(measurementId: string) {
    const supabase = await createClient()
    const { data: measurement } = await supabase
      .from('measurements')
      .select('is_locked, locked_by_estimate_id, locked_at')
      .eq('id', measurementId)
      .single()
    
    return measurement
  }

  async getEstimateStatus(estimateId: string): Promise<EstimateStatus | null> {
    const supabase = await createClient()
    const { data: estimate } = await supabase
      .from('estimates')
      .select('status')
      .eq('id', estimateId)
      .single()
    
    return estimate?.status || null
  }

  async canEditMeasurements(userId: string, jobId: string): Promise<{
    canEdit: boolean
    reason?: string
    lockedByEstimate?: string
  }> {
    const userRole = await this.getUserRole(userId)
    
    // Managers can always edit
    if (userRole === 'manager') {
      return { canEdit: true }
    }

    // Check if any measurements for this job are locked
    const supabase = await createClient()
    const { data: lockedMeasurements } = await supabase
      .from('measurements')
      .select('locked_by_estimate_id, locked_at')
      .eq('job_id', jobId)
      .eq('is_locked', true)
      .limit(1)
    
    if (lockedMeasurements && lockedMeasurements.length > 0) {
      return {
        canEdit: false,
        reason: 'Measurements are locked by an approved estimate',
        lockedByEstimate: lockedMeasurements[0].locked_by_estimate_id
      }
    }

    return { canEdit: true }
  }

  async canEditEstimate(userId: string, estimateId: string): Promise<{
    canEdit: boolean
    reason?: string
  }> {
    const userRole = await this.getUserRole(userId)
    
    // Managers can always edit
    if (userRole === 'manager') {
      return { canEdit: true }
    }

    const estimateStatus = await this.getEstimateStatus(estimateId)
    
    // Salespersons can edit draft and rejected estimates
    if (estimateStatus === 'draft' || estimateStatus === 'rejected') {
      return { canEdit: true }
    }

    // Cannot edit approved or pending estimates
    if (estimateStatus === 'approved') {
      return {
        canEdit: false,
        reason: 'Estimate is approved and locked. Contact a manager to request changes.'
      }
    }

    if (estimateStatus === 'pending_approval') {
      return {
        canEdit: false,
        reason: 'Estimate is pending approval and cannot be modified.'
      }
    }

    return { canEdit: true }
  }

  async lockMeasurements(jobId: string, estimateId: string): Promise<void> {
    const supabase = await createClient()
    
    // Lock all measurements for this job
    await supabase
      .from('measurements')
      .update({
        is_locked: true,
        locked_by_estimate_id: estimateId,
        locked_at: new Date().toISOString()
      })
      .eq('job_id', jobId)

    // Mark the estimate as locking measurements
    await supabase
      .from('estimates')
      .update({
        locks_measurements: true
      })
      .eq('id', estimateId)
  }

  async unlockMeasurements(jobId: string, estimateId: string): Promise<void> {
    const supabase = await createClient()
    
    // Unlock measurements locked by this estimate
    await supabase
      .from('measurements')
      .update({
        is_locked: false,
        locked_by_estimate_id: null,
        locked_at: null
      })
      .eq('job_id', jobId)
      .eq('locked_by_estimate_id', estimateId)

    // Update the estimate to not lock measurements
    await supabase
      .from('estimates')
      .update({
        locks_measurements: false
      })
      .eq('id', estimateId)
  }
}

export const permissionsService = new PermissionsService()