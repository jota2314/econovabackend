import { NextRequest, NextResponse } from 'next/server'
import { getPricePerSqft } from '@/lib/utils/pricing-calculator'

export async function GET(request: NextRequest) {
  try {
    // Generate pricing catalog from our pricing calculator
    const pricingCatalog = []
    
    // Add Closed Cell options
    const closedCellOptions = [
      { rValue: 7, thickness: '1"', type: 'closed_cell' },
      { rValue: 13, thickness: '1.5"', type: 'closed_cell' },
      { rValue: 15, thickness: '2"', type: 'closed_cell' },
      { rValue: 19, thickness: '2.5"', type: 'closed_cell' },
      { rValue: 21, thickness: '3"', type: 'closed_cell' },
      { rValue: 30, thickness: '4"', type: 'closed_cell' },
      { rValue: 38, thickness: '5"', type: 'closed_cell' },
      { rValue: 49, thickness: '7"', type: 'closed_cell' }
    ]
    
    for (const option of closedCellOptions) {
      const price = getPricePerSqft('closed_cell', option.rValue)
      pricingCatalog.push({
        id: `closed-cell-r${option.rValue}`,
        item_name: `Closed Cell R-${option.rValue} (${option.thickness})`,
        base_price: price,
        unit: 'sqft',
        service_type: 'insulation',
        insulation_type: 'closed_cell',
        r_value: option.rValue,
        thickness: option.thickness
      })
    }
    
    // Add Open Cell options
    const openCellOptions = [
      { rValue: 15, thickness: '3.5"', type: 'open_cell' },
      { rValue: 21, thickness: '5.5"', type: 'open_cell' },
      { rValue: 28, thickness: '7"', type: 'open_cell' },
      { rValue: 30, thickness: '8"', type: 'open_cell' },
      { rValue: 34, thickness: '9"', type: 'open_cell' },
      { rValue: 38, thickness: '10"', type: 'open_cell' },
      { rValue: 45, thickness: '12"', type: 'open_cell' },
      { rValue: 49, thickness: '13"', type: 'open_cell' }
    ]
    
    for (const option of openCellOptions) {
      const price = getPricePerSqft('open_cell', option.rValue)
      pricingCatalog.push({
        id: `open-cell-r${option.rValue}`,
        item_name: `Open Cell R-${option.rValue} (${option.thickness})`,
        base_price: price,
        unit: 'sqft', 
        service_type: 'insulation',
        insulation_type: 'open_cell',
        r_value: option.rValue,
        thickness: option.thickness
      })
    }

    // Add Fiberglass Batt options
    const fiberglassBattOptions = [
      { rValue: 13, thickness: '3.5"', type: 'fiberglass_batt' },
      { rValue: 15, thickness: '3.5"', type: 'fiberglass_batt' },
      { rValue: 19, thickness: '6"', type: 'fiberglass_batt' },
      { rValue: 21, thickness: '5.5"', type: 'fiberglass_batt' },
      { rValue: 30, thickness: '9.5"', type: 'fiberglass_batt' },
      { rValue: 38, thickness: '12"', type: 'fiberglass_batt' }
    ]
    
    for (const option of fiberglassBattOptions) {
      const price = getPricePerSqft('fiberglass_batt', option.rValue)
      pricingCatalog.push({
        id: `fiberglass-batt-r${option.rValue}`,
        item_name: `Fiberglass Batt R-${option.rValue} (${option.thickness})`,
        base_price: price,
        unit: 'sqft',
        service_type: 'insulation',
        insulation_type: 'fiberglass_batt',
        r_value: option.rValue,
        thickness: option.thickness
      })
    }

    // Add Fiberglass Blown-in options
    const fiberglassBlownOptions = [
      { rValue: 19, thickness: '5-6"', type: 'fiberglass_blown' },
      { rValue: 30, thickness: '8-10"', type: 'fiberglass_blown' },
      { rValue: 38, thickness: '10-14"', type: 'fiberglass_blown' },
      { rValue: 49, thickness: '13-18"', type: 'fiberglass_blown' }
    ]
    
    for (const option of fiberglassBlownOptions) {
      const price = getPricePerSqft('fiberglass_blown', option.rValue)
      pricingCatalog.push({
        id: `fiberglass-blown-r${option.rValue}`,
        item_name: `Fiberglass Blown-in R-${option.rValue} (${option.thickness})`,
        base_price: price,
        unit: 'sqft',
        service_type: 'insulation',
        insulation_type: 'fiberglass_blown',
        r_value: option.rValue,
        thickness: option.thickness
      })
    }

    // Add Hybrid options
    const hybridOptions = [
      { rValue: 21, thickness: '4"', type: 'hybrid' },
      { rValue: 30, thickness: '5.5"', type: 'hybrid' },
      { rValue: 38, thickness: '7.5"', type: 'hybrid' },
      { rValue: 49, thickness: '10"', type: 'hybrid' }
    ]
    
    for (const option of hybridOptions) {
      const price = getPricePerSqft('hybrid', option.rValue)
      pricingCatalog.push({
        id: `hybrid-r${option.rValue}`,
        item_name: `Hybrid (Open + Closed) R-${option.rValue} (${option.thickness})`,
        base_price: price,
        unit: 'sqft',
        service_type: 'insulation',
        insulation_type: 'hybrid',
        r_value: option.rValue,
        thickness: option.thickness
      })
    }
    
    return NextResponse.json({
      success: true,
      data: pricingCatalog
    })
    
  } catch (error) {
    console.error('Error fetching insulation pricing:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pricing data' },
      { status: 500 }
    )
  }
}