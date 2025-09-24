"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RouteManager } from './route-manager'
import {
  Brain,
  MapPin,
  Building,
  Phone,
  Clock,
  TrendingUp,
  Star,
  Navigation,
  RefreshCw,
  Loader2,
  ExternalLink,
  Target,
  Calendar,
  Award,
  Route,
  CheckSquare,
  Square
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
  permit_type: 'residential' | 'commercial'
  status: 'new' | 'contacted' | 'converted_to_lead' | 'rejected' | 'hot' | 'cold' | 'visited' | 'not_visited'
  notes?: string
  latitude: number
  longitude: number
}

interface VisitRecommendation {
  permitId: string
  priority: 'high' | 'medium' | 'low'
  score: number
  reasons: string[]
  recommendedAction: string
  timeOfDay: 'morning' | 'afternoon' | 'evening'
  permit: Permit
}

interface RecommendationSummary {
  totalAnalyzed: number
  highPriority: number
  mediumPriority: number
  lowPriority: number
  dailyGoal: string
}

interface VisitRecommendationsProps {
  onPermitSelect?: (permit: Permit) => void
  zoneFilter?: {
    state?: 'MA' | 'NH'
    county?: string
    cities?: string[]
  }
}

export function VisitRecommendations({ onPermitSelect, zoneFilter }: VisitRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<VisitRecommendation[]>([])
  const [summary, setSummary] = useState<RecommendationSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [generatedAt, setGeneratedAt] = useState<string>('')
  const [selectedRecommendations, setSelectedRecommendations] = useState<Set<string>>(new Set())
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false)
  const [hasInitiallyFetched, setHasInitiallyFetched] = useState(false)
  // Store the filter that was used for the current recommendations
  const [appliedFilter, setAppliedFilter] = useState<typeof zoneFilter>({})

  // Route Manager state
  const [showRouteManager, setShowRouteManager] = useState(false)
  const [activeRoutePermits, setActiveRoutePermits] = useState<Permit[]>([])
  const [routeStartAddress, setRouteStartAddress] = useState('')
  const [routeEndAddress, setRouteEndAddress] = useState('')

  // Route planning dialog state
  const [isRoutePlannerOpen, setIsRoutePlannerOpen] = useState(false)
  const [startPointType, setStartPointType] = useState<'current' | 'first' | 'custom'>('current')
  const [customStartAddress, setCustomStartAddress] = useState('')
  const [endPointType, setEndPointType] = useState<'last' | 'start' | 'custom'>('last')
  const [customEndAddress, setCustomEndAddress] = useState('')

  // Geolocation state
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  // Geolocation functions
  const getCurrentLocation = async (): Promise<{lat: number, lng: number}> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          let errorMessage = 'Location access denied'
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user'
              break
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable'
              break
            case error.TIMEOUT:
              errorMessage = 'Location request timed out'
              break
          }
          reject(new Error(errorMessage))
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // Cache for 5 minutes
        }
      )
    })
  }

  const handleGetCurrentLocation = async () => {
    setIsGettingLocation(true)
    setLocationError(null)

    try {
      const location = await getCurrentLocation()
      setCurrentLocation(location)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get location'
      setLocationError(errorMessage)
    } finally {
      setIsGettingLocation(false)
    }
  }

  const fetchRecommendations = async (filterToUse?: typeof zoneFilter) => {
    setIsLoading(true)
    // Use provided filter or the last applied filter
    const currentFilter = filterToUse !== undefined ? filterToUse : appliedFilter

    console.log('fetchRecommendations called with filter:', currentFilter)
    console.log('Current zoneFilter prop:', zoneFilter)

    try {
      // Build query parameters for location filtering based on currentFilter
      let url = '/api/permits/recommendations?'
      const params = new URLSearchParams()

      if (currentFilter?.cities && currentFilter.cities.length > 0) {
        params.append('cities', currentFilter.cities.join(','))
      }

      url += params.toString()
      console.log('Fetching URL:', url)

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations')
      }

      const data = await response.json()

      if (data.success) {
        console.log('Received recommendations:', data.recommendations?.length, 'items')
        console.log('First few recommendations:', data.recommendations?.slice(0, 3).map((r: any) => r.permit?.city))
        setRecommendations(data.recommendations || [])
        setSummary(data.summary || null)
        setGeneratedAt(data.generatedAt || '')
        setHasInitiallyFetched(true)
        // Store the filter that was actually used for these recommendations
        setAppliedFilter(currentFilter)
        const locationText = currentFilter?.cities && currentFilter.cities.length > 0
          ? `${currentFilter.cities.length} selected cities`
          : currentFilter?.county
          ? currentFilter.county
          : 'all locations'
        toast.success(`Generated ${data.recommendations?.length || 0} visit recommendations for ${locationText}`)
      } else {
        throw new Error(data.error || 'Failed to generate recommendations')
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error)
      toast.error('Failed to load visit recommendations')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Only fetch once on initial mount with the current zoneFilter
    if (!hasInitiallyFetched) {
      fetchRecommendations(zoneFilter)
    }
  }, []) // Empty dependency array - only run once on mount

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <Star className="w-4 h-4" />
      case 'medium': return <TrendingUp className="w-4 h-4" />
      case 'low': return <Target className="w-4 h-4" />
      default: return <Target className="w-4 h-4" />
    }
  }

  const getTimeIcon = (timeOfDay: string) => {
    switch (timeOfDay) {
      case 'morning': return '🌅'
      case 'afternoon': return '☀️'
      case 'evening': return '🌆'
      default: return '⏰'
    }
  }

  const getGoogleMapsUrl = (permit: Permit) => {
    return `https://www.google.com/maps?q=${permit.latitude},${permit.longitude}`
  }

  const formatAddress = (permit: Permit) => {
    return [permit.address, permit.city, permit.state, permit.zip_code]
      .filter(Boolean)
      .join(', ')
  }

  const toggleRecommendationSelection = (permitId: string) => {
    setSelectedRecommendations(prev => {
      const newSet = new Set(prev)
      if (newSet.has(permitId)) {
        newSet.delete(permitId)
      } else {
        newSet.add(permitId)
      }
      return newSet
    })
  }

  const selectAllRecommendations = () => {
    setSelectedRecommendations(new Set(recommendations.map(rec => rec.permitId)))
  }

  const clearAllSelections = () => {
    setSelectedRecommendations(new Set())
  }

  const handleCreateRoute = async () => {
    const selectedPermits = recommendations
      .filter(rec => selectedRecommendations.has(rec.permitId))
      .map(rec => rec.permit)

    try {
      // Determine actual start and end locations based on UI selections
      let actualStartLocation: string
      let actualEndLocation: string

      // Handle start location
      if (startPointType === 'current') {
        if (currentLocation) {
          actualStartLocation = `${currentLocation.lat},${currentLocation.lng}`
        } else {
          // Try to get location if not already available
          try {
            const location = await getCurrentLocation()
            setCurrentLocation(location)
            actualStartLocation = `${location.lat},${location.lng}`
          } catch (error) {
            console.warn('Failed to get current location, using business address:', error)
            actualStartLocation = 'Wilmington, MA 01887' // Fallback to business location
          }
        }
      } else if (startPointType === 'first' && selectedPermits.length > 0) {
        const firstPermit = selectedPermits[0]
        actualStartLocation = `${firstPermit.address}, ${firstPermit.city || ''}, ${firstPermit.state || 'MA'} ${firstPermit.zip_code || ''}`
      } else if (startPointType === 'custom' && customStartAddress) {
        actualStartLocation = customStartAddress.trim()
      } else {
        // Try to get current location as fallback
        try {
          const location = await getCurrentLocation()
          setCurrentLocation(location)
          actualStartLocation = `${location.lat},${location.lng}`
        } catch (error) {
          console.warn('Failed to get current location, using business address:', error)
          actualStartLocation = 'Wilmington, MA 01887' // Final fallback to business location
        }
      }

      // Handle end location
      if (endPointType === 'start') {
        // Round trip - same as start
        actualEndLocation = actualStartLocation
      } else if (endPointType === 'last' && selectedPermits.length > 0) {
        const lastPermit = selectedPermits[selectedPermits.length - 1]
        actualEndLocation = `${lastPermit.address}, ${lastPermit.city || ''}, ${lastPermit.state || 'MA'} ${lastPermit.zip_code || ''}`
      } else if (endPointType === 'custom' && customEndAddress) {
        actualEndLocation = customEndAddress.trim()
      } else {
        actualEndLocation = actualStartLocation // Fallback to round trip
      }

      // Set the route data and show the RouteManager
      setActiveRoutePermits(selectedPermits)
      setRouteStartAddress(actualStartLocation)
      setRouteEndAddress(actualEndLocation)
      setShowRouteManager(true)
      setIsRoutePlannerOpen(false)

      toast.success(`Route created with ${selectedPermits.length} stops! Use the route checklist to track your progress.`)
    } catch (error) {
      console.error('Error creating route:', error)
      toast.error('Failed to create route')
    }
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-slate-600">Analyzing permits and generating AI recommendations...</span>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-4 sm:p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <Brain className="w-6 h-6 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900">AI Visit Recommendations</h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Smart recommendations for today's highest-priority visits
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end sm:justify-start">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchRecommendations(zoneFilter)}
              disabled={isLoading}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <RefreshCw className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Selection and Route Controls - Stack on mobile */}
        {recommendations.length > 0 && (
          <div className="mt-4 p-3 sm:p-4 bg-white rounded-lg border border-blue-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <div className="text-sm font-medium text-slate-700">
                  {selectedRecommendations.size > 0 ? (
                    <span className="text-blue-600">
                      {selectedRecommendations.size} selected
                    </span>
                  ) : (
                    <span className="text-xs sm:text-sm">Select properties to calculate route</span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllRecommendations}
                    className="text-xs flex-1 sm:flex-none"
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllSelections}
                    disabled={selectedRecommendations.size === 0}
                    className="text-xs flex-1 sm:flex-none"
                  >
                    Clear
                  </Button>
                </div>
              </div>
              <Dialog open={isRoutePlannerOpen} onOpenChange={setIsRoutePlannerOpen}>
                <DialogTrigger asChild>
                  <Button
                    disabled={selectedRecommendations.size < 2}
                    className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                    size="sm"
                  >
                    <Route className="w-4 h-4 mr-2" />
                    <span className="text-xs sm:text-sm">Calculate Route</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Plan Your Route</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-6 py-4">
                    {/* Starting Point */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Starting Point</Label>
                      <RadioGroup value={startPointType} onValueChange={(value: any) => setStartPointType(value)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="current" id="start-current" />
                            <Label htmlFor="start-current" className="font-normal cursor-pointer">
                              My Current Location
                            </Label>
                            {currentLocation && (
                              <Badge variant="secondary" className="text-xs">✓ Located</Badge>
                            )}
                            {locationError && (
                              <Badge variant="destructive" className="text-xs">Permission denied</Badge>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleGetCurrentLocation}
                            disabled={isGettingLocation}
                            className="ml-2"
                          >
                            {isGettingLocation ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Target className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                        {(() => {
                          const selectedPermits = recommendations
                            .filter(rec => selectedRecommendations.has(rec.permitId))
                            .map(rec => rec.permit)
                          const firstPermit = selectedPermits[0]
                          return firstPermit ? (
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="first" id="start-first" />
                              <Label htmlFor="start-first" className="font-normal cursor-pointer">
                                First Permit ({firstPermit.address}, {firstPermit.city})
                              </Label>
                            </div>
                          ) : null
                        })()}
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="custom" id="start-custom" />
                          <Label htmlFor="start-custom" className="font-normal cursor-pointer">
                            Custom Address
                          </Label>
                        </div>
                      </RadioGroup>
                      {startPointType === 'custom' && (
                        <Input
                          placeholder="Enter starting address..."
                          value={customStartAddress}
                          onChange={(e) => setCustomStartAddress(e.target.value)}
                          className="mt-2"
                        />
                      )}
                    </div>

                    {/* Ending Point */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Ending Point</Label>
                      <RadioGroup value={endPointType} onValueChange={(value: any) => setEndPointType(value)}>
                        {(() => {
                          const selectedPermits = recommendations
                            .filter(rec => selectedRecommendations.has(rec.permitId))
                            .map(rec => rec.permit)
                          const lastPermit = selectedPermits[selectedPermits.length - 1]
                          return lastPermit ? (
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="last" id="end-last" />
                              <Label htmlFor="end-last" className="font-normal cursor-pointer">
                                Last Permit ({lastPermit.address}, {lastPermit.city})
                              </Label>
                            </div>
                          ) : null
                        })()}
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="start" id="end-start" />
                          <Label htmlFor="end-start" className="font-normal cursor-pointer">
                            Return to Starting Point
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="custom" id="end-custom" />
                          <Label htmlFor="end-custom" className="font-normal cursor-pointer">
                            Custom Address
                          </Label>
                        </div>
                      </RadioGroup>
                      {endPointType === 'custom' && (
                        <Input
                          placeholder="Enter ending address..."
                          value={customEndAddress}
                          onChange={(e) => setCustomEndAddress(e.target.value)}
                          className="mt-2"
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsRoutePlannerOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateRoute}
                      className="bg-orange-600 hover:bg-orange-700"
                      disabled={
                        (startPointType === 'custom' && !customStartAddress) ||
                        (endPointType === 'custom' && !customEndAddress)
                      }
                    >
                      <Route className="w-4 h-4 mr-2" />
                      Create Route
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}

        {/* Active Filter Display */}
        {zoneFilter && (zoneFilter.cities?.length || zoneFilter.county) && (
          <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-yellow-600" />
                <h3 className="text-sm font-semibold text-yellow-800">Active Filter</h3>
                <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700">
                  {zoneFilter.cities?.length
                    ? `${zoneFilter.cities.length} cities selected`
                    : zoneFilter.county
                    ? zoneFilter.county
                    : 'All locations'
                  }
                </Badge>
              </div>
              <span className="text-xs text-yellow-600">
                Routes optimized to stay under 4 hours
              </span>
            </div>
          </div>
        )}

        {/* Summary Stats - 2x2 grid on mobile, 1x4 on desktop */}
        {summary && (
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="text-center p-2 sm:p-3 bg-white rounded-lg border">
              <div className="text-xl sm:text-2xl font-bold text-slate-900">{summary.totalAnalyzed}</div>
              <div className="text-xs text-slate-600">Total Analyzed</div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-white rounded-lg border">
              <div className="text-xl sm:text-2xl font-bold text-red-600">{summary.highPriority}</div>
              <div className="text-xs text-slate-600">High Priority</div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-white rounded-lg border">
              <div className="text-xl sm:text-2xl font-bold text-yellow-600">{summary.mediumPriority}</div>
              <div className="text-xs text-slate-600">Medium Priority</div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-white rounded-lg border">
              <div className="text-xl sm:text-2xl font-bold text-green-600">{summary.lowPriority}</div>
              <div className="text-xs text-slate-600">Low Priority</div>
            </div>
          </div>
        )}

        {/* Daily Goal */}
        {summary?.dailyGoal && (
          <div className="mt-4 p-4 bg-blue-100 rounded-lg">
            <div className="flex items-center space-x-2">
              <Award className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800">Today's Strategy:</span>
            </div>
            <p className="mt-1 text-sm text-blue-700">{summary.dailyGoal}</p>
          </div>
        )}
      </Card>

      {/* Recommendations List */}
      {recommendations.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-slate-400 mb-2">
            <Brain className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-slate-600 mb-2">No Recommendations Available</h3>
          <p className="text-sm text-slate-500">
            Add some permits to get AI-powered visit recommendations
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec, index) => (
            <Card key={`${rec.permitId}-${index}`} className="p-3 sm:p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
                <div className="flex items-start space-x-3 sm:space-x-4 flex-1">
                  {/* Selection Checkbox */}
                  <button
                    onClick={() => toggleRecommendationSelection(rec.permitId)}
                    className="mt-1 p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                  >
                    {selectedRecommendations.has(rec.permitId) ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    {/* Header - Stack on mobile */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-2 sm:space-y-0 mb-3">
                      <div className="flex items-center space-x-2">
                        <Badge className={`${getPriorityColor(rec.priority)} flex items-center space-x-1`} variant="outline">
                          {getPriorityIcon(rec.priority)}
                          <span className="capitalize">{rec.priority}</span>
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-3 text-sm">
                        <div className="font-medium text-slate-700">
                          Score: {rec.score}/100
                        </div>
                        <div className="flex items-center text-slate-500">
                          <Clock className="w-4 h-4 mr-1" />
                          {getTimeIcon(rec.timeOfDay)} {rec.timeOfDay}
                        </div>
                      </div>
                    </div>

                    {/* Address and Builder */}
                    <div className="space-y-2 mb-3">
                      <div className="flex items-start space-x-2">
                        <MapPin className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                        <span className="font-medium text-slate-900 text-sm sm:text-base break-words">
                          {formatAddress(rec.permit)}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                        <div className="flex items-center space-x-2">
                          <Building className="w-4 h-4 text-slate-500 flex-shrink-0" />
                          <span className="text-slate-700 text-sm truncate">{rec.permit.builder_name}</span>
                        </div>
                        {rec.permit.builder_phone && (
                          <div className="flex items-center space-x-1 text-sm text-slate-500 ml-6 sm:ml-0">
                            <Phone className="w-3 h-3 flex-shrink-0" />
                            <span>{rec.permit.builder_phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* AI Priority Reasoning - Most Prominent */}
                    <div className="mb-3 p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <Brain className="w-4 h-4 text-purple-600 flex-shrink-0" />
                        <div className="text-sm font-semibold text-purple-800">AI Analysis - Why Visit Today:</div>
                      </div>
                      <div className="space-y-2">
                        {rec.reasons.map((reason, idx) => (
                          <div key={idx} className="flex items-start space-x-2 text-sm text-purple-700">
                            <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5 flex-shrink-0" />
                            <span className="font-medium leading-relaxed">{reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons - Horizontal on mobile, vertical on desktop */}
                <div className="flex flex-row sm:flex-col space-x-2 sm:space-x-0 sm:space-y-2 sm:ml-4 overflow-x-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(getGoogleMapsUrl(rec.permit), '_blank')}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 flex-shrink-0"
                  >
                    <Navigation className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Navigate</span>
                  </Button>
                  {rec.permit.builder_phone && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`tel:${rec.permit.builder_phone}`)}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50 flex-shrink-0"
                    >
                      <Phone className="w-4 h-4 sm:mr-1" />
                      <span className="hidden sm:inline">Call</span>
                    </Button>
                  )}
                  {onPermitSelect && (
                    <Button
                      size="sm"
                      onClick={() => onPermitSelect(rec.permit)}
                      className="bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
                    >
                      <span className="text-xs sm:text-sm">View</span>
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Footer */}
      {generatedAt && (
        <div className="text-center text-xs text-slate-500">
          <Calendar className="w-4 h-4 inline mr-1" />
          Last updated: {new Date(generatedAt).toLocaleString()}
        </div>
      )}

      {/* Route Manager */}
      {showRouteManager && activeRoutePermits.length > 0 && (
        <RouteManager
          permits={activeRoutePermits}
          startAddress={routeStartAddress}
          endAddress={routeEndAddress}
          onClose={() => {
            setShowRouteManager(false)
            setActiveRoutePermits([])
            setSelectedRecommendations(new Set())
          }}
          onPermitStatusUpdate={(permitId, status) => {
            // Update the local recommendations state
            setRecommendations(prev => prev.map(rec =>
              rec.permitId === permitId
                ? { ...rec, permit: { ...rec.permit, status } }
                : rec
            ))
          }}
        />
      )}
    </div>
  )
}