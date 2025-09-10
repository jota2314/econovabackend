import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/services/logger'

// GET /api/permits - List all permits
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const permit_type = searchParams.get('permit_type')
    const builder_name = searchParams.get('builder_name')

    let query = supabase
      .from('permits')
      .select(`
        *,
        created_by:users!permits_created_by_fkey(full_name)
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (permit_type) {
      query = query.eq('permit_type', permit_type)
    }
    if (builder_name) {
      query = query.ilike('builder_name', `%${builder_name}%`)
    }

    const { data: permits, error } = await query

    if (error) {
      logger.error('Error fetching permits:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(permits)
  } catch (error) {
    logger.error('Unexpected error in GET /api/permits:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/permits - Create new permit
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      address,
      city,
      state = 'MA',
      zip_code,
      builder_name,
      builder_phone,
      permit_type,
      notes,
      latitude,
      longitude,
      photo_urls = []
    } = body

    // Validation
    if (!address || !builder_name || !permit_type) {
      return NextResponse.json(
        { error: 'Address, builder_name, and permit_type are required' },
        { status: 400 }
      )
    }

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      )
    }

    if (!['residential', 'commercial'].includes(permit_type)) {
      return NextResponse.json(
        { error: 'permit_type must be residential or commercial' },
        { status: 400 }
      )
    }

    const permitData = {
      address: address.trim(),
      city: city?.trim(),
      state: state?.trim() || 'MA',
      zip_code: zip_code?.trim(),
      builder_name: builder_name.trim(),
      builder_phone: builder_phone?.trim(),
      permit_type,
      notes: notes?.trim(),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      photo_urls,
      created_by: user.id,
      geocoded_at: new Date().toISOString()
    }

    const { data: permit, error } = await supabase
      .from('permits')
      .insert([permitData])
      .select(`
        *,
        created_by:users!permits_created_by_fkey(full_name)
      `)
      .single()

    if (error) {
      logger.error('Error creating permit:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logger.info(`Permit created: ${permit.id} by user ${user.id}`)
    return NextResponse.json(permit, { status: 201 })

  } catch (error) {
    logger.error('Unexpected error in POST /api/permits:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}