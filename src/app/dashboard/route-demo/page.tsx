"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { RouteManager } from '@/components/lead-hunter/route-manager'
import { MapPin, Route as RouteIcon } from 'lucide-react'

export default function RouteDemoPage() {
  const [showRoute, setShowRoute] = useState(false)

  // Sample Salisbury permits for demo
  const samplePermits = [
    {
      id: '1',
      address: '195 Atlantic Avenue',
      city: 'Salisbury',
      state: 'MA',
      zip_code: '01952',
      builder_name: 'Unknown Builder',
      builder_phone: '978-555-0001',
      latitude: 42.8584,
      longitude: -70.8618
    },
    {
      id: '2',
      address: '15 Lincoln Avenue',
      city: 'Salisbury',
      state: 'MA',
      zip_code: '01952',
      builder_name: 'North Shore Builders',
      builder_phone: '978-555-0002',
      latitude: 42.8434,
      longitude: -70.8528
    },
    {
      id: '3',
      address: '159 Beach Road',
      city: 'Salisbury',
      state: 'MA',
      zip_code: '01952',
      builder_name: 'Mitchell Construction',
      builder_phone: '978-555-0003',
      latitude: 42.8754,
      longitude: -70.8148
    },
    {
      id: '4',
      address: '238 Lafayette Road',
      city: 'Salisbury',
      state: 'MA',
      zip_code: '01952',
      builder_name: 'Patrick Homes',
      builder_phone: '978-555-0004',
      latitude: 42.8601,
      longitude: -70.8411
    },
    {
      id: '5',
      address: '76 North End Boulevard',
      city: 'Salisbury',
      state: 'MA',
      zip_code: '01952',
      builder_name: 'Unknown Builder',
      latitude: 42.8799,
      longitude: -70.8189
    }
  ]

  return (
    <div className="p-6 space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Route Manager Demo</h1>
              <p className="text-gray-600 mt-2">
                This demonstrates the in-app route checklist system for managing property visits
              </p>
            </div>
            <MapPin className="w-8 h-8 text-blue-600" />
          </div>

          <div className="bg-blue-50 p-4 rounded-lg space-y-2">
            <h3 className="font-semibold text-blue-900">How it works:</h3>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• Route shows all stops in optimized order</li>
              <li>• Click "Navigate" on each stop to open just that address in Google Maps</li>
              <li>• Check off stops as you visit them</li>
              <li>• See total estimated time for the full route</li>
              <li>• Route saves automatically and persists across sessions</li>
            </ul>
          </div>

          <Button
            onClick={() => setShowRoute(true)}
            size="lg"
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <RouteIcon className="w-5 h-5 mr-2" />
            Open Route Manager (5 Salisbury Stops)
          </Button>
        </div>
      </Card>

      {showRoute && (
        <RouteManager
          permits={samplePermits}
          startAddress="Current Location, Salisbury, MA"
          endAddress="Current Location, Salisbury, MA"
          onClose={() => setShowRoute(false)}
        />
      )}
    </div>
  )
}