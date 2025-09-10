"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { MapPin, Building, Phone, FileText, Camera, X } from 'lucide-react'
import { toast } from 'sonner'

interface AddPermitFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (permitData: PermitFormData) => void
  initialData?: {
    lat?: number
    lng?: number
    address?: string
  }
}

export interface PermitFormData {
  address: string
  city: string
  state: string
  zip_code: string
  builder_name: string
  builder_phone: string
  permit_type: 'residential' | 'commercial'
  notes: string
  latitude?: number
  longitude?: number
}

export function AddPermitForm({ isOpen, onClose, onSubmit, initialData }: AddPermitFormProps) {
  const [formData, setFormData] = useState<PermitFormData>({
    address: initialData?.address || '',
    city: '',
    state: 'MA',
    zip_code: '',
    builder_name: '',
    builder_phone: '',
    permit_type: 'residential',
    notes: '',
    latitude: initialData?.lat,
    longitude: initialData?.lng,
  })
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false)

  const handleInputChange = (field: keyof PermitFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const geocodeAddress = async () => {
    if (!formData.address) {
      toast.error('Please enter an address first')
      return
    }

    setIsGeocodingAddress(true)
    
    try {
      const fullAddress = `${formData.address}, ${formData.city}, ${formData.state} ${formData.zip_code}`.trim()
      const geocoder = new google.maps.Geocoder()
      
      geocoder.geocode({ address: fullAddress }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          const location = results[0].geometry.location
          setFormData(prev => ({
            ...prev,
            latitude: location.lat(),
            longitude: location.lng()
          }))
          toast.success('Address geocoded successfully!')
        } else {
          toast.error('Could not geocode address. Please check the address.')
        }
        setIsGeocodingAddress(false)
      })
    } catch (error) {
      toast.error('Error geocoding address')
      setIsGeocodingAddress(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const newFiles = Array.from(files)
      setSelectedFiles(prev => [...prev, ...newFiles])
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.address || !formData.builder_name) {
      toast.error('Address and Builder Name are required')
      return
    }

    if (!formData.latitude || !formData.longitude) {
      toast.error('Please geocode the address by clicking "Find on Map"')
      return
    }

    setIsSubmitting(true)
    
    try {
      // TODO: Upload photos to Supabase storage if any
      onSubmit(formData)
      toast.success('Permit added successfully!')
      onClose()
      
      // Reset form
      setFormData({
        address: '',
        city: '',
        state: 'MA',
        zip_code: '',
        builder_name: '',
        builder_phone: '',
        permit_type: 'residential',
        notes: '',
      })
      setSelectedFiles([])
    } catch (error) {
      toast.error('Failed to add permit')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 sm:p-4">
      <Card className="bg-white w-full h-full sm:max-w-md sm:w-full sm:max-h-[90vh] sm:h-auto overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Add New Permit</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Address Section */}
            <div className="space-y-3">
              <Label className="flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>Address *</span>
              </Label>
              <Input
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="123 Main Street"
                required
              />
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>City</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="Boston"
                  />
                </div>
                <div>
                  <Label>ZIP Code</Label>
                  <Input
                    value={formData.zip_code}
                    onChange={(e) => handleInputChange('zip_code', e.target.value)}
                    placeholder="02101"
                  />
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={geocodeAddress}
                disabled={isGeocodingAddress || !formData.address}
                className="w-full"
              >
                {isGeocodingAddress ? 'Finding...' : 'Find on Map'}
              </Button>
              
              {formData.latitude && formData.longitude && (
                <p className="text-xs text-green-600">
                  ✓ Location found: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                </p>
              )}
            </div>

            {/* Builder Section */}
            <div className="space-y-3">
              <Label className="flex items-center space-x-2">
                <Building className="w-4 h-4" />
                <span>Builder Name *</span>
              </Label>
              <Input
                value={formData.builder_name}
                onChange={(e) => handleInputChange('builder_name', e.target.value)}
                placeholder="ABC Construction Company"
                required
              />
              
              <Label className="flex items-center space-x-2">
                <Phone className="w-4 h-4" />
                <span>Builder Phone</span>
              </Label>
              <Input
                value={formData.builder_phone}
                onChange={(e) => handleInputChange('builder_phone', e.target.value)}
                placeholder="(555) 123-4567"
                type="tel"
              />
            </div>

            {/* Permit Details */}
            <div className="space-y-3">
              <Label>Permit Type</Label>
              <Select 
                value={formData.permit_type} 
                onValueChange={(value: 'residential' | 'commercial') => handleInputChange('permit_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>

              <Label className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Notes</span>
              </Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any additional notes about this permit..."
                rows={3}
              />
            </div>

            {/* Photo Upload */}
            <div className="space-y-3">
              <Label className="flex items-center space-x-2">
                <Camera className="w-4 h-4" />
                <span>Photos</span>
              </Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
              />
              
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">Selected photos:</p>
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                      <span className="text-sm truncate">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-orange-500 hover:bg-orange-600"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add Permit'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}