import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all permits with 0,0 coordinates
    const { data: permits, error: fetchError } = await supabase
      .from('permits')
      .select('id, address, city, state, zip_code')
      .eq('latitude', 0)
      .eq('longitude', 0)

    if (fetchError) {
      console.error('Error fetching permits:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch permits' }, { status: 500 })
    }

    if (!permits || permits.length === 0) {
      return NextResponse.json({
        message: 'No permits need geocoding',
        geocoded: 0
      })
    }

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Geocode each permit
    for (const permit of permits) {
      try {
        // Build geocoding query
        const addressParts = [
          permit.address,
          permit.city,
          permit.state,
          permit.zip_code
        ].filter(Boolean)

        const fullAddress = addressParts.join(', ')

        if (!fullAddress.trim()) {
          errors.push(`Permit ${permit.id}: No address to geocode`)
          errorCount++
          continue
        }

        // Geocode using OpenStreetMap Nominatim
        const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullAddress)}&format=json&limit=1`

        const response = await fetch(geocodeUrl, {
          headers: {
            'User-Agent': 'EconovaLeadHunter/1.0'
          }
        })

        if (!response.ok) {
          errors.push(`Permit ${permit.id}: Geocoding service unavailable`)
          errorCount++
          continue
        }

        const results = await response.json()

        if (!results || results.length === 0) {
          errors.push(`Permit ${permit.id}: Address not found - ${fullAddress}`)
          errorCount++
          continue
        }

        const location = results[0]
        const latitude = parseFloat(location.lat)
        const longitude = parseFloat(location.lon)

        if (isNaN(latitude) || isNaN(longitude)) {
          errors.push(`Permit ${permit.id}: Invalid coordinates received`)
          errorCount++
          continue
        }

        // Update permit with coordinates
        const { error: updateError } = await supabase
          .from('permits')
          .update({
            latitude,
            longitude,
            geocoded_at: new Date().toISOString()
          })
          .eq('id', permit.id)

        if (updateError) {
          console.error('Error updating permit coordinates:', updateError)
          errors.push(`Permit ${permit.id}: Failed to update coordinates`)
          errorCount++
          continue
        }

        successCount++
        console.log(`Geocoded permit ${permit.id}: ${fullAddress} -> ${latitude}, ${longitude}`)

        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`Error geocoding permit ${permit.id}:`, error)
        errors.push(`Permit ${permit.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        errorCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Geocoding complete: ${successCount} successful, ${errorCount} failed`,
      geocoded: successCount,
      failed: errorCount,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Geocode all error:', error)
    return NextResponse.json({
      error: 'Geocoding failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}