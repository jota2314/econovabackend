import { NextRequest, NextResponse } from 'next/server'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
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

    console.log(`✅ Approving estimate ${id} by user ${user.id}`)

    // Check if user is a manager
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userProfile?.role !== 'manager') {
      return NextResponse.json(
        { success: false, error: 'Only managers can approve estimates' },
        { status: 403 }
      )
    }

    // Get estimate with job details first
    const { data: estimate, error: estimateError } = await supabase
      .from('estimates')
      .select(`
        *,
        jobs!inner (
          id,
          job_name,
          service_type
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

    // Update estimate status to approved
    const { data: updatedEstimate, error: updateError } = await supabase
      .from('estimates')
      .update({
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error approving estimate:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to approve estimate' },
        { status: 500 }
      )
    }

    // Update job workflow status to allow workflow progression
    const { error: jobUpdateError } = await supabase
      .from('jobs')
      .update({
        workflow_status: 'send_to_customer'
      })
      .eq('id', estimate.jobs.id)

    if (jobUpdateError) {
      console.warn('Warning: Failed to update job workflow status:', jobUpdateError)
    }

    console.log(`✅ Estimate ${id} approved successfully`)

    return NextResponse.json({
      success: true,
      message: 'Estimate approved successfully',
      estimate: updatedEstimate,
      job_workflow_updated: !jobUpdateError
    })

  } catch (error) {
    console.error('Error in approve estimate API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}