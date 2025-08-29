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

    let query = supabase
      .from('jobs')
      .select(`
        *,
        lead:leads!lead_id(name, phone, address),
        measurements(id, room_name, floor_level, area_type, surface_type, framing_size, square_feet, insulation_type, r_value, photo_url, notes)
      `)
      .order('created_at', { ascending: false })

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
    const supabase = await createClient()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      job_name, 
      lead_id, 
      service_type,
      building_type,
      measurement_type,
      job_complexity,
      // Insulation fields
      project_type, 
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

    console.log('Creating multi-trade job:', body)

    if (!job_name || !lead_id || !service_type || !building_type || !measurement_type) {
      return NextResponse.json(
        { success: false, error: 'Job name, lead ID, service type, building type, and measurement type are required' },
        { status: 400 }
      )
    }

    // First, ensure the user exists in the users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    // If user doesn't exist, create them
    if (!existingUser) {
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
        console.error('Error creating user:', userError)
        // Continue anyway - we'll create job without created_by
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
        project_type: project_type || 'new_construction',
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
    const { data, error } = await supabase
      .from('jobs')
      .insert({
        job_name,
        lead_id,
        service_type,
        building_type: building_type,
        measurement_type,
        structural_framing: service_type === 'insulation' ? structural_framing : null,
        roof_rafters: service_type === 'insulation' ? roof_rafters : null,
        scope_of_work: JSON.stringify(serviceSpecificData),
        total_square_feet: 0,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating job:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    console.log('Job created successfully:', data.id)

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