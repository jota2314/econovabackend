"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Lead } from "@/lib/types/database"
import { 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  DollarSign,
  ChevronRight,
  Users,
  TrendingUp
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface LeadPipelineProps {
  leads: Lead[]
  onUpdateStatus: (leadId: string, status: Lead['status']) => void
  onEditLead: (lead: Lead) => void
}

const pipelineStages = [
  {
    status: 'new' as const,
    title: 'New Leads',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Recently added leads'
  },
  {
    status: 'contacted' as const,
    title: 'Contacted',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    description: 'Initial contact made'
  },
  {
    status: 'measurement_scheduled' as const,
    title: 'Scheduled',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Measurement scheduled'
  },
  {
    status: 'measured' as const,
    title: 'Measured',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    description: 'Site measured'
  },
  {
    status: 'quoted' as const,
    title: 'Quoted',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    description: 'Quote prepared'
  },
  {
    status: 'proposal_sent' as const,
    title: 'Proposal Sent',
    color: 'bg-pink-100 text-pink-800 border-pink-200',
    description: 'Proposal delivered'
  },
  {
    status: 'closed_won' as const,
    title: 'Won',
    color: 'bg-green-100 text-green-800 border-green-200',
    description: 'Deal closed successfully'
  },
  {
    status: 'closed_lost' as const,
    title: 'Lost',
    color: 'bg-red-100 text-red-800 border-red-200',
    description: 'Deal not closed'
  }
]

const getNextStages = (currentStatus: Lead['status']) => {
  const statusFlow = {
    'new': ['contacted', 'closed_lost'],
    'contacted': ['measurement_scheduled', 'closed_lost'],
    'measurement_scheduled': ['measured', 'closed_lost'],
    'measured': ['quoted', 'closed_lost'],
    'quoted': ['proposal_sent', 'closed_lost'],
    'proposal_sent': ['closed_won', 'closed_lost'],
    'closed_won': [],
    'closed_lost': ['new', 'contacted']
  }
  return statusFlow[currentStatus] || []
}

const getStatusLabel = (status: Lead['status']) => {
  return pipelineStages.find(stage => stage.status === status)?.title || status
}

export function LeadPipeline({ leads, onUpdateStatus, onEditLead }: LeadPipelineProps) {
  const [selectedStage, setSelectedStage] = useState<Lead['status'] | null>(null)

  // Group leads by status
  const leadsByStatus = leads.reduce((acc, lead) => {
    if (!acc[lead.status]) {
      acc[lead.status] = []
    }
    acc[lead.status].push(lead)
    return acc
  }, {} as Record<Lead['status'], Lead[]>)

  // Calculate pipeline metrics
  const activeLeads = leads.filter(lead => !['closed_won', 'closed_lost'].includes(lead.status))
  const conversionRate = leads.length > 0 
    ? ((leadsByStatus.closed_won?.length || 0) / leads.length * 100).toFixed(1)
    : '0'

  const LeadCard = ({ lead }: { lead: Lead }) => (
    <Card className="mb-3 hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h4 className="font-semibold text-slate-900">
              {lead.name}
            </h4>
            {lead.company && (
              <p className="text-xs text-slate-500">{lead.company}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEditLead(lead)}>
                Edit Lead
              </DropdownMenuItem>
              {getNextStages(lead.status).map(status => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => onUpdateStatus(lead.id, status)}
                >
                  Move to {getStatusLabel(status)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-1 text-xs text-slate-600">
          <div className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            <a href={`tel:${lead.phone}`} className="hover:text-orange-600">
              {lead.phone}
            </a>
          </div>
          {lead.email && (
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              <a href={`mailto:${lead.email}`} className="hover:text-orange-600">
                {lead.email}
              </a>
            </div>
          )}
          {(lead.city && lead.state) && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{lead.city}, {lead.state}</span>
            </div>
          )}
        </div>

        <div className="mt-2 text-xs text-slate-400">
          Added {new Date(lead.created_at).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Pipeline Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-slate-600">Total Leads</p>
                <p className="text-2xl font-bold">{leads.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-slate-600">Active Leads</p>
                <p className="text-2xl font-bold">{activeLeads.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm text-slate-600">This Month</p>
                <p className="text-2xl font-bold">
                  {leads.filter(lead => {
                    const leadDate = new Date(lead.created_at);
                    const now = new Date();
                    return leadDate.getMonth() === now.getMonth() && 
                           leadDate.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm text-slate-600">Win Rate</p>
                <p className="text-2xl font-bold">{conversionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Stages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {pipelineStages.map((stage) => {
          const stageLeads = leadsByStatus[stage.status] || []
          
          return (
            <Card 
              key={stage.status}
              className={`${selectedStage === stage.status ? 'ring-2 ring-orange-500' : ''}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    {stage.title}
                  </CardTitle>
                  <Badge variant="outline" className={stage.color}>
                    {stageLeads.length}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">{stage.description}</p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {stageLeads.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-400">
                      No leads in this stage
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <LeadCard key={lead.id} lead={lead} />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Status Flow Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Pipeline Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline" className="bg-blue-100">New</Badge>
            <ChevronRight className="h-3 w-3 text-slate-400" />
            <Badge variant="outline" className="bg-yellow-100">Contacted</Badge>
            <ChevronRight className="h-3 w-3 text-slate-400" />
            <Badge variant="outline" className="bg-purple-100">Scheduled</Badge>
            <ChevronRight className="h-3 w-3 text-slate-400" />
            <Badge variant="outline" className="bg-indigo-100">Measured</Badge>
            <ChevronRight className="h-3 w-3 text-slate-400" />
            <Badge variant="outline" className="bg-orange-100">Quoted</Badge>
            <ChevronRight className="h-3 w-3 text-slate-400" />
            <Badge variant="outline" className="bg-pink-100">Proposal Sent</Badge>
            <ChevronRight className="h-3 w-3 text-slate-400" />
            <Badge variant="outline" className="bg-green-100">Won</Badge>
            <span className="text-slate-400 mx-2">or</span>
            <Badge variant="outline" className="bg-red-100">Lost</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Leads can move forward through the pipeline or be marked as lost at any stage. 
            Lost leads can be reactivated by moving them back to an earlier stage.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}