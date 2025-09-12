import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/services/logger'

// GET /api/permits/[id] - Get specific permit
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: permit, error } = await supabase
      .from('permits')
      .select(`
        *,
        created_by:users!permits_created_by_fkey(full_name)
      `)
      .eq('id', params.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Permit not found' }, { status: 404 })
      }
      logger.error('Error fetching permit:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(permit)
  } catch (error) {
    logger.error('Unexpected error in GET /api/permits/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/permits/[id] - Update permit
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if permit exists and user has permission
    const { data: existingPermit, error: fetchError } = await supabase
      .from('permits')
      .select('created_by')
      .eq('id', params.id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Permit not found' }, { status: 404 })
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    // Check if user owns this permit or is a manager
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || (!currentUser || (existingPermit.created_by !== user.id && currentUser.role !== 'manager'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      address,
      city,
      state,
      zip_code,
      builder_name,
      builder_phone,
      permit_type,
      status,
      notes,
      latitude,
      longitude,
      photo_urls
    } = body

    // Validation for required fields
    if (address !== undefined && !address.trim()) {
      return NextResponse.json({ error: 'Address cannot be empty' }, { status: 400 })
    }
    if (builder_name !== undefined && !builder_name.trim()) {
      return NextResponse.json({ error: 'Builder name cannot be empty' }, { status: 400 })
    }
    if (permit_type !== undefined && !['residential', 'commercial'].includes(permit_type)) {
      return NextResponse.json({ error: 'permit_type must be residential or commercial' }, { status: 400 })
    }
    if (status !== undefined && !['new', 'contacted', 'converted_to_lead', 'rejected', 'hot', 'cold', 'visited', 'not_visited'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
    }

    // Build update object (only include provided fields)
    const updateData: any = {}
    if (address !== undefined) updateData.address = address.trim()
    if (city !== undefined) updateData.city = city?.trim()
    if (state !== undefined) updateData.state = state?.trim()
    if (zip_code !== undefined) updateData.zip_code = zip_code?.trim()
    if (builder_name !== undefined) updateData.builder_name = builder_name.trim()
    if (builder_phone !== undefined) updateData.builder_phone = builder_phone?.trim()
    if (permit_type !== undefined) updateData.permit_type = permit_type
    if (status !== undefined) updateData.status = status
    if (notes !== undefined) updateData.notes = notes?.trim()
    if (latitude !== undefined) updateData.latitude = parseFloat(latitude)
    if (longitude !== undefined) updateData.longitude = parseFloat(longitude)
    if (photo_urls !== undefined) updateData.photo_urls = photo_urls

    const { data: permit, error } = await supabase
      .from('permits')
      .update(updateData)
      .eq('id', params.id)
      .select(`
        *,
        created_by:users!permits_created_by_fkey(full_name)
      `)
      .single()

    if (error) {
      logger.error('Error updating permit:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logger.info(`Permit updated: ${params.id} by user ${user.id}`)
    return NextResponse.json(permit)

  } catch (error) {
    logger.error('Unexpected error in PUT /api/permits/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/permits/[id] - Delete permit
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if permit exists and user has permission
    const { data: existingPermit, error: fetchError } = await supabase
      .from('permits')
      .select('created_by')
      .eq('id', params.id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Permit not found' }, { status: 404 })
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    // Check if user owns this permit or is a manager
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || (!currentUser || (existingPermit.created_by !== user.id && currentUser.role !== 'manager'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error, count } = await supabase
      .from('permits')
      .delete()
      .eq('id', params.id)
      .select()

    if (error) {
      logger.error('Error deleting permit:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Check if any rows were actually deleted
    if (!data || data.length === 0) {
      logger.error(`No permit was deleted for ID: ${params.id}. This could indicate RLS policy restrictions or the permit doesn't exist.`)
      return NextResponse.json({ error: 'No permit was deleted. Check permissions or if permit exists.' }, { status: 404 })
    }

    logger.info(`Permit deleted: ${params.id} by user ${user.id}. Deleted data:`, data)
    return NextResponse.json({ message: 'Permit deleted successfully', deletedData: data[0] })

  } catch (error) {
    logger.error('Unexpected error in DELETE /api/permits/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}