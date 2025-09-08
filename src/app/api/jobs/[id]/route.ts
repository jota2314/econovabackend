import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/lib/types/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: job, error } = await supabase
      .from('jobs')
      .select(`
        *,
        lead:leads(
          name,
          phone,
          email,
          address,
          city,
          state
        ),
        measurements(
          id,
          room_name,
          surface_type,
          square_feet
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching job:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch job' },
        { status: 500 }
      )
    }

    // Parse project_type from scope_of_work if stored as JSON
    let enhancedJob = job
    if (job?.scope_of_work) {
      try {
        const parsed = JSON.parse(job.scope_of_work)
        enhancedJob = {
          ...job,
          scope_of_work: parsed.description || job.scope_of_work
        } as any
      } catch {
        // If not JSON, keep original
      }
    }

    return NextResponse.json({
      success: true,
      data: enhancedJob
    })

  } catch (error) {
    console.error('Error in jobs GET:', error)
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
  const { id } = await params
  console.log(`[PATCH /api/jobs/${id}] Starting request`)
  
  try {
    const supabase = await createClient()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log(`[PATCH /api/jobs/${id}] Auth result:`, { 
      hasUser: !!user, 
      userId: user?.id, 
      authError: authError?.message 
    })
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { total_square_feet, ...otherUpdates } = body

    console.log(`[PATCH /api/jobs/${id}] Request body:`, body)

    // Create a clean update object with only the fields we want to update
    const jobUpdate: Record<string, unknown> = {}
    if (total_square_feet !== undefined) {
      jobUpdate.total_square_feet = total_square_feet
    }
    
    // Add any other valid job fields from otherUpdates
    const validJobFields = ['job_name', 'measurement_type', 'structural_framing', 'roof_rafters', 'scope_of_work', 'quote_amount', 'quote_sent_at', 'workflow_status']
    for (const [key, value] of Object.entries(otherUpdates)) {
      if (validJobFields.includes(key) && value !== undefined) {
        jobUpdate[key] = value
      }
    }
    
    console.log(`[PATCH /api/jobs/${id}] Update data:`, jobUpdate)

    // Use type assertion to handle dynamic update objects with Supabase
    const { data: job, error } = await supabase
      .from('jobs')
      .update(jobUpdate as any)
      .eq('id', id)
      .select('*')
      .single()

    if (error || !job) {
      console.error(`[PATCH /api/jobs/${id}] Database error:`, error)
      return NextResponse.json(
        { success: false, error: 'Failed to update job' },
        { status: 500 }
      )
    }

    // Type assertion to help TypeScript understand the type
    const updatedJob = job as Database['public']['Tables']['jobs']['Row']
    console.log(`[PATCH /api/jobs/${id}] Success:`, { jobId: updatedJob.id })

    return NextResponse.json({
      success: true,
      data: updatedJob
    })

  } catch (error) {
    console.error('Error in jobs PATCH:', error)
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
  const { id } = await params
  console.log(`[DELETE /api/jobs/${id}] Starting request`)
  
  try {
    const supabase = await createClient()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log(`[DELETE /api/jobs/${id}] Auth result:`, { 
      hasUser: !!user, 
      userId: user?.id, 
      authError: authError?.message 
    })
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log(`[DELETE /api/jobs/${id}] Deleting measurements first...`)
    
    // First delete all measurements associated with the job
    const { error: measurementsError } = await supabase
      .from('measurements')
      .delete()
      .eq('job_id', id)

    if (measurementsError) {
      console.error(`[DELETE /api/jobs/${id}] Error deleting measurements:`, measurementsError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete job measurements' },
        { status: 500 }
      )
    }

    console.log(`[DELETE /api/jobs/${id}] Measurements deleted, now deleting job...`)

    // Then delete the job
    const { error: jobError } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id)

    if (jobError) {
      console.error(`[DELETE /api/jobs/${id}] Error deleting job:`, jobError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete job' },
        { status: 500 }
      )
    }

    console.log(`[DELETE /api/jobs/${id}] Job deleted successfully`)

    return NextResponse.json({
      success: true,
      message: 'Job deleted successfully'
    })

  } catch (error) {
    console.error('Error in jobs DELETE:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}