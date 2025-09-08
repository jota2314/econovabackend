/**
 * API routes for managing HVAC systems within specific jobs
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { jobHvacSystemSchema, type JobHvacSystem, type JobHvacSystemsResponse, type JobHvacSummary } from '@/types/hvac-simple'

interface RouteParams {
  params: { id: string }
}

// GET /api/jobs/[id]/hvac-systems - Get all HVAC systems for a job
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient()
    const jobId = params.id

    // Fetch all HVAC systems for this job
    const { data: systems, error } = await supabase
      .from('job_hvac_systems')
      .select('*')
      .eq('job_id', jobId)
      .order('system_number', { ascending: true })

    if (error) {
      console.error('Error fetching job HVAC systems:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch HVAC systems'
      }, { status: 500 })
    }

    // Calculate summary
    const summary: JobHvacSummary = {
      total_systems: systems?.length || 0,
      total_amount: systems?.reduce((sum, sys) => sum + sys.total_amount, 0) || 0,
      total_ductwork: systems?.reduce((sum, sys) => sum + sys.ductwork_total, 0) || 0,
      systems_breakdown: (systems || []).map(sys => ({
        system_number: sys.system_number,
        system_name: sys.system_name,
        unit_price: sys.unit_price,
        quantity: sys.quantity,
        total_amount: sys.total_amount,
        ductwork_total: sys.ductwork_total
      }))
    }

    const response: JobHvacSystemsResponse = {
      success: true,
      data: {
        systems: systems || [],
        summary
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in job HVAC systems GET:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// POST /api/jobs/[id]/hvac-systems - Add HVAC system to job
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient()
    const jobId = params.id
    const body = await request.json()

    // If catalog_system_id is provided, copy data from catalog
    let systemData = body
    if (body.catalog_system_id) {
      const { data: catalogSystem, error: catalogError } = await supabase
        .from('hvac_systems_catalog')
        .select('*')
        .eq('id', body.catalog_system_id)
        .single()

      if (catalogError) {
        return NextResponse.json({
          success: false,
          error: 'Catalog system not found'
        }, { status: 404 })
      }

      // Copy catalog data, but allow overrides from request body
      systemData = {
        ...body,
        system_name: body.system_name || catalogSystem.system_name,
        system_type: body.system_type || catalogSystem.system_type,
        ahri_certified_ref: body.ahri_certified_ref || catalogSystem.ahri_certified_ref,
        manufacturer: body.manufacturer || catalogSystem.manufacturer,
        condenser_model: body.condenser_model || catalogSystem.condenser_model,
        tonnage: body.tonnage ?? catalogSystem.tonnage,
        seer2: body.seer2 ?? catalogSystem.seer2,
        hspf2: body.hspf2 ?? catalogSystem.hspf2,
        eer2: body.eer2 ?? catalogSystem.eer2,
        head_unit_model: body.head_unit_model || catalogSystem.head_unit_model,
        unit_price: body.unit_price ?? catalogSystem.base_price
      }
    }

    // Validate input
    const validationResult = jobHvacSystemSchema.safeParse(systemData)
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid input data',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const validatedData = validationResult.data

    // Check for duplicate system number
    const { data: existing } = await supabase
      .from('job_hvac_systems')
      .select('id')
      .eq('job_id', jobId)
      .eq('system_number', validatedData.system_number)
      .single()

    if (existing) {
      return NextResponse.json({
        success: false,
        error: `System number ${validatedData.system_number} already exists for this job`
      }, { status: 409 })
    }

    // Insert new system
    const { data: system, error } = await supabase
      .from('job_hvac_systems')
      .insert([{
        job_id: jobId,
        ...validatedData
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating job HVAC system:', error)
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
    console.error('Error in job HVAC systems POST:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}