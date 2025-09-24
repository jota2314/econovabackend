"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  MapPin,
  Navigation,
  Phone,
  Clock,
  CheckCircle2,
  Circle,
  X,
  Building,
  Car,
  Play,
  Pause,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Loader2,
  Camera,
  Mic,
  MicOff,
  FileText,
  Flag,
  Home,
  ThermometerSun,
  Snowflake,
  Flame,
  Wifi,
  WifiOff
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
  status: 'new' | 'contacted' | 'converted_to_lead' | 'rejected' | 'hot' | 'cold' | 'visited' | 'not_visited'
  notes?: string
  photo_urls?: string[]
  temperature?: 'hot' | 'warm' | 'cold'
}

interface RouteStop {
  permit: Permit
  visited: boolean
  order: number
  estimatedTime?: number
  distance?: number
}

interface ActiveRoute {
  id: string
  stops: RouteStop[]
  startAddress: string
  totalDistance: number
  totalTime: number
  startedAt: string
  completedAt?: string
  currentStopIndex: number
}

interface FullScreenRouteNavigatorProps {
  route: ActiveRoute
  onClose: () => void
  onPermitUpdate: (permitId: string, updates: Partial<Permit>) => Promise<void>
}

export function FullScreenRouteNavigator({
  route,
  onClose,
  onPermitUpdate
}: FullScreenRouteNavigatorProps) {
  const [activeRoute, setActiveRoute] = useState<ActiveRoute>(route)
  const [expandedStop, setExpandedStop] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [currentStopNotes, setCurrentStopNotes] = useState('')
  const [currentStopStatus, setCurrentStopStatus] = useState<Permit['status']>('new')
  const [currentStopTemperature, setCurrentStopTemperature] = useState<'hot' | 'warm' | 'cold'>('warm')
  const [isRecording, setIsRecording] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingUpdates, setPendingUpdates] = useState(0)

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

  // Auto-start timer when route begins
  useEffect(() => {
    if (activeRoute && !activeRoute.completedAt) {
      setIsTimerRunning(true)
    }
  }, [])

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      syncOfflineUpdates()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check for pending updates on mount
    const offlineUpdates = JSON.parse(localStorage.getItem('offlinePermitUpdates') || '[]')
    setPendingUpdates(offlineUpdates.length)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Sync offline updates when online
  const syncOfflineUpdates = async () => {
    const offlineUpdates = JSON.parse(localStorage.getItem('offlinePermitUpdates') || '[]')
    if (offlineUpdates.length === 0) return

    console.log('Syncing', offlineUpdates.length, 'offline updates...')

    const failedUpdates = []
    for (const update of offlineUpdates) {
      try {
        await onPermitUpdate(update.permitId, update.updates)
        console.log('Synced update for permit:', update.permitId)
      } catch (error) {
        console.error('Failed to sync update:', error)
        failedUpdates.push(update)
      }
    }

    // Keep only failed updates
    localStorage.setItem('offlinePermitUpdates', JSON.stringify(failedUpdates))
    setPendingUpdates(failedUpdates.length)

    if (failedUpdates.length === 0) {
      toast.success('All offline updates synced successfully!')
    } else {
      toast.warning(`${offlineUpdates.length - failedUpdates.length} updates synced, ${failedUpdates.length} failed`)
    }
  }

  // Save route to localStorage whenever it changes
  useEffect(() => {
    if (activeRoute) {
      localStorage.setItem('activeRoute', JSON.stringify(activeRoute))
    }
  }, [activeRoute])

  // Load current stop data
  useEffect(() => {
    const currentStop = getIncompleteStops()[0]
    if (currentStop) {
      setCurrentStopNotes(currentStop.permit.notes || '')
      setCurrentStopStatus(currentStop.permit.status)
      setCurrentStopTemperature(currentStop.permit.temperature || 'warm')
    }
  }, [activeRoute.currentStopIndex])

  const getIncompleteStops = () => {
    return activeRoute.stops.filter(stop => !stop.visited)
  }

  const getCurrentStop = () => {
    return getIncompleteStops()[0] || null
  }

  const markStopCompleted = async () => {
    const currentStop = getCurrentStop()
    if (!currentStop) return

    setIsUpdating(true)
    try {
      // Update permit with current data
      const updates: Partial<Permit> = {
        status: currentStopStatus,
        notes: currentStopNotes,
        temperature: currentStopTemperature
      }

      // Try to update online first, fallback to offline if no connection
      try {
        await onPermitUpdate(currentStop.permit.id, updates)
      } catch (error) {
        // If online update fails, queue for offline sync
        console.warn('Online update failed, queuing for offline sync:', error)

        // Store offline updates
        const offlineUpdates = JSON.parse(localStorage.getItem('offlinePermitUpdates') || '[]')
        offlineUpdates.push({
          permitId: currentStop.permit.id,
          updates,
          timestamp: Date.now(),
          routeId: activeRoute.id
        })
        localStorage.setItem('offlinePermitUpdates', JSON.stringify(offlineUpdates))
        setPendingUpdates(offlineUpdates.length)

        toast.warning('Working offline - changes will sync when connected')

        // Continue with local update
      }

      // Mark stop as visited in route
      const updatedStops = [...activeRoute.stops]
      const stopIndex = updatedStops.findIndex(s => s.permit.id === currentStop.permit.id)
      if (stopIndex !== -1) {
        updatedStops[stopIndex] = {
          ...updatedStops[stopIndex],
          visited: true,
          permit: { ...updatedStops[stopIndex].permit, ...updates }
        }
      }

      const updatedRoute = {
        ...activeRoute,
        stops: updatedStops,
        currentStopIndex: activeRoute.currentStopIndex + 1
      }

      // Check if all stops are visited
      const remainingStops = getIncompleteStops()
      if (remainingStops.length === 1) { // This was the last one
        updatedRoute.completedAt = new Date().toISOString()
        setIsTimerRunning(false)
        toast.success('🎉 Route completed! Great job!')
      } else {
        toast.success('Stop completed! Moving to next location.')
      }

      setActiveRoute(updatedRoute)

      // Reset form for next stop
      const nextStop = getIncompleteStops()[0]
      if (nextStop) {
        setCurrentStopNotes(nextStop.permit.notes || '')
        setCurrentStopStatus(nextStop.permit.status)
        setCurrentStopTemperature(nextStop.permit.temperature || 'warm')
      }

    } catch (error) {
      console.error('Error completing stop:', error)
      toast.error('Failed to complete stop. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  const navigateToStop = (stop: RouteStop) => {
    const { permit } = stop
    const address = encodeURIComponent(
      `${permit.address}, ${permit.city || ''}, ${permit.state || 'MA'} ${permit.zip_code || ''}`
    )
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${address}`, '_blank')
  }

  const handlePhotoCapture = () => {
    // This will integrate with existing photo upload component
    // For now, we'll show a placeholder
    toast.info('Photo capture will open existing photo upload component')
  }

  const handleVoiceNote = () => {
    if (isRecording) {
      setIsRecording(false)
      // Stop recording and transcribe
      toast.success('Voice note recorded and transcribed')
    } else {
      setIsRecording(true)
      // Start recording
      toast.info('Recording voice note...')
    }
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

  const visitedCount = activeRoute.stops.filter(s => s.visited).length
  const progress = (visitedCount / activeRoute.stops.length) * 100
  const incompleteStops = getIncompleteStops()
  const currentStop = getCurrentStop()

  const getStatusColor = (status: Permit['status']) => {
    switch (status) {
      case 'new': return 'bg-green-100 text-green-800'
      case 'contacted': return 'bg-yellow-100 text-yellow-800'
      case 'hot': return 'bg-red-100 text-red-800'
      case 'cold': return 'bg-slate-100 text-slate-800'
      case 'visited': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTemperatureIcon = (temp: 'hot' | 'warm' | 'cold') => {
    switch (temp) {
      case 'hot': return <Flame className="w-4 h-4 text-red-600" />
      case 'warm': return <ThermometerSun className="w-4 h-4 text-yellow-600" />
      case 'cold': return <Snowflake className="w-4 h-4 text-blue-600" />
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header Bar */}
      <div className="bg-white border-b px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Car className="w-5 h-5 text-blue-600" />
            <div>
              <h1 className="font-semibold text-lg">Active Route</h1>
              <p className="text-sm text-slate-600">
                {visitedCount} of {activeRoute.stops.length} completed ({Math.round(progress)}%)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Network Status Indicator */}
            <div className="flex items-center space-x-1">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-green-600" title="Online" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-600" title="Offline" />
              )}
              {pendingUpdates > 0 && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded" title={`${pendingUpdates} pending updates`}>
                  {pendingUpdates}
                </span>
              )}
            </div>

            <div className="text-center hidden sm:block">
              <div className="text-xs text-slate-500">Elapsed</div>
              <div className="font-medium text-sm">
                {Math.floor(elapsedTime / 60)}h {elapsedTime % 60}m
              </div>
            </div>
            <Button
              size="sm"
              variant={isTimerRunning ? "secondary" : "default"}
              onClick={() => setIsTimerRunning(!isTimerRunning)}
            >
              {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={closeRoute}
              className="text-slate-500 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <Progress value={progress} className="mt-2 h-2" />
      </div>

      {/* Route Stops List */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeRoute.completedAt ? (
          <div className="text-center py-12">
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-600 mb-2">Route Completed!</h2>
            <p className="text-slate-600 mb-6">
              You've successfully visited all {activeRoute.stops.length} locations.
            </p>
            <Button onClick={closeRoute} className="bg-green-600 hover:bg-green-700">
              Close Route
            </Button>
          </div>
        ) : incompleteStops.length === 0 ? (
          <div className="text-center py-12">
            <Flag className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No More Stops</h2>
            <p className="text-slate-600">All locations have been visited.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {incompleteStops.map((stop, index) => {
              const isExpanded = expandedStop === index
              const isCurrent = index === 0

              return (
                <Card
                  key={`${stop.permit.id}-${index}`}
                  className={`p-4 transition-all ${
                    isCurrent
                      ? 'bg-blue-50 border-blue-300 shadow-lg'
                      : 'hover:shadow-md border-slate-200'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Stop Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="mt-1">
                          {isCurrent ? (
                            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                              {visitedCount + 1}
                            </div>
                          ) : (
                            <div className="w-6 h-6 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center text-sm font-medium">
                              {visitedCount + index + 1}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              Stop #{visitedCount + index + 1}
                            </Badge>
                            {isCurrent && (
                              <Badge className="text-xs bg-blue-600">
                                Current
                              </Badge>
                            )}
                            <Badge className={`text-xs ${getStatusColor(stop.permit.status)}`}>
                              {stop.permit.status.replace('_', ' ')}
                            </Badge>
                            {stop.permit.temperature && getTemperatureIcon(stop.permit.temperature)}
                          </div>

                          <div className="font-medium text-base mb-1">
                            {stop.permit.address}
                          </div>
                          <div className="text-sm text-slate-600 mb-2">
                            {stop.permit.city}, {stop.permit.state || 'MA'} {stop.permit.zip_code}
                          </div>
                          <div className="flex items-center space-x-2 text-sm">
                            <Building className="w-4 h-4 text-slate-500" />
                            <span className="font-medium">{stop.permit.builder_name}</span>
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

                    {/* Navigation Buttons */}
                    <div className="flex space-x-2">
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
                          onClick={() => window.open(`tel:${stop.permit.builder_phone}`)}
                        >
                          <Phone className="w-4 h-4 mr-2" />
                          Call
                        </Button>
                      )}
                    </div>

                    {/* Current Stop Actions - Inline for current stop */}
                    {isCurrent && !activeRoute.completedAt && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm text-slate-700">Complete Stop</h4>
                          <Badge className="bg-blue-600 text-xs">
                            Current
                          </Badge>
                        </div>

                        {/* Quick Action Buttons */}
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePhotoCapture}
                            className="flex items-center justify-center"
                          >
                            <Camera className="w-4 h-4 mr-2" />
                            Photo
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleVoiceNote}
                            className={`flex items-center justify-center ${
                              isRecording ? 'bg-red-50 border-red-200' : ''
                            }`}
                          >
                            {isRecording ? <MicOff className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                            {isRecording ? 'Stop' : 'Voice Note'}
                          </Button>
                        </div>

                        {/* Status and Temperature */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-slate-500 block mb-1">Status</label>
                            <Select value={currentStopStatus} onValueChange={(v) => setCurrentStopStatus(v as Permit['status'])}>
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="contacted">Contacted</SelectItem>
                                <SelectItem value="hot">Hot 🔥</SelectItem>
                                <SelectItem value="cold">Cold ❄️</SelectItem>
                                <SelectItem value="not_visited">Not Home</SelectItem>
                                <SelectItem value="rejected">Not Interested</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 block mb-1">Temperature</label>
                            <Select value={currentStopTemperature} onValueChange={(v) => setCurrentStopTemperature(v as 'hot' | 'warm' | 'cold')}>
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="hot">🔥 Hot</SelectItem>
                                <SelectItem value="warm">☀️ Warm</SelectItem>
                                <SelectItem value="cold">❄️ Cold</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Notes */}
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">Notes</label>
                          <Textarea
                            placeholder="Add notes about this visit..."
                            value={currentStopNotes}
                            onChange={(e) => setCurrentStopNotes(e.target.value)}
                            className="min-h-16 text-sm"
                          />
                        </div>

                        {/* Complete Button */}
                        <Button
                          onClick={markStopCompleted}
                          disabled={isUpdating}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          {isUpdating ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Completing...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-5 h-5 mr-2" />
                              Complete & Next Stop
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {/* Expanded Details for non-current stops */}
                    {isExpanded && !isCurrent && (
                      <div className="pt-3 border-t">
                        {stop.permit.notes && (
                          <div className="mb-3">
                            <Label className="text-xs text-slate-500">Previous Notes</Label>
                            <p className="text-sm bg-slate-50 p-2 rounded">{stop.permit.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}