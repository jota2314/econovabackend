"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  MapPin, 
  Navigation, 
  Phone,
  MessageSquare,
  Mail,
  Eye
} from "lucide-react"
import { Lead } from "@/lib/types/database"

interface LeadMapViewProps {
  leads: Lead[]
  onSelectLead: (lead: Lead) => void
}

// Territory areas for Massachusetts
const territories = [
  { name: 'Greater Boston', cities: ['Boston', 'Cambridge', 'Somerville', 'Newton', 'Brookline'] },
  { name: 'North Shore', cities: ['Salem', 'Lynn', 'Peabody', 'Beverly', 'Gloucester'] },
  { name: 'South Shore', cities: ['Quincy', 'Braintree', 'Weymouth', 'Plymouth', 'Hingham'] },
  { name: 'MetroWest', cities: ['Framingham', 'Natick', 'Waltham', 'Wellesley', 'Needham'] },
  { name: 'Central Mass', cities: ['Worcester', 'Shrewsbury', 'Marlborough', 'Leominster', 'Fitchburg'] },
  { name: 'Western Mass', cities: ['Springfield', 'Amherst', 'Northampton', 'Pittsfield', 'Holyoke'] }
]

function TerritoryCard({ 
  territory, 
  leads, 
  onSelectLead 
}: { 
  territory: typeof territories[0], 
  leads: Lead[], 
  onSelectLead: (lead: Lead) => void 
}) {
  const territoryLeads = leads.filter(lead => 
    lead.city && territory.cities.some(city => 
      lead.city?.toLowerCase().includes(city.toLowerCase())
    )
  )

  const getStatusCounts = () => {
    const counts = {
      new: 0,
      contacted: 0,
      scheduled: 0,
      quoted: 0,
      won: 0,
      lost: 0
    }
    
    territoryLeads.forEach(lead => {
      switch (lead.status) {
        case 'new':
          counts.new++
          break
        case 'contacted':
          counts.contacted++
          break
        case 'measurement_scheduled':
        case 'measured':
          counts.scheduled++
          break
        case 'quoted':
        case 'proposal_sent':
          counts.quoted++
          break
        case 'closed_won':
          counts.won++
          break
        case 'closed_lost':
          counts.lost++
          break
      }
    })
    
    return counts
  }

  const statusCounts = getStatusCounts()
  
  if (territoryLeads.length === 0) {
    return (
      <Card className="opacity-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-slate-400" />
            {territory.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">No leads in this territory</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="hover:shadow-md transition-all cursor-pointer">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            {territory.name}
          </div>
          <Badge variant="secondary">
            {territoryLeads.length} lead{territoryLeads.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">{statusCounts.new}</div>
            <div className="text-slate-600">New</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-yellow-600">{statusCounts.contacted}</div>
            <div className="text-slate-600">Contacted</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-purple-600">{statusCounts.scheduled}</div>
            <div className="text-slate-600">Scheduled</div>
          </div>
        </div>

        {/* Recent Leads */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-700">Recent Leads:</h4>
          {territoryLeads.slice(0, 3).map(lead => (
            <div key={lead.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
              <div>
                <div className="font-medium text-sm">{lead.name}</div>
                <div className="text-xs text-slate-500">
                  {lead.city}, {lead.state} • {lead.phone}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSelectLead(lead)}
                className="h-8 w-8 p-0"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          ))}
          
          {territoryLeads.length > 3 && (
            <div className="text-center">
              <span className="text-sm text-slate-500">
                +{territoryLeads.length - 3} more lead{territoryLeads.length - 3 !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Territory Stats */}
        <div className="pt-2 border-t border-slate-200">
          <div className="flex justify-between text-xs text-slate-600">
            <span>Conversion Rate:</span>
            <span className="font-medium">
              {territoryLeads.length > 0 
                ? Math.round((statusCounts.won / territoryLeads.length) * 100)
                : 0}%
            </span>
          </div>
          <div className="flex justify-between text-xs text-slate-600 mt-1">
            <span>Avg. Response Time:</span>
            <span className="font-medium">2.3 days</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function LeadMapView({ leads, onSelectLead }: LeadMapViewProps) {
  const [selectedTerritory, setSelectedTerritory] = useState<string | null>(null)
  
  // Leads without city information
  const unassignedLeads = leads.filter(lead => !lead.city)
  
  // Calculate total stats
  const totalStats = {
    new: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    scheduled: leads.filter(l => ['measurement_scheduled', 'measured'].includes(l.status)).length,
    quoted: leads.filter(l => ['quoted', 'proposal_sent'].includes(l.status)).length,
    won: leads.filter(l => l.status === 'closed_won').length,
    lost: leads.filter(l => l.status === 'closed_lost').length
  }

  return (
    <div className="space-y-6">
      {/* Map Header with Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{totalStats.new}</div>
            <div className="text-sm text-slate-600">New Leads</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{totalStats.contacted}</div>
            <div className="text-sm text-slate-600">Contacted</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{totalStats.scheduled}</div>
            <div className="text-sm text-slate-600">Scheduled</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{totalStats.quoted}</div>
            <div className="text-sm text-slate-600">Quoted</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{totalStats.won}</div>
            <div className="text-sm text-slate-600">Won</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{totalStats.lost}</div>
            <div className="text-sm text-slate-600">Lost</div>
          </CardContent>
        </Card>
      </div>

      {/* Territory Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Navigation className="h-5 w-5" />
          Massachusetts Territories
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {territories.map(territory => (
            <TerritoryCard
              key={territory.name}
              territory={territory}
              leads={leads}
              onSelectLead={onSelectLead}
            />
          ))}
        </div>
      </div>

      {/* Unassigned Leads */}
      {unassignedLeads.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-slate-500" />
            Leads Without Location ({unassignedLeads.length})
          </h2>
          
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                {unassignedLeads.map(lead => (
                  <div key={lead.id} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                    <div>
                      <div className="font-medium">{lead.name}</div>
                      <div className="text-sm text-slate-500">
                        {lead.phone}
                        {lead.email && ` • ${lead.email}`}
                        {lead.company && ` • ${lead.company}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {lead.status.replace('_', ' ')}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onSelectLead(lead)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <MapPin className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 mb-1">Territory Management</h3>
              <p className="text-sm text-blue-700">
                This view organizes leads by geographic territories in Massachusetts. 
                Use this to plan route optimization, assign territory-based salespeople, 
                and track regional performance metrics.
              </p>
              <p className="text-xs text-blue-600 mt-2">
                Note: In a production environment, this would integrate with Google Maps API 
                for precise geolocation and route planning.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}