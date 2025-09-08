import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateTotalEstimate, type InsulationType } from '@/lib/utils/pricing-calculator'
import { logger } from '@/lib/services/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { 
      prepWork = false, 
      fireRetardant = false, 
      complexityMultiplier = 1.0,
      discount = 0
    } = await request.json()

    // Get job measurements
    const { data: measurements, error: measurementsError } = await supabase
      .from('measurements')
      .select('*')
      .eq('job_id', id)

    if (measurementsError) {
      throw new Error(`Failed to fetch measurements: ${measurementsError.message}`)
    }

    if (!measurements || measurements.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No measurements found for this job' },
        { status: 400 }
      )
    }

    // Calculate base estimate
    const baseEstimate = calculateTotalEstimate(
      measurements
        .filter(m => m.square_feet !== null)
        .map(m => ({
          squareFeet: m.square_feet!,
          insulationType: m.insulation_type as InsulationType,
          rValue: m.r_value ? Number(m.r_value) : 0
        }))
    )

    // Calculate additional costs
    const totalSquareFeet = measurements.reduce((sum, m) => sum + (m.square_feet || 0), 0)
    
    // Apply complexity multiplier to base price
    let adjustedSubtotal = baseEstimate.subtotal * complexityMultiplier
    
    // Add prep work if needed
    let prepWorkCost = 0
    if (prepWork) {
      prepWorkCost = totalSquareFeet * 0.50 // $0.50/sqft for prep work
      adjustedSubtotal += prepWorkCost
    }

    // Add fire retardant if needed  
    let fireRetardantCost = 0
    if (fireRetardant) {
      fireRetardantCost = totalSquareFeet * 1.10 // $1.10/sqft for fire retardant
      adjustedSubtotal += fireRetardantCost
    }

    // Apply discount
    const discountAmount = adjustedSubtotal * (discount / 100)
    const subtotalAfterDiscount = adjustedSubtotal - discountAmount
    const total = subtotalAfterDiscount

    // Prepare detailed breakdown
    const breakdown = {
      baseInsulation: {
        description: 'Spray foam insulation',
        squareFeet: totalSquareFeet,
        amount: baseEstimate.subtotal
      },
      complexity: complexityMultiplier > 1 ? {
        description: `Complexity adjustment (${((complexityMultiplier - 1) * 100).toFixed(1)}% increase)`,
        amount: baseEstimate.subtotal * (complexityMultiplier - 1)
      } : null,
      prepWork: prepWork ? {
        description: 'Surface preparation',
        squareFeet: totalSquareFeet,
        rate: 0.50,
        amount: prepWorkCost
      } : null,
      fireRetardant: fireRetardant ? {
        description: 'Fire retardant coating',
        squareFeet: totalSquareFeet,
        rate: 1.10,
        amount: fireRetardantCost
      } : null,
      discount: discount > 0 ? {
        description: `Discount (${discount}%)`,
        amount: -discountAmount
      } : null,
    }

    // Create estimate record
    const { data: estimate, error: estimateError } = await supabase
      .from('estimates')
      .insert({
        job_id: id,
        estimate_number: `EST-${Date.now()}`,
        total_amount: total,
        subtotal: subtotalAfterDiscount,
        markup_percentage: 6.25,
        locks_measurements: false,
        status: total > 10000 ? 'pending_approval' : 'approved',
        created_by: user.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (estimateError) {
      throw new Error(`Failed to create estimate: ${estimateError.message}`)
    }

    return NextResponse.json({
      success: true,
      data: {
        estimate,
        breakdown,
        summary: {
          totalSquareFeet,
          subtotal: adjustedSubtotal,
          discountAmount,
          subtotalAfterDiscount,
          total,
          requiresApproval: total > 10000
        }
      }
    })

  } catch (error) {
    logger.error('Error creating estimate', error, { jobId: id })
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create estimate' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()

    // Get existing estimates for this job
    const { data: estimates, error } = await supabase
      .from('estimates')
      .select('*')
      .eq('job_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch estimates: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      data: estimates
    })

  } catch (error) {
    logger.error('Error fetching estimates', error, { jobId: id })
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch estimates' },
      { status: 500 }
    )
  }
}