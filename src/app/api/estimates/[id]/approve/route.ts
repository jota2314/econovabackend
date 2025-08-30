import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // Check if user is a manager
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || userData.role !== 'manager') {
      return NextResponse.json(
        { success: false, error: 'Only managers can approve estimates' },
        { status: 403 }
      )
    }

    // Get the estimate to check if it exists and its current status
    const { data: existingEstimate, error: fetchError } = await supabase
      .from('estimates')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingEstimate) {
      return NextResponse.json(
        { success: false, error: 'Estimate not found' },
        { status: 404 }
      )
    }

    if (existingEstimate.status === 'approved') {
      return NextResponse.json(
        { success: false, error: 'Estimate is already approved' },
        { status: 400 }
      )
    }

    // Update the estimate
    const { data: updatedEstimate, error: updateError } = await supabase
      .from('estimates')
      .update({
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        jobs!inner (
          id,
          customer_name,
          service_type,
          address
        ),
        approved_by_user:users!estimates_approved_by_fkey (
          id,
          full_name,
          email
        )
      `)
      .single()

    if (updateError) {
      console.error('Error approving estimate:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to approve estimate' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedEstimate,
      message: 'Estimate approved successfully'
    })

  } catch (error) {
    console.error('Error in estimate approval:', error)
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

    // Check if user is a manager
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || userData.role !== 'manager') {
      return NextResponse.json(
        { success: false, error: 'Only managers can reject estimates' },
        { status: 403 }
      )
    }

    // Update the estimate status to rejected
    const { data: rejectedEstimate, error: rejectError } = await supabase
      .from('estimates')
      .update({
        status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (rejectError) {
      console.error('Error rejecting estimate:', rejectError)
      return NextResponse.json(
        { success: false, error: 'Failed to reject estimate' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: rejectedEstimate,
      message: 'Estimate rejected successfully'
    })

  } catch (error) {
    console.error('Error in estimate rejection:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}