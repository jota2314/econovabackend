import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    console.log('Test endpoint called')
    
    // Check environment variables
    const envCheck = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
      timestamp: new Date().toISOString()
    }
    
    console.log('Environment check:', envCheck)
    
    // Test database connection
    const supabase = await createClient()
    
    // Try to query the leads table
    console.log('Attempting to query leads table...')
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, name, phone, status')
      .limit(5)
    
    if (leadsError) {
      console.error('Leads query error:', leadsError)
      return NextResponse.json({
        success: false,
        error: 'Database query failed',
        details: leadsError,
        env: envCheck,
        message: 'Could not query leads table'
      })
    }
    
    console.log('Leads query successful, found:', leads?.length || 0, 'leads')
    
    // Test users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name')
      .limit(3)
    
    // Test jobs table
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, job_name, lead_id')
      .limit(5)
      
    // Test measurements table
    const { data: measurements, error: measurementsError } = await supabase
      .from('measurements')
      .select('id, job_id, room_name, square_feet')
      .limit(10)
    
    return NextResponse.json({
      success: true,
      message: 'Database connection working',
      data: {
        leads: {
          count: leads?.length || 0,
          sample: leads?.slice(0, 2) || []
        },
        users: {
          count: users?.length || 0,
          error: usersError?.message || null
        },
        jobs: {
          count: jobs?.length || 0,
          sample: jobs || [],
          error: jobsError?.message || null
        },
        measurements: {
          count: measurements?.length || 0,
          sample: measurements || [],
          error: measurementsError?.message || null
        }
      },
      env: envCheck,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Test endpoint error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}