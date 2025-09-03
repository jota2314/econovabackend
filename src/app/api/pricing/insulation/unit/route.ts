import { NextRequest, NextResponse } from 'next/server'
import { getDatabasePricePerSqft } from '@/lib/utils/database-pricing-calculator'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { kind, r, ccInches, ocInches } = body

    // Validate input
    if (!kind || typeof r !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Invalid input: kind and r are required' },
        { status: 400 }
      )
    }

    if (!['closed_cell', 'open_cell', 'hybrid'].includes(kind)) {
      return NextResponse.json(
        { success: false, error: 'Invalid kind: must be closed_cell, open_cell, or hybrid' },
        { status: 400 }
      )
    }

    // Get database pricing using existing helper
    const price = await getDatabasePricePerSqft(kind, r)

    return NextResponse.json({
      success: true,
      price: price || 0,
      details: {
        kind,
        r,
        ccInches,
        ocInches
      }
    })
  } catch (error) {
    console.error('Error in pricing API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
