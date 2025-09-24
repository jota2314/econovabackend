"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  MapPin,
  Navigation,
  Phone,
  Clock,
  CheckCircle2,
  Circle,
  Route as RouteIcon,
  X,
  Building,
  Car,
  Play,
  Pause,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'

interface Permit {
  id: string
  address: string
  city?: string
  state?: string
  zip_code?: string
  builder_name: string
  builder_phone?: string
  latitude: number
  longitude: number
  status?: string
}

interface RouteStop {
  permit: Permit
  visited: boolean
  order: number
  estimatedTime?: number // minutes to this stop
  distance?: number // miles to this stop
}

interface ActiveRoute {
  id: string
  stops: RouteStop[]
  startAddress: string
  endAddress: string
  totalDistance: number
  totalTime: number // in minutes
  startedAt: string
  completedAt?: string
  currentStopIndex: number
}

interface RouteManagerProps {
  permits: Permit[]
  startAddress: string
  endAddress: string
  onClose: () => void
  onPermitStatusUpdate?: (permitId: string, status: string) => void
}

export function RouteManager({
  permits,
  startAddress,
  endAddress,
  onClose,
  onPermitStatusUpdate
}: RouteManagerProps) {
  const [activeRoute, setActiveRoute] = useState<ActiveRoute | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [expandedStop, setExpandedStop] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)

  // Load saved route from localStorage on mount
  useEffect(() => {
    const savedRoute = localStorage.getItem('activeRoute')
    if (savedRoute) {
      const route = JSON.parse(savedRoute)
      setActiveRoute(route)
    } else {
      // Create new route
      createOptimizedRoute()
    }
  }, [permits])

  // Save route to localStorage whenever it changes
  useEffect(() => {
    if (activeRoute) {
      localStorage.setItem('activeRoute', JSON.stringify(activeRoute))
    }
  }, [activeRoute])

  // Timer for tracking actual time spent
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1)
      }, 60000) // Update every minute
    }
    return () => clearInterval(interval)
  }, [isTimerRunning])

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959 // Earth radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  // Remove duplicate addresses and optimize route
  const optimizeRoute = (stops: Permit[]): Permit[] => {
    // Remove duplicates based on address
    const uniqueStops = stops.filter((stop, index, self) =>
      index === self.findIndex(s =>
        s.address.toLowerCase().trim() === stop.address.toLowerCase().trim() &&
        s.city?.toLowerCase() === stop.city?.toLowerCase()
      )
    )

    if (uniqueStops.length <= 2) return uniqueStops

    const optimized: Permit[] = []
    const remaining = [...uniqueStops]

    // Start with the first permit (closest to start point in real implementation)
    let current = remaining.shift()!
    optimized.push(current)

    while (remaining.length > 0) {
      let nearestIndex = 0
      let nearestDistance = Infinity

      // Find nearest unvisited stop
      for (let i = 0; i < remaining.length; i++) {
        const distance = calculateDistance(
          current.latitude,
          current.longitude,
          remaining[i].latitude,
          remaining[i].longitude
        )
        if (distance < nearestDistance) {
          nearestDistance = distance
          nearestIndex = i
        }
      }

      current = remaining[nearestIndex]
      optimized.push(current)
      remaining.splice(nearestIndex, 1)
    }

    return optimized
  }

  const createOptimizedRoute = async () => {
    setIsOptimizing(true)
    try {
      // Optimize the route order
      const optimizedPermits = optimizeRoute(permits)

      // Create route stops with estimated times
      const stops: RouteStop[] = optimizedPermits.map((permit, index) => {
        // Estimate 15 minutes per stop + 2 minutes per mile of driving
        const distance = index > 0
          ? calculateDistance(
              optimizedPermits[index - 1].latitude,
              optimizedPermits[index - 1].longitude,
              permit.latitude,
              permit.longitude
            )
          : 0

        return {
          permit,
          visited: false,
          order: index + 1,
          distance: Math.round(distance * 10) / 10,
          estimatedTime: Math.round(distance * 2 + 15) // 2 min/mile + 15 min per stop
        }
      })

      // Calculate total time and distance
      const totalDistance = stops.reduce((sum, stop) => sum + (stop.distance || 0), 0)
      const totalTime = stops.reduce((sum, stop) => sum + (stop.estimatedTime || 0), 0)

      const route: ActiveRoute = {
        id: `route-${Date.now()}`,
        stops,
        startAddress,
        endAddress,
        totalDistance: Math.round(totalDistance * 10) / 10,
        totalTime,
        startedAt: new Date().toISOString(),
        currentStopIndex: 0
      }

      setActiveRoute(route)
      toast.success(`Route optimized! ${stops.length} stops, ${Math.round(totalTime / 60 * 10) / 10} hours estimated`)
    } catch (error) {
      console.error('Error optimizing route:', error)
      toast.error('Failed to optimize route')
    } finally {
      setIsOptimizing(false)
    }
  }

  const markStopVisited = async (stopIndex: number) => {
    if (!activeRoute) return

    const updatedStops = [...activeRoute.stops]
    updatedStops[stopIndex].visited = true

    const updatedRoute = {
      ...activeRoute,
      stops: updatedStops,
      currentStopIndex: Math.min(stopIndex + 1, updatedStops.length - 1)
    }

    // Check if all stops are visited
    const allVisited = updatedStops.every(stop => stop.visited)
    if (allVisited) {
      updatedRoute.completedAt = new Date().toISOString()
      setIsTimerRunning(false)
      toast.success('🎉 Route completed! Great job!')
    }

    setActiveRoute(updatedRoute)

    // Update permit status in the database
    const permit = updatedStops[stopIndex].permit
    if (onPermitStatusUpdate) {
      onPermitStatusUpdate(permit.id, 'visited')
    }

    // Update via API
    try {
      await fetch(`/api/permits/${permit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'visited' })
      })
    } catch (error) {
      console.error('Error updating permit status:', error)
    }
  }

  const markStopUnvisited = (stopIndex: number) => {
    if (!activeRoute) return

    const updatedStops = [...activeRoute.stops]
    updatedStops[stopIndex].visited = false

    setActiveRoute({
      ...activeRoute,
      stops: updatedStops,
      completedAt: undefined
    })
  }

  const navigateToStop = (stop: RouteStop) => {
    const { permit } = stop
    const address = encodeURIComponent(
      `${permit.address}, ${permit.city || ''}, ${permit.state || 'MA'} ${permit.zip_code || ''}`
    )
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${address}`, '_blank')
  }

  const resetRoute = () => {
    if (!activeRoute) return

    const resetStops = activeRoute.stops.map(stop => ({
      ...stop,
      visited: false
    }))

    setActiveRoute({
      ...activeRoute,
      stops: resetStops,
      currentStopIndex: 0,
      completedAt: undefined
    })

    setElapsedTime(0)
    setIsTimerRunning(false)
    toast.info('Route progress reset')
  }

  const closeRoute = () => {
    if (activeRoute && !activeRoute.completedAt) {
      if (!confirm('You have an active route. Are you sure you want to close it?')) {
        return
      }
    }
    localStorage.removeItem('activeRoute')
    onClose()
  }

  if (isOptimizing) {
    return (
      <Card className="fixed inset-4 sm:inset-auto sm:right-4 sm:top-4 sm:w-96 sm:max-h-[90vh] z-50 bg-white shadow-2xl">
        <div className="p-6 flex flex-col items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
          <p className="text-lg font-medium">Optimizing your route...</p>
          <p className="text-sm text-slate-600 mt-2">Calculating the most efficient path</p>
        </div>
      </Card>
    )
  }

  if (!activeRoute) return null

  const visitedCount = activeRoute.stops.filter(s => s.visited).length
  const progress = (visitedCount / activeRoute.stops.length) * 100
  const estimatedHours = Math.floor(activeRoute.totalTime / 60)
  const estimatedMinutes = activeRoute.totalTime % 60

  return (
    <Card className="fixed inset-4 sm:inset-auto sm:right-4 sm:top-4 sm:w-[480px] sm:max-h-[90vh] z-50 bg-white shadow-2xl flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <RouteIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Active Route</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={closeRoute}
            className="text-slate-500 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {visitedCount} of {activeRoute.stops.length} completed
            </span>
            <span className="text-slate-600">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="text-center p-2 bg-white rounded border">
            <div className="text-xs text-slate-500">Distance</div>
            <div className="font-semibold text-sm">{activeRoute.totalDistance} mi</div>
          </div>
          <div className="text-center p-2 bg-white rounded border">
            <div className="text-xs text-slate-500">Est. Time</div>
            <div className="font-semibold text-sm">
              {estimatedHours > 0 && `${estimatedHours}h `}{estimatedMinutes}m
            </div>
          </div>
          <div className="text-center p-2 bg-white rounded border">
            <div className="text-xs text-slate-500">Actual</div>
            <div className="font-semibold text-sm">
              {Math.floor(elapsedTime / 60)}h {elapsedTime % 60}m
            </div>
          </div>
        </div>

        {/* Timer Controls */}
        <div className="flex items-center space-x-2 mt-3">
          <Button
            size="sm"
            variant={isTimerRunning ? "secondary" : "default"}
            onClick={() => setIsTimerRunning(!isTimerRunning)}
            className="flex-1"
          >
            {isTimerRunning ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Pause Timer
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Timer
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={resetRoute}
            title="Reset all progress"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stops List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activeRoute.stops.map((stop, index) => {
          const isExpanded = expandedStop === index
          const isCurrentStop = index === activeRoute.currentStopIndex && !stop.visited

          return (
            <Card
              key={`${stop.permit.id}-${index}`}
              className={`p-3 transition-all ${
                stop.visited
                  ? 'bg-green-50 border-green-200'
                  : isCurrentStop
                    ? 'bg-blue-50 border-blue-300 shadow-md'
                    : 'hover:shadow-md'
              }`}
            >
              <div className="space-y-2">
                {/* Stop Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <button
                      onClick={() => stop.visited ? markStopUnvisited(index) : markStopVisited(index)}
                      className="mt-0.5 transition-colors"
                    >
                      {stop.visited ? (
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                      ) : (
                        <Circle className="w-6 h-6 text-slate-400 hover:text-blue-600" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          Stop #{stop.order}
                        </Badge>
                        {isCurrentStop && (
                          <Badge className="text-xs bg-blue-600">
                            Current
                          </Badge>
                        )}
                        {stop.distance && (
                          <span className="text-xs text-slate-500">
                            {stop.distance} mi • {stop.estimatedTime} min
                          </span>
                        )}
                      </div>

                      <div className="font-medium text-sm truncate">
                        {stop.permit.address}
                      </div>
                      <div className="text-xs text-slate-600">
                        {stop.permit.city}, {stop.permit.state || 'MA'} {stop.permit.zip_code}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedStop(isExpanded ? null : index)}
                    className="p-1"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="pl-9 space-y-2 pt-2 border-t">
                    <div className="flex items-center space-x-2 text-sm">
                      <Building className="w-4 h-4 text-slate-500" />
                      <span className="font-medium">{stop.permit.builder_name}</span>
                    </div>

                    {stop.permit.builder_phone && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Phone className="w-4 h-4 text-slate-500" />
                        <span>{stop.permit.builder_phone}</span>
                      </div>
                    )}

                    <div className="flex items-center space-x-2 pt-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                        onClick={() => navigateToStop(stop)}
                      >
                        <Navigation className="w-4 h-4 mr-2" />
                        Navigate
                      </Button>

                      {stop.permit.builder_phone && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => window.open(`tel:${stop.permit.builder_phone}`)}
                        >
                          <Phone className="w-4 h-4 mr-2" />
                          Call
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-slate-50">
        <div className="text-center">
          {activeRoute.completedAt ? (
            <div className="space-y-2">
              <div className="text-green-600 font-semibold">
                🎉 Route Completed!
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={closeRoute}
                className="w-full"
              >
                Close Route
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-slate-600">
                Started at {new Date(activeRoute.startedAt).toLocaleTimeString()}
              </div>
              <div className="text-sm font-medium">
                {activeRoute.stops.length - visitedCount} stops remaining
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}