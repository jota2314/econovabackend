import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Try to query the table to see if it exists
    const { data, error } = await supabase
      .from('pricing_catalog')
      .select('count', { count: 'exact' })
      .limit(1)

    if (error) {
      return NextResponse.json({
        success: false,
        tableExists: false,
        error: error.message,
        message: 'Table does not exist or cannot be accessed'
      })
    }

    return NextResponse.json({
      success: true,
      tableExists: true,
      rowCount: data?.length || 0,
      message: 'Table exists and is accessible'
    })
  } catch (error) {
    console.error('Error checking table:', error)
    return NextResponse.json({
      success: false,
      tableExists: false,
      error: 'Failed to check table existence'
    }, { status: 500 })
  }
}
