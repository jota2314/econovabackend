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

    let dateRange
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      }
    }

    const analytics = new AnalyticsService()
    const conversion = await analytics.getPipelineConversion(dateRange)

    return NextResponse.json({ 
      success: true, 
      data: conversion 
    })
  } catch (error) {
    console.error('Error fetching pipeline conversion:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch pipeline conversion data' 
    }, { status: 500 })
  }
}