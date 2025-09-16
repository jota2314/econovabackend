"use client"

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Autocomplete } from '@react-google-maps/api'
import { MapPin, Building, Phone, FileText, X, Image as ImageIcon, Trash2 } from 'lucide-react'
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
  county?: string
  builder_name: string
  builder_phone: string
  permit_type: 'residential' | 'commercial'
  status: 'new' | 'contacted' | 'converted_to_lead' | 'rejected' | 'hot' | 'cold' | 'visited' | 'not_visited'
  notes: string
  project_value?: number
  description?: string
  latitude?: number
  longitude?: number
  photo_urls?: string[]
}

export function AddPermitForm({ isOpen, onClose, onSubmit, initialData }: AddPermitFormProps) {
  const [formData, setFormData] = useState<PermitFormData>({
    address: initialData?.address || '',
    city: '',
    state: 'MA',
    zip_code: '',
    county: '',
    builder_name: '',
    builder_phone: '',
    permit_type: 'residential',
    status: 'new',
    notes: '',
    project_value: undefined,
    description: '',
    latitude: initialData?.lat,
    longitude: initialData?.lng,
    photo_urls: [],
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleInputChange = (field: keyof PermitFormData, value: string) => {
    if (field === 'project_value') {
      const numValue = value === '' ? undefined : parseFloat(value)
      setFormData(prev => ({ ...prev, [field]: numValue }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  const onAutocompleteLoad = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete
  }

  const onPlaceChanged = () => {
    if (!autocompleteRef.current) return

    const place = autocompleteRef.current.getPlace()
    
    if (!place.geometry || !place.geometry.location) {
      toast.error('Please select a valid address from the suggestions')
      return
    }

    // Parse address components
    const components = place.address_components || []
    let streetNumber = ''
    let route = ''
    let city = ''
    let state = ''
    let zipCode = ''
    let county = ''

    components.forEach((component) => {
      const types = component.types
      if (types.includes('street_number')) {
        streetNumber = component.long_name
      } else if (types.includes('route')) {
        route = component.long_name
      } else if (types.includes('locality')) {
        city = component.long_name
      } else if (types.includes('administrative_area_level_1')) {
        state = component.short_name
      } else if (types.includes('postal_code')) {
        zipCode = component.long_name
      } else if (types.includes('administrative_area_level_2')) {
        county = component.long_name
      }
    })

    // Combine street number and route for full address
    const fullAddress = `${streetNumber} ${route}`.trim()

    // Update form with parsed data
    setFormData(prev => ({
      ...prev,
      address: fullAddress || place.formatted_address || '',
      city: city,
      state: state || 'MA', // Default to MA if not found
      zip_code: zipCode,
      county: county ? county.replace(' County', '') : '',
      latitude: place.geometry!.location!.lat(),
      longitude: place.geometry!.location!.lng()
    }))

    toast.success('Address auto-populated successfully!')
  }

  const handleFileChange = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const maxFiles = 10
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    const toUpload: File[] = []
    for (let i = 0; i < files.length && i < maxFiles; i++) {
      const f = files[i]
      if (allowedTypes.includes(f.type)) toUpload.push(f)
    }

    if (toUpload.length === 0) return

    setIsUploading(true)
    const uploadedUrls: string[] = []
    try {
      for (const file of toUpload) {
        const formData = new FormData()
        formData.append('photo', file)
        const res = await fetch('/api/permits/photo', { method: 'POST', body: formData })
        if (!res.ok) throw new Error(`Upload failed for ${file.name}`)
        const data = await res.json()
        if (!data.success || !data.url) throw new Error('Upload API error')
        uploadedUrls.push(data.url)
      }
      setFormData(prev => ({ ...prev, photo_urls: [...(prev.photo_urls || []), ...uploadedUrls] }))
      toast.success(`Uploaded ${uploadedUrls.length} photo(s)`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to upload photos')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removePhoto = (url: string) => {
    setFormData(prev => ({ ...prev, photo_urls: (prev.photo_urls || []).filter(u => u !== url) }))
  }

  const geocodeAddress = async () => {
    if (!formData.address) {
      toast.error('Please enter an address first')
      return
    }

    // Check if Google Maps API is available
    if (typeof window === 'undefined' || !window.google || !window.google.maps) {
      toast.error('Google Maps is not loaded yet. Please wait and try again.')
      return
    }

    setIsGeocodingAddress(true)
    
    try {
      const fullAddress = `${formData.address}, ${formData.city}, ${formData.state} ${formData.zip_code}`.trim()
      const geocoder = new window.google.maps.Geocoder()
      
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
      console.error('Geocoding error:', error)
      toast.error('Error geocoding address')
      setIsGeocodingAddress(false)
    }
  }




  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.address) {
      toast.error('Address is required')
      return
    }

    if (!formData.latitude || !formData.longitude) {
      toast.error('Please select an address from suggestions or use "Find on Map" to get coordinates')
      return
    }

    setIsSubmitting(true)
    
    try {
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
        status: 'new',
        notes: '',
        photo_urls: [],
      })
    } catch (error) {
      toast.error('Failed to add permit')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <style jsx global>{`
        .pac-container {
          z-index: 9999 !important;
          border-radius: 8px !important;
          border: 1px solid #e2e8f0 !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
        }
        .pac-item {
          padding: 12px 16px !important;
          border-bottom: 1px solid #f1f5f9 !important;
          cursor: pointer !important;
        }
        .pac-item:hover {
          background-color: #f8fafc !important;
        }
        .pac-item-selected {
          background-color: #f97316 !important;
          color: white !important;
        }
        .pac-matched {
          font-weight: 600 !important;
        }
      `}</style>
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
                <span>Address * (start typing for suggestions)</span>
              </Label>
              {typeof window !== 'undefined' && window.google && window.google.maps ? (
                <Autocomplete
                  onLoad={onAutocompleteLoad}
                  onPlaceChanged={onPlaceChanged}
                  options={{
                    types: ['address'],
                    componentRestrictions: { country: ['us'] },
                    fields: ['formatted_address', 'address_components', 'geometry']
                  }}
                >
                  <Input
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Start typing address... (e.g., 123 Main Street)"
                    required
                    className="autocomplete-input"
                  />
                </Autocomplete>
              ) : (
                <Input
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="123 Main Street (Google Maps loading...)"
                  required
                />
              )}
              
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

              {/* Manual Geocoding Button - Only show if no coordinates or if user typed manually */}
              {(!formData.latitude || !formData.longitude) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={geocodeAddress}
                  disabled={isGeocodingAddress || !formData.address}
                  className="w-full"
                >
                  {isGeocodingAddress ? 'Finding...' : 'Find on Map (Manual)'}
                </Button>
              )}
              
              {formData.latitude && formData.longitude && (
                <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs text-green-700 font-medium">
                    ✓ Location confirmed: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Address validated and ready to save
                  </p>
                </div>
              )}
            </div>

            {/* Builder Section */}
            <div className="space-y-3">
              <Label className="flex items-center space-x-2">
                <Building className="w-4 h-4" />
                <span>Builder Name</span>
                <span className="text-xs text-slate-500">(optional)</span>
              </Label>
              <Input
                value={formData.builder_name}
                onChange={(e) => handleInputChange('builder_name', e.target.value)}
                placeholder="ABC Construction Company (leave empty if unknown)"
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

              <Label>Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value: 'new' | 'contacted' | 'converted_to_lead' | 'rejected' | 'hot' | 'cold' | 'visited' | 'not_visited') => handleInputChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">🆕 New</SelectItem>
                  <SelectItem value="contacted">📞 Contacted</SelectItem>
                  <SelectItem value="converted_to_lead">✅ Converted to Lead</SelectItem>
                  <SelectItem value="rejected">❌ Rejected</SelectItem>
                  <SelectItem value="hot">🔥 Hot</SelectItem>
                  <SelectItem value="cold">❄️ Cold</SelectItem>
                  <SelectItem value="visited">👥 Visited</SelectItem>
                  <SelectItem value="not_visited">📍 Not Visited</SelectItem>
                </SelectContent>
              </Select>

              <Label>Project Value</Label>
              <Input
                type="number"
                value={formData.project_value || ''}
                onChange={(e) => handleInputChange('project_value', e.target.value)}
                placeholder="250000"
                min="0"
                step="1000"
              />
              <p className="text-xs text-slate-500">
                Estimated or actual project value in dollars (e.g., 250000 for $250,000)
              </p>

              <Label className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Description</span>
              </Label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Brief description of the project (e.g., Single family dwelling, Kitchen renovation, etc.)"
                rows={2}
              />

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

            {/* Photos */}
            <div className="space-y-3">
              <Label className="flex items-center space-x-2">
                <ImageIcon className="w-4 h-4" />
                <span>Photos</span>
                <span className="text-xs text-slate-500">(optional)</span>
              </Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFileChange(e.target.files)}
                className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100"
                disabled={isUploading}
              />
              {isUploading && (
                <p className="text-xs text-slate-500">Uploading...</p>
              )}
              {!!formData.photo_urls?.length && (
                <div className="grid grid-cols-3 gap-2">
                  {formData.photo_urls.map((url) => (
                    <div key={url} className="relative group">
                      <img src={url} alt="permit" className="w-full h-24 object-cover rounded" />
                      <button
                        type="button"
                        className="absolute top-1 right-1 bg-white/90 rounded p-1 shadow-sm opacity-0 group-hover:opacity-100 transition"
                        onClick={() => removePhoto(url)}
                        aria-label="Remove photo"
                      >
                        <Trash2 className="w-4 h-4 text-slate-700" />
                      </button>
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
    </>
  )
}