import { NextRequest, NextResponse } from 'next/server'

interface OptimizeRouteRequest {
  origin: string
  destination: string
  permits: string[]  // All permits to optimize
  optimizeWaypoints?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const { origin, destination, permits, optimizeWaypoints = true }: OptimizeRouteRequest = await request.json()

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Maps API key not configured' },
        { status: 500 }
      )
    }

    // Build Google Directions API URL with proper waypoint optimization
    const baseUrl = 'https://maps.googleapis.com/maps/api/directions/json'

    // Handle different scenarios for waypoint optimization
    let waypointsParam = ''

    if (permits.length === 0) {
      // No permits to optimize, direct route
      waypointsParam = ''
    } else if (origin === destination) {
      // Round trip: optimize ALL permits as waypoints
      waypointsParam = optimizeWaypoints
        ? `optimize:true|${permits.join('|')}`
        : permits.join('|')
    } else {
      // Start to end with permits: optimize ALL permits as waypoints
      waypointsParam = optimizeWaypoints
        ? `optimize:true|${permits.join('|')}`
        : permits.join('|')
    }

    const params = new URLSearchParams({
      origin: origin,
      destination: destination,
      key: apiKey
    })

    if (waypointsParam) {
      params.set('waypoints', waypointsParam)
    }

    const response = await fetch(`${baseUrl}?${params}`)

    if (!response.ok) {
      throw new Error(`Google API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.status !== 'OK') {
      throw new Error(`Google API status: ${data.status}`)
    }

    // Extract optimized waypoint order
    const result = {
      status: data.status,
      waypoint_order: data.routes[0]?.waypoint_order || [],
      duration: data.routes[0]?.legs?.reduce((total: number, leg: any) => total + leg.duration.value, 0),
      distance: data.routes[0]?.legs?.reduce((total: number, leg: any) => total + leg.distance.value, 0)
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Route optimization error:', error)
    return NextResponse.json(
      { error: 'Failed to optimize route' },
      { status: 500 }
    )
  }
}