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

    // First get the job to determine the service type
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('service_type')
      .eq('id', id)
      .single()

    if (jobError || !job) {
      console.error(`[GET /api/jobs/${id}/measurements] Job not found:`, jobError)
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      )
    }

    // Query measurements from the single measurements table (include lock status)
    const { data: measurements, error } = await supabase
      .from('measurements')
      .select('*')
      .eq('job_id', id)
      .order('created_at', { ascending: true })
    
    console.log(`[GET /api/jobs/${id}/measurements] Result:`, { 
      data: measurements,
      error: error,
      count: measurements?.length || 0
    })

    if (error) {
      console.error(`[GET /api/jobs/${id}/measurements] Database error:`, error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch measurements' },
        { status: 500 }
      )
    }

    // Return measurements with all fields (no need to parse from notes anymore)
    const enhancedMeasurements = measurements || []
    
    console.log(`[GET /api/jobs/${id}/measurements] Success:`, { 
      count: enhancedMeasurements.length 
    })
    
    return NextResponse.json({
      success: true,
      data: enhancedMeasurements
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

    // Load current user's role for permission checks
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    const currentUserRole = (profile?.role as 'manager' | 'salesperson') ?? null

    // Check if measurements are locked by an approved estimate
    const { data: lockedMeasurements } = await supabase
      .from('measurements')
      .select('locked_by_estimate_id')
      .eq('job_id', id)
      .eq('is_locked', true)
      .limit(1)
    
    if (lockedMeasurements && lockedMeasurements.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Measurements are locked by an approved estimate',
          locked_by_estimate: lockedMeasurements[0].locked_by_estimate_id
        },
        { status: 403 }
      )
    }

    // First get the job to determine the service type
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('service_type')
      .eq('id', id)
      .single()

    if (jobError || !job) {
      console.error(`[POST /api/jobs/${id}/measurements] Job not found:`, jobError)
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    console.log(`[POST /api/jobs/${id}/measurements] Request body:`, body)

    let insertData: any = {}
    let tableName = ''

    // Handle different service types
    switch (job.service_type) {
      case 'insulation':
        const { 
          room_name: insulationRoomName,
          floor_level,
          area_type, 
          surface_type,
          // framing_size, // Property doesn't exist in DB schema
          height, 
          width, 
          insulation_type,
          r_value,
          closed_cell_inches,
          open_cell_inches,
          is_hybrid_system,
          notes: insulationNotes,
          photo_url,
          // Manager-only overrides
          override_closed_cell_price_per_sqft,
          override_open_cell_price_per_sqft 
        } = body

        // Validate insulation fields
        if (!insulationRoomName || !surface_type || height === undefined || width === undefined) {
          return NextResponse.json(
            { success: false, error: 'Missing required insulation fields' },
            { status: 400 }
          )
        }

        // Don't calculate square_feet - it's a generated column in the database
        
        insertData = {
          job_id: id,
          room_name: insulationRoomName,
          floor_level: floor_level || null,
          area_type: area_type || null,
          surface_type,
          // framing_size, // Property doesn't exist in DB schema
          height: parseFloat(height),
          width: parseFloat(width),
          // square_feet is generated automatically - don't insert it
          insulation_type: insulation_type || null,
          r_value: r_value || null,
          closed_cell_inches: closed_cell_inches ? parseFloat(closed_cell_inches) : 0,
          open_cell_inches: open_cell_inches ? parseFloat(open_cell_inches) : 0,
          is_hybrid_system: is_hybrid_system || false,
          notes: insulationNotes || null,
          photo_url: photo_url || null
        }

        // Apply manager-only overrides if present
        if (currentUserRole === 'manager') {
          if (override_closed_cell_price_per_sqft !== undefined && override_closed_cell_price_per_sqft !== null && override_closed_cell_price_per_sqft !== '') {
            insertData.override_closed_cell_price_per_sqft = parseFloat(override_closed_cell_price_per_sqft)
            insertData.override_set_by = user!.id
            insertData.override_set_at = new Date().toISOString()
          }
          if (override_open_cell_price_per_sqft !== undefined && override_open_cell_price_per_sqft !== null && override_open_cell_price_per_sqft !== '') {
            insertData.override_open_cell_price_per_sqft = parseFloat(override_open_cell_price_per_sqft)
            insertData.override_set_by = user!.id
            insertData.override_set_at = new Date().toISOString()
          }
        }
        
        tableName = 'measurements'
        break

      case 'hvac':
        const { 
          room_name: hvacRoomName,
          system_type,
          tonnage,
          seer_rating,
          ductwork_linear_feet,
          return_vents_count,
          supply_vents_count,
          notes: hvacNotes 
        } = body

        // Validate HVAC fields
        if (!hvacRoomName || !system_type || tonnage === undefined || ductwork_linear_feet === undefined || 
            return_vents_count === undefined || supply_vents_count === undefined) {
          return NextResponse.json(
            { success: false, error: 'Missing required HVAC fields' },
            { status: 400 }
          )
        }

        insertData = {
          job_id: id,
          room_name: hvacRoomName,
          system_type,
          tonnage: parseFloat(tonnage),
          seer_rating: seer_rating ? parseFloat(seer_rating) : null,
          ductwork_linear_feet: parseFloat(ductwork_linear_feet),
          return_vents_count: parseInt(return_vents_count),
          supply_vents_count: parseInt(supply_vents_count),
          notes: hvacNotes || null
        }

        tableName = 'hvac_measurements'
        break

      case 'plaster':
        const { 
          room_name: plasterRoomName,
          wall_condition,
          ceiling_condition,
          wall_square_feet,
          ceiling_square_feet,
          prep_work_hours,
          notes: plasterNotes 
        } = body

        // Validate Plaster fields
        if (!plasterRoomName || !wall_condition || !ceiling_condition || 
            wall_square_feet === undefined || ceiling_square_feet === undefined || prep_work_hours === undefined) {
          return NextResponse.json(
            { success: false, error: 'Missing required plaster fields' },
            { status: 400 }
          )
        }

        insertData = {
          job_id: id,
          room_name: plasterRoomName,
          wall_condition,
          ceiling_condition,
          wall_square_feet: parseFloat(wall_square_feet),
          ceiling_square_feet: parseFloat(ceiling_square_feet),
          prep_work_hours: parseFloat(prep_work_hours),
          notes: plasterNotes || null
        }

        tableName = 'plaster_measurements'
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid service type' },
          { status: 400 }
        )
    }


    console.log(`[POST /api/jobs/${id}/measurements] Creating measurement:`, insertData)

    let measurement = null
    let insertError = null

    // Insert measurement into the appropriate table
    try {
      let result: { data: any; error: any } = { data: null, error: null }
      if (job.service_type === 'insulation') {
        // Use the main measurements table for insulation
        const insertResult = await supabase
          .from('measurements')
          .insert(insertData)
          .select()
          .single()
        result = insertResult
      } else if (job.service_type === 'hvac') {
        const insertResult = await supabase
          .from('hvac_measurements')
          .insert(insertData)
          .select()
          .single()
        result = insertResult
      } else if (job.service_type === 'plaster') {
        const insertResult = await supabase
          .from('plaster_measurements')
          .insert(insertData)
          .select()
          .single()
        result = insertResult
      }
      
      measurement = result?.data
      insertError = result?.error
    } catch {
      console.warn(`Table ${tableName} not found`)
      return NextResponse.json(
        { success: false, error: `${tableName} table not available yet. Please contact administrator.` },
        { status: 503 }
      )
    }

    if (insertError) {
      console.error(`[POST /api/jobs/${id}/measurements] Database error:`, {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
        fullError: insertError
      })
      return NextResponse.json(
        { success: false, error: 'Failed to create measurement', details: insertError.message },
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
      id: (measurement as any)?.id,
      ...(job.service_type === 'insulation' && 'square_feet' in (measurement as any) && { square_feet: (measurement as any).square_feet })
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