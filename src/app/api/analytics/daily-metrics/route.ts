import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AnalyticsService } from '@/lib/services/analytics'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const userId = searchParams.get('userId')

    if (!startDate || !endDate) {
      return NextResponse.json({ 
        error: 'Start date and end date are required' 
      }, { status: 400 })
    }

    const analytics = new AnalyticsService()
    const metrics = await analytics.getDailyActivityMetrics(
      new Date(startDate),
      new Date(endDate),
      userId || undefined
    )

    return NextResponse.json({ 
      success: true, 
      data: metrics 
    })
  } catch (error) {
    console.error('Error fetching daily metrics:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch daily metrics' 
    }, { status: 500 })
  }
}