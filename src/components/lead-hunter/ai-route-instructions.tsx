"use client"

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Brain, MapPin, Building, Target, Clock, Route, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface City {
  name: string
  state: 'MA' | 'NH'
  county: string
}

interface AIRouteInstructionsProps {
  isOpen: boolean
  onClose: () => void
  onGenerateRoute: (instructions: RouteInstructions) => void
  availableCities?: City[]
  isGenerating?: boolean
}

export interface RouteInstructions {
  cities: string[]
  projectTypes: {
    newConstruction: boolean
    additions: boolean
    commercial: boolean
    followUps: boolean
    hotLeads: boolean
  }
  customInstructions: string
  maxStops: number
  priorityFactors: {
    projectValue: boolean
    daysOld: boolean
    builderHistory: boolean
  }
  startLocation: string
  endLocation: string
  returnToStart: boolean
  startTime?: string
}

const PRESET_INSTRUCTIONS = [
  {
    label: '🏗️ New Construction Only',
    value: 'new_construction',
    settings: {
      projectTypes: { newConstruction: true, additions: false, commercial: false, followUps: false, hotLeads: false },
      customInstructions: 'Focus only on new construction permits'
    }
  },
  {
    label: '🔥 Hot Leads + Follow-ups',
    value: 'hot_followups',
    settings: {
      projectTypes: { newConstruction: false, additions: false, commercial: false, followUps: true, hotLeads: true },
      customInstructions: 'Prioritize hot leads and permits needing follow-up'
    }
  },
  {
    label: '💰 High Value Projects',
    value: 'high_value',
    settings: {
      projectTypes: { newConstruction: true, additions: true, commercial: true, followUps: false, hotLeads: false },
      customInstructions: 'Focus on projects with estimated value over $100,000',
      priorityFactors: { projectValue: true, daysOld: false, builderHistory: false }
    }
  },
  {
    label: '📍 Not Visited Permits',
    value: 'not_visited',
    settings: {
      projectTypes: { newConstruction: true, additions: true, commercial: true, followUps: false, hotLeads: false },
      customInstructions: 'Only include permits that have not been visited yet'
    }
  }
]

// Massachusetts cities grouped by county
const MA_CITIES = {
  'Essex': ['Andover', 'Beverly', 'Danvers', 'Gloucester', 'Haverhill', 'Lawrence', 'Lynn', 'Methuen', 'Newburyport', 'Peabody', 'Salem', 'Amesbury', 'Essex', 'Georgetown', 'Groveland', 'Hamilton', 'Ipswich', 'Lynnfield', 'Manchester-by-the-Sea', 'Marblehead', 'Merrimac', 'Middleton', 'Nahant', 'Newbury', 'North Andover', 'Rockport', 'Rowley', 'Salisbury', 'Saugus', 'Swampscott', 'Topsfield', 'Wenham', 'West Newbury'],
  'Middlesex': ['Cambridge', 'Lowell', 'Newton', 'Somerville', 'Waltham', 'Medford', 'Malden', 'Framingham', 'Lexington', 'Woburn', 'Arlington', 'Belmont', 'Burlington', 'Concord', 'Everett', 'Marlborough', 'Natick', 'Reading', 'Stoneham', 'Watertown', 'Winchester'],
  'Suffolk': ['Boston', 'Chelsea', 'Revere', 'Winthrop'],
  'Norfolk': ['Needham', 'Brookline', 'Quincy', 'Weymouth', 'Braintree', 'Milton', 'Dedham', 'Westwood', 'Norwood', 'Canton', 'Sharon', 'Stoughton', 'Randolph', 'Holbrook', 'Avon', 'Bellingham', 'Dover', 'Foxborough', 'Franklin', 'Medfield', 'Medway', 'Millis', 'Norfolk', 'Norfolk', 'Plainville', 'Walpole', 'Wellesley', 'Wrentham'],
  'Worcester': ['Worcester', 'Shrewsbury', 'Westborough', 'Grafton', 'Milford', 'Auburn', 'Holden', 'Leicester', 'Millbury', 'Northborough', 'Southborough', 'Spencer', 'West Boylston'],
  'Plymouth': ['Plymouth', 'Brockton', 'Quincy', 'Weymouth', 'Hingham', 'Scituate', 'Marshfield', 'Duxbury', 'Cohasset', 'Hull', 'Norwell', 'Rockland', 'Whitman', 'Abington', 'Bridgewater', 'East Bridgewater', 'West Bridgewater', 'Halifax', 'Hanover', 'Hanson', 'Kingston', 'Lakeville', 'Marion', 'Mattapoisett', 'Middleborough', 'Pembroke', 'Rochester', 'Wareham']
}

// New Hampshire cities
const NH_CITIES = {
  'Rockingham': ['Portsmouth', 'Derry', 'Salem', 'Rochester', 'Dover', 'Exeter', 'Hampton', 'Londonderry'],
  'Hillsborough': ['Manchester', 'Nashua', 'Concord', 'Merrimack', 'Bedford', 'Milford']
}

export function AIRouteInstructions({
  isOpen,
  onClose,
  onGenerateRoute,
  availableCities,
  isGenerating = false
}: AIRouteInstructionsProps) {
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  const [projectTypes, setProjectTypes] = useState({
    newConstruction: true,
    additions: false,
    commercial: false,
    followUps: false,
    hotLeads: false
  })
  const [customInstructions, setCustomInstructions] = useState('')
  const [maxStops, setMaxStops] = useState(20)
  const [priorityFactors, setPriorityFactors] = useState({
    projectValue: true,
    daysOld: true,
    builderHistory: false
  })
  const [citySearchInput, setCitySearchInput] = useState('')
  const [showCitySuggestions, setShowCitySuggestions] = useState(false)
  const [startLocation, setStartLocation] = useState('Current Location')
  const [endLocation, setEndLocation] = useState('')
  const [returnToStart, setReturnToStart] = useState(true)

  // Flatten all cities into a single searchable list
  const allCities = useMemo(() => {
    const cities: string[] = []

    // Add MA cities
    Object.values(MA_CITIES).forEach(countyCities => {
      cities.push(...countyCities)
    })

    // Add NH cities
    Object.values(NH_CITIES).forEach(countyCities => {
      cities.push(...countyCities)
    })

    return cities.sort()
  }, [])

  // Filter cities based on search input
  const filteredCities = useMemo(() => {
    if (!citySearchInput.trim()) return []

    return allCities.filter(city =>
      city.toLowerCase().includes(citySearchInput.toLowerCase()) &&
      !selectedCities.includes(city)
    ).slice(0, 10) // Limit to 10 suggestions
  }, [citySearchInput, allCities, selectedCities])

  const handlePresetSelect = (preset: typeof PRESET_INSTRUCTIONS[0]) => {
    setProjectTypes(preset.settings.projectTypes)
    setCustomInstructions(preset.settings.customInstructions)
    if (preset.settings.priorityFactors) {
      setPriorityFactors(preset.settings.priorityFactors)
    }
    toast.success(`Applied preset: ${preset.label}`)
  }

  const handleCitySelect = (city: string) => {
    setSelectedCities(prev => [...prev, city])
    setCitySearchInput('')
    setShowCitySuggestions(false)
  }

  const handleCityRemove = (city: string) => {
    setSelectedCities(prev => prev.filter(c => c !== city))
  }

  const handleSearchInputChange = (value: string) => {
    setCitySearchInput(value)
    setShowCitySuggestions(value.length > 0)
  }

  const handleGenerateRoute = () => {
    if (selectedCities.length === 0) {
      toast.error('Please select at least one city')
      return
    }

    if (!Object.values(projectTypes).some(v => v)) {
      toast.error('Please select at least one project type')
      return
    }

    const instructions: RouteInstructions = {
      cities: selectedCities,
      projectTypes,
      customInstructions,
      maxStops,
      priorityFactors,
      startLocation,
      endLocation: returnToStart ? startLocation : endLocation,
      returnToStart
    }

    onGenerateRoute(instructions)
  }


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-blue-600" />
            <span>AI Route Instructions</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Preset Options */}
          <div className="space-y-2">
            <Label>Quick Presets</Label>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_INSTRUCTIONS.map((preset) => (
                <Button
                  key={preset.value}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetSelect(preset)}
                  className="justify-start"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* City Search Selection */}
          <div className="space-y-3">
            <Label>Select Cities to Visit</Label>

            <div className="relative">
              <Input
                placeholder="Type city name (e.g., Boston, Salem, Manchester...)"
                value={citySearchInput}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                onFocus={() => setShowCitySuggestions(citySearchInput.length > 0)}
                onBlur={() => setTimeout(() => setShowCitySuggestions(false), 200)}
              />

              {/* City Suggestions Dropdown */}
              {showCitySuggestions && filteredCities.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {filteredCities.map(city => (
                    <button
                      key={city}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                      onClick={() => handleCitySelect(city)}
                    >
                      <span className="text-sm">{city}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Cities */}
            {selectedCities.length > 0 && (
              <>
                <div className="flex flex-wrap gap-1">
                  {selectedCities.map(city => (
                    <Badge key={city} variant="secondary" className="text-xs">
                      {city}
                      <button
                        className="ml-1 hover:text-red-600"
                        onClick={() => handleCityRemove(city)}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-slate-500">
                  💡 Route will also include nearby cities for better coverage
                </p>
              </>
            )}
          </div>

          {/* Route Settings */}
          <div className="space-y-3">
            <Label>Route Settings</Label>

            <div className="space-y-3">
              <div>
                <Label className="text-sm">Starting Location</Label>
                <Input
                  placeholder="Enter starting address or 'Current Location'"
                  value={startLocation}
                  onChange={(e) => setStartLocation(e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={returnToStart}
                  onCheckedChange={(checked) => setReturnToStart(checked as boolean)}
                />
                <Label className="text-sm">Return to starting location</Label>
              </div>

              {!returnToStart && (
                <div>
                  <Label className="text-sm">Ending Location</Label>
                  <Input
                    placeholder="Enter ending address"
                    value={endLocation}
                    onChange={(e) => setEndLocation(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Project Types */}
          <div className="space-y-2">
            <Label>Project Types to Include</Label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={projectTypes.newConstruction}
                  onCheckedChange={(checked) =>
                    setProjectTypes(prev => ({ ...prev, newConstruction: checked as boolean }))
                  }
                />
                <span>New Construction</span>
              </label>
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={projectTypes.additions}
                  onCheckedChange={(checked) =>
                    setProjectTypes(prev => ({ ...prev, additions: checked as boolean }))
                  }
                />
                <span>Additions/Renovations</span>
              </label>
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={projectTypes.commercial}
                  onCheckedChange={(checked) =>
                    setProjectTypes(prev => ({ ...prev, commercial: checked as boolean }))
                  }
                />
                <span>Commercial Projects</span>
              </label>
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={projectTypes.followUps}
                  onCheckedChange={(checked) =>
                    setProjectTypes(prev => ({ ...prev, followUps: checked as boolean }))
                  }
                />
                <span>Follow-up Visits</span>
              </label>
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={projectTypes.hotLeads}
                  onCheckedChange={(checked) =>
                    setProjectTypes(prev => ({ ...prev, hotLeads: checked as boolean }))
                  }
                />
                <span>Hot Leads Only 🔥</span>
              </label>
            </div>
          </div>

          {/* Priority Factors */}
          <div className="space-y-2">
            <Label>Prioritize By</Label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={priorityFactors.projectValue}
                  onCheckedChange={(checked) =>
                    setPriorityFactors(prev => ({ ...prev, projectValue: checked as boolean }))
                  }
                />
                <span>Project Value</span>
              </label>
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={priorityFactors.daysOld}
                  onCheckedChange={(checked) =>
                    setPriorityFactors(prev => ({ ...prev, daysOld: checked as boolean }))
                  }
                />
                <span>Days Since Permit Filed</span>
              </label>
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={priorityFactors.builderHistory}
                  onCheckedChange={(checked) =>
                    setPriorityFactors(prev => ({ ...prev, builderHistory: checked as boolean }))
                  }
                />
                <span>Builder History</span>
              </label>
            </div>
          </div>

          {/* Custom Instructions */}
          <div className="space-y-2">
            <Label>Custom Instructions (Optional)</Label>
            <Textarea
              placeholder="E.g., Focus on builders with multiple permits, avoid residential areas before 9 AM, skip lunch hours..."
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              className="min-h-20"
            />
            <p className="text-xs text-slate-500">
              💡 Routes are optimized using Google Maps for real driving distances and traffic conditions
            </p>
          </div>

          {/* Max Stops */}
          <div className="space-y-2">
            <Label>Maximum Stops</Label>
            <Input
              type="number"
              min="1"
              max="50"
              value={maxStops}
              onChange={(e) => setMaxStops(parseInt(e.target.value) || 20)}
              className="w-32"
            />
            <p className="text-xs text-slate-600">Recommended: 15-25 stops per day</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerateRoute}
            disabled={isGenerating || selectedCities.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Route...
              </>
            ) : (
              <>
                <Route className="w-4 h-4 mr-2" />
                Generate Route
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}