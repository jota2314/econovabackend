import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()

    // Step 1: Drop existing table
    console.log('Dropping existing pricing_catalog table...')
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: 'DROP TABLE IF EXISTS pricing_catalog CASCADE;'
    })

    if (dropError) {
      console.log('Drop error (may be expected):', dropError.message)
    }

    // Step 2: Create new table structure
    console.log('Creating new pricing_catalog table...')
    const createTableSQL = `
      CREATE TABLE pricing_catalog (
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
      
      -- Create index
      CREATE INDEX idx_pricing_catalog_service_type ON pricing_catalog(service_type);
      
      -- Enable RLS
      ALTER TABLE pricing_catalog ENABLE ROW LEVEL SECURITY;
      
      -- Create policies
      CREATE POLICY "Users can view pricing catalog" ON pricing_catalog
        FOR SELECT USING (true);
        
      CREATE POLICY "Managers can manage pricing catalog" ON pricing_catalog
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'manager'
          )
        );
    `

    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: createTableSQL
    })

    if (createError) {
      return NextResponse.json({
        success: false,
        error: `Failed to create table: ${createError.message}`,
        step: 'create_table'
      })
    }

    // Step 3: Insert your pricing data
    console.log('Inserting pricing data...')

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

    // Build all pricing items
    for (const rule of openCellPricing) {
      catalogItems.push({
        service_type: 'insulation',
        item_name: `Open Cell R-${rule.minRValue}-${rule.maxRValue} (${rule.thickness})`,
        unit: 'sq ft',
        base_price: rule.pricePerSqft,
        markup_percentage: 0,
        notes: `R-3.8/inch | Range: R-${rule.minRValue} to R-${rule.maxRValue} | Thickness: ${rule.thickness}`
      })
    }

    for (const rule of closedCellPricing) {
      catalogItems.push({
        service_type: 'insulation',
        item_name: `Closed Cell R-${rule.minRValue}-${rule.maxRValue} (${rule.thickness})`,
        unit: 'sq ft',
        base_price: rule.pricePerSqft,
        markup_percentage: 0,
        notes: `R-7/inch | Range: R-${rule.minRValue} to R-${rule.maxRValue} | Thickness: ${rule.thickness}`
      })
    }

    // Insert all items at once
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
      message: `Successfully recreated table and inserted ${catalogItems.length} pricing items`,
      data: {
        openCellItems: openCellPricing.length,
        closedCellItems: closedCellPricing.length,
        totalItems: catalogItems.length,
        sampleItems: data?.slice(0, 3) // Show first 3 items as examples
      }
    })

  } catch (error) {
    console.error('Error recreating pricing catalog:', error)
    return NextResponse.json({
      success: false,
      error: `Failed to recreate pricing catalog: ${error}`,
      step: 'general_error'
    }, { status: 500 })
  }
}
