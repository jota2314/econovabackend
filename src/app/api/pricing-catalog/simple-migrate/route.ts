import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()

    // First, let's see what table structure we actually have
    const { data: testData, error: testError } = await supabase
      .from('pricing_catalog')
      .select('*')
      .limit(1)

    if (testError) {
      return NextResponse.json({
        success: false,
        error: `Cannot access table: ${testError.message}`,
        step: 'table_access'
      })
    }

    // Your complete pricing data
    const openCellPricing = [
      { minRValue: 0, maxRValue: 15, pricePerSqft: 1.65, thickness: '3.5"' },
      { minRValue: 16, maxRValue: 21, pricePerSqft: 1.90, thickness: '5.5"' },
      { minRValue: 22, maxRValue: 28, pricePerSqft: 2.20, thickness: '7"' },
      { minRValue: 29, maxRValue: 30.9, pricePerSqft: 2.40, thickness: '8"' },
      { minRValue: 31, maxRValue: 34, pricePerSqft: 2.60, thickness: '9"' },
      { minRValue: 35, maxRValue: 38, pricePerSqft: 2.90, thickness: '10"' },
      { minRValue: 39, maxRValue: 45, pricePerSqft: 3.30, thickness: '12"' },
      { minRValue: 46, maxRValue: 49, pricePerSqft: 3.50, thickness: '13"' },
      { minRValue: 50, maxRValue: 999, pricePerSqft: 3.50, thickness: '13+"' }
    ]

    const closedCellPricing = [
      { minRValue: 0, maxRValue: 7, pricePerSqft: 1.80, thickness: '1"' },
      { minRValue: 8, maxRValue: 13, pricePerSqft: 2.30, thickness: '1.5"' },
      { minRValue: 14, maxRValue: 15.9, pricePerSqft: 2.80, thickness: '2"' },
      { minRValue: 16, maxRValue: 19, pricePerSqft: 3.60, thickness: '2.5"' },
      { minRValue: 20, maxRValue: 21.9, pricePerSqft: 3.90, thickness: '3"' },
      { minRValue: 22, maxRValue: 30.9, pricePerSqft: 5.70, thickness: '4"' },
      { minRValue: 31, maxRValue: 38.9, pricePerSqft: 6.80, thickness: '5"' },
      { minRValue: 39, maxRValue: 49.9, pricePerSqft: 8.70, thickness: '7"' },
      { minRValue: 50, maxRValue: 999, pricePerSqft: 8.70, thickness: '7+"' }
    ]

    // Clear existing insulation data first (in case we're re-running)
    const { error: deleteError } = await supabase
      .from('pricing_catalog')
      .delete()
      .eq('service_type', 'insulation')

    console.log('Delete result:', deleteError?.message || 'Success')

    const results = []

    // Insert Open Cell items one by one to see what works
    for (const rule of openCellPricing) {
      try {
        const { data, error } = await supabase
          .from('pricing_catalog')
          .insert({
            service_type: 'insulation',
            item_name: `Open Cell R-${rule.minRValue}-${rule.maxRValue} (${rule.thickness})`,
            unit: 'sq ft',
            base_price: rule.pricePerSqft,
            markup_percentage: 0,
            notes: `R-3.8/inch | ${rule.minRValue}-${rule.maxRValue} | ${rule.thickness}`
          })
          .select()

        if (error) {
          results.push({ type: 'open_cell', rule, error: error.message, success: false })
        } else {
          results.push({ type: 'open_cell', rule, data, success: true })
        }
      } catch (err) {
        results.push({ type: 'open_cell', rule, error: String(err), success: false })
      }
    }

    // Insert Closed Cell items one by one
    for (const rule of closedCellPricing) {
      try {
        const { data, error } = await supabase
          .from('pricing_catalog')
          .insert({
            service_type: 'insulation',
            item_name: `Closed Cell R-${rule.minRValue}-${rule.maxRValue} (${rule.thickness})`,
            unit: 'sq ft',
            base_price: rule.pricePerSqft,
            markup_percentage: 0,
            notes: `R-7/inch | ${rule.minRValue}-${rule.maxRValue} | ${rule.thickness}`
          })
          .select()

        if (error) {
          results.push({ type: 'closed_cell', rule, error: error.message, success: false })
        } else {
          results.push({ type: 'closed_cell', rule, data, success: true })
        }
      } catch (err) {
        results.push({ type: 'closed_cell', rule, error: String(err), success: false })
      }
    }

    const successCount = results.filter(r => r.success).length
    const errorCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: successCount > 0,
      message: `Migration completed: ${successCount} successful, ${errorCount} failed`,
      totalAttempted: results.length,
      successCount,
      errorCount,
      results: results.slice(0, 5), // Show first 5 results
      errors: results.filter(r => !r.success).map(r => r.error)
    })

  } catch (error) {
    console.error('Error in simple migration:', error)
    return NextResponse.json({
      success: false,
      error: `Migration failed: ${error}`,
      step: 'general_error'
    }, { status: 500 })
  }
}
