"use client"

import { useState } from "react"
import { Lead } from "@/lib/types/database"
// SMS Templates moved locally to avoid importing Twilio SDK on client side
const SMS_TEMPLATES = {
  initial_contact: {
    name: "Initial Contact",
    template: "Hi {name}, thanks for your interest in spray foam insulation! We'd love to schedule a free consultation to discuss your {project_type} needs."
  },
  followup: {
    name: "Follow Up",
    template: "Hi {name}, just following up on our previous conversation about your insulation project. Are you available for a quick call to discuss next steps?"
  },
  appointment_reminder: {
    name: "Appointment Reminder",
    template: "Hi {name}, this is a reminder about your spray foam consultation tomorrow. We'll see you at the scheduled time. Call us if you need to reschedule."
  },
  quote_ready: {
    name: "Quote Ready",
    template: "Hi {name}, your spray foam insulation quote is ready! We've prepared a competitive estimate for your project. When would be a good time to discuss it?"
  },
  project_completion: {
    name: "Project Completion",
    template: "Hi {name}, thank you for choosing us for your spray foam insulation project! We hope you're satisfied with the work. Please let us know if you have any questions."
  }
} as const
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Send, Loader2, FileText } from "lucide-react"
import { toast } from "sonner"

interface SMSModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: Lead | null
  onSMSSent?: () => void
}

export function SMSModal({ open, onOpenChange, lead, onSMSSent }: SMSModalProps) {
  const [message, setMessage] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [isSending, setIsSending] = useState(false)

  const applyTemplate = (templateKey: string) => {
    if (!lead) return
    
    const template = SMS_TEMPLATES[templateKey as keyof typeof SMS_TEMPLATES]
    if (!template) return

    let processedMessage = template.template
      .replace(/{name}/g, lead.name)
      .replace(/{company}/g, lead.company || 'your business')
      .replace(/{project_type}/g, 'spray foam insulation project')

    setMessage(processedMessage)
    setSelectedTemplate(templateKey)
  }

  const sendSMS = async () => {
    if (!lead || !message.trim()) {
      toast.error("Please enter a message")
      return
    }

    setIsSending(true)

    try {
      const response = await fetch('/api/communications/sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId: lead.id,
          phoneNumber: lead.phone,
          message: message.trim(),
          userId: null // Will be updated when auth is implemented
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("SMS sent successfully!")
        setMessage("")
        setSelectedTemplate("")
        onOpenChange(false)
        onSMSSent?.()
      } else {
        toast.error(`Failed to send SMS: ${result.error}`)
      }
    } catch (error) {
      console.error('Error sending SMS:', error)
      toast.error("Failed to send SMS. Please try again.")
    } finally {
      setIsSending(false)
    }
  }

  const handleClose = () => {
    setMessage("")
    setSelectedTemplate("")
    onOpenChange(false)
  }

  if (!lead) return null

  const messageLength = message.length
  const smsCount = Math.ceil(messageLength / 160)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Send SMS to {lead.name}
          </DialogTitle>
          <DialogDescription>
            Send a text message to {lead.phone}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Lead Info */}
          <Card className="p-4 bg-slate-50">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-slate-900">{lead.name}</h4>
                {lead.company && (
                  <p className="text-sm text-slate-600">{lead.company}</p>
                )}
                <p className="text-sm text-slate-500">{lead.phone}</p>
              </div>
              <Badge variant="outline" className="bg-white">
                SMS
              </Badge>
            </div>
          </Card>

          {/* Template Selection */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4" />
              <h4 className="text-sm font-medium">Use Template</h4>
            </div>
            <Select value={selectedTemplate} onValueChange={applyTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a template or write custom message" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SMS_TEMPLATES).map(([key, template]) => (
                  <SelectItem key={key} value={key}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Message Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Message</label>
              <div className="text-xs text-slate-500">
                {messageLength} characters • {smsCount} SMS {smsCount !== 1 ? 'messages' : 'message'}
              </div>
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              className="min-h-[120px] resize-none"
              maxLength={1000}
            />
            {messageLength > 160 && (
              <p className="text-xs text-amber-600 mt-1">
                Long messages will be split into multiple SMS messages
              </p>
            )}
          </div>

          {/* Template Preview */}
          {selectedTemplate && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h5 className="text-sm font-medium text-blue-900 mb-1">
                Template: {SMS_TEMPLATES[selectedTemplate as keyof typeof SMS_TEMPLATES].name}
              </h5>
              <p className="text-xs text-blue-700">
                Variables like {"{name}"} have been replaced with lead information
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            onClick={sendSMS}
            disabled={!message.trim() || isSending}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Send className="mr-2 h-4 w-4" />
            Send SMS
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}