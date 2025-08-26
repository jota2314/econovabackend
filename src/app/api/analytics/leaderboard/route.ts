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
    const timeframe = searchParams.get('timeframe') as 'week' | 'month' | 'quarter' || 'month'

    const analytics = new AnalyticsService()
    const leaderboard = await analytics.getPerformanceLeaderboard(timeframe)

    return NextResponse.json({ 
      success: true, 
      data: leaderboard 
    })
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch leaderboard data' 
    }, { status: 500 })
  }
}