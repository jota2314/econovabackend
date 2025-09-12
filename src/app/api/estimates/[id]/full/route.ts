import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/services/logger'
import { calculateHybridRValue, calculateHybridPricing } from '@/lib/utils/hybrid-calculator'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()

    // Get estimate with job details in a single query
    const { data: estimate, error: estimateError } = await supabase
      .from('estimates')
      .select(`
        *,
        jobs!inner (
          id,
          job_name,
          service_type,
          building_type,
          project_address,
          job_address,
          project_city,
          project_state,
          project_zip_code,
          lead:leads (
            name,
            email,
            phone
          )
        ),
        created_by_user:users!estimates_created_by_fkey (
          id,
          full_name,
          email
        ),
        approved_by_user:users!estimates_approved_by_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq('id', id)
      .single()

    if (estimateError || !estimate) {
      return NextResponse.json(
        { success: false, error: 'Estimate not found' },
        { status: 404 }
      )
    }

    // Get measurements for this estimate's job in the same request cycle
    const jobId = estimate.jobs.id
    const { data: measurements, error: measurementsError } = await supabase
      .from('measurements')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true })

    // Process measurements and photos exactly as in the original store
    let realItems: any[] = []
    let realPhotos: any[] = []
    
    if (!measurementsError && measurements && measurements.length > 0) {
      // Calculate pricing using the same hybrid logic as the job view
      realItems = measurements
        .filter((measurement: any) => measurement.square_feet && measurement.square_feet > 0)
        .map((measurement: any) => {
          let unitPrice = 0
          let totalCost = 0
          let rValue = measurement.r_value || ''

          // Check for override price first (applies to all insulation types)
          if (measurement.override_unit_price) {
            unitPrice = measurement.override_unit_price
            totalCost = unitPrice * (measurement.square_feet || 0)
          } else {
            // Calculate pricing based on insulation type and measurements
            if (measurement.insulation_type === 'hybrid' && measurement.is_hybrid_system) {
              // Use hybrid pricing calculation
              const hybridCalc = calculateHybridRValue(
                measurement.closed_cell_inches || 0,
                measurement.open_cell_inches || 0
              )
              const hybridPricing = calculateHybridPricing(hybridCalc)
              
              unitPrice = hybridPricing.totalPricePerSqft
              totalCost = unitPrice * (measurement.square_feet || 0)
              rValue = `R-${hybridCalc.totalRValue}`
            } else {
              // Handle non-hybrid systems (single insulation type)
              // Calculate based on insulation type and inches
              const totalInches = (measurement.closed_cell_inches || 0) + (measurement.open_cell_inches || 0)
              if (measurement.insulation_type === 'closed_cell') {
                unitPrice = totalInches * 1.243 // $1.243 per inch from hybrid calculator
              } else if (measurement.insulation_type === 'open_cell') {
                unitPrice = totalInches * 0.471 // $0.471 per inch from hybrid calculator
              }
              totalCost = unitPrice * (measurement.square_feet || 0)
            }
          }

          return {
            id: measurement.id,
            room_name: measurement.room_name,
            surface_type: measurement.surface_type,
            area_type: measurement.area_type || '',
            height: measurement.height || 0,
            width: measurement.width || 0,
            square_feet: measurement.square_feet || 0,
            insulation_type: measurement.insulation_type,
            r_value: rValue,
            unit_price: Math.round(unitPrice * 100) / 100, // Round to 2 decimals
            total_cost: Math.round(totalCost * 100) / 100, // Round to 2 decimals
            notes: measurement.notes,
            // Pass through the raw data for reference
            closed_cell_inches: measurement.closed_cell_inches,
            open_cell_inches: measurement.open_cell_inches,
            is_hybrid_system: measurement.is_hybrid_system
          }
        })
      
      // Get photos from measurement photo_url field
      realPhotos = measurements
        .filter((measurement: any) => measurement.photo_url)
        .map((measurement: any, index: number) => ({
          id: `photo-${measurement.id}`,
          url: measurement.photo_url,
          alt: `${measurement.room_name} photo`,
          caption: `${measurement.room_name} - ${measurement.surface_type}`,
          measurement_id: measurement.id,
          room_name: measurement.room_name
        }))
    }
    
    // Combine estimate with processed items and photos
    const fullEstimate = {
      ...estimate,
      items: realItems,
      photos: realPhotos,
      // Keep database values, don't override with calculations
      subtotal: estimate.subtotal || 0,
      total_amount: estimate.total_amount || 0
    }

    return NextResponse.json({
      success: true,
      data: fullEstimate
    })

  } catch (error) {
    logger.error('Error in GET estimate full API', error, { estimateId: id })
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}