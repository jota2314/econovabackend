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
    const serviceType = searchParams.get('service_type') // insulation, hvac, plaster, or null for all
    const period = searchParams.get('period') // today, week, month, year
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    // Get user's role to determine data access
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    // Build base query
    let jobsQuery = supabase
      .from('jobs')
      .select(`
        *,
        measurements!left (
          id,
          square_feet
        ),
        hvac_measurements!left (
          id,
          tonnage,
          ductwork_linear_ft
        ),
        plaster_measurements!left (
          id
        ),
        estimates!left (
          id,
          status,
          subtotal,
          created_at
        )
      `)

    // Apply role-based filtering
    if (userProfile?.role === 'salesperson' || userProfile?.role === 'lead_hunter') {
      // Salesperson and lead hunters can only see their own jobs
      jobsQuery = jobsQuery.eq('created_by', user.id)
    }
    // Managers and admins can see all jobs (no filter needed)

    // Apply service type filter
    if (serviceType && serviceType !== 'all') {
      jobsQuery = jobsQuery.eq('service_type', serviceType)
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
      jobsQuery = jobsQuery
        .gte('created_at', dateStart.toISOString())
        .lte('created_at', dateEnd.toISOString())
    }

    const { data: jobs, error: jobsError } = await jobsQuery

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch jobs' },
        { status: 500 }
      )
    }

    console.log(`🔍 [Stats API] Found ${jobs?.length || 0} jobs for user ${user.id} (role: ${userProfile?.role})`)

    // Calculate statistics
    const stats = {
      total_jobs: jobs?.length || 0,
      total_square_feet: 0,
      service_specific_count: 0,
      won_jobs: 0,
      lost_jobs: 0,
      pending_jobs: 0,
      in_progress_jobs: 0,
      total_quote_amount: 0,
      won_quote_amount: 0,
      total_commissions: 0,
      // Estimate-specific metrics
      total_estimates: 0,
      pending_estimates: 0,
      approved_estimates: 0,
      rejected_estimates: 0,
      draft_estimates: 0,
      total_estimate_value: 0,
      approved_estimate_value: 0,
      pending_estimate_value: 0,
      average_estimate_value: 0
    }

    // Calculate totals
    jobs?.forEach(job => {
      // Square feet calculation
      let jobSquareFeet = 0
      
      // Get square feet from measurements
      if (job.measurements && job.measurements.length > 0) {
        jobSquareFeet = job.measurements.reduce((sum, m) => sum + (m.square_feet || 0), 0)
      }
      
      // Get square feet from insulation measurements (skip since square_feet column doesn't exist)
      // if (job.insulation_measurements && job.insulation_measurements.length > 0) {
      //   jobSquareFeet += job.insulation_measurements.reduce((sum, m) => sum + (m.square_feet || 0), 0)
      // }
      
      // Get square feet from plaster measurements (skip since column names don't match)
      // if (job.plaster_measurements && job.plaster_measurements.length > 0) {
      //   jobSquareFeet += job.plaster_measurements.reduce((sum, m) => 
      //     sum + (m.wall_square_feet || 0) + (m.ceiling_square_feet || 0), 0)
      // }
      
      stats.total_square_feet += jobSquareFeet

      // Job status counts
      switch (job.job_status) {
        case 'won':
          stats.won_jobs++
          stats.won_quote_amount += job.quote_amount || 0
          stats.total_commissions += (job.quote_amount || 0) * 0.05 // 5% commission
          break
        case 'lost':
          stats.lost_jobs++
          break
        case 'in_progress':
          stats.in_progress_jobs++
          break
        default:
          stats.pending_jobs++
      }

      // Total quote amount
      stats.total_quote_amount += job.quote_amount || 0

      // Estimate calculations
      if (job.estimates && job.estimates.length > 0) {
        console.log(`📊 [Stats API] Job ${job.job_name} has ${job.estimates.length} estimates:`, job.estimates.map(e => ({ status: e.status, subtotal: e.subtotal })))
        job.estimates.forEach(estimate => {
          stats.total_estimates++
          const estimateValue = estimate.subtotal || 0
          stats.total_estimate_value += estimateValue
          console.log(`💰 [Stats API] Adding estimate value: $${estimateValue} (subtotal: ${estimate.subtotal})`)

          switch (estimate.status) {
            case 'pending_approval':
              stats.pending_estimates++
              stats.pending_estimate_value += estimateValue
              break
            case 'approved':
              stats.approved_estimates++
              stats.approved_estimate_value += estimateValue
              break
            case 'rejected':
              stats.rejected_estimates++
              break
            case 'draft':
              stats.draft_estimates++
              break
          }
        })
      }

      // Service-specific counts
      if (serviceType === 'hvac' && job.hvac_measurements) {
        stats.service_specific_count += job.hvac_measurements.length
      } else if (serviceType === 'insulation' && job.measurements) {
        stats.service_specific_count += job.measurements.length
      } else if (serviceType === 'plaster' && job.plaster_measurements) {
        stats.service_specific_count += job.plaster_measurements.length
      } else if (!serviceType || serviceType === 'all') {
        // For all trades, count total measurements
        stats.service_specific_count += 
          (job.measurements?.length || 0) + 
          (job.hvac_measurements?.length || 0) + 
          (job.plaster_measurements?.length || 0)
      }
    })

    // Calculate win rate
    const totalCompletedJobs = stats.won_jobs + stats.lost_jobs
    const win_rate = totalCompletedJobs > 0 ? (stats.won_jobs / totalCompletedJobs) * 100 : 0
    
    // Calculate average estimate value
    stats.average_estimate_value = stats.total_estimates > 0 ? stats.total_estimate_value / stats.total_estimates : 0

    console.log(`✅ [Stats API] Final calculations:`)
    console.log(`   - Total estimates: ${stats.total_estimates}`)
    console.log(`   - Total estimate value: $${stats.total_estimate_value}`)
    console.log(`   - Average estimate value: $${stats.average_estimate_value}`)

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        win_rate: Math.round(win_rate * 100) / 100, // Round to 2 decimal places
        average_estimate_value: Math.round(stats.average_estimate_value * 100) / 100
      }
    })

  } catch (error) {
    console.error('Error in job stats API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}