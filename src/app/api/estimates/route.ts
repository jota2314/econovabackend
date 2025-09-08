import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Build query
    let query = supabase
      .from('estimates')
      .select(`
        *,
        jobs!inner (
          id,
          job_name,
          service_type,
          lead_id,
          created_by,
          lead:leads!lead_id (
            id,
            name,
            email,
            phone
          )
        ),
        created_by_user:users!estimates_created_by_fkey (
          id,
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })

    const { data: estimates, error } = await query

    if (error) {
      console.error('Error fetching estimates:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch estimates' },
        { status: 500 }
      )
    }

    // Calculate totals
    const totalAmount = estimates?.reduce((sum, est) => sum + (est.total_amount || est.subtotal || 0), 0) || 0
    const pendingAmount = estimates?.filter(e => e.status === 'pending_approval')
      .reduce((sum, est) => sum + (est.total_amount || est.subtotal || 0), 0) || 0
    const approvedAmount = estimates?.filter(e => e.status === 'approved')
      .reduce((sum, est) => sum + (est.total_amount || est.subtotal || 0), 0) || 0

    return NextResponse.json({
      success: true,
      data: {
        estimates: estimates || [],
        summary: {
          total_count: estimates?.length || 0,
          total_amount: totalAmount,
          pending_count: estimates?.filter(e => e.status === 'pending_approval').length || 0,
          pending_amount: pendingAmount,
          approved_count: estimates?.filter(e => e.status === 'approved').length || 0,
          approved_amount: approvedAmount,
          average_amount: estimates?.length ? totalAmount / estimates.length : 0
        }
      }
    })

  } catch (error) {
    console.error('Error in estimates GET:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const body = await request.json()
    
    // Validate required fields
    if (!body.job_id || !body.total_amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: job_id and total_amount are required' },
        { status: 400 }
      )
    }

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('service_type')
      .eq('id', body.job_id)
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      )
    }

    // Generate estimate number
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    const estimateNumber = `EST-${dateStr}-${randomNum}`

    // Create estimate
    const { data: estimate, error } = await supabase
      .from('estimates')
      .insert({
        job_id: body.job_id,
        estimate_number: estimateNumber,
        subtotal: body.subtotal || body.total_amount,
        total_amount: body.total_amount,
        status: body.status || 'pending_approval',
        valid_until: body.valid_until || null,
        created_by: body.created_by,
        markup_percentage: 0,
        locks_measurements: body.locks_measurements || false
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to create estimate' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: estimate
    })

  } catch (error) {
    console.error('Error in estimates POST:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}