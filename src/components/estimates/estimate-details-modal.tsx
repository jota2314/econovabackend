"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ImageGallery, ImageThumbnailGrid } from "@/components/ui/image-gallery"
import { toast } from "sonner"
import { 
  FileText, 
  DollarSign, 
  Camera, 
  Save, 
  Edit, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  User,
  Calendar,
  Building,
  Phone,
  Mail
} from "lucide-react"

interface EstimateItem {
  id: string
  room_name: string
  surface_type: string
  area_type: string
  height: number
  width: number
  square_feet: number
  insulation_type?: string
  r_value?: string
  unit_price: number
  total_cost: number
  override_price?: number
  notes?: string
}

interface EstimatePhoto {
  id: string
  url: string
  alt?: string
  caption?: string
  measurement_id?: string
  room_name?: string
}

interface EstimateDetails {
  id: string
  estimate_number: string
  status: 'draft' | 'pending_approval' | 'sent' | 'approved' | 'rejected'
  total_amount: number
  subtotal: number
  markup_percentage: number
  markup_amount: number
  created_at: string
  updated_at: string
  jobs: {
    id: string
    job_name: string
    service_type: string
    building_type: string
    lead: {
      name: string
      email?: string
      phone?: string
    }
  }
  created_by_user?: {
    full_name: string
    email: string
  }
  approved_by_user?: {
    full_name: string
    email: string
  }
  items: EstimateItem[]
  photos: EstimatePhoto[]
}

interface EstimateDetailsModalProps {
  estimateId: string | null
  isOpen: boolean
  onClose: () => void
  onEstimateUpdated?: () => void
}

export function EstimateDetailsModal({ 
  estimateId, 
  isOpen, 
  onClose, 
  onEstimateUpdated 
}: EstimateDetailsModalProps) {
  const [estimate, setEstimate] = useState<EstimateDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingPrices, setEditingPrices] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0)
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({})

  const fetchEstimateDetails = async () => {
    if (!estimateId) return
    
    try {
      setLoading(true)
      
      // Fetch estimate details
      const estimateResponse = await fetch(`/api/estimates/${estimateId}`)
      const estimateData = await estimateResponse.json()
      
      if (!estimateResponse.ok) {
        throw new Error(estimateData.error || 'Failed to fetch estimate')
      }
      
      // Fetch measurements and photos for this estimate
      // Note: estimateData.data.jobs.id contains the job ID
      const jobId = estimateData.data.jobs.id
      const measurementsResponse = await fetch(`/api/jobs/${jobId}/measurements`)
      const measurementsData = await measurementsResponse.json()
      
      // Mock estimate items - in real implementation, these would come from estimate_items table
      const mockItems: EstimateItem[] = [
        {
          id: '1',
          room_name: 'Living Room',
          surface_type: 'wall',
          area_type: 'exterior_wall',
          height: 10,
          width: 12,
          square_feet: 120,
          insulation_type: 'closed_cell',
          r_value: 'R-21',
          unit_price: 3.50,
          total_cost: 420,
        },
        {
          id: '2',
          room_name: 'Kitchen',
          surface_type: 'ceiling',
          area_type: 'floor_joists',
          height: 8,
          width: 10,
          square_feet: 80,
          insulation_type: 'open_cell',
          r_value: 'R-15',
          unit_price: 2.75,
          total_cost: 220,
        }
      ]
      
      // Mock photos - in real implementation, these would come from measurements
      const mockPhotos: EstimatePhoto[] = [
        {
          id: '1',
          url: '/api/placeholder/400/300',
          caption: 'Living Room - Before',
          room_name: 'Living Room'
        },
        {
          id: '2',
          url: '/api/placeholder/400/300',
          caption: 'Kitchen - Ceiling View',
          room_name: 'Kitchen'
        }
      ]
      
      setEstimate({
        ...estimateData.data,
        items: mockItems,
        photos: mockPhotos,
        subtotal: mockItems.reduce((sum, item) => sum + (item.override_price || item.total_cost), 0),
        markup_percentage: 6.25,
        markup_amount: mockItems.reduce((sum, item) => sum + (item.override_price || item.total_cost), 0) * 0.0625
      })
      
    } catch (error) {
      console.error('Error fetching estimate details:', error)
      toast.error('Failed to load estimate details')
    } finally {
      setLoading(false)
    }
  }

  const handlePriceOverride = (itemId: string, newPrice: number) => {
    setPriceOverrides(prev => ({
      ...prev,
      [itemId]: newPrice
    }))
  }

  const calculateTotals = () => {
    if (!estimate) return { subtotal: 0, markup: 0, total: 0 }
    
    const subtotal = estimate.items.reduce((sum, item) => {
      const price = priceOverrides[item.id] ?? item.total_cost
      return sum + price
    }, 0)
    
    const markup = subtotal * (estimate.markup_percentage / 100)
    const total = subtotal + markup
    
    return { subtotal, markup, total }
  }

  const handleSavePriceOverrides = async () => {
    if (!estimate) return
    
    try {
      setSaving(true)
      
      // In real implementation, this would update the estimate_items table
      const response = await fetch(`/api/estimates/${estimate.id}/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price_overrides: priceOverrides })
      })
      
      if (response.ok) {
        toast.success('Prices updated successfully')
        setEditingPrices(false)
        onEstimateUpdated?.()
        await fetchEstimateDetails() // Refresh data
      } else {
        throw new Error('Failed to update prices')
      }
    } catch (error) {
      console.error('Error saving price overrides:', error)
      toast.error('Failed to save price changes')
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'draft': 'outline',
      'pending_approval': 'default',
      'sent': 'secondary',
      'approved': 'default',
      'rejected': 'destructive'
    }
    
    const colors: Record<string, string> = {
      'draft': 'bg-gray-100 text-gray-800',
      'pending_approval': 'bg-yellow-100 text-yellow-800',
      'sent': 'bg-blue-100 text-blue-800',
      'approved': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800'
    }
    
    return (
      <Badge variant={variants[status] || 'outline'} className={colors[status]}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }

  useEffect(() => {
    if (isOpen && estimateId) {
      fetchEstimateDetails()
    }
  }, [isOpen, estimateId])

  const totals = calculateTotals()

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-orange-600" />
              <p className="text-slate-600">Loading estimate details...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!estimate) {
    return null
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Estimate {estimate.estimate_number}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {estimate.jobs.job_name} • {estimate.jobs.lead.name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(estimate.status)}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingPrices(!editingPrices)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {editingPrices ? 'Cancel' : 'Edit Prices'}
                </Button>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="details" className="flex-1 overflow-hidden">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="items">Items & Pricing</TabsTrigger>
              <TabsTrigger value="photos">Photos ({estimate.photos.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Customer Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Name</Label>
                      <p className="text-sm">{estimate.jobs.lead.name}</p>
                    </div>
                    {estimate.jobs.lead.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{estimate.jobs.lead.email}</span>
                      </div>
                    )}
                    {estimate.jobs.lead.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{estimate.jobs.lead.phone}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Job Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Job Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Job Name</Label>
                      <p className="text-sm">{estimate.jobs.job_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Service Type</Label>
                      <p className="text-sm capitalize">{estimate.jobs.service_type}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Building Type</Label>
                      <p className="text-sm capitalize">{estimate.jobs.building_type}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Estimate Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Estimate Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Created</Label>
                      <p className="text-sm">{new Date(estimate.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Created By</Label>
                      <p className="text-sm">{estimate.created_by_user?.full_name || 'Unknown'}</p>
                    </div>
                    {estimate.approved_by_user && (
                      <div>
                        <Label className="text-sm font-medium">Approved By</Label>
                        <p className="text-sm">{estimate.approved_by_user.full_name}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Pricing Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Pricing Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Subtotal:</span>
                      <span className="text-sm font-medium">{formatCurrency(totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Markup ({estimate.markup_percentage}%):</span>
                      <span className="text-sm font-medium">{formatCurrency(totals.markup)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="font-medium">Total:</span>
                      <span className="font-bold text-lg">{formatCurrency(totals.total)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="items" className="overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                {estimate.items.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                        <div className="md:col-span-2">
                          <h4 className="font-medium">{item.room_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {item.surface_type} • {item.area_type}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {item.height}" × {item.width}" = {item.square_feet} sq ft
                          </p>
                        </div>
                        
                        <div>
                          <Label className="text-xs">Insulation</Label>
                          <p className="text-sm">{item.insulation_type}</p>
                          <p className="text-xs text-muted-foreground">{item.r_value}</p>
                        </div>
                        
                        <div>
                          <Label className="text-xs">Unit Price</Label>
                          <p className="text-sm">{formatCurrency(item.unit_price)}</p>
                        </div>
                        
                        <div>
                          <Label className="text-xs">Total Cost</Label>
                          {editingPrices ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={priceOverrides[item.id] ?? item.total_cost}
                              onChange={(e) => handlePriceOverride(item.id, parseFloat(e.target.value) || 0)}
                              className="h-8"
                            />
                          ) : (
                            <p className="text-sm font-medium">
                              {formatCurrency(priceOverrides[item.id] ?? item.total_cost)}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex justify-end">
                          {item.override_price && (
                            <Badge variant="outline" className="text-xs">
                              Override
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {editingPrices && (
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingPrices(false)
                        setPriceOverrides({})
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSavePriceOverrides} disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="photos" className="overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                {estimate.photos.length > 0 ? (
                  <ImageThumbnailGrid
                    images={estimate.photos}
                    onImageClick={(index) => {
                      setSelectedPhotoIndex(index)
                      setGalleryOpen(true)
                    }}
                  />
                ) : (
                  <div className="text-center py-12">
                    <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No photos available for this estimate</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <ImageGallery
        images={estimate.photos}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        initialIndex={selectedPhotoIndex}
      />
    </>
  )
}