import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/services/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()

    // Get estimate with job details
    const { data: estimate, error: estimateError } = await supabase
      .from('estimates')
      .select(`
        *,
        jobs!inner (
          id,
          job_name,
          service_type,
          project_address,
          project_city,
          project_state,
          project_zip_code,
          lead:leads (
            name,
            email,
            phone
          )
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

    return NextResponse.json({
      success: true,
      data: estimate
    })

  } catch (error) {
    logger.error('Error in GET estimate API', error, { estimateId: id })
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    
    // Check authentication first
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      logger.error('Authentication failed in PATCH estimate', { error: authError, estimateId: id })
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    
    // Log incoming request details with user info
    logger.info('PATCH /api/estimates/[id] - Request received', {
      estimateId: id,
      userId: user.id,
      bodyKeys: Object.keys(body),
      lineItemsCount: body.line_items?.length || 0,
      total_amount: body.total_amount,
      subtotal: body.subtotal
    })

    // First, fetch the current estimate to check its status, amounts, and ownership
    const { data: currentEstimate, error: fetchError } = await adminSupabase
      .from('estimates')
      .select('status, total_amount, approved_by, approved_at, created_by')
      .eq('id', id)
      .single()

    if (fetchError || !currentEstimate) {
      logger.error('Failed to fetch current estimate', { error: fetchError, estimateId: id })
      return NextResponse.json(
        { success: false, error: 'Estimate not found' },
        { status: 404 }
      )
    }
    
    // Check if user owns this estimate or is a manager
    // For now, let's log the issue but allow the update if created_by is null
    if (currentEstimate.created_by && currentEstimate.created_by !== user.id) {
      // Check if user is a manager (managers can update any estimate)
      const { data: userData } = await adminSupabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      
      if (userData?.role !== 'manager') {
        logger.error('User does not have permission to update this estimate', { 
          userId: user.id, 
          estimateCreatedBy: currentEstimate.created_by,
          estimateId: id 
        })
        return NextResponse.json(
          { success: false, error: 'You do not have permission to update this estimate' },
          { status: 403 }
        )
      }
      
      logger.info('Manager is updating estimate created by another user', {
        managerId: user.id,
        originalCreator: currentEstimate.created_by,
        estimateId: id
      })
    } else if (!currentEstimate.created_by) {
      logger.warn('Estimate has no created_by field, allowing update', {
        userId: user.id,
        estimateId: id
      })
    }

    // Build update object dynamically based on provided fields
    const updateData: any = {}

    // Smart approval status logic
    const isApproved = currentEstimate.status === 'approved'
    const amountChanged = body.total_amount !== undefined && 
                         body.total_amount !== currentEstimate.total_amount

    // If estimate was approved and amount changed, reset approval
    if (isApproved && amountChanged) {
      logger.info('Resetting approval status - estimate was approved but amount changed', {
        estimateId: id,
        oldAmount: currentEstimate.total_amount,
        newAmount: body.total_amount
      })
      updateData.status = 'pending_approval'
      updateData.approved_by = null
      updateData.approved_at = null
    } else if (body.status !== undefined) {
      // Otherwise, only update status if explicitly provided
      updateData.status = body.status
    }

    // Add amount fields if provided
    if (body.total_amount !== undefined) {
      updateData.total_amount = body.total_amount
    }
    if (body.subtotal !== undefined) {
      updateData.subtotal = body.subtotal
    }

    logger.info('Updating estimate with smart approval logic', { 
      estimateId: id, 
      updateData,
      wasApproved: isApproved,
      amountChanged
    })

    // First, let's check if we have anything to update
    if (Object.keys(updateData).length === 0) {
      logger.warn('No fields to update in estimate', { estimateId: id })
      // If no fields to update, just fetch and return current estimate
      const { data: existingEstimate } = await adminSupabase
        .from('estimates')
        .select()
        .eq('id', id)
        .single()
      
      // Still process line items if provided
      if (body.line_items && Array.isArray(body.line_items)) {
        // Continue with line items processing below
      } else {
        return NextResponse.json({
          success: true,
          data: existingEstimate
        })
      }
    }
    
    // Update estimate (without select to avoid the single row error)
    const { error: updateError } = await adminSupabase
      .from('estimates')
      .update(updateData)
      .eq('id', id)

    if (updateError) {
      logger.error('Database error updating estimate', {
        error: updateError,
        errorMessage: updateError.message,
        errorDetails: updateError.details,
        errorHint: updateError.hint,
        errorCode: updateError.code,
        estimateId: id,
        updateData
      })
      return NextResponse.json(
        { success: false, error: `Failed to update estimate: ${updateError.message}` },
        { status: 500 }
      )
    }

    // Fetch the updated estimate separately
    const { data: updatedEstimate, error: fetchUpdatedError } = await adminSupabase
      .from('estimates')
      .select()
      .eq('id', id)
      .single()

    if (fetchUpdatedError) {
      logger.error('Error fetching updated estimate', { 
        error: fetchUpdatedError,
        estimateId: id 
      })
      // Update succeeded but fetch failed - still continue
    }

    logger.info('Estimate updated successfully', { estimateId: id, updatedEstimate })

    // Handle line items if provided
    if (body.line_items && Array.isArray(body.line_items)) {
      logger.info('Processing line items', { 
        estimateId: id, 
        lineItemsCount: body.line_items.length,
        firstLineItem: body.line_items[0] 
      })
      
      // Delete existing line items
      logger.info('Deleting existing line items', { estimateId: id })
      const { error: deleteError } = await adminSupabase
        .from('estimate_line_items')
        .delete()
        .eq('estimate_id', id)

      if (deleteError) {
        logger.error('Database error deleting line items', { 
          error: deleteError,
          errorMessage: deleteError.message,
          errorDetails: deleteError.details,
          errorHint: deleteError.hint,
          errorCode: deleteError.code,
          estimateId: id 
        })
        return NextResponse.json(
          { success: false, error: `Failed to delete line items: ${deleteError.message}` },
          { status: 500 }
        )
      }

      // Insert new line items
      if (body.line_items.length > 0) {
        const lineItemsToInsert = body.line_items.map((item: any, index: number) => ({
          estimate_id: id,
          line_number: index + 1,
          service_type: item.service_type || 'insulation',
          description: item.description,
          quantity: item.quantity || 0,
          unit: item.unit || 'sqft',
          unit_price: item.unit_price || 0,
          line_total: (item.quantity || 0) * (item.unit_price || 0)  // Calculate total here
        }))

        logger.info('Inserting new line items', { 
          estimateId: id, 
          lineItemsCount: lineItemsToInsert.length,
          sampleItem: lineItemsToInsert[0] 
        })

        const { error: insertError } = await adminSupabase
          .from('estimate_line_items')
          .insert(lineItemsToInsert)

        if (insertError) {
          logger.error('Database error inserting line items', { 
            error: insertError,
            errorMessage: insertError.message,
            errorDetails: insertError.details,
            errorHint: insertError.hint,
            errorCode: insertError.code,
            estimateId: id,
            lineItemsToInsert 
          })
          return NextResponse.json(
            { success: false, error: `Failed to insert line items: ${insertError.message}` },
            { status: 500 }
          )
        }
        
        logger.info('Line items inserted successfully', { estimateId: id })
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedEstimate
    })

  } catch (error: any) {
    logger.error('Unexpected error in PATCH estimate API', {
      error,
      errorMessage: error?.message,
      errorStack: error?.stack,
      errorName: error?.name,
      estimateId: id
    })
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error?.message || 'Unknown error'}` },
      { status: 500 }
    )
  }
}