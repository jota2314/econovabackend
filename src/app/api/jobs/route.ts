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
        measurements(id, room_name, floor_level, area_type, surface_type, square_feet, insulation_type, r_value)
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

    return NextResponse.json({
      success: true,
      data: data || []
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
      measurement_type,
      project_type, 
      structural_framing, 
      roof_rafters, 
      scope_of_work 
    } = body

    console.log('Creating job:', body)

    if (!job_name || !lead_id || !measurement_type) {
      return NextResponse.json(
        { success: false, error: 'Job name, lead ID, and measurement type are required' },
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

    // Create the job
    const { data, error } = await supabase
      .from('jobs')
      .insert({
        job_name,
        lead_id,
        measurement_type,
        project_type: project_type || 'new_construction',
        structural_framing,
        roof_rafters,
        scope_of_work,
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