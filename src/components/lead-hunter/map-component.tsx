"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, MarkerClusterer } from '@react-google-maps/api'

interface Permit {
  id: string
  address: string
  builder_name: string
  builder_phone?: string
  permit_type: 'residential' | 'commercial'
  status: 'new' | 'contacted' | 'converted_to_lead' | 'rejected' | 'hot' | 'cold' | 'visited' | 'not_visited'
  notes?: string
  latitude: number
  longitude: number
  created_at: string
}

interface MapComponentProps {
  permits: Permit[]
  selectedPermit: Permit | null
  onPermitSelect: (permit: Permit | null) => void
  onMapClick: (lat: number, lng: number) => void
  showUserLocation?: boolean
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '600px'
}

// Default center - Boston, MA area
const center = {
  lat: 42.3601,
  lng: -71.0589
}

// Optimize map options with memoization
const getMapOptions = (): google.maps.MapOptions => ({
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  gestureHandling: 'greedy', // Better mobile gesture handling
  zoomControlOptions: {
    position: typeof google !== 'undefined' ? google.maps.ControlPosition.RIGHT_BOTTOM : undefined
  },
  clickableIcons: false, // Prevent accidental clicks on POIs
})

// Clustering options for better performance with many markers
const clusterOptions = {
  gridSize: 50,
  maxZoom: 15,
  minimumClusterSize: 10,
  styles: [
    {
      url: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50">
          <circle cx="25" cy="25" r="22" fill="#3b82f6" opacity="0.8" stroke="#ffffff" stroke-width="3"/>
        </svg>
      `),
      height: 50,
      width: 50,
      textColor: '#ffffff',
      textSize: 14,
      fontWeight: 'bold',
    },
    {
      url: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60">
          <circle cx="30" cy="30" r="27" fill="#2563eb" opacity="0.8" stroke="#ffffff" stroke-width="3"/>
        </svg>
      `),
      height: 60,
      width: 60,
      textColor: '#ffffff',
      textSize: 15,
      fontWeight: 'bold',
    },
    {
      url: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="70" height="70">
          <circle cx="35" cy="35" r="32" fill="#1d4ed8" opacity="0.8" stroke="#ffffff" stroke-width="3"/>
        </svg>
      `),
      height: 70,
      width: 70,
      textColor: '#ffffff',
      textSize: 16,
      fontWeight: 'bold',
    },
  ],
}

export function MapComponent({
  permits,
  selectedPermit,
  onPermitSelect,
  onMapClick,
  showUserLocation = true
}: MapComponentProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [mapBounds, setMapBounds] = useState<google.maps.LatLngBounds | null>(null)

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places'], // Only load what we need
  })

  // Track bounds listener for cleanup
  const boundsListenerRef = useRef<google.maps.MapsEventListener | null>(null)
  const boundsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map)

    // Debounce bounds updates to reduce re-renders during pan/zoom
    boundsListenerRef.current = map.addListener('bounds_changed', () => {
      if (boundsTimeoutRef.current) {
        clearTimeout(boundsTimeoutRef.current)
      }

      boundsTimeoutRef.current = setTimeout(() => {
        const bounds = map.getBounds()
        if (bounds) {
          setMapBounds(bounds)
        }
      }, 300) // 300ms debounce
    })
  }, [])

  const onUnmount = useCallback(() => {
    // Cleanup listeners and timeouts
    if (boundsListenerRef.current) {
      google.maps.event.removeListener(boundsListenerRef.current)
    }
    if (boundsTimeoutRef.current) {
      clearTimeout(boundsTimeoutRef.current)
    }
    setMap(null)
  }, [])

  const handleMapClick = useCallback((event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const lat = event.latLng.lat()
      const lng = event.latLng.lng()
      onMapClick(lat, lng)
    }
  }, [onMapClick])

  // Memoize marker icon generation
  const getMarkerIcon = useCallback((permit: Permit) => {
    const colors = {
      new: '#10b981', // green
      contacted: '#f59e0b', // amber
      converted_to_lead: '#3b82f6', // blue
      rejected: '#ef4444', // red
      hot: '#ea580c', // orange fire color 🔥
      cold: '#64748b', // slate
      visited: '#a855f7', // purple
      not_visited: '#6b7280' // gray
    }

    // Return undefined if Google Maps isn't loaded yet
    if (typeof google === 'undefined') {
      return undefined
    }

    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: colors[permit.status],
      fillOpacity: 0.8,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      scale: 12, // Larger markers for easier mobile tapping
    }
  }, [])

  const getMarkerTitle = (permit: Permit) => {
    return `${permit.builder_name} - ${permit.address} (${permit.status})`
  }

  // Get user's current location
  const getUserLocation = useCallback(() => {
    if (!showUserLocation) return

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userPos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
        setUserLocation(userPos)
        setLocationError(null)

        // Optionally center map on user location
        if (map && permits.length === 0) {
          map.panTo(userPos)
        }
      },
      (error) => {
        let errorMessage = 'Failed to get location'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location unavailable'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out'
            break
        }
        setLocationError(errorMessage)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // Cache for 5 minutes
      }
    )
  }, [showUserLocation, map, permits.length])

  // Get user location when component mounts
  useEffect(() => {
    if (showUserLocation && isLoaded) {
      getUserLocation()
    }
  }, [showUserLocation, isLoaded, getUserLocation])

  // Get user location icon
  const getUserLocationIcon = () => {
    if (typeof google === 'undefined') return undefined

    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: '#4285f4', // Google blue
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 3,
      scale: 8,
    }
  }

  // Memoize valid permits (those with actual coordinates)
  const validPermits = useMemo(() => {
    return permits.filter((permit) => permit.latitude !== 0 || permit.longitude !== 0)
  }, [permits])

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-50">
        <div className="text-center p-8">
          <div className="text-red-500 text-lg mb-2">⚠️ Map Loading Error</div>
          <p className="text-slate-600 text-sm">Failed to load Google Maps</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full min-h-[600px] flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
          <p className="text-slate-600">Loading map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={11}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={handleMapClick}
        options={getMapOptions()}
      >
        {/* Marker Clustering for better performance */}
        <MarkerClusterer options={clusterOptions}>
          {(clusterer) => (
            <>
              {validPermits.map((permit) => (
                <Marker
                  key={permit.id}
                  position={{
                    lat: permit.latitude,
                    lng: permit.longitude
                  }}
                  icon={getMarkerIcon(permit)}
                  title={getMarkerTitle(permit)}
                  onClick={() => onPermitSelect(permit)}
                  clusterer={clusterer}
                />
              ))}
            </>
          )}
        </MarkerClusterer>

        {/* User Location Marker */}
        {userLocation && showUserLocation && (
          <Marker
            position={userLocation}
            icon={getUserLocationIcon()}
            title="Your Current Location"
            zIndex={1000} // Ensure it appears above other markers
          />
        )}

        {selectedPermit && (
          <InfoWindow
            position={{
              lat: selectedPermit.latitude,
              lng: selectedPermit.longitude
            }}
            onCloseClick={() => onPermitSelect(null)}
          >
            <div className="p-2 max-w-xs">
              <h3 className="font-bold text-sm mb-1">
                {selectedPermit.builder_name}
              </h3>
              <p className="text-xs text-gray-600 mb-1">
                {selectedPermit.address}
              </p>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  selectedPermit.status === 'new' ? 'bg-green-100 text-green-800' :
                  selectedPermit.status === 'contacted' ? 'bg-amber-100 text-amber-800' :
                  selectedPermit.status === 'converted_to_lead' ? 'bg-blue-100 text-blue-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {selectedPermit.status.replace('_', ' ')}
                </span>
                <span className={`px-2 py-1 rounded text-xs ${
                  selectedPermit.permit_type === 'residential' ?
                  'bg-gray-100 text-gray-700' : 'bg-purple-100 text-purple-700'
                }`}>
                  {selectedPermit.permit_type}
                </span>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  )
}