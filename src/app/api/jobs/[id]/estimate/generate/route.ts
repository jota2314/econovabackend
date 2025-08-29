import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const supabase = await createClient()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      )
    }

    // Get all measurements for the job
    const { data: measurements, error: measurementsError } = await supabase
      .from('insulation_measurements')
      .select('*')
      .eq('job_id', id)

    if (measurementsError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch measurements' },
        { status: 500 }
      )
    }

    if (!measurements || measurements.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No measurements found for this job' },
        { status: 400 }
      )
    }

    // Get pricing data for the service type
    const { data: pricingData, error: pricingError } = await supabase
      .from('pricing_catalog')
      .select('*')
      .eq('service_type', job.service_type)

    if (pricingError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch pricing data' },
        { status: 500 }
      )
    }

    // Generate estimate number
    const estimateNumber = `EST-${Date.now()}`

    // Calculate line items based on measurements and pricing
    const lineItems: Array<{
      description: string
      quantity: number
      unit_price: number
      total_price: number
    }> = []

    let totalAmount = 0

    // Group measurements by insulation type and framing size
    const groupedMeasurements = measurements.reduce((acc, measurement) => {
      const key = `${measurement.insulation_type || 'standard'}_${measurement.framing_size}`
      if (!acc[key]) {
        acc[key] = {
          insulation_type: measurement.insulation_type,
          framing_size: measurement.framing_size,
          total_square_feet: 0,
          measurements: []
        }
      }
      acc[key].total_square_feet += measurement.square_feet
      acc[key].measurements.push(measurement)
      return acc
    }, {} as Record<string, any>)

    // Create line items for each group
    for (const [key, group] of Object.entries(groupedMeasurements)) {
      const group_data = group as any
      
      // Find matching pricing item
      const pricingItem = pricingData?.find(item => 
        item.item_name.toLowerCase().includes(group_data.insulation_type?.toLowerCase() || 'insulation') &&
        item.unit === 'sq_ft'
      ) || pricingData?.find(item => item.unit === 'sq_ft') // Fallback to first sq_ft item

      if (pricingItem) {
        const unitPrice = pricingItem.base_price * (1 + pricingItem.markup_percentage / 100)
        const totalPrice = unitPrice * group_data.total_square_feet

        lineItems.push({
          description: `${group_data.insulation_type || 'Insulation'} - ${group_data.framing_size} framing`,
          quantity: group_data.total_square_feet,
          unit_price: unitPrice,
          total_price: totalPrice
        })

        totalAmount += totalPrice
      }
    }

    // Create the estimate
    const { data: estimate, error: estimateError } = await supabase
      .from('estimates')
      .insert({
        job_id: id,
        estimate_number: estimateNumber,
        total_amount: totalAmount,
        status: 'draft',
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        created_by: user.id
      })
      .select()
      .single()

    if (estimateError) {
      console.error('Error creating estimate:', estimateError)
      return NextResponse.json(
        { success: false, error: 'Failed to create estimate' },
        { status: 500 }
      )
    }

    // Create estimate line items
    const lineItemsWithEstimateId = lineItems.map(item => ({
      estimate_id: estimate.id,
      ...item
    }))

    const { error: lineItemsError } = await supabase
      .from('estimate_line_items')
      .insert(lineItemsWithEstimateId)

    if (lineItemsError) {
      console.error('Error creating line items:', lineItemsError)
      // Try to clean up the estimate
      await supabase.from('estimates').delete().eq('id', estimate.id)
      return NextResponse.json(
        { success: false, error: 'Failed to create estimate line items' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        estimate,
        line_items: lineItemsWithEstimateId
      }
    })

  } catch (error) {
    console.error('Estimate generation API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}