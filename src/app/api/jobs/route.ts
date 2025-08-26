import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')

    let query = supabase
      .from('jobs')
      .select(`
        *,
        lead:leads!lead_id(name, phone, address)
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
    const body = await request.json()
    const { 
      job_name, 
      lead_id, 
      measurement_type, 
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

    const supabase = createClient()

    // Create the job
    const { data, error } = await supabase
      .from('jobs')
      .insert({
        job_name,
        lead_id,
        measurement_type,
        structural_framing,
        roof_rafters,
        scope_of_work,
        total_square_feet: 0,
        created_by: '00000000-0000-0000-0000-000000000000' // System user for now
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