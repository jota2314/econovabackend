"use client"

import { useState, useEffect, useCallback } from 'react'
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api'

interface Permit {
  id: string
  address: string
  builder_name: string
  builder_phone?: string
  permit_type: 'residential' | 'commercial'
  status: 'new' | 'contacted' | 'converted_to_lead' | 'rejected'
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
}

const mapContainerStyle = {
  width: '100%',
  height: '100%'
}

// Default center - Boston, MA area
const center = {
  lat: 42.3601,
  lng: -71.0589
}

const getMapOptions = () => ({
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

export function MapComponent({ 
  permits, 
  selectedPermit, 
  onPermitSelect, 
  onMapClick 
}: MapComponentProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null)

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map)
  }, [])

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  const handleMapClick = useCallback((event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const lat = event.latLng.lat()
      const lng = event.latLng.lng()
      onMapClick(lat, lng)
    }
  }, [onMapClick])

  const getMarkerIcon = (permit: Permit) => {
    const colors = {
      new: '#10b981', // green
      contacted: '#f59e0b', // amber  
      converted_to_lead: '#3b82f6', // blue
      rejected: '#ef4444' // red
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
  }

  const getMarkerTitle = (permit: Permit) => {
    return `${permit.builder_name} - ${permit.address} (${permit.status})`
  }

  return (
    <div className="w-full h-full">
      <LoadScript 
        googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}
        libraries={['places']}
      >
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={11}
          onLoad={onLoad}
          onUnmount={onUnmount}
          onClick={handleMapClick}
          options={getMapOptions()}
        >
          {permits.map((permit) => (
            <Marker
              key={permit.id}
              position={{
                lat: permit.latitude,
                lng: permit.longitude
              }}
              icon={getMarkerIcon(permit)}
              title={getMarkerTitle(permit)}
              onClick={() => onPermitSelect(permit)}
            />
          ))}

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
      </LoadScript>
    </div>
  )
}