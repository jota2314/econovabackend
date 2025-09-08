"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useLeadsStore } from "@/stores/leads-store"

export function LeadForm() {
  const { 
    showAddDialog, 
    editingLead, 
    loading,
    closeDialog, 
    createLead, 
    updateLead 
  } = useLeadsStore()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    lead_source: 'website',
    followup_priority: 'warm',
    status: 'new',
    lead_score: 50
  })

  // Reset form when dialog opens/closes or when editing different lead
  useEffect(() => {
    if (editingLead) {
      setFormData({
        name: editingLead.name || '',
        email: editingLead.email || '',
        phone: editingLead.phone || '',
        company: editingLead.company || '',
        lead_source: editingLead.lead_source || 'website',
        followup_priority: editingLead.followup_priority || 'warm',
        status: editingLead.status || 'new',
        lead_score: editingLead.lead_score || 50
      })
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        lead_source: 'website',
        followup_priority: 'warm',
        status: 'new',
        lead_score: 50
      })
    }
  }, [editingLead, showAddDialog])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clean up form data - ensure required fields are always included
    const cleanedData: any = {
      name: formData.name,
      email: formData.email.trim() || '',
      phone: formData.phone.trim() || '',
      company: formData.company.trim() || '',
      lead_source: formData.lead_source,
      followup_priority: formData.followup_priority,
      status: formData.status,
      lead_score: formData.lead_score
    }
    
    console.log('🔍 Form data being sent:', cleanedData)
    
    try {
      if (editingLead) {
        // Update existing lead
        await updateLead(editingLead.id, cleanedData)
      } else {
        // Create new lead
        await createLead(cleanedData)
      }
    } catch (error) {
      // Error is already handled in the store
      console.error('Form submission error:', error)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={showAddDialog} onOpenChange={() => closeDialog()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {editingLead ? 'Edit Lead' : 'Add New Lead'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => handleInputChange('company', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">Lead Source</Label>
            <Select value={formData.lead_source} onValueChange={(value) => handleInputChange('lead_source', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="drive_by">Drive By</SelectItem>
                <SelectItem value="permit">Permit</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.followup_priority} onValueChange={(value) => handleInputChange('followup_priority', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hot">Hot</SelectItem>
                  <SelectItem value="warm">Warm</SelectItem>
                  <SelectItem value="cold">Cold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                  <SelectItem value="closed_won">Closed Won</SelectItem>
                  <SelectItem value="closed_lost">Closed Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => closeDialog()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : editingLead ? 'Update Lead' : 'Create Lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}