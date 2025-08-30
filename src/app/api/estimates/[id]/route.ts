import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: estimate, error } = await supabase
      .from('estimates')
      .select(`
        *,
        jobs!inner (
          id,
          job_name,
          service_type,
          lead_id,
          lead:leads!lead_id (
            id,
            name,
            email,
            phone,
            address
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

  } catch (error) {
    console.error('Error in estimate GET:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is a manager for approval actions
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const body = await request.json()
    console.log('[PATCH /api/estimates/[id]] Request body:', body)

    // If status is being changed to approved/rejected, only managers can do this
    if ((body.status === 'approved' || body.status === 'rejected') && userData?.role !== 'manager') {
      return NextResponse.json(
        { success: false, error: 'Only managers can approve or reject estimates' },
        { status: 403 }
      )
    }

    // Build update object
    const updateData: any = {}
    
    if (body.status) {
      updateData.status = body.status
    }
    
    if (body.subtotal !== undefined) {
      updateData.subtotal = body.subtotal
    }
    
    if (body.notes !== undefined) {
      updateData.notes = body.notes
    }
    
    if (body.approved_at !== undefined) {
      updateData.approved_at = body.approved_at
    }

    // Update the estimate
    const { data: estimate, error } = await supabase
      .from('estimates')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        jobs!inner (
          id,
          job_name,
          service_type,
          lead_id
        ),
        created_by_user:users!estimates_created_by_fkey (
          id,
          full_name,
          email
        )
      `)
      .single()

    if (error) {
      console.error('Error updating estimate:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update estimate' },
        { status: 500 }
      )
    }

    console.log('[PATCH /api/estimates/[id]] Updated estimate:', estimate?.id)

    return NextResponse.json({
      success: true,
      data: estimate
    })

  } catch (error) {
    console.error('Error in estimate PATCH:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // First, get the estimate to check ownership
    const { data: estimate } = await supabase
      .from('estimates')
      .select('created_by')
      .eq('id', id)
      .single()

    if (!estimate) {
      return NextResponse.json(
        { success: false, error: 'Estimate not found' },
        { status: 404 }
      )
    }

    // Check if user can delete this estimate (owner or manager)
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (estimate.created_by !== user.id && userData?.role !== 'manager') {
      return NextResponse.json(
        { success: false, error: 'You can only delete your own estimates' },
        { status: 403 }
      )
    }

    // Delete the estimate (this will cascade to line items)
    const { error } = await supabase
      .from('estimates')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting estimate:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete estimate' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Estimate deleted successfully'
    })

  } catch (error) {
    console.error('Error in estimate DELETE:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}