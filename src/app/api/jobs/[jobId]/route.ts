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
      .from('jobs')
      .select(`
        *,
        lead:leads!lead_id(name, phone, address, city, state),
        measurements(
          id,
          room_name,
          surface_type,
          height,
          width,
          square_feet,
          photo_url,
          notes,
          created_at
        )
      `)
      .eq('id', jobId)
      .single()

    if (error) {
      console.error('Error fetching job:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error) {
    console.error('Error in job GET:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const { jobId } = await params
    const body = await request.json()

    console.log('Updating job:', jobId, body)

    const supabase = createClient()

    const { data, error } = await supabase
      .from('jobs')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)
      .select()
      .single()

    if (error) {
      console.error('Error updating job:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Job updated successfully'
    })

  } catch (error) {
    console.error('Error in job PATCH:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const { jobId } = await params
    const supabase = createClient()

    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', jobId)

    if (error) {
      console.error('Error deleting job:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Job deleted successfully'
    })

  } catch (error) {
    console.error('Error in job DELETE:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}