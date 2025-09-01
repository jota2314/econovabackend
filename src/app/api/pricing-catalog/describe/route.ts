import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get table information
    const { data, error } = await supabase
      .rpc('get_table_columns', { table_name: 'pricing_catalog' })

    if (error) {
      console.error('RPC Error:', error)
      // Try a simple select with limit to see what columns exist
      const { data: simpleData, error: simpleError } = await supabase
        .from('pricing_catalog')
        .select('*')
        .limit(1)

      return NextResponse.json({
        success: simpleError ? false : true,
        error: simpleError?.message,
        columns: simpleError ? 'Cannot determine' : Object.keys(simpleData?.[0] || {}),
        sampleData: simpleData?.[0] || null
      })
    }

    return NextResponse.json({
      success: true,
      columns: data,
      message: 'Table structure retrieved successfully'
    })
  } catch (error) {
    console.error('Error describing table:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to describe table structure'
    }, { status: 500 })
  }
}
