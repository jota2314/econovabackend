import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  console.log(`[GET /api/jobs/${id}/measurements] Starting request`)
  
  try {
    const supabase = await createClient()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log(`[GET /api/jobs/${id}/measurements] Auth result:`, { 
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

    const { data: measurements, error } = await supabase
      .from('measurements')
      .select('*')
      .eq('job_id', id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error(`[GET /api/jobs/${id}/measurements] Database error:`, error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch measurements' },
        { status: 500 }
      )
    }

    console.log(`[GET /api/jobs/${id}/measurements] Success:`, { 
      count: measurements?.length || 0 
    })
    
    return NextResponse.json({
      success: true,
      data: measurements || []
    })

  } catch (error) {
    console.error('Error in measurements GET:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  console.log(`[POST /api/jobs/${id}/measurements] Starting request`)
  
  try {
    const supabase = await createClient()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log(`[POST /api/jobs/${id}/measurements] Auth result:`, { 
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
    const { room_name, surface_type, height, width, notes } = body

    console.log(`[POST /api/jobs/${id}/measurements] Request body:`, body)

    // Validate required fields
    if (!room_name || !surface_type || !height || !width) {
      console.log(`[POST /api/jobs/${id}/measurements] Validation failed:`, {
        room_name, surface_type, height, width
      })
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Calculate square feet
    const square_feet = height * width

    const insertData = {
      job_id: id,
      room_name,
      surface_type,
      height,
      width,
      notes: notes || null
    }

    console.log(`[POST /api/jobs/${id}/measurements] Creating measurement:`, insertData)

    const { data: measurement, error } = await supabase
      .from('measurements')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error(`[POST /api/jobs/${id}/measurements] Database error:`, {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error
      })
      return NextResponse.json(
        { success: false, error: 'Failed to create measurement', details: error.message },
        { status: 500 }
      )
    }

    if (!measurement) {
      console.error(`[POST /api/jobs/${id}/measurements] No measurement returned despite no error`)
      return NextResponse.json(
        { success: false, error: 'No measurement data returned' },
        { status: 500 }
      )
    }

    console.log(`[POST /api/jobs/${id}/measurements] Success:`, { 
      id: measurement.id,
      square_feet: measurement.square_feet
    })

    return NextResponse.json({
      success: true,
      data: measurement
    })

  } catch (error) {
    console.error('Error in measurements POST:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}