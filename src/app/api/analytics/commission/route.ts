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
    const userId = searchParams.get('userId')
    const month = searchParams.get('month')

    let monthDate
    if (month) {
      monthDate = new Date(month)
    }

    const analytics = new AnalyticsService()
    const commission = await analytics.getCommissionData(
      userId || undefined,
      monthDate
    )

    return NextResponse.json({ 
      success: true, 
      data: commission 
    })
  } catch (error) {
    console.error('Error fetching commission data:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch commission data' 
    }, { status: 500 })
  }
}