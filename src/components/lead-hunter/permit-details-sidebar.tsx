"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  MapPin, 
  Building, 
  Phone, 
  Calendar, 
  FileText, 
  Camera,
  ExternalLink,
  Edit,
  Trash2,
  UserPlus,
  X
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
  status: 'new' | 'contacted' | 'converted_to_lead' | 'rejected'
  notes?: string
  latitude: number
  longitude: number
  created_at: string
  photo_urls?: string[]
  created_by?: {
    full_name: string
  }
}

interface PermitDetailsSidebarProps {
  permit: Permit | null
  isOpen: boolean
  onClose: () => void
  onStatusChange: (permitId: string, newStatus: Permit['status']) => void
  onConvertToLead: (permit: Permit) => void
  onEdit: (permit: Permit) => void
  onDelete: (permitId: string) => void
}

export function PermitDetailsSidebar({ 
  permit, 
  isOpen, 
  onClose, 
  onStatusChange,
  onConvertToLead,
  onEdit,
  onDelete
}: PermitDetailsSidebarProps) {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  if (!permit || !isOpen) return null

  const handleStatusChange = async (newStatus: Permit['status']) => {
    setIsUpdatingStatus(true)
    try {
      await onStatusChange(permit.id, newStatus)
      toast.success('Status updated successfully')
    } catch (error) {
      toast.error('Failed to update status')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleConvertToLead = () => {
    onConvertToLead(permit)
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this permit? This action cannot be undone.')) {
      onDelete(permit.id)
    }
  }

  const getStatusColor = (status: Permit['status']) => {
    switch (status) {
      case 'new': return 'bg-green-100 text-green-800 border-green-200'
      case 'contacted': return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'converted_to_lead': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getGoogleMapsUrl = () => {
    return `https://www.google.com/maps?q=${permit.latitude},${permit.longitude}`
  }

  const fullAddress = [permit.address, permit.city, permit.state, permit.zip_code]
    .filter(Boolean)
    .join(', ')

  return (
    <div className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-xl border-l transform transition-transform duration-300 z-40 ${
      isOpen ? 'translate-x-0' : 'translate-x-full'
    }`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b bg-slate-50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Permit Details</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Status and Type */}
          <div className="flex items-center space-x-3">
            <Badge className={getStatusColor(permit.status)} variant="outline">
              {permit.status.replace('_', ' ').toUpperCase()}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {permit.permit_type}
            </Badge>
          </div>

          {/* Builder Information */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center">
              <Building className="w-4 h-4 mr-2" />
              Builder Information
            </h3>
            <div className="space-y-2">
              <div>
                <p className="font-medium text-slate-900">{permit.builder_name}</p>
              </div>
              {permit.builder_phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-slate-500" />
                  <p className="text-slate-600">{permit.builder_phone}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto"
                    onClick={() => window.open(`tel:${permit.builder_phone}`)}
                  >
                    Call
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Location Information */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              Location
            </h3>
            <div className="space-y-2">
              <p className="text-slate-900">{fullAddress}</p>
              <div className="text-xs text-slate-500">
                {permit.latitude.toFixed(6)}, {permit.longitude.toFixed(6)}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => window.open(getGoogleMapsUrl(), '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View in Google Maps
              </Button>
            </div>
          </Card>

          {/* Notes */}
          {permit.notes && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Notes
              </h3>
              <p className="text-slate-600 text-sm whitespace-pre-wrap">
                {permit.notes}
              </p>
            </Card>
          )}

          {/* Photos */}
          {permit.photo_urls && permit.photo_urls.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <Camera className="w-4 h-4 mr-2" />
                Photos ({permit.photo_urls.length})
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {permit.photo_urls.map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`Permit photo ${index + 1}`}
                    className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80"
                    onClick={() => window.open(url, '_blank')}
                  />
                ))}
              </div>
            </Card>
          )}

          {/* Status Update */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Update Status</h3>
            <Select
              value={permit.status}
              onValueChange={(value: Permit['status']) => handleStatusChange(value)}
              disabled={isUpdatingStatus}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="converted_to_lead">Converted to Lead</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </Card>

          {/* Metadata */}
          <Card className="p-4 bg-slate-50">
            <div className="flex items-center space-x-2 text-sm text-slate-600 mb-2">
              <Calendar className="w-4 h-4" />
              <span>Added {formatDate(permit.created_at)}</span>
            </div>
            {permit.created_by && (
              <div className="text-sm text-slate-600">
                by {permit.created_by.full_name}
              </div>
            )}
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t bg-slate-50 space-y-2">
          {permit.status !== 'converted_to_lead' && (
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handleConvertToLead}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Convert to Lead
            </Button>
          )}
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onEdit(permit)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}