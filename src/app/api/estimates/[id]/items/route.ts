import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/services/logger'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    logger.info('Updating estimate item prices', { estimateId: id, priceOverrides: body.price_overrides })

    // Validate that estimate exists
    const { data: estimate, error: estimateError } = await supabase
      .from('estimates')
      .select('id')
      .eq('id', id)
      .single()

    if (estimateError || !estimate) {
      return NextResponse.json(
        { success: false, error: 'Estimate not found' },
        { status: 404 }
      )
    }

    const { price_overrides } = body

    if (!price_overrides || typeof price_overrides !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid price overrides data' },
        { status: 400 }
      )
    }

    // Update measurements with price overrides
    const measurementIds = Object.keys(price_overrides)
    const updatePromises = measurementIds.map(async (measurementId) => {
      const overridePrice = price_overrides[measurementId]
      
      if (typeof overridePrice !== 'number' || overridePrice < 0) {
        throw new Error(`Invalid price override for measurement ${measurementId}: ${overridePrice}`)
      }

      // Update the measurement with the override unit price
      const { error } = await supabase
        .from('measurements')
        .update({
          override_unit_price: overridePrice,
          override_set_at: new Date().toISOString()
        })
        .eq('id', measurementId)

      if (error) {
        logger.error('Error updating measurement override price', error, { 
          estimateId: id, 
          measurementId,
          overridePrice 
        })
        throw new Error(`Failed to update measurement ${measurementId}`)
      }

      return { measurementId, overridePrice }
    })

    // Execute all measurement updates
    const results = await Promise.all(updatePromises)
    
    logger.info('Price overrides updated successfully', { 
      estimateId: id, 
      overrideCount: Object.keys(price_overrides).length,
      results: results.map(r => ({ id: r.measurementId, price: r.overridePrice }))
    })

    // Recalculate estimate totals based on ALL measurements (including updated ones)
    // Fetch all measurements for this estimate to calculate correct totals
    const { data: job, error: jobError } = await supabase
      .from('estimates')
      .select('job_id')
      .eq('id', id)
      .single()

    if (jobError || !job?.job_id) {
      logger.error('Error fetching job_id for estimate totals calculation', jobError, { estimateId: id })
      return NextResponse.json(
        { success: false, error: 'Failed to find associated job for estimate' },
        { status: 404 }
      )
    }

    const { data: measurements, error: measurementsError } = await supabase
      .from('measurements')
      .select('id, square_feet, override_unit_price, insulation_type, closed_cell_inches, open_cell_inches, is_hybrid_system')
      .eq('job_id', job.job_id)
      .gt('square_feet', 0)

    if (measurementsError) {
      logger.error('Error fetching measurements for totals calculation', measurementsError, { estimateId: id, jobId: job.job_id })
      return NextResponse.json(
        { success: false, error: 'Failed to fetch measurements for calculation' },
        { status: 500 }
      )
    }

    // Calculate subtotal using the same logic as the store
    let subtotal = 0
    if (measurements) {
      subtotal = measurements.reduce((sum, measurement) => {
        let unitPrice = 0

        if (measurement.override_unit_price) {
          // Use override price if set
          unitPrice = measurement.override_unit_price
        } else {
          // Calculate pricing based on insulation type (same as store logic)
          if (measurement.insulation_type === 'hybrid' && measurement.is_hybrid_system) {
            // Use hybrid pricing calculation
            const closedCellInches = measurement.closed_cell_inches || 0
            const openCellInches = measurement.open_cell_inches || 0
            
            // Simple hybrid calculation (matching store logic)
            const closedCellPrice = closedCellInches * 1.243  // $1.243 per inch
            const openCellPrice = openCellInches * 0.471      // $0.471 per inch
            unitPrice = closedCellPrice + openCellPrice
          } else {
            // Handle non-hybrid systems
            const totalInches = (measurement.closed_cell_inches || 0) + (measurement.open_cell_inches || 0)
            if (measurement.insulation_type === 'closed_cell') {
              unitPrice = totalInches * 1.243
            } else if (measurement.insulation_type === 'open_cell') {
              unitPrice = totalInches * 0.471
            }
          }
        }

        const totalCost = unitPrice * (measurement.square_feet || 0)
        return sum + totalCost
      }, 0)
    }

    // No markup for now (matching store logic)
    const totalAmount = subtotal

    // Update estimate with new totals
    const { error: updateError } = await supabase
      .from('estimates')
      .update({
        subtotal,
        total_amount: totalAmount
      })
      .eq('id', id)

    if (updateError) {
      logger.error('Error updating estimate totals', updateError, { 
        estimateId: id, 
        subtotal, 
        totalAmount,
        errorMessage: updateError.message,
        errorDetails: updateError.details,
        errorHint: updateError.hint
      })
      return NextResponse.json(
        { success: false, error: `Failed to update estimate totals: ${updateError.message}` },
        { status: 500 }
      )
    }

    logger.info('Estimate totals updated successfully', {
      estimateId: id,
      newSubtotal: subtotal,
      newTotal: totalAmount
    })

    return NextResponse.json({
      success: true,
      message: 'Price overrides updated successfully',
      data: {
        subtotal,
        total_amount: totalAmount,
        updated_measurements: results.length
      }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    logger.error('Error in PATCH estimate items API', { 
      error: errorMessage, 
      stack: errorStack,
      estimateId: await params.then(p => p.id).catch(() => 'unknown')
    })
    
    console.error('PATCH /api/estimates/[id]/items error:', {
      message: errorMessage,
      stack: errorStack,
    })
    
    return NextResponse.json(
      { success: false, error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    )
  }
}