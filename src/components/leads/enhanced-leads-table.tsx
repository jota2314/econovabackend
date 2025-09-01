"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Phone,
  Mail,
  MapPin,
  Calendar,
  Thermometer,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Flame,
  Snowflake,
  Sun
} from 'lucide-react'

interface EnhancedLead {
  id: string
  name: string
  email: string | null
  phone: string
  company: string | null
  address: string | null
  city: string | null
  state: string | null
  status: string
  lead_source: string | null
  temperature: 'hot' | 'warm' | 'cold'
  lead_score: number
  last_contact_date: string | null
  next_followup_date: string | null
  assigned_to: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

interface EnhancedLeadsTableProps {
  className?: string
}

export function EnhancedLeadsTable({ className }: EnhancedLeadsTableProps) {
  const [leads, setLeads] = useState<EnhancedLead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [temperatureFilter, setTemperatureFilter] = useState('all')
  const supabase = createClient()

  const fetchLeads = async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      if (temperatureFilter !== 'all') {
        query = query.eq('temperature', temperatureFilter)
      }

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
      }

      const { data, error: queryError } = await query

      if (queryError) {
        throw new Error(queryError.message)
      }

      setLeads(data || [])
    } catch (err) {
      console.error('Error fetching leads:', err)
      setError(err instanceof Error ? err.message : 'Failed to load leads')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeads()
  }, [statusFilter, temperatureFilter, searchTerm])

  const getTemperatureIcon = (temperature: string) => {
    switch (temperature) {
      case 'hot':
        return <Flame className="h-4 w-4 text-red-500" />
      case 'warm':
        return <Sun className="h-4 w-4 text-yellow-500" />
      case 'cold':
        return <Snowflake className="h-4 w-4 text-blue-500" />
      default:
        return <Thermometer className="h-4 w-4 text-gray-400" />
    }
  }

  const getTemperatureBadge = (temperature: string) => {
    const configs = {
      hot: 'bg-red-100 text-red-800 border-red-200',
      warm: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      cold: 'bg-blue-100 text-blue-800 border-blue-200'
    }
    return configs[temperature as keyof typeof configs] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getStatusBadge = (status: string) => {
    const configs = {
      new: 'bg-blue-100 text-blue-800 border-blue-200',
      contacted: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      measurement_scheduled: 'bg-purple-100 text-purple-800 border-purple-200',
      measured: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      quoted: 'bg-orange-100 text-orange-800 border-orange-200',
      proposal_sent: 'bg-pink-100 text-pink-800 border-pink-200',
      closed_won: 'bg-green-100 text-green-800 border-green-200',
      closed_lost: 'bg-red-100 text-red-800 border-red-200'
    }
    return configs[status as keyof typeof configs] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      new: 'New',
      contacted: 'Contacted',
      measurement_scheduled: 'Scheduled',
      measured: 'Measured',
      quoted: 'Quoted',
      proposal_sent: 'Proposal Sent',
      closed_won: 'Closed Won',
      closed_lost: 'Closed Lost'
    }
    return labels[status as keyof typeof labels] || status
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const getDaysAgo = (dateString: string | null) => {
    if (!dateString) return null
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getUrgencyIndicator = (lead: EnhancedLead) => {
    const daysSinceContact = getDaysAgo(lead.last_contact_date)
    const daysUntilFollowup = lead.next_followup_date ? getDaysAgo(lead.next_followup_date) : null
    
    if (daysUntilFollowup !== null && daysUntilFollowup <= 0) {
      return <AlertTriangle className="h-4 w-4 text-red-500" title="Follow-up overdue!" />
    }
    if (daysSinceContact && daysSinceContact > 14) {
      return <Clock className="h-4 w-4 text-orange-500" title="No contact in 14+ days" />
    }
    if (lead.temperature === 'hot' && lead.lead_score >= 80) {
      return <TrendingUp className="h-4 w-4 text-green-500" title="High-priority lead" />
    }
    return null
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Enhanced Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                <div className="h-10 w-10 bg-gray-300 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-gray-300 rounded animate-pulse" />
                  <div className="h-3 w-48 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Enhanced Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
            <p className="font-medium">Error loading leads</p>
            <p className="text-sm mt-1">{error}</p>
            <Button 
              onClick={fetchLeads}
              size="sm"
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            Enhanced Leads
            <Badge variant="secondary">{leads.length}</Badge>
          </CardTitle>
          <Button onClick={fetchLeads} size="sm" variant="outline">
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <Input
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="measurement_scheduled">Scheduled</SelectItem>
              <SelectItem value="measured">Measured</SelectItem>
              <SelectItem value="quoted">Quoted</SelectItem>
            </SelectContent>
          </Select>
          <Select value={temperatureFilter} onValueChange={setTemperatureFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Temp" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="hot">🔥 Hot</SelectItem>
              <SelectItem value="warm">☀️ Warm</SelectItem>
              <SelectItem value="cold">❄️ Cold</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Leads List */}
        <div className="space-y-3">
          {leads.map((lead) => (
            <div 
              key={lead.id} 
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium text-lg">{lead.name}</h3>
                    {getUrgencyIndicator(lead)}
                    <Badge 
                      variant="outline"
                      className={getTemperatureBadge(lead.temperature)}
                    >
                      {getTemperatureIcon(lead.temperature)}
                      <span className="ml-1 capitalize">{lead.temperature}</span>
                    </Badge>
                    <Badge 
                      variant="outline"
                      className={getStatusBadge(lead.status)}
                    >
                      {getStatusLabel(lead.status)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {lead.phone}
                    </div>
                    {lead.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {lead.email}
                      </div>
                    )}
                    {lead.city && lead.state && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {lead.city}, {lead.state}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(lead.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  {lead.last_contact_date && (
                    <div className="mt-2 text-xs text-gray-500">
                      Last contact: {getDaysAgo(lead.last_contact_date)} days ago
                      {lead.next_followup_date && (
                        <span className="ml-2">
                          • Next follow-up: {new Date(lead.next_followup_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getScoreColor(lead.lead_score)}`}>
                      {lead.lead_score}
                    </div>
                    <div className="text-xs text-gray-500">Score</div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline">
                      View
                    </Button>
                    <Button size="sm">
                      Contact
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {leads.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Thermometer className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No leads found matching your criteria</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
