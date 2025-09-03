import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')

    // Get user's role to determine data access
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    let query = supabase
      .from('jobs')
      .select(`
        *,
        latest_estimate_pdf_url,
        latest_estimate_pdf_name,
        pdf_generated_at,
        estimate_sent_at,
        lead:leads!lead_id(name, phone, address),
        measurements(id, room_name, floor_level, area_type, surface_type, framing_size, square_feet, insulation_type, r_value, photo_url, notes),
        estimates(id, estimate_number, subtotal, total_amount, status, created_by)
      `)
      .order('created_at', { ascending: false })

    // Apply role-based filtering
    if (userProfile?.role === 'salesperson' || userProfile?.role === 'lead_hunter') {
      // Salesperson and lead hunters can only see their own jobs
      query = query.eq('created_by', user.id)
    }
    // Managers and admins can see all jobs (no filter needed)

    if (leadId) {
      query = query.eq('lead_id', leadId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching jobs:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // Parse service-specific data from scope_of_work if stored as JSON
    const enhancedJobs = data?.map((job: any) => {
      if (job.scope_of_work) {
        try {
          const parsed = JSON.parse(job.scope_of_work)
          return {
            ...job,
            // Extract service-specific fields
            project_type: parsed.project_type || null,
            system_type: parsed.system_type || null,
            install_type: parsed.install_type || null,
            tonnage_estimate: parsed.tonnage_estimate || null,
            plaster_job_type: parsed.plaster_job_type || null,
            number_of_rooms: parsed.number_of_rooms || null,
            approximate_sqft: parsed.approximate_sqft || null,
            job_complexity: parsed.job_complexity || 'standard',
            scope_of_work: parsed.description || job.scope_of_work
          }
        } catch (e) {
          // If not JSON, keep original
        }
      }
      return job
    }) || []

    return NextResponse.json({
      success: true,
      data: enhancedJobs
    })

  } catch (error) {
    console.error('Error in jobs GET:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[POST /api/jobs] Starting job creation request')
    const supabase = await createClient()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('[POST /api/jobs] Auth result:', { hasUser: !!user, userId: user?.id, authError: authError?.message })
    
    if (authError || !user) {
      console.log('[POST /api/jobs] Auth failed')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('[POST /api/jobs] Request body:', body)
    
    const { 
      job_name, 
      lead_id, 
      service_type,
      building_type,
      measurement_type,
      job_complexity,
      // Project address fields
      project_address,
      project_city,
      project_state,
      project_zip_code,
      // Project type field
      construction_type, 
      // Legacy fields (for backward compatibility)
      structural_framing, 
      roof_rafters,
      // HVAC fields
      system_type,
      install_type,
      tonnage_estimate,
      // Plaster fields
      plaster_job_type,
      number_of_rooms,
      approximate_sqft,
      scope_of_work 
    } = body

    console.log('[POST /api/jobs] Parsed fields:', { job_name, lead_id, service_type, building_type, measurement_type })

    if (!job_name || !lead_id || !service_type || !building_type || !measurement_type) {
      console.log('[POST /api/jobs] Missing required fields:', { job_name: !!job_name, lead_id: !!lead_id, service_type: !!service_type, building_type: !!building_type, measurement_type: !!measurement_type })
      return NextResponse.json(
        { success: false, error: 'Job name, lead ID, service type, building type, and measurement type are required' },
        { status: 400 }
      )
    }

    // First, ensure the user exists in the users table
    console.log('[POST /api/jobs] Checking if user exists:', user.id)
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    console.log('[POST /api/jobs] User exists:', !!existingUser)

    // If user doesn't exist, create them
    if (!existingUser) {
      console.log('[POST /api/jobs] Creating new user')
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || user.email || 'Unknown',
          role: 'manager'
        })
        .single()
      
      if (userError) {
        console.error('[POST /api/jobs] Error creating user:', userError)
        // Continue anyway - we'll create job without created_by
      } else {
        console.log('[POST /api/jobs] User created successfully')
      }
    }

    // Store service-specific data in scope_of_work as JSON structure
    const serviceSpecificData = {
      description: scope_of_work || '',
      service_type,
      building_type,
      job_complexity: job_complexity || 'standard',
      // Insulation fields
      ...(service_type === 'insulation' && {
        construction_type: construction_type || 'new',
        structural_framing,
        roof_rafters
      }),
      // HVAC fields
      ...(service_type === 'hvac' && {
        system_type,
        install_type,
        tonnage_estimate
      }),
      // Plaster fields
      ...(service_type === 'plaster' && {
        plaster_job_type,
        number_of_rooms,
        approximate_sqft
      })
    }
    
    // Create the job with new multi-trade structure
    const jobData = {
      job_name,
      lead_id,
      service_type,
      building_type: building_type,
      measurement_type,
      project_address,
      project_city,
      project_state,
      project_zip_code,
      construction_type,
      structural_framing: service_type === 'insulation' ? structural_framing : null,
      roof_rafters: service_type === 'insulation' ? roof_rafters : null,
      scope_of_work: JSON.stringify(serviceSpecificData),
      total_square_feet: 0,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    console.log('[POST /api/jobs] Creating job with data:', jobData)
    
    const { data, error } = await supabase
      .from('jobs')
      .insert(jobData)
      .select()
      .single()

    console.log('[POST /api/jobs] Job creation result:', { success: !error, error, jobId: data?.id })

    if (error) {
      console.error('[POST /api/jobs] Database error creating job:', error)
      return NextResponse.json(
        { success: false, error: error.message, details: error },
        { status: 500 }
      )
    }

    console.log('[POST /api/jobs] Job created successfully:', data.id)

    return NextResponse.json({
      success: true,
      data,
      message: 'Job created successfully'
    })

  } catch (error) {
    console.error('Error in jobs POST:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}