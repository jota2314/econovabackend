import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()

    // Create the pricing_catalog table with the correct structure
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS pricing_catalog (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        service_type text CHECK (service_type IN ('insulation', 'hvac', 'plaster')) NOT NULL,
        item_name text NOT NULL,
        unit text NOT NULL,
        base_price decimal(10,2) NOT NULL,
        markup_percentage decimal(5,2) DEFAULT 0,
        notes text,
        created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `

    const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableQuery })

    if (createError) {
      console.error('Create table error:', createError)
      return NextResponse.json({
        success: false,
        error: `Failed to create table: ${createError.message}`,
        step: 'create_table'
      })
    }

    // Now insert the pricing data
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

    const catalogItems = []

    // Add Open Cell pricing items
    for (const rule of openCellPricing) {
      catalogItems.push({
        service_type: 'insulation',
        item_name: `Open Cell Spray Foam R-${rule.minRValue}-${rule.maxRValue} (${rule.thickness})`,
        unit: 'sq ft',
        base_price: rule.pricePerSqft,
        markup_percentage: 0,
        notes: `R-3.8/inch | R-value range: ${rule.minRValue}-${rule.maxRValue} | Thickness: ${rule.thickness}`
      })
    }

    // Add Closed Cell pricing items
    for (const rule of closedCellPricing) {
      catalogItems.push({
        service_type: 'insulation',
        item_name: `Closed Cell Spray Foam R-${rule.minRValue}-${rule.maxRValue} (${rule.thickness})`,
        unit: 'sq ft',
        base_price: rule.pricePerSqft,
        markup_percentage: 0,
        notes: `R-7/inch | R-value range: ${rule.minRValue}-${rule.maxRValue} | Thickness: ${rule.thickness}`
      })
    }

    // Clear existing data first
    const { error: deleteError } = await supabase
      .from('pricing_catalog')
      .delete()
      .eq('service_type', 'insulation')

    if (deleteError) {
      console.log('Delete error (may be expected if table is empty):', deleteError.message)
    }

    // Insert all items
    const { data, error: insertError } = await supabase
      .from('pricing_catalog')
      .insert(catalogItems)
      .select()

    if (insertError) {
      return NextResponse.json({
        success: false,
        error: `Failed to insert pricing data: ${insertError.message}`,
        step: 'insert_data'
      })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully created table and inserted ${catalogItems.length} pricing items`,
      data: {
        openCellItems: openCellPricing.length,
        closedCellItems: closedCellPricing.length,
        totalItems: catalogItems.length,
        insertedData: data
      }
    })
  } catch (error) {
    console.error('Error setting up pricing catalog:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to setup pricing catalog'
    }, { status: 500 })
  }
}
