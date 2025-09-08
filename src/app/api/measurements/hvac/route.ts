import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enhancedHvacMeasurementSchema } from '@/components/measurements/services/hvac/types-enhanced'
import { logger } from '@/lib/services/logger'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { job_id, measurements } = body

    if (!job_id || !measurements || !Array.isArray(measurements)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: job_id and measurements array' 
      }, { status: 400 })
    }

    logger.info('Creating enhanced HVAC measurements', { 
      jobId: job_id, 
      count: measurements.length,
      userId: user.id 
    })

    // Validate each measurement
    const validatedMeasurements = []
    for (const measurement of measurements) {
      try {
        const validated = enhancedHvacMeasurementSchema.parse(measurement)
        validatedMeasurements.push({
          job_id,
          room_name: `HVAC System ${validated.system_number}`,
          system_number: validated.system_number,
          system_description: validated.system_description,
          system_type: validated.system_type,
          
          // AHRI Certification
          ahri_number: validated.ahri_certificate.ahri_number,
          outdoor_model: validated.ahri_certificate.outdoor_model,
          indoor_model: validated.ahri_certificate.indoor_model,
          manufacturer: validated.ahri_certificate.manufacturer,
          tonnage: validated.ahri_certificate.tonnage,
          seer2_rating: validated.ahri_certificate.seer2_rating || null,
          hspf2_rating: validated.ahri_certificate.hspf2_rating || null,
          eer2_rating: validated.ahri_certificate.eer2_rating || null,
          ahri_certified: validated.ahri_certificate.certified,
          
          // Installation Details
          ductwork_linear_feet: validated.ductwork_linear_feet,
          supply_vents: validated.supply_vents,
          return_vents: validated.return_vents,
          installation_complexity: validated.installation_complexity,
          
          // Additional Services
          existing_system_removal: validated.existing_system_removal,
          electrical_upgrade_required: validated.electrical_upgrade_required,
          permit_required: validated.permit_required,
          startup_testing_required: validated.startup_testing_required,
          
          // Project Details
          installation_location: validated.installation_location || null,
          special_requirements: validated.special_requirements || null,
          notes: validated.notes || null,
          
          // Pricing
          price_override: validated.price_override || null,
          override_reason: validated.override_reason || null,
          
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      } catch (validationError) {
        logger.error('HVAC measurement validation failed', validationError, { measurement })
        return NextResponse.json({ 
          success: false, 
          error: `Validation failed for system ${measurement.system_number || 'unknown'}: ${validationError.message}` 
        }, { status: 400 })
      }
    }

    // Insert measurements
    const { data, error } = await supabase
      .from('enhanced_hvac_measurements')
      .insert(validatedMeasurements)
      .select('*')

    if (error) {
      logger.error('Failed to create enhanced HVAC measurements', error, { jobId: job_id })
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create HVAC measurements' 
      }, { status: 500 })
    }

    logger.info('Enhanced HVAC measurements created successfully', { 
      jobId: job_id,
      count: data.length 
    })

    return NextResponse.json({ success: true, data })

  } catch (error) {
    logger.error('Error in enhanced HVAC measurements POST', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('job_id')

    if (!jobId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameter: job_id' 
      }, { status: 400 })
    }

    logger.info('Loading enhanced HVAC measurements', { jobId, userId: user.id })

    const { data, error } = await supabase
      .from('enhanced_hvac_measurements')
      .select('*')
      .eq('job_id', jobId)
      .order('system_number', { ascending: true })

    if (error) {
      logger.error('Failed to load enhanced HVAC measurements', error, { jobId })
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to load HVAC measurements' 
      }, { status: 500 })
    }

    logger.info('Enhanced HVAC measurements loaded successfully', { 
      jobId, 
      count: data.length 
    })

    return NextResponse.json({ success: true, data })

  } catch (error) {
    logger.error('Error in enhanced HVAC measurements GET', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}