import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') // all, pending_approval, approved
    const serviceType = searchParams.get('service_type') // insulation, hvac, plaster
    const period = searchParams.get('period') // today, week, month, year
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const jobId = searchParams.get('job_id') // Filter by specific job

    // Get user's role to determine data access
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

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

    // Apply role-based filtering
    if (userProfile?.role === 'salesperson' || userProfile?.role === 'lead_hunter') {
      // Salesperson and lead hunters can only see estimates for their own jobs
      query = query.eq('created_by', user.id)
    }
    // Managers and admins can see all estimates (no filter needed)

    // Apply status filter
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // Apply service type filter (filter on jobs.service_type)
    if (serviceType && serviceType !== 'all') {
      query = query.eq('jobs.service_type', serviceType)
    }

    // Apply job ID filter
    if (jobId) {
      query = query.eq('job_id', jobId)
    }

    // Apply date filters
    const now = new Date()
    let dateStart: Date | null = null
    let dateEnd: Date | null = null

    if (period) {
      switch (period) {
        case 'today':
          dateStart = startOfDay(now)
          dateEnd = endOfDay(now)
          break
        case 'week':
          dateStart = startOfWeek(now)
          dateEnd = endOfWeek(now)
          break
        case 'month':
          dateStart = startOfMonth(now)
          dateEnd = endOfMonth(now)
          break
        case 'year':
          dateStart = startOfYear(now)
          dateEnd = endOfYear(now)
          break
      }
    } else if (startDate && endDate) {
      dateStart = new Date(startDate)
      dateEnd = new Date(endDate)
    }

    if (dateStart && dateEnd) {
      query = query
        .gte('created_at', dateStart.toISOString())
        .lte('created_at', dateEnd.toISOString())
    }

    const { data: estimates, error } = await query

    if (error) {
      console.error('Error fetching estimates:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch estimates' },
        { status: 500 }
      )
    }

    // Calculate totals (use total_amount if available, otherwise subtotal)
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
    console.log('[POST /api/estimates] Starting request')
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('[POST /api/estimates] Auth result:', { hasUser: !!user, userId: user?.id })
    
    if (authError || !user) {
      console.log('[POST /api/estimates] Auth failed:', authError)
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('[POST /api/estimates] Request body:', body)
    
    // Validate required fields
    if (!body.job_id || !body.total_amount) {
      console.log('[POST /api/estimates] Missing required fields:', { job_id: !!body.job_id, total_amount: !!body.total_amount })
      return NextResponse.json(
        { success: false, error: 'Missing required fields: job_id and total_amount are required' },
        { status: 400 }
      )
    }

    // Get job details to set service_type
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('service_type')
      .eq('id', body.job_id)
      .single()

    if (jobError || !job) {
      console.log('[POST /api/estimates] Job lookup failed:', { jobError, job_id: body.job_id })
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      )
    }

    // Generate estimate number (EST-YYYYMMDD-XXXX)
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    const estimateNumber = `EST-${dateStr}-${randomNum}`

    // Create estimate
    const estimateData = {
      job_id: body.job_id,
      estimate_number: estimateNumber,
      subtotal: body.subtotal || body.total_amount,
      total_amount: body.total_amount,
      status: body.status || 'pending_approval',
      valid_until: body.valid_until || null,
      created_by: user.id,
      markup_percentage: body.markup_percentage || 6.25,
      locks_measurements: body.locks_measurements || false
    }
    
    console.log('[POST /api/estimates] Creating estimate with data:', estimateData)
    
    const { data: estimate, error } = await supabase
      .from('estimates')
      .insert(estimateData)
      .select()
      .single()
    
    console.log('[POST /api/estimates] Insert result:', { success: !error, error, estimateId: estimate?.id })

    if (error) {
      console.error('[POST /api/estimates] Database error creating estimate:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create estimate', details: error.message },
        { status: 500 }
      )
    }

    // If line items are provided, insert them
    if (body.line_items && body.line_items.length > 0) {
      console.log('[POST /api/estimates] Creating line items:', body.line_items.length)
      const lineItems = body.line_items.map((item: any) => ({
        estimate_id: estimate.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.quantity * item.unit_price,
        unit: item.unit || 'each',
        service_type: item.service_type || job.service_type
      }))

      const { error: lineItemsError } = await supabase
        .from('estimate_line_items')
        .insert(lineItems)
        
      console.log('[POST /api/estimates] Line items result:', { success: !lineItemsError, error: lineItemsError })

      if (lineItemsError) {
        console.error('Error creating line items:', lineItemsError)
        // Note: Not failing the whole request if line items fail
      }
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