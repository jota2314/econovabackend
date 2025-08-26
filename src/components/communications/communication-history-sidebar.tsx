"use client"

import { useState, useEffect } from "react"
import { Lead, Communication } from "@/lib/types/database"
import { communicationsService } from "@/lib/services/communications"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  Phone, 
  MessageSquare, 
  PhoneCall, 
  PhoneIncoming,
  PhoneOutgoing,
  MessageCircle,
  Play,
  Download,
  Calendar,
  Clock,
  User
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface CommunicationHistorySidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: Lead | null
}

interface CommunicationWithUser extends Communication {
  user?: {
    full_name: string
    email: string
  }
}

export function CommunicationHistorySidebar({ 
  open, 
  onOpenChange, 
  lead 
}: CommunicationHistorySidebarProps) {
  const [communications, setCommunications] = useState<CommunicationWithUser[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    totalCalls: 0,
    totalSMS: 0,
    outboundCalls: 0,
    inboundCalls: 0,
    outboundSMS: 0,
    inboundSMS: 0
  })

  useEffect(() => {
    if (open && lead) {
      fetchCommunications()
      fetchStats()
    }
  }, [open, lead])

  const fetchCommunications = async () => {
    if (!lead) return

    setLoading(true)
    try {
      const result = await communicationsService.getCommunicationsForLead(lead.id)
      if (result.success) {
        setCommunications(result.data)
      }
    } catch (error) {
      console.error('Error fetching communications:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    if (!lead) return

    try {
      const result = await communicationsService.getLeadCommunicationStats(lead.id)
      if (result.success) {
        setStats(result.stats)
      }
    } catch (error) {
      console.error('Error fetching communication stats:', error)
    }
  }

  const getTypeIcon = (type: string, direction: string) => {
    if (type === 'call') {
      return direction === 'outbound' ? (
        <PhoneOutgoing className="h-4 w-4 text-blue-600" />
      ) : (
        <PhoneIncoming className="h-4 w-4 text-green-600" />
      )
    }
    return <MessageCircle className="h-4 w-4 text-purple-600" />
  }

  const getTypeLabel = (type: string, direction: string) => {
    if (type === 'call') {
      return direction === 'outbound' ? 'Outbound Call' : 'Inbound Call'
    }
    return direction === 'outbound' ? 'SMS Sent' : 'SMS Received'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'delivered':
      case 'sent':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'failed':
      case 'undelivered':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'in-progress':
      case 'sending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200'
    }
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const playRecording = (recordingUrl: string) => {
    // Open recording in a new tab or use an audio player
    window.open(recordingUrl, '_blank')
  }

  if (!lead) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Communication History
          </SheetTitle>
          <SheetDescription>
            All calls and messages for {lead.name}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Lead Info */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium text-slate-900">{lead.name}</h4>
                {lead.company && (
                  <p className="text-sm text-slate-600">{lead.company}</p>
                )}
                <p className="text-sm text-slate-500">{lead.phone}</p>
              </div>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t">
              <div className="text-center">
                <div className="text-lg font-semibold text-slate-900">
                  {stats.totalCalls}
                </div>
                <div className="text-xs text-slate-500">Total Calls</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-slate-900">
                  {stats.totalSMS}
                </div>
                <div className="text-xs text-slate-500">Total SMS</div>
              </div>
            </div>
          </Card>

          {/* Communications List */}
          <div>
            <h4 className="text-sm font-medium text-slate-900 mb-3">Recent Activity</h4>
            <ScrollArea className="h-[calc(100vh-400px)]">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
                </div>
              ) : communications.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                  <p className="text-slate-500">No communications yet</p>
                  <p className="text-sm text-slate-400">Start by making a call or sending an SMS</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {communications.map((comm) => (
                    <Card key={comm.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          {getTypeIcon(comm.type, comm.direction)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h5 className="text-sm font-medium text-slate-900">
                              {getTypeLabel(comm.type, comm.direction)}
                            </h5>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getStatusColor(comm.status || '')}`}
                            >
                              {comm.status}
                            </Badge>
                          </div>
                          
                          {/* Call Details */}
                          {comm.type === 'call' && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-4 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Duration: {formatDuration(comm.duration_seconds)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(comm.created_at), { addSuffix: true })}
                                </span>
                              </div>
                              
                              {/* Recording */}
                              {comm.recording_url && (
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => playRecording(comm.recording_url!)}
                                    className="h-8 text-xs"
                                  >
                                    <Play className="h-3 w-3 mr-1" />
                                    Play Recording
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* SMS Details */}
                          {comm.type === 'sms' && comm.content && (
                            <div className="space-y-2">
                              <p className="text-sm text-slate-600 bg-slate-50 rounded p-2 border-l-2 border-slate-200">
                                {comm.content}
                              </p>
                              <div className="flex items-center gap-1 text-xs text-slate-500">
                                <Calendar className="h-3 w-3" />
                                {formatDistanceToNow(new Date(comm.created_at), { addSuffix: true })}
                              </div>
                            </div>
                          )}
                          
                          {/* User Info */}
                          {comm.user && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                              <User className="h-3 w-3" />
                              {comm.user.full_name}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}