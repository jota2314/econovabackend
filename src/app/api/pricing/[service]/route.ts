import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PricingCatalog } from '@/lib/types/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ service: string }> }
) {
  const { service } = await params
  
  try {
    const supabase = await createClient()

    // Validate service type
    const validServices = ['insulation', 'hvac', 'plaster']
    if (!validServices.includes(service)) {
      return NextResponse.json(
        { error: 'Invalid service type' },
        { status: 400 }
      )
    }

    // Fetch pricing data for the specified service
    // Note: This is a placeholder implementation since pricing_catalog table may not exist yet
    try {
      const { data: pricing, error } = await supabase
        .from('pricing_catalog')
        .select('*')
        .eq('service_type', service)
        .order('created_at')

      if (error) {
        console.warn('Pricing catalog table not found, returning empty array:', error.message)
        // Return empty array instead of error for now
        return NextResponse.json({
          success: true,
          data: []
        })
      }

      return NextResponse.json({
        success: true,
        data: pricing || []
      })
    } catch (err) {
      console.warn('Pricing catalog error, returning empty array:', err)
      return NextResponse.json({
        success: true,
        data: []
      })
    }

  } catch (error) {
    console.error('Pricing API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}