import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ measurementId: string }>
}

export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const { measurementId } = await params
    const supabase = await createClient()

    // Get the measurement first to get the job_id for updating totals
    const { data: measurement, error: fetchError } = await supabase
      .from('measurements')
      .select('job_id, square_feet')
      .eq('id', measurementId)
      .single()

    if (fetchError || !measurement) {
      return NextResponse.json(
        { success: false, error: 'Measurement not found' },
        { status: 404 }
      )
    }

    // Delete the measurement
    const { error } = await supabase
      .from('measurements')
      .delete()
      .eq('id', measurementId)

    if (error) {
      console.error('Error deleting measurement:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // Recalculate job total square feet
    const { data: remainingMeasurements } = await supabase
      .from('measurements')
      .select('square_feet')
      .eq('job_id', measurement.job_id)

    const totalSquareFeet = remainingMeasurements?.reduce((sum, m) => sum + (m.square_feet || 0), 0) || 0

    await supabase
      .from('jobs')
      .update({ 
        total_square_feet: totalSquareFeet,
        updated_at: new Date().toISOString()
      })
      .eq('id', measurement.job_id)

    return NextResponse.json({
      success: true,
      message: 'Measurement deleted successfully'
    })

  } catch (error) {
    console.error('Error in measurement DELETE:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}