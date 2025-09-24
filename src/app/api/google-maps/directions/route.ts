import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const origin = searchParams.get('origin')
  const destination = searchParams.get('destination')
  const waypoints = searchParams.get('waypoints')

  if (!origin || !destination) {
    return NextResponse.json({ error: 'Missing origin or destination' }, { status: 400 })
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 })
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/directions/json')
    url.searchParams.append('origin', origin)
    url.searchParams.append('destination', destination)

    if (waypoints) {
      url.searchParams.append('waypoints', waypoints)
    }

    url.searchParams.append('mode', 'driving')
    url.searchParams.append('departure_time', 'now')
    url.searchParams.append('traffic_model', 'best_guess')
    url.searchParams.append('key', apiKey)

    const response = await fetch(url.toString())
    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error('Directions API error:', error)
    return NextResponse.json({ error: 'Failed to fetch directions data' }, { status: 500 })
  }
}