"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ImageGallery, ImageThumbnailGrid } from "@/components/ui/image-gallery"
import { 
  useEstimateDetails,
  useEstimateLoading,
  useEstimateSaving,
  useEstimateApproving,
  useEstimateError,
  useEstimatePriceOverrides,
  useEstimateDimensionOverrides,
  useEstimateEditingPrices,
  useFetchEstimate,
  useUpdatePriceOverrides,
  useSetPriceOverride,
  useSetDimensionOverride,
  useSetEditingPrices,
  useClearPriceOverrides,
  useClearAllOverrides,
  useApproveEstimate,
  useResetEstimate,
  useGetCalculatedTotals,
  useHasUnsavedChanges
} from "@/stores/estimate-details-store"
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
  Mail,
  ArrowLeft
} from "lucide-react"

export default function EstimateDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const estimateId = params.id as string
  
  // Zustand store hooks
  const estimate = useEstimateDetails()
  const loading = useEstimateLoading()
  const saving = useEstimateSaving()
  const approving = useEstimateApproving()
  const error = useEstimateError()
  const priceOverrides = useEstimatePriceOverrides()
  const dimensionOverrides = useEstimateDimensionOverrides()
  const editingPrices = useEstimateEditingPrices()
  
  // Action hooks
  const fetchEstimate = useFetchEstimate()
  const updatePriceOverrides = useUpdatePriceOverrides()
  const setPriceOverride = useSetPriceOverride()
  const setDimensionOverride = useSetDimensionOverride()
  const setEditingPrices = useSetEditingPrices()
  const clearPriceOverrides = useClearPriceOverrides()
  const clearAllOverrides = useClearAllOverrides()
  const approveEstimate = useApproveEstimate()
  const reset = useResetEstimate()
  const getCalculatedTotals = useGetCalculatedTotals()
  const hasUnsavedChanges = useHasUnsavedChanges()
  
  // Local state for gallery
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0)

  const handleSavePriceOverrides = async () => {
    await updatePriceOverrides(priceOverrides)
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
    if (estimateId) {
      fetchEstimate(estimateId).catch(error => {
        console.error('Error in fetchEstimate:', error)
      })
    }
    
    // Clean up when component unmounts
    return () => {
      reset()
    }
  }, [estimateId, fetchEstimate, reset])

  const totals = getCalculatedTotals()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-orange-600" />
          <p className="text-slate-600">Loading estimate details...</p>
        </div>
      </div>
    )
  }

  if (error || !estimate) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error || 'Estimate not found'}</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-700" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">Estimate {estimate.estimate_number}</h1>
                  <div className="flex items-center gap-3 mt-1">
                    {getStatusBadge(estimate.status)}
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-600">{estimate.jobs.job_name}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-600">{estimate.jobs.lead.name}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-slate-600">Total Amount</p>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(estimate?.total_amount || 0)}</p>
            </div>
            <div className="flex items-center gap-2">
              {estimate?.status === 'pending_approval' && (
                <div className="flex flex-col items-end gap-1">
                  {hasUnsavedChanges() && (
                    <p className="text-xs text-orange-600 font-medium">
                      Save changes before approving
                    </p>
                  )}
                  <Button
                    onClick={approveEstimate}
                    disabled={approving || hasUnsavedChanges()}
                    className="bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {approving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Approve
                      </>
                    )}
                  </Button>
                </div>
              )}
              <Button
                variant="outline"
                onClick={() => setEditingPrices(!editingPrices)}
                className="border-slate-200 hover:bg-slate-50"
              >
                <Edit className="h-4 w-4 mr-2" />
                {editingPrices ? 'Cancel Edit' : 'Edit Prices'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="details" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl bg-slate-100 p-1 rounded-lg">
          <TabsTrigger 
            value="details" 
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
          >
            <User className="h-4 w-4 mr-2" />
            Details
          </TabsTrigger>
          <TabsTrigger 
            value="items"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Items & Pricing
          </TabsTrigger>
          <TabsTrigger 
            value="photos"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
          >
            <Camera className="h-4 w-4 mr-2" />
            Photos ({estimate.photos.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Information */}
            <Card className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <User className="h-5 w-5 text-blue-700" />
                  </div>
                  <span className="text-lg">Customer Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <Label className="text-sm font-semibold text-slate-700">Customer Name</Label>
                  <p className="text-lg font-medium text-slate-900 mt-1">{estimate.jobs.lead.name}</p>
                </div>
                {estimate.jobs.lead.email && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <Mail className="h-5 w-5 text-green-700" />
                    <div>
                      <Label className="text-xs font-medium text-green-700">Email</Label>
                      <p className="text-sm font-medium text-green-800">{estimate.jobs.lead.email}</p>
                    </div>
                  </div>
                )}
                {estimate.jobs.lead.phone && (
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                    <Phone className="h-5 w-5 text-purple-700" />
                    <div>
                      <Label className="text-xs font-medium text-purple-700">Phone</Label>
                      <p className="text-sm font-medium text-purple-800">{estimate.jobs.lead.phone}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Job Information */}
            <Card className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-orange-500">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Building className="h-5 w-5 text-orange-700" />
                  </div>
                  <span className="text-lg">Job Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <Label className="text-sm font-semibold text-slate-700">Job Name</Label>
                  <p className="text-lg font-medium text-slate-900 mt-1">{estimate.jobs.job_name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <Label className="text-xs font-medium text-blue-700">Service Type</Label>
                    <p className="text-sm font-medium text-blue-800 capitalize mt-1">{estimate.jobs.service_type}</p>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-lg">
                    <Label className="text-xs font-medium text-indigo-700">Building Type</Label>
                    <p className="text-sm font-medium text-indigo-800 capitalize mt-1">{estimate.jobs.building_type}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Estimate Information */}
            <Card className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-green-500">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-green-700" />
                  </div>
                  <span className="text-lg">Estimate Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <Label className="text-sm font-semibold text-slate-700">Created Date</Label>
                  <p className="text-lg font-medium text-slate-900 mt-1">{new Date(estimate.created_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Label className="text-sm font-semibold text-blue-700">Created By</Label>
                  <p className="text-lg font-medium text-blue-800 mt-1">{estimate.created_by_user?.full_name || 'Unknown'}</p>
                </div>
                {estimate.approved_by_user && (
                  <div className="p-3 bg-emerald-50 rounded-lg">
                    <Label className="text-sm font-semibold text-emerald-700">Approved By</Label>
                    <p className="text-lg font-medium text-emerald-800 mt-1">{estimate.approved_by_user.full_name}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pricing Summary */}
            <Card className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50 to-green-50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <DollarSign className="h-5 w-5 text-emerald-700" />
                  </div>
                  <span className="text-lg">Pricing Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-emerald-100 rounded-lg border border-emerald-200">
                  <span className="text-lg font-bold text-emerald-800">Total Amount:</span>
                  <span className="text-2xl font-bold text-emerald-900">{formatCurrency(estimate?.total_amount || 0)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="items" className="space-y-6">
          <div className="space-y-6">
            {estimate.items.map((item, index) => (
              <Card key={item.id} className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-indigo-500">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-indigo-700">{index + 1}</span>
                      </div>
                      <div>
                        <h4 className="text-xl font-semibold text-slate-900">{item.room_name}</h4>
                        <p className="text-sm text-slate-600 capitalize">
                          {item.surface_type} • {item.area_type.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    {item.override_price && (
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        Price Override
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <Label className="text-sm font-semibold text-slate-700">Dimensions</Label>
                      {editingPrices ? (
                        <div className="space-y-2 mt-2">
                          <div className="flex gap-2">
                            <div>
                              <Label className="text-xs text-slate-600">Height</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={dimensionOverrides[item.id]?.height ?? item.height}
                                onChange={(e) => {
                                  const height = parseFloat(e.target.value) || 0
                                  const width = dimensionOverrides[item.id]?.width ?? item.width
                                  const sqft = dimensionOverrides[item.id]?.square_feet ?? item.square_feet
                                  setDimensionOverride(item.id, height, width, sqft)
                                }}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-slate-600">Width</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={dimensionOverrides[item.id]?.width ?? item.width}
                                onChange={(e) => {
                                  const width = parseFloat(e.target.value) || 0
                                  const height = dimensionOverrides[item.id]?.height ?? item.height
                                  const sqft = dimensionOverrides[item.id]?.square_feet ?? item.square_feet
                                  setDimensionOverride(item.id, height, width, sqft)
                                }}
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-lg font-medium text-slate-900 mt-1">
                            {dimensionOverrides[item.id]?.height ?? item.height}" × {dimensionOverrides[item.id]?.width ?? item.width}"
                          </p>
                        </>
                      )}
                    </div>
                    
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <Label className="text-sm font-semibold text-blue-700">Insulation Type</Label>
                      <p className="text-lg font-medium text-blue-800 mt-1 capitalize">{item.insulation_type?.replace('_', ' ')}</p>
                      <p className="text-sm text-blue-600 mt-1">{item.r_value}</p>
                    </div>
                    
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <Label className="text-sm font-semibold text-purple-700">Total SqFt</Label>
                      {editingPrices ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={dimensionOverrides[item.id]?.square_feet ?? item.square_feet}
                          onChange={(e) => {
                            const sqft = parseFloat(e.target.value) || 0
                            const height = dimensionOverrides[item.id]?.height ?? item.height
                            const width = dimensionOverrides[item.id]?.width ?? item.width
                            setDimensionOverride(item.id, height, width, sqft)
                          }}
                          className="mt-1 h-10 bg-white border-purple-200 focus:border-purple-500"
                        />
                      ) : (
                        <p className="text-lg font-medium text-purple-800 mt-1">
                          {dimensionOverrides[item.id]?.square_feet ?? item.square_feet} sq ft
                        </p>
                      )}
                    </div>
                    
                    <div className="p-4 bg-green-50 rounded-lg">
                      <Label className="text-sm font-semibold text-green-700">Unit Price</Label>
                      {editingPrices ? (
                        <div className="space-y-1 mt-1">
                          <Input
                            type="number"
                            step="0.01"
                            value={priceOverrides[item.id] ? (priceOverrides[item.id] / (dimensionOverrides[item.id]?.square_feet ?? item.square_feet)) : item.unit_price}
                            onChange={(e) => {
                              const unitPrice = parseFloat(e.target.value) || 0
                              const sqft = dimensionOverrides[item.id]?.square_feet ?? item.square_feet
                              setPriceOverride(item.id, unitPrice * sqft)
                            }}
                            className="h-8 bg-white border-green-200 focus:border-green-500"
                          />
                          <p className="text-xs text-green-600">per sq ft</p>
                        </div>
                      ) : (
                        <>
                          <p className="text-lg font-medium text-green-800 mt-1">{formatCurrency(item.unit_price)}</p>
                          <p className="text-sm text-green-600 mt-1">per sq ft</p>
                        </>
                      )}
                    </div>
                    
                    <div className="p-4 bg-emerald-50 rounded-lg">
                      <Label className="text-sm font-semibold text-emerald-700">Total Cost</Label>
                      {editingPrices ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={priceOverrides[item.id] ?? item.total_cost}
                          onChange={(e) => setPriceOverride(item.id, parseFloat(e.target.value) || 0)}
                          className="mt-1 h-10 bg-white border-emerald-200 focus:border-emerald-500"
                        />
                      ) : (
                        <p className="text-xl font-bold text-emerald-800 mt-1">
                          {formatCurrency(priceOverrides[item.id] ?? item.total_cost)}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {item.notes && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <Label className="text-sm font-semibold text-yellow-800">Notes</Label>
                      <p className="text-sm text-yellow-700 mt-1">{item.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            
            {editingPrices && (
              <Card className="bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-900">Price Editing Mode</h4>
                      <p className="text-sm text-slate-600">Make changes to individual item prices above</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingPrices(false)
                          clearAllOverrides()
                        }}
                        className="border-slate-300 hover:bg-slate-100"
                      >
                        Cancel Changes
                      </Button>
                      <Button 
                        onClick={handleSavePriceOverrides} 
                        disabled={saving}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="photos" className="space-y-6">
          <div className="space-y-6">
            {estimate.photos.length > 0 ? (
              <>
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Camera className="h-5 w-5 text-blue-700" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">Project Photos</h3>
                        <p className="text-sm text-slate-600">{estimate.photos.length} photos available • Click to view full size</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <ImageThumbnailGrid
                  images={estimate.photos}
                  onImageClick={(index) => {
                    setSelectedPhotoIndex(index)
                    setGalleryOpen(true)
                  }}
                />
              </>
            ) : (
              <Card className="border-dashed border-2 border-slate-200">
                <CardContent className="text-center py-16">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Camera className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Photos Available</h3>
                  <p className="text-slate-600 mb-4">Photos from the job site will appear here once they're uploaded.</p>
                  <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
                    <Camera className="h-4 w-4 mr-2" />
                    Upload Photos
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <ImageGallery
        images={estimate.photos}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        initialIndex={selectedPhotoIndex}
      />
    </div>
  )
}