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
    const { 
      room_name, 
      floor_level, 
      area_type, 
      surface_type, 
      height, 
      width, 
      insulation_type, 
      notes 
    } = body

    console.log(`[POST /api/jobs/${id}/measurements] Request body:`, body)

    // Validate required fields (make floor_level and area_type optional for backward compatibility)
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
    
    // Build insert data with available fields
    const insertData: any = {
      job_id: id,
      room_name,
      surface_type,
      height,
      width,
      notes: notes || null
    }
    
    // Add optional enhanced fields if they exist in the database
    // These will be stored in notes or metadata if columns don't exist
    if (floor_level) {
      insertData.floor_level = floor_level
    }
    if (area_type) {
      insertData.area_type = area_type
    }
    if (insulation_type) {
      insertData.insulation_type = insulation_type
    }
    
    // Calculate R-value if we have area_type
    if (area_type) {
      try {
        const { calculateRValue } = await import('@/lib/utils/r-value-calculator')
        const { data: job } = await supabase
          .from('jobs')
          .select('project_type')
          .eq('id', id)
          .single()
        
        const projectType = job?.project_type || 'new_construction'
        const rValueResult = calculateRValue(projectType as any, area_type as any)
        insertData.r_value = rValueResult.rValue
      } catch (error) {
        console.log('R-value calculation skipped:', error)
      }
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