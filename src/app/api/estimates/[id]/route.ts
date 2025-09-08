import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/services/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()

    // Get estimate with job details
    const { data: estimate, error: estimateError } = await supabase
      .from('estimates')
      .select(`
        *,
        jobs!inner (
          id,
          job_name,
          service_type,
          lead:leads (
            name,
            email,
            phone
          )
        ),
        approved_by_user:users!estimates_approved_by_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq('id', id)
      .single()

    if (estimateError || !estimate) {
      return NextResponse.json(
        { success: false, error: 'Estimate not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: estimate
    })

  } catch (error) {
    logger.error('Error in GET estimate API', error, { estimateId: id })
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Validate required fields
    if (!body.status) {
      return NextResponse.json(
        { success: false, error: 'Status is required' },
        { status: 400 }
      )
    }

    // Update estimate
    const { data: updatedEstimate, error: updateError } = await supabase
      .from('estimates')
      .update({
        status: body.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      logger.error('Error updating estimate', updateError, { estimateId: id, status: body.status })
      return NextResponse.json(
        { success: false, error: 'Failed to update estimate' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedEstimate
    })

  } catch (error) {
    logger.error('Error in PATCH estimate API', error, { estimateId: id })
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}