import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireManagerRole, type AuthenticatedRequest } from '@/lib/middleware/auth'

async function handleApprovalAction(
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { action } = body // action: 'approve' | 'reject'
  
  if (!action || !['approve', 'reject'].includes(action)) {
    return NextResponse.json(
      { success: false, error: 'Invalid action. Must be "approve" or "reject"' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Get the estimate with job details
  const { data: estimate, error: estimateError } = await supabase
    .from('estimates')
    .select(`
      *,
      jobs!inner (
        id,
        job_name,
        service_type,
        lead:leads (
          name,
          email,
          phone
        )
      ),
      created_by_user:users!left!estimates_created_by_fkey (
        id,
        full_name,
        email
      )
    `)
    .eq('id', id)
    .single()

  if (estimateError || !estimate) {
    return NextResponse.json(
      { success: false, error: 'Estimate not found' },
      { status: 404 }
    )
  }

  if (estimate.status === 'approved' && action === 'approve') {
    return NextResponse.json(
      { success: false, error: 'Estimate is already approved' },
      { status: 400 }
    )
  }

  // Update estimate status
  const newStatus = action === 'approve' ? 'approved' : 'rejected'
  const updateData: any = {
    status: newStatus,
    approved_by: request.user!.id,
    approved_at: new Date().toISOString()
  }

  // Use transaction for measurement locking
  const { data: updatedEstimate, error: updateError } = await supabase
    .from('estimates')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      jobs!inner (
        id,
        job_name,
        service_type
      ),
      approved_by_user:users!left!estimates_approved_by_fkey (
        id,
        full_name,
        email
      )
    `)

  if (updateError) {
    console.error('Error updating estimate:', updateError)
    return NextResponse.json(
      { success: false, error: 'Failed to update estimate status' },
      { status: 500 }
    )
  }

  // Check if any rows were updated
  if (!updatedEstimate || updatedEstimate.length === 0) {
    console.error('No estimate was updated for ID:', id)
    return NextResponse.json(
      { success: false, error: 'Estimate not found or could not be updated' },
      { status: 404 }
    )
  }

  // Get the first (and should be only) updated estimate
  const finalEstimate = Array.isArray(updatedEstimate) ? updatedEstimate[0] : updatedEstimate

  // Handle measurement locking
  let measurementUpdate = null
  if (action === 'approve') {
    // Lock measurements when estimate is approved
    measurementUpdate = await supabase
      .from('measurements')
      .update({
        locked_by_estimate_id: id,
        is_locked: true,
        locked_at: new Date().toISOString()
      })
      .eq('job_id', finalEstimate.jobs.id)
  } else {
    // Unlock measurements when estimate is rejected
    measurementUpdate = await supabase
      .from('measurements')
      .update({
        locked_by_estimate_id: null,
        is_locked: false,
        locked_at: null
      })
      .eq('job_id', finalEstimate.jobs.id)
      .eq('locked_by_estimate_id', id)
  }

  return NextResponse.json({
    success: true,
    data: {
      estimate: finalEstimate,
      measurements_locked: action === 'approve',
      measurements_updated: measurementUpdate?.count || 0
    },
    message: `Estimate ${action}d successfully`
  })
}

// POST method for approve/reject action (primary method)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is a manager
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userProfile?.role !== 'manager') {
      return NextResponse.json(
        { success: false, error: 'Only managers can approve/reject estimates' },
        { status: 403 }
      )
    }

    // Create authenticated request and call handler
    const authenticatedRequest = request as AuthenticatedRequest
    authenticatedRequest.user = user
    authenticatedRequest.userProfile = userProfile

    return handleApprovalAction(authenticatedRequest, { params: Promise.resolve({ id }) })
  } catch (error) {
    console.error('Error in POST approval handler:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT method for approve/reject action  
export const PUT = requireManagerRole(handleApprovalAction)

// PATCH method for backward compatibility with existing frontend
export const PATCH = requireManagerRole(async (request: AuthenticatedRequest, context: any) => {
  const body = await request.json()
  
  // Convert PATCH request to approval action format
  if (body.status === 'approved') {
    const modifiedRequest = request as AuthenticatedRequest
    modifiedRequest.json = () => Promise.resolve({ action: 'approve' })
    return handleApprovalAction(modifiedRequest, context)
  } else if (body.status === 'rejected') {
    const modifiedRequest = request as AuthenticatedRequest
    modifiedRequest.json = () => Promise.resolve({ action: 'reject' })
    return handleApprovalAction(modifiedRequest, context)
  }
  
  return NextResponse.json(
    { success: false, error: 'Invalid status. Must approve or reject via action parameter' },
    { status: 400 }
  )
})