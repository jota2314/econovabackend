import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enhancedHvacMeasurementSchema } from '@/components/measurements/services/hvac/types-enhanced'
import { logger } from '@/lib/services/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    logger.info('Loading enhanced HVAC measurement by ID', { measurementId: id, userId: user.id })

    const { data, error } = await supabase
      .from('enhanced_hvac_measurements')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      logger.error('Failed to load enhanced HVAC measurement', error, { measurementId: id })
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to load HVAC measurement' 
      }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ 
        success: false, 
        error: 'HVAC measurement not found' 
      }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })

  } catch (error) {
    logger.error('Error in enhanced HVAC measurement GET', error, { measurementId: id })
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    logger.info('Updating enhanced HVAC measurement', { measurementId: id, userId: user.id })

    // Check if user is manager for price overrides
    let isManager = false
    if (body.price_override !== undefined) {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      
      isManager = profile?.role === 'manager'
      if (!isManager) {
        return NextResponse.json({ 
          success: false, 
          error: 'Only managers can set price overrides' 
        }, { status: 403 })
      }
    }

    try {
      const validated = enhancedHvacMeasurementSchema.parse(body)
      
      const updateData = {
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
        
        updated_at: new Date().toISOString()
      }

      // Only managers can update pricing overrides
      if (isManager) {
        updateData.price_override = validated.price_override || null
        updateData.override_reason = validated.override_reason || null
      }

      const { data, error } = await supabase
        .from('enhanced_hvac_measurements')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single()

      if (error) {
        logger.error('Failed to update enhanced HVAC measurement', error, { measurementId: id })
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to update HVAC measurement' 
        }, { status: 500 })
      }

      logger.info('Enhanced HVAC measurement updated successfully', { measurementId: id })
      return NextResponse.json({ success: true, data })

    } catch (validationError) {
      logger.error('HVAC measurement validation failed on update', validationError, { measurementId: id })
      return NextResponse.json({ 
        success: false, 
        error: `Validation failed: ${validationError.message}` 
      }, { status: 400 })
    }

  } catch (error) {
    logger.error('Error in enhanced HVAC measurement PUT', error, { measurementId: id })
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    logger.info('Deleting enhanced HVAC measurement', { measurementId: id, userId: user.id })

    const { error } = await supabase
      .from('enhanced_hvac_measurements')
      .delete()
      .eq('id', id)

    if (error) {
      logger.error('Failed to delete enhanced HVAC measurement', error, { measurementId: id })
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to delete HVAC measurement' 
      }, { status: 500 })
    }

    logger.info('Enhanced HVAC measurement deleted successfully', { measurementId: id })
    return NextResponse.json({ 
      success: true, 
      message: 'HVAC measurement deleted successfully' 
    })

  } catch (error) {
    logger.error('Error in enhanced HVAC measurement DELETE', error, { measurementId: id })
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}