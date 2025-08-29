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

    // Query the appropriate measurements table based on service type
    // Note: Falling back to original measurements table if new tables don't exist
    let measurements = []
    let error = null

    try {
      switch (job.service_type) {
        case 'insulation':
          try {
            const insulationResult = await supabase
              .from('insulation_measurements')
              .select('*')
              .eq('job_id', id)
              .order('created_at', { ascending: true })
            measurements = insulationResult.data
            error = insulationResult.error
          } catch (insulationError) {
            console.warn('insulation_measurements table not found, using measurements table')
            // Fallback to original measurements table
            const fallbackResult = await supabase
              .from('measurements')
              .select('*')
              .eq('job_id', id)
              .order('created_at', { ascending: true })
            measurements = fallbackResult.data
            error = fallbackResult.error
          }
          break
        case 'hvac':
          try {
            const hvacResult = await supabase
              .from('hvac_measurements')
              .select('*')
              .eq('job_id', id)
              .order('created_at', { ascending: true })
            measurements = hvacResult.data
            error = hvacResult.error
          } catch (hvacError) {
            console.warn('hvac_measurements table not found, returning empty array')
            measurements = []
            error = null
          }
          break
        case 'plaster':
          try {
            const plasterResult = await supabase
              .from('plaster_measurements')
              .select('*')
              .eq('job_id', id)
              .order('created_at', { ascending: true })
            measurements = plasterResult.data
            error = plasterResult.error
          } catch (plasterError) {
            console.warn('plaster_measurements table not found, returning empty array')
            measurements = []
            error = null
          }
          break
        default:
          // Default to insulation and original measurements table
          const defaultResult = await supabase
            .from('measurements')
            .select('*')
            .eq('job_id', id)
            .order('created_at', { ascending: true })
          measurements = defaultResult.data
          error = defaultResult.error
      }
    } catch (tableError) {
      console.warn('Error querying measurement tables, falling back to measurements table:', tableError)
      const fallbackResult = await supabase
        .from('measurements')
        .select('*')
        .eq('job_id', id)
        .order('created_at', { ascending: true })
      measurements = fallbackResult.data
      error = fallbackResult.error
    }

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
          framing_size, 
          height, 
          width, 
          insulation_type, 
          notes: insulationNotes 
        } = body

        // Validate insulation fields
        if (!insulationRoomName || !surface_type || !framing_size || height === undefined || width === undefined) {
          return NextResponse.json(
            { success: false, error: 'Missing required insulation fields' },
            { status: 400 }
          )
        }

        const square_feet = parseFloat(height) * parseFloat(width)
        
        insertData = {
          job_id: id,
          room_name: insulationRoomName,
          floor_level: floor_level || null,
          area_type: area_type || null,
          surface_type,
          framing_size,
          height: parseFloat(height),
          width: parseFloat(width),
          square_feet,
          insulation_type: insulation_type || null,
          r_value: null,
          notes: insulationNotes || null
        }
        
        tableName = 'insulation_measurements'
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

    try {
      const result = await supabase
        .from(tableName)
        .insert(insertData)
        .select()
        .single()
      
      measurement = result.data
      insertError = result.error
    } catch (tableError) {
      console.warn(`Table ${tableName} not found, falling back to measurements table`)
      
      // Fallback to original measurements table for insulation
      if (job.service_type === 'insulation') {
        const fallbackResult = await supabase
          .from('measurements')
          .insert({
            job_id: id,
            room_name: insertData.room_name,
            floor_level: insertData.floor_level,
            area_type: insertData.area_type,
            surface_type: insertData.surface_type,
            height: insertData.height,
            width: insertData.width,
            insulation_type: insertData.insulation_type,
            notes: insertData.notes
          })
          .select()
          .single()
        
        measurement = fallbackResult.data
        insertError = fallbackResult.error
      } else {
        // For HVAC and Plaster, return error since we can't fallback
        return NextResponse.json(
          { success: false, error: `${tableName} table not available yet. Please contact administrator.` },
          { status: 503 }
        )
      }
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