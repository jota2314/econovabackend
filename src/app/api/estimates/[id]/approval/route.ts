import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { permissionsService } from '@/lib/services/permissions'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const supabase = await createClient()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is a manager
    const userRole = await permissionsService.getUserRole(user.id)
    if (userRole !== 'manager') {
      return NextResponse.json(
        { success: false, error: 'Only managers can approve/reject estimates' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, reason } = body // action: 'approve' | 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    // Get the estimate
    const { data: estimate, error: estimateError } = await supabase
      .from('estimates')
      .select('job_id, status')
      .eq('id', id)
      .single()

    if (estimateError || !estimate) {
      return NextResponse.json(
        { success: false, error: 'Estimate not found' },
        { status: 404 }
      )
    }

    // Update estimate status
    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    const updateData: any = {
      status: newStatus,
      approved_by: user.id,
      approved_at: new Date().toISOString()
    }

    const { data: updatedEstimate, error: updateError } = await supabase
      .from('estimates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Failed to update estimate status' },
        { status: 500 }
      )
    }

    // Handle measurement locking based on approval/rejection
    if (action === 'approve') {
      // Lock measurements when estimate is approved
      await permissionsService.lockMeasurements(estimate.job_id, id)
    } else if (action === 'reject') {
      // Unlock measurements when estimate is rejected (in case it was previously approved)
      await permissionsService.unlockMeasurements(estimate.job_id, id)
    }

    return NextResponse.json({
      success: true,
      data: {
        estimate: updatedEstimate,
        measurements_locked: action === 'approve'
      }
    })

  } catch (error) {
    console.error('Estimate approval API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}