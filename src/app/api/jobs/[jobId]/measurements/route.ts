import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ jobId: string }>
}

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { jobId } = await params
    const supabase = createClient()

    const { data, error } = await supabase
      .from('measurements')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching measurements:', error)
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
    console.error('Error in measurements GET:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { jobId } = await params
    const body = await request.json()
    const { room_name, surface_type, height, width, notes } = body

    console.log('Adding measurement to job:', jobId, body)

    if (!room_name || !surface_type || !height || !width) {
      return NextResponse.json(
        { success: false, error: 'Room name, surface type, height, and width are required' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Insert the measurement
    const { data, error } = await supabase
      .from('measurements')
      .insert({
        job_id: jobId,
        room_name,
        surface_type,
        height: parseFloat(height.toString()),
        width: parseFloat(width.toString()),
        notes
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating measurement:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // Calculate and update job total square feet
    const { data: allMeasurements } = await supabase
      .from('measurements')
      .select('square_feet')
      .eq('job_id', jobId)

    if (allMeasurements) {
      const totalSquareFeet = allMeasurements.reduce((sum, m) => sum + (m.square_feet || 0), 0)
      
      await supabase
        .from('jobs')
        .update({ 
          total_square_feet: totalSquareFeet,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
    }

    console.log('Measurement created successfully:', data.id)

    return NextResponse.json({
      success: true,
      data,
      message: 'Measurement added successfully'
    })

  } catch (error) {
    console.error('Error in measurements POST:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}