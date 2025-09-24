import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const origins = searchParams.get('origins')
  const destinations = searchParams.get('destinations')

  if (!origins || !destinations) {
    return NextResponse.json({ error: 'Missing origins or destinations' }, { status: 400 })
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 })
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json')
    url.searchParams.append('origins', origins)
    url.searchParams.append('destinations', destinations)
    url.searchParams.append('units', 'imperial')
    url.searchParams.append('mode', 'driving')
    url.searchParams.append('departure_time', 'now')
    url.searchParams.append('traffic_model', 'best_guess')
    url.searchParams.append('key', apiKey)

    const response = await fetch(url.toString())
    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error('Distance Matrix API error:', error)
    return NextResponse.json({ error: 'Failed to fetch distance data' }, { status: 500 })
  }
}