/**
 * API routes for HVAC systems catalog management
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hvacCatalogSchema, type HvacSystemCatalog, type HvacCatalogResponse } from '@/types/hvac-simple'

// GET /api/hvac-catalog - List all active HVAC systems
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const manufacturer = searchParams.get('manufacturer') || ''
    const systemType = searchParams.get('system_type') || ''
    
    let query = supabase
      .from('hvac_systems_catalog')
      .select('*')
      .eq('is_active', true)
      .order('system_name', { ascending: true })

    // Apply filters
    if (search) {
      query = query.textSearch('search_vector', search)
    }
    
    if (manufacturer) {
      query = query.ilike('manufacturer', `%${manufacturer}%`)
    }
    
    if (systemType) {
      query = query.eq('system_type', systemType)
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    const { data: systems, error, count } = await query
      .range(from, to)
      .returns<HvacSystemCatalog[]>()

    if (error) {
      console.error('Error fetching HVAC catalog:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch HVAC systems' 
      }, { status: 500 })
    }

    const response: HvacCatalogResponse = {
      success: true,
      data: {
        systems: systems || [],
        total: count || 0
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in HVAC catalog GET:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// POST /api/hvac-catalog - Create new HVAC system in catalog
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()

    // Validate input
    const validationResult = hvacCatalogSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid input data',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const systemData = validationResult.data

    const { data: system, error } = await supabase
      .from('hvac_systems_catalog')
      .insert([systemData])
      .select()
      .single()

    if (error) {
      console.error('Error creating HVAC system:', error)
      
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({
          success: false,
          error: 'A system with this name already exists'
        }, { status: 409 })
      }
      
      return NextResponse.json({
        success: false,
        error: 'Failed to create HVAC system'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { system }
    }, { status: 201 })

  } catch (error) {
    console.error('Error in HVAC catalog POST:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}