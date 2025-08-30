import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    console.log('Testing hybrid measurement creation...')

    // Test creating a hybrid measurement to see what error we get
    const testData = {
      job_id: 'test-id',
      room_name: 'Test Room',
      surface_type: 'wall',
      framing_size: '2x6',
      height: 8,
      width: 12,
      square_feet: 96,
      insulation_type: 'hybrid',
      closed_cell_inches: 2,
      open_cell_inches: 4,
      is_hybrid_system: true
    }

    // Try insulation_measurements table first
    console.log('Testing insulation_measurements table...')
    const { data: insulationResult, error: insulationError } = await supabase
      .from('insulation_measurements')
      .insert(testData)
      .select()
      .single()

    if (insulationError) {
      console.log('insulation_measurements error:', {
        message: insulationError.message,
        details: insulationError.details,
        hint: insulationError.hint,
        code: insulationError.code
      })

      // Try measurements table
      console.log('Testing measurements table...')
      const { data: measurementResult, error: measurementError } = await supabase
        .from('measurements')
        .insert({
          job_id: testData.job_id,
          room_name: testData.room_name,
          surface_type: testData.surface_type,
          framing_size: testData.framing_size,
          height: testData.height,
          width: testData.width,
          insulation_type: testData.insulation_type
        })
        .select()
        .single()

      if (measurementError) {
        console.log('measurements error:', {
          message: measurementError.message,
          details: measurementError.details,
          hint: measurementError.hint,
          code: measurementError.code
        })

        return NextResponse.json({
          success: false,
          message: 'Database schema needs updates',
          errors: {
            insulation_measurements: insulationError,
            measurements: measurementError
          }
        })
      } else {
        // Clean up test record
        if (measurementResult?.id) {
          await supabase.from('measurements').delete().eq('id', measurementResult.id)
        }
        return NextResponse.json({
          success: true,
          message: 'measurements table works, but insulation_measurements needs updates',
          error: insulationError
        })
      }
    } else {
      // Clean up test record
      if (insulationResult?.id) {
        await supabase.from('insulation_measurements').delete().eq('id', insulationResult.id)
      }
      return NextResponse.json({
        success: true,
        message: 'Both tables work - migration not needed!'
      })
    }

  } catch (error) {
    console.error('Error running migration test:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
}