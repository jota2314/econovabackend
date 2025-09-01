import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, type AuthenticatedRequest } from '@/lib/middleware/auth'

async function getEstimateHandler(
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Single optimized query with all related data
  const { data: estimate, error } = await supabase
    .from('estimates')
    .select(`
      *,
      jobs!inner (
        id,
        job_name,
        service_type,
        total_square_feet,
        lead:leads!lead_id (
          id,
          name,
          email,
          phone,
          address,
          city,
          state
        )
      ),
      created_by_user:users!estimates_created_by_fkey (
        id,
        full_name,
        email
      ),
      estimate_line_items (
        id,
        description,
        quantity,
        unit_price,
        line_total,
        unit,
        service_type
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching estimate:', error)
    return NextResponse.json(
      { success: false, error: 'Estimate not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    success: true,
    data: estimate
  })
}

async function updateEstimateHandler(
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const supabase = await createClient()

  // Validate the estimate exists and user has permission
  const { data: existingEstimate, error: fetchError } = await supabase
    .from('estimates')
    .select('status, created_by')
    .eq('id', id)
    .single()

  if (fetchError || !existingEstimate) {
    return NextResponse.json(
      { success: false, error: 'Estimate not found' },
      { status: 404 }
    )
  }

  // Only allow updates if user created the estimate or is a manager
  if (existingEstimate.created_by !== request.user!.id && request.userProfile?.role !== 'manager') {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions' },
      { status: 403 }
    )
  }

  // Prevent updates to approved estimates
  if (existingEstimate.status === 'approved') {
    return NextResponse.json(
      { success: false, error: 'Cannot update approved estimates' },
      { status: 400 }
    )
  }

  // Update the estimate
  const { data: updatedEstimate, error: updateError } = await supabase
    .from('estimates')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating estimate:', updateError)
    return NextResponse.json(
      { success: false, error: 'Failed to update estimate' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    data: updatedEstimate
  })
}

async function deleteEstimateHandler(
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Check if estimate exists and user has permission
  const { data: estimate, error: fetchError } = await supabase
    .from('estimates')
    .select('status, created_by')
    .eq('id', id)
    .single()

  if (fetchError || !estimate) {
    return NextResponse.json(
      { success: false, error: 'Estimate not found' },
      { status: 404 }
    )
  }

  // Only allow deletion if user created the estimate or is a manager
  if (estimate.created_by !== request.user!.id && request.userProfile?.role !== 'manager') {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions' },
      { status: 403 }
    )
  }

  // Prevent deletion of approved estimates
  if (estimate.status === 'approved') {
    return NextResponse.json(
      { success: false, error: 'Cannot delete approved estimates' },
      { status: 400 }
    )
  }

  // Delete the estimate (cascade should handle line items)
  const { error: deleteError } = await supabase
    .from('estimates')
    .delete()
    .eq('id', id)

  if (deleteError) {
    console.error('Error deleting estimate:', deleteError)
    return NextResponse.json(
      { success: false, error: 'Failed to delete estimate' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: 'Estimate deleted successfully'
  })
}

// Apply auth middleware to all routes
export const GET = requireAuth(getEstimateHandler)
export const PATCH = requireAuth(updateEstimateHandler)
export const DELETE = requireAuth(deleteEstimateHandler)