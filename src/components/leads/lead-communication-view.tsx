"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { 
  Phone, 
  MessageSquare, 
  Mail, 
  Clock, 
  Calendar, 
  User,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Plus,
  Edit,
  History,
  MessageCircle
} from "lucide-react"
import { Lead } from "@/lib/types/database"
import { formatDistanceToNow } from "date-fns"

interface LeadCommunicationViewProps {
  leads: Lead[]
  onCallLead: (lead: Lead) => void
  onSMSLead: (lead: Lead) => void
  onEmailLead: (lead: Lead) => void
  onViewHistory: (lead: Lead) => void
  onUpdateStatus: (leadId: string, status: Lead['status']) => void
}

interface LeadCardProps {
  lead: Lead
  onCallLead: (lead: Lead) => void
  onSMSLead: (lead: Lead) => void
  onEmailLead: (lead: Lead) => void
  onViewHistory: (lead: Lead) => void
  onUpdateStatus: (leadId: string, status: Lead['status']) => void
}

function LeadCard({ 
  lead, 
  onCallLead, 
  onSMSLead, 
  onEmailLead, 
  onViewHistory, 
  onUpdateStatus 
}: LeadCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [addingNote, setAddingNote] = useState(false)
  const [noteText, setNoteText] = useState('')

  const daysSinceCreated = Math.floor(
    (new Date().getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)
  )

  const getStatusColor = (status: Lead['status']) => {
    switch (status) {
      case 'new': return 'bg-blue-500 border-blue-600'
      case 'contacted': return 'bg-yellow-500 border-yellow-600'
      case 'measurement_scheduled': return 'bg-purple-500 border-purple-600'
      case 'measured': return 'bg-indigo-500 border-indigo-600'
      case 'quoted': return 'bg-orange-500 border-orange-600'
      case 'proposal_sent': return 'bg-pink-500 border-pink-600'
      case 'closed_won': return 'bg-green-500 border-green-600'
      case 'closed_lost': return 'bg-red-500 border-red-600'
      default: return 'bg-gray-500 border-gray-600'
    }
  }

  const getUrgencyLevel = () => {
    if (daysSinceCreated > 14 && lead.status === 'new') return 'critical'
    if (daysSinceCreated > 7 && (lead.status === 'new' || lead.status === 'contacted')) return 'high'
    if (daysSinceCreated > 3 && lead.status === 'contacted') return 'medium'
    return 'normal'
  }

  const urgencyLevel = getUrgencyLevel()

  const handleAddNote = () => {
    if (noteText.trim()) {
      // In a real app, you'd save this note to the database
      console.log('Adding note:', noteText, 'to lead:', lead.id)
      setNoteText('')
      setAddingNote(false)
      // You could also call an API to save the note
    }
  }

  return (
    <Card className={`transition-all duration-200 hover:shadow-md border-l-4 ${
      urgencyLevel === 'critical' ? 'border-l-red-500 bg-red-50' :
      urgencyLevel === 'high' ? 'border-l-orange-500 bg-orange-50' :
      urgencyLevel === 'medium' ? 'border-l-yellow-500 bg-yellow-50' :
      'border-l-slate-300'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-4 w-4 text-slate-500" />
              {lead.name}
              {urgencyLevel === 'critical' && (
                <AlertTriangle className="h-4 w-4 text-red-500" title="Urgent: No contact for &gt;14 days" />
              )}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge 
                className={`text-white text-xs ${getStatusColor(lead.status)}`}
              >
                {lead.status.replace('_', ' ').toUpperCase()}
              </Badge>
              <span className="text-sm text-slate-500">
                {daysSinceCreated} day{daysSinceCreated !== 1 ? 's' : ''} ago
              </span>
              {lead.company && (
                <span className="text-sm text-slate-600">• {lead.company}</span>
              )}
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="ml-2"
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Contact Information */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-slate-400" />
              <span className="font-medium">{lead.phone}</span>
            </div>
            {lead.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-slate-400" />
                <span>{lead.email}</span>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onCallLead(lead)}
              className="text-green-600 border-green-200 hover:bg-green-50"
            >
              <Phone className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSMSLead(lead)}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            {lead.email && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEmailLead(lead)}
                className="text-purple-600 border-purple-200 hover:bg-purple-50"
              >
                <Mail className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewHistory(lead)}
              className="text-slate-600 border-slate-200 hover:bg-slate-50"
            >
              <History className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Last Contact & Follow-up Info */}
        <div className="flex items-center justify-between text-sm bg-slate-50 p-2 rounded">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-slate-400" />
              <span className="text-slate-600">
                Last Contact: {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span className="text-slate-600">Next: Schedule follow-up</span>
            </div>
          </div>
          
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            daysSinceCreated > 14 ? 'bg-red-100 text-red-800' :
            daysSinceCreated > 7 ? 'bg-orange-100 text-orange-800' :
            daysSinceCreated > 3 ? 'bg-yellow-100 text-yellow-800' :
            'bg-green-100 text-green-800'
          }`}>
            {daysSinceCreated > 14 ? 'URGENT' :
             daysSinceCreated > 7 ? 'HIGH' :
             daysSinceCreated > 3 ? 'MEDIUM' : 'GOOD'}
          </div>
        </div>

        {/* Expanded Content */}
        {expanded && (
          <div className="space-y-3 border-t pt-3">
            {/* Address */}
            {lead.address && (
              <div className="text-sm">
                <span className="font-medium text-slate-600">Address: </span>
                <span>{lead.address}</span>
                {lead.city && lead.state && (
                  <span>, {lead.city}, {lead.state}</span>
                )}
              </div>
            )}

            {/* Lead Source */}
            {lead.lead_source && (
              <div className="text-sm">
                <span className="font-medium text-slate-600">Source: </span>
                <Badge variant="secondary" className="text-xs">
                  {lead.lead_source.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            )}

            {/* Notes */}
            {lead.notes && (
              <div className="text-sm">
                <span className="font-medium text-slate-600">Notes: </span>
                <p className="mt-1 text-slate-700">{lead.notes}</p>
              </div>
            )}

            {/* Quick Status Updates */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-slate-600">Quick Update:</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUpdateStatus(lead.id, 'contacted')}
                className="h-7 text-xs"
              >
                Mark Contacted
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUpdateStatus(lead.id, 'measurement_scheduled')}
                className="h-7 text-xs"
              >
                Schedule Meeting
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUpdateStatus(lead.id, 'quoted')}
                className="h-7 text-xs"
              >
                Mark Quoted
              </Button>
            </div>

            {/* Add Note Section */}
            {addingNote ? (
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a note about this lead..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddNote}>
                    Save Note
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      setAddingNote(false)
                      setNoteText('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddingNote(true)}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Note
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function LeadCommunicationView({ 
  leads, 
  onCallLead, 
  onSMSLead, 
  onEmailLead, 
  onViewHistory, 
  onUpdateStatus 
}: LeadCommunicationViewProps) {
  // Sort leads by urgency (days since created, status priority)
  const sortedLeads = [...leads].sort((a, b) => {
    const daysA = Math.floor((new Date().getTime() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24))
    const daysB = Math.floor((new Date().getTime() - new Date(b.created_at).getTime()) / (1000 * 60 * 60 * 24))
    
    // Priority: new status leads that are old, then by days desc
    if (a.status === 'new' && b.status !== 'new') return -1
    if (b.status === 'new' && a.status !== 'new') return 1
    
    return daysB - daysA // Most days first (oldest first)
  })

  if (leads.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageCircle className="mx-auto h-16 w-16 text-slate-300 mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">No leads to follow up</h3>
        <p className="text-slate-600">All filtered leads have been contacted or completed.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-500 mr-3" />
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {sortedLeads.filter(l => 
                    Math.floor((new Date().getTime() - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24)) > 14
                  ).length}
                </p>
                <p className="text-sm text-slate-600">Critical (&gt;14 days)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-500 mr-3" />
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {sortedLeads.filter(l => {
                    const days = Math.floor((new Date().getTime() - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24))
                    return days > 7 && days <= 14
                  }).length}
                </p>
                <p className="text-sm text-slate-600">High Priority (7-14 days)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Phone className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {sortedLeads.filter(l => l.status === 'contacted').length}
                </p>
                <p className="text-sm text-slate-600">Recently Contacted</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {sortedLeads.filter(l => l.status === 'measurement_scheduled').length}
                </p>
                <p className="text-sm text-slate-600">Meetings Scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lead Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sortedLeads.map(lead => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onCallLead={onCallLead}
            onSMSLead={onSMSLead}
            onEmailLead={onEmailLead}
            onViewHistory={onViewHistory}
            onUpdateStatus={onUpdateStatus}
          />
        ))}
      </div>
    </div>
  )
}