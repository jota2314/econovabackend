import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Test basic connection
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    if (testError) {
      return NextResponse.json(
        { 
          success: false, 
          error: testError.message,
          details: 'Database connection failed'
        }, 
        { status: 500 }
      )
    }

    // Test auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    return NextResponse.json({
      success: true,
      connection: 'Connected to Supabase successfully',
      database: 'Profiles table accessible',
      auth: user ? 'User authenticated' : 'No authenticated user',
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to connect to Supabase'
      }, 
      { status: 500 }
    )
  }
}