// Google Maps Route Optimization Utilities

interface Location {
  lat: number
  lng: number
  address?: string
}

interface Permit {
  id: string
  latitude: number
  longitude: number
  address: string
  priority_score?: number
}

// Get real driving distances using Google Maps Distance Matrix API
export async function getRealDistances(
  origin: Location,
  destinations: Permit[]
): Promise<Map<string, { distance: number; duration: number }>> {
  const distanceMap = new Map()

  // Google Maps Distance Matrix API allows max 25 destinations per request
  const batchSize = 25

  for (let i = 0; i < destinations.length; i += batchSize) {
    const batch = destinations.slice(i, i + batchSize)

    const origins = [`${origin.lat},${origin.lng}`]
    const dests = batch.map(d => `${d.latitude},${d.longitude}`)

    const url = new URL('/api/google-maps/distance-matrix', window.location.origin)
    url.searchParams.append('origins', origins.join('|'))
    url.searchParams.append('destinations', dests.join('|'))

    try {
      const response = await fetch(url.toString())
      const data = await response.json()

      if (data.status === 'OK') {
        data.rows[0].elements.forEach((element: any, index: number) => {
          if (element.status === 'OK') {
            distanceMap.set(batch[index].id, {
              distance: element.distance.value, // in meters
              duration: element.duration_in_traffic?.value || element.duration.value // in seconds
            })
          }
        })
      }
    } catch (error) {
      console.error('Distance Matrix API error:', error)
    }
  }

  return distanceMap
}

// Optimize route using Google Directions API with waypoint optimization
export async function optimizeRouteWithGoogle(
  origin: Location,
  permits: Permit[],
  returnToOrigin: boolean = true
): Promise<Permit[]> {
  if (permits.length === 0) return []
  if (permits.length === 1) return permits

  // Google Directions API allows max 25 waypoints
  const maxWaypoints = 23 // Leave room for origin and destination
  const routePermits = permits.slice(0, maxWaypoints)

  const url = new URL('/api/google-maps/directions', window.location.origin)
  url.searchParams.append('origin', `${origin.lat},${origin.lng}`)

  // If returning to origin, set it as destination, otherwise use last permit
  if (returnToOrigin) {
    url.searchParams.append('destination', `${origin.lat},${origin.lng}`)
  } else {
    const lastPermit = routePermits[routePermits.length - 1]
    url.searchParams.append('destination', `${lastPermit.latitude},${lastPermit.longitude}`)
    routePermits.pop() // Remove last permit from waypoints since it's the destination
  }

  // Add waypoints
  const waypoints = routePermits.map(p => `${p.latitude},${p.longitude}`).join('|')
  if (waypoints) {
    url.searchParams.append('waypoints', `optimize:true|${waypoints}`)
  }

  try {
    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.status === 'OK' && data.routes.length > 0) {
      const route = data.routes[0]

      // Get the optimized order from waypoint_order
      if (route.waypoint_order) {
        const optimizedPermits: Permit[] = []

        // Reorder permits based on Google's optimization
        route.waypoint_order.forEach((index: number) => {
          optimizedPermits.push(routePermits[index])
        })

        // If we had a destination permit, add it back at the end
        if (!returnToOrigin && permits.length > maxWaypoints - 1) {
          optimizedPermits.push(permits[permits.length - 1])
        }

        // Add any remaining permits that didn't fit in the optimization
        if (permits.length > maxWaypoints) {
          optimizedPermits.push(...permits.slice(maxWaypoints))
        }

        return optimizedPermits
      }
    }
  } catch (error) {
    console.error('Directions API error:', error)
  }

  // Fallback to original order if API fails
  return permits
}

// Smart route optimization combining distance and priority
export async function createOptimalRoute(
  startLocation: Location,
  permits: Permit[],
  returnToStart: boolean = true
): Promise<{
  permits: Permit[]
  totalDistance: number
  totalDuration: number
  legs?: Array<{ distance: number; duration: number }>
  routePolyline?: string
}> {
  if (permits.length === 0) {
    return {
      permits: [],
      totalDistance: 0,
      totalDuration: 0,
      legs: []
    }
  }

  // Build address list for permits
  const permitAddresses = permits.map((p: any) =>
    `${p.latitude},${p.longitude}`
  )

  // Determine destination
  const destination = returnToStart
    ? `${startLocation.lat},${startLocation.lng}`
    : permitAddresses[permitAddresses.length - 1]

  const waypoints = returnToStart ? permitAddresses : permitAddresses.slice(0, -1)

  try {
    // Use the server-side route optimization API
    const response = await fetch('/api/routes/optimize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        origin: `${startLocation.lat},${startLocation.lng}`,
        destination: destination,
        permits: waypoints,
        optimizeWaypoints: true
      })
    })

    if (!response.ok) throw new Error('Route optimization failed')

    const data = await response.json()

    if (data.error) throw new Error(data.error)

    // Reorder permits based on optimized waypoint order
    let optimizedPermits = permits
    if (data.waypoint_order && Array.isArray(data.waypoint_order)) {
      const orderedPermits: Permit[] = []
      data.waypoint_order.forEach((index: number) => {
        if (index < permits.length) {
          orderedPermits.push(permits[index])
        }
      })
      optimizedPermits = orderedPermits.length > 0 ? orderedPermits : permits
    }

    // Extract leg details
    const legs = data.legs || []

    return {
      permits: optimizedPermits,
      totalDistance: Math.round((data.distance || 0) / 1609.34), // Convert meters to miles
      totalDuration: Math.round((data.duration || 0) / 60), // Convert seconds to minutes
      legs: legs.map((leg: any) => ({
        distance: Math.round((leg.distance || 0) / 1609.34), // miles
        duration: Math.round((leg.duration || 0) / 60) // minutes
      }))
    }
  } catch (error) {
    console.error('Route optimization error:', error)

    // Fallback: return permits in original order with estimated times
    return {
      permits: permits,
      totalDistance: permits.length * 5, // Rough estimate: 5 miles per stop
      totalDuration: permits.length * 20, // Rough estimate: 20 minutes per stop
      legs: permits.map(() => ({ distance: 5, duration: 20 }))
    }
  }
}

// Get nearby cities based on a selected city
export async function getNearbyCities(city: string, radiusMiles: number = 10): Promise<string[]> {
  // This would ideally use a geocoding service to find nearby cities
  // For now, return a hardcoded list based on common MA/NH cities

  const cityProximity: { [key: string]: string[] } = {
    'Needham': ['Dedham', 'Newton', 'Wellesley', 'Dover', 'Westwood', 'Brookline'],
    'Boston': ['Cambridge', 'Somerville', 'Brookline', 'Chelsea', 'Revere', 'Quincy'],
    'Cambridge': ['Boston', 'Somerville', 'Arlington', 'Belmont', 'Watertown'],
    'Salem': ['Marblehead', 'Peabody', 'Lynn', 'Beverly', 'Danvers', 'Swampscott'],
    'Andover': ['North Andover', 'Lawrence', 'Methuen', 'Tewksbury', 'Wilmington'],
    // Add more as needed
  }

  return cityProximity[city] || []
}