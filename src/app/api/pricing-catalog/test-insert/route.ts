import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()

    // Try to insert a simple test record
    const { data, error } = await supabase
      .from('pricing_catalog')
      .insert({
        service_type: 'insulation',
        item_name: 'Test Item',
        unit: 'sq ft',
        base_price: 1.00,
        markup_percentage: 0,
        notes: 'Test entry'
      })
      .select()

    return NextResponse.json({
      success: !error,
      error: error?.message,
      data: data,
      message: error ? 'Insert failed' : 'Insert successful'
    })
  } catch (error) {
    console.error('Error testing insert:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to test insert'
    }, { status: 500 })
  }
}
