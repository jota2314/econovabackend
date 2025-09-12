import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/services/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // For now, use a hardcoded manager user for testing with a valid UUID
    // TODO: Implement proper session-based authentication
    const user = { id: '00000000-0000-0000-0000-000000000001' }
    
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
        approved_by: null, // TODO: Replace with actual user ID once proper authentication is implemented
        approved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      logger.error('Error approving estimate', updateError, { estimateId: id, userId: user.id })
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
      logger.warn('Failed to update job workflow status', { error: jobUpdateError, jobId: estimate.jobs.id })
    }

    logger.info('Estimate approved successfully', { estimateId: id, userId: user.id, jobId: estimate.jobs.id })

    return NextResponse.json({
      success: true,
      message: 'Estimate approved successfully',
      estimate: updatedEstimate,
      job_workflow_updated: !jobUpdateError
    })

  } catch (error) {
    logger.error('Error in approve estimate API', error, { estimateId: id })
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}