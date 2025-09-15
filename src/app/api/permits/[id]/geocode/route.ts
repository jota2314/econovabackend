import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Check auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permitId = params.id

    // Get the permit
    const { data: permit, error: fetchError } = await supabase
      .from('permits')
      .select('address, city, state, zip_code')
      .eq('id', permitId)
      .single()

    if (fetchError || !permit) {
      return NextResponse.json({ error: 'Permit not found' }, { status: 404 })
    }

    // Build geocoding query
    const addressParts = [
      permit.address,
      permit.city,
      permit.state,
      permit.zip_code
    ].filter(Boolean)

    const fullAddress = addressParts.join(', ')

    if (!fullAddress.trim()) {
      return NextResponse.json({ error: 'No address to geocode' }, { status: 400 })
    }

    console.log('🔍 Geocoding address:', fullAddress)

    // Try different geocoding services
    let results = null
    let lastError = ''

    // Strategy 1: Try Google Geocoding API if available
    if (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      try {
        console.log('🔍 Trying Google Geocoding API...')
        const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`

        const response = await fetch(googleUrl)
        const data = await response.json()

        if (data.status === 'OK' && data.results && data.results.length > 0) {
          const location = data.results[0].geometry.location
          results = [{
            lat: location.lat.toString(),
            lon: location.lng.toString(),
            display_name: data.results[0].formatted_address
          }]
          console.log('✅ Google Geocoding successful:', location)
        } else {
          console.log('❌ Google Geocoding failed:', data.status, data.error_message)
          lastError = `Google: ${data.status} - ${data.error_message || 'No results'}`
        }
      } catch (error) {
        console.log('❌ Google Geocoding error:', error)
        lastError = `Google API error: ${error instanceof Error ? error.message : 'Unknown'}`
      }
    }

    // Strategy 2: Try OpenStreetMap Nominatim as fallback
    if (!results) {
      try {
        console.log('🔍 Trying OpenStreetMap Nominatim...')
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullAddress)}&format=json&limit=1&countrycodes=us`

        const response = await fetch(nominatimUrl, {
          headers: {
            'User-Agent': 'EconovaLeadHunter/1.0 (Contact: support@econova.com)',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9'
          }
        })

        console.log('📡 Nominatim response status:', response.status)

        if (response.ok) {
          const data = await response.json()
          if (data && data.length > 0) {
            results = data
            console.log('✅ Nominatim successful:', data[0])
          } else {
            console.log('❌ Nominatim: No results found')
            lastError = 'Nominatim: No results found'
          }
        } else {
          const errorText = await response.text()
          console.log('❌ Nominatim HTTP error:', response.status, errorText)
          lastError = `Nominatim HTTP ${response.status}: ${errorText}`
        }
      } catch (error) {
        console.log('❌ Nominatim error:', error)
        lastError = `Nominatim error: ${error instanceof Error ? error.message : 'Unknown'}`
      }
    }

    if (!results || results.length === 0) {
      console.log('❌ All geocoding strategies failed for:', fullAddress)
      return NextResponse.json({
        error: 'Address not found',
        address: fullAddress,
        details: lastError,
        debug: {
          hasGoogleKey: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
          attemptedServices: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? ['Google', 'Nominatim'] : ['Nominatim']
        }
      }, { status: 404 })
    }

    const location = results[0]
    const latitude = parseFloat(location.lat)
    const longitude = parseFloat(location.lon)

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json({
        error: 'Invalid coordinates received',
        address: fullAddress
      }, { status: 400 })
    }

    // Update permit with coordinates
    const { error: updateError } = await supabase
      .from('permits')
      .update({
        latitude,
        longitude,
        geocoded_at: new Date().toISOString()
      })
      .eq('id', permitId)

    if (updateError) {
      console.error('Error updating permit coordinates:', updateError)
      return NextResponse.json({
        error: 'Failed to update coordinates'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      latitude,
      longitude,
      address: fullAddress
    })

  } catch (error) {
    console.error('Geocoding error:', error)
    return NextResponse.json({
      error: 'Geocoding failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}