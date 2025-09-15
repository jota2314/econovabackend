"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { MapPin, Filter, X, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'

// Massachusetts and New Hampshire geographical data
const MA_COUNTIES = [
  'Barnstable', 'Berkshire', 'Bristol', 'Dukes', 'Essex', 'Franklin',
  'Hampden', 'Hampshire', 'Middlesex', 'Nantucket', 'Norfolk', 'Plymouth',
  'Suffolk', 'Worcester'
]

const NH_COUNTIES = [
  'Belknap', 'Carroll', 'Cheshire', 'Coos', 'Grafton', 'Hillsborough',
  'Merrimack', 'Rockingham', 'Strafford', 'Sullivan'
]

// Major cities/towns by county (sample data - would be expanded in production)
const CITIES_BY_COUNTY: Record<string, string[]> = {
  // Massachusetts
  'Middlesex': ['Cambridge', 'Lowell', 'Newton', 'Somerville', 'Framingham', 'Malden', 'Medford', 'Waltham'],
  'Worcester': ['Worcester', 'Fitchburg', 'Leominster', 'Milford', 'Shrewsbury', 'Westborough'],
  'Essex': ['Lynn', 'Lawrence', 'Haverhill', 'Peabody', 'Salem', 'Methuen', 'Beverly'],
  'Norfolk': ['Quincy', 'Brookline', 'Weymouth', 'Braintree', 'Franklin', 'Needham'],
  'Plymouth': ['Plymouth', 'Brockton', 'Taunton', 'Bridgewater', 'Marshfield', 'Hanover'],
  'Bristol': ['New Bedford', 'Fall River', 'Attleboro', 'Taunton', 'Mansfield'],
  'Suffolk': ['Boston', 'Revere', 'Chelsea', 'Winthrop'],
  'Hampden': ['Springfield', 'Chicopee', 'Westfield', 'Holyoke', 'Agawam'],
  'Hampshire': ['Northampton', 'Amherst', 'Easthampton', 'South Hadley'],
  'Berkshire': ['Pittsfield', 'North Adams', 'Lenox', 'Great Barrington'],
  'Franklin': ['Greenfield', 'Orange', 'Montague', 'Shelburne Falls'],
  'Barnstable': ['Barnstable', 'Hyannis', 'Falmouth', 'Sandwich', 'Dennis'],

  // New Hampshire
  'Hillsborough': ['Manchester', 'Nashua', 'Merrimack', 'Bedford', 'Goffstown', 'Hudson'],
  'Rockingham': ['Derry', 'Salem', 'Portsmouth', 'Londonderry', 'Windham', 'Exeter'],
  'Merrimack': ['Concord', 'Franklin', 'Hopkinton', 'Bow', 'Hooksett'],
  'Strafford': ['Dover', 'Rochester', 'Somersworth', 'Durham', 'Farmington'],
  'Cheshire': ['Keene', 'Jaffrey', 'Peterborough', 'Swanzey'],
  'Grafton': ['Lebanon', 'Hanover', 'Littleton', 'Plymouth', 'Bristol'],
  'Belknap': ['Laconia', 'Gilford', 'Belmont', 'Tilton'],
  'Carroll': ['Conway', 'Wolfeboro', 'Ossipee', 'North Conway'],
  'Sullivan': ['Claremont', 'Newport', 'Charlestown'],
  'Coos': ['Berlin', 'Gorham', 'Lancaster', 'Whitefield']
}

interface ZoneFilter {
  state?: 'MA' | 'NH'
  county?: string
  cities?: string[]
  customZone?: string
}

interface ZoneSelectorProps {
  onZoneChange: (filter: ZoneFilter) => void
  selectedZone: ZoneFilter
  permitCounts?: Record<string, number>
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  defaultCollapsed?: boolean
}

export function ZoneSelector({
  onZoneChange,
  selectedZone,
  permitCounts = {},
  isCollapsed,
  onToggleCollapse,
  defaultCollapsed = false
}: ZoneSelectorProps) {
  const [activeFilters, setActiveFilters] = useState<ZoneFilter>(selectedZone)
  const [availableCities, setAvailableCities] = useState<string[]>([])
  const [localCollapsed, setLocalCollapsed] = useState(defaultCollapsed)
  const [isHydrated, setIsHydrated] = useState(false)

  // Ensure hydration consistency
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Use prop-controlled collapsed state if provided, otherwise use local state
  const collapsed = isCollapsed !== undefined ? isCollapsed : localCollapsed
  const toggleCollapse = onToggleCollapse || (() => setLocalCollapsed(!localCollapsed))

  // Update available cities when county changes
  useEffect(() => {
    if (activeFilters.county) {
      setAvailableCities(CITIES_BY_COUNTY[activeFilters.county] || [])
    } else {
      setAvailableCities([])
    }
  }, [activeFilters.county])

  // Apply filters when they change
  useEffect(() => {
    onZoneChange(activeFilters)
  }, [activeFilters, onZoneChange])

  const handleStateChange = (state: 'MA' | 'NH' | 'all') => {
    const newFilters: ZoneFilter = {
      ...activeFilters,
      state: state === 'all' ? undefined : state,
      county: undefined,
      cities: undefined
    }
    setActiveFilters(newFilters)
  }

  const handleCountyChange = (county: string) => {
    const newFilters: ZoneFilter = {
      ...activeFilters,
      county: county === 'all' ? undefined : county,
      cities: undefined
    }
    setActiveFilters(newFilters)
  }

  const handleCityToggle = (city: string) => {
    const currentCities = activeFilters.cities || []
    const newCities = currentCities.includes(city)
      ? currentCities.filter(c => c !== city)
      : [...currentCities, city]
    
    setActiveFilters({
      ...activeFilters,
      cities: newCities.length > 0 ? newCities : undefined
    })
  }

  const clearAllFilters = () => {
    setActiveFilters({})
  }

  const getCountiesForState = (state?: 'MA' | 'NH') => {
    if (!state) return [...MA_COUNTIES, ...NH_COUNTIES].sort()
    return state === 'MA' ? MA_COUNTIES : NH_COUNTIES
  }

  const getFilterSummary = () => {
    const parts = []
    if (activeFilters.state) parts.push(activeFilters.state)
    if (activeFilters.county) parts.push(`${activeFilters.county} County`)
    if (activeFilters.cities?.length) {
      parts.push(`${activeFilters.cities.length} cities`)
    }
    return parts.length > 0 ? parts.join(' • ') : 'All Areas'
  }

  const hasActiveFilters = activeFilters.state || activeFilters.county || activeFilters.cities?.length
  
  const getActiveFilterCount = () => {
    let count = 0
    if (activeFilters.state) count++
    if (activeFilters.county) count++
    if (activeFilters.cities?.length) count += activeFilters.cities.length
    return count
  }

  // Show loading state during hydration to prevent mismatch
  if (!isHydrated) {
    return (
      <Card className="p-4 space-y-4 transition-all duration-300 ease-in-out">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold">Zone Selector</h3>
          </div>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Loading...</span>
          </div>
        </div>
      </Card>
    )
  }

  // Collapsed view - compact summary
  if (collapsed) {
    return (
      <Card className="p-3 bg-white border shadow-sm transition-all duration-300 ease-in-out">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <MapPin className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <span className="text-sm font-medium text-slate-700 truncate">
                {getFilterSummary()}
              </span>
              {hasActiveFilters && (
                <Badge
                  variant="secondary"
                  className="ml-2 flex-shrink-0 bg-orange-100 text-orange-700 border-orange-200"
                >
                  {getActiveFilterCount()} active
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2 ml-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-2"
                title="Clear all filters"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapse}
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              title="Expand zone selector"
            >
              <Filter className="w-4 h-4 mr-1" />
              <ChevronDown className="w-4 h-4 transition-transform duration-200" />
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  // Expanded view - full selector
  return (
    <Card className="p-4 space-y-4 transition-all duration-300 ease-in-out animate-in slide-in-from-top-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MapPin className="w-5 h-5 text-orange-500" />
          <h3 className="font-semibold">Zone Selector</h3>
          {hasActiveFilters && (
            <Badge 
              variant="secondary" 
              className="ml-2 bg-orange-100 text-orange-700 border-orange-200"
            >
              {getActiveFilterCount()} active
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              title="Clear all filters"
            >
              <X className="w-4 h-4 mr-1" />
              Clear All
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapse}
            className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            title="Collapse zone selector"
          >
            <ChevronUp className="w-4 h-4 transition-transform duration-200" />
          </Button>
        </div>
      </div>

      {/* Filter Summary */}
      <div className="p-3 bg-slate-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">
            {getFilterSummary()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* State Selector */}
        <div className="space-y-2">
          <Label>State</Label>
          <Select 
            value={activeFilters.state || 'all'} 
            onValueChange={handleStateChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              <SelectItem value="MA">Massachusetts</SelectItem>
              <SelectItem value="NH">New Hampshire</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* County Selector */}
        <div className="space-y-2">
          <Label>County</Label>
          <Select 
            value={activeFilters.county || 'all'} 
            onValueChange={handleCountyChange}
            disabled={!activeFilters.state}
          >
            <SelectTrigger>
              <SelectValue placeholder={activeFilters.state ? "Select county" : "Select state first"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Counties</SelectItem>
              {getCountiesForState(activeFilters.state).map(county => (
                <SelectItem key={county} value={county}>
                  {county} County {permitCounts[county] ? `(${permitCounts[county]})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom Zone (Placeholder for future) */}
        <div className="space-y-2">
          <Label>Custom Zone</Label>
          <Button 
            variant="outline" 
            className="w-full justify-start text-slate-500"
            disabled
          >
            <Plus className="w-4 h-4 mr-2" />
            Draw Zone (Coming Soon)
          </Button>
        </div>
      </div>

      {/* City Selector */}
      {activeFilters.county && availableCities.length > 0 && (
        <div className="space-y-2">
          <Label>Cities/Towns in {activeFilters.county} County</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
            {availableCities.map(city => {
              const isSelected = activeFilters.cities?.includes(city) || false
              const count = permitCounts[city]
              
              return (
                <Badge
                  key={city}
                  variant={isSelected ? "default" : "outline"}
                  className={`cursor-pointer justify-between hover:bg-slate-100 ${
                    isSelected ? 'bg-orange-500 hover:bg-orange-600' : ''
                  }`}
                  onClick={() => handleCityToggle(city)}
                >
                  <span className="truncate">{city}</span>
                  {count && <span className="ml-1">({count})</span>}
                </Badge>
              )
            })}
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="space-y-2">
          <Label className="text-xs text-slate-600">Active Filters</Label>
          <div className="flex flex-wrap gap-2">
            {activeFilters.state && (
              <Badge variant="secondary">
                {activeFilters.state}
                <X 
                  className="w-3 h-3 ml-1 cursor-pointer hover:text-red-500" 
                  onClick={() => handleStateChange('all')}
                />
              </Badge>
            )}
            {activeFilters.county && (
              <Badge variant="secondary">
                {activeFilters.county} County
                <X 
                  className="w-3 h-3 ml-1 cursor-pointer hover:text-red-500" 
                  onClick={() => handleCountyChange('all')}
                />
              </Badge>
            )}
            {activeFilters.cities?.map(city => (
              <Badge key={city} variant="secondary">
                {city}
                <X 
                  className="w-3 h-3 ml-1 cursor-pointer hover:text-red-500" 
                  onClick={() => handleCityToggle(city)}
                />
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}