import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { OPEN_CELL_PRICING, CLOSED_CELL_PRICING } from '@/lib/utils/pricing-calculator'

export async function POST() {
  try {
    const supabase = await createClient()

    // Clear existing data first
    await supabase
      .from('pricing_catalog')
      .delete()
      .eq('service_type', 'insulation')

    const catalogItems = []

    // Add Open Cell pricing items
    for (const rule of OPEN_CELL_PRICING) {
      catalogItems.push({
        service_type: 'insulation',
        item_name: `Open Cell Spray Foam R-${rule.minRValue}-${rule.maxRValue}${rule.thickness ? ` (${rule.thickness})` : ''}`,
        unit: 'sq ft',
        base_price: rule.pricePerSqft,
        markup_percentage: 0, // No markup, prices already include markup
        notes: `R-3.8/inch | R-value range: ${rule.minRValue}-${rule.maxRValue}${rule.thickness ? ` | Thickness: ${rule.thickness}` : ''}`
      })
    }

    // Add Closed Cell pricing items
    for (const rule of CLOSED_CELL_PRICING) {
      catalogItems.push({
        service_type: 'insulation',
        item_name: `Closed Cell Spray Foam R-${rule.minRValue}-${rule.maxRValue}${rule.thickness ? ` (${rule.thickness})` : ''}`,
        unit: 'sq ft',
        base_price: rule.pricePerSqft,
        markup_percentage: 0, // No markup, prices already include markup
        notes: `R-7/inch | R-value range: ${rule.minRValue}-${rule.maxRValue}${rule.thickness ? ` | Thickness: ${rule.thickness}` : ''}`
      })
    }

    // Insert all items
    const { data, error } = await supabase
      .from('pricing_catalog')
      .insert(catalogItems)
      .select()

    if (error) {
      throw new Error(`Failed to migrate pricing data: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      message: `Successfully migrated ${catalogItems.length} pricing items`,
      data: {
        openCellItems: OPEN_CELL_PRICING.length,
        closedCellItems: CLOSED_CELL_PRICING.length,
        totalItems: catalogItems.length
      }
    })
  } catch (error) {
    console.error('Error migrating pricing data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to migrate pricing data' },
      { status: 500 }
    )
  }
}
