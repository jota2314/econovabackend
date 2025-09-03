"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { 
  ArrowLeft,
  CheckCircle2, 
  XCircle, 
  Download,
  FileText,
  DollarSign,
  Calendar,
  User,
  Building2,
  Edit,
  Save,
  Settings,
  ChevronDown,
  ChevronUp,
  Camera
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

interface EstimateDetail {
  id: string
  estimate_number: string
  subtotal: number
  total_amount: number
  status: string
  created_at: string
  markup_percentage: number
  jobs: {
    id: string
    job_name: string
    service_type: string
    lead: {
      name: string
      email: string
      phone: string
      address: string
      city: string
      state: string
    }
  }
  created_by_user: {
    full_name: string
    email: string
  }
  estimate_line_items: {
    id: string
    description: string
    quantity: number
    unit_price: number
    line_total: number
    service_type: string
  }[]
}

export default function EstimateSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const [estimate, setEstimate] = useState<EstimateDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [estimateId, setEstimateId] = useState<string>('')
  const [editedItems, setEditedItems] = useState<any>({})
  const [isEditing, setIsEditing] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [showEstimateDetails, setShowEstimateDetails] = useState(false)
  const [showClientInfo, setShowClientInfo] = useState(false)
  const [measurementPhotos, setMeasurementPhotos] = useState<string[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const resolvedParams = await params
      setEstimateId(resolvedParams.id)
      loadUser()
      loadEstimateSummary(resolvedParams.id)
    }
    init()
  }, [])

  const loadUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()
      setUser(profile)
    }
  }

  const loadEstimateSummary = async (id: string) => {
    try {
      setLoading(true)
      
      // Use the optimized API endpoint that fetches all data in one query
      const response = await fetch(`/api/estimates/${id}`)
      const result = await response.json()

      if (!result.success) {
        console.error('Error loading estimate:', result.error)
        toast.error('Failed to load estimate: ' + result.error)
        return
      }

      const estimateData = result.data
      
      // Load measurement photos separately (only additional query needed)
      const { data: measurements } = await supabase
        .from('measurements')
        .select('photo_url')
        .eq('job_id', estimateData.jobs.id)
        .not('photo_url', 'is', null)

      const photos = measurements?.map(m => m.photo_url).filter(Boolean) || []
      setMeasurementPhotos(photos)

      // The API already returns properly structured data
      setEstimate(estimateData)
    } catch (error) {
      console.error('Error loading estimate summary:', error)
      toast.error('Failed to load estimate summary')
    } finally {
      setLoading(false)
    }
  }

  const approveEstimate = async () => {
    try {
      const response = await fetch(`/api/estimates/${estimateId}/approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'approve' })
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast.success('Estimate approved successfully!')
        router.push('/dashboard/estimate-approvals')
      } else {
        toast.error('Failed to approve estimate: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error approving estimate:', error)
      toast.error('Failed to approve estimate')
    }
  }

  const rejectEstimate = async () => {
    try {
      const response = await fetch(`/api/estimates/${estimateId}/approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'reject' })
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast.success('Estimate rejected successfully!')
        router.push('/dashboard/estimate-approvals')
      } else {
        toast.error('Failed to reject estimate: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error rejecting estimate:', error)
      toast.error('Failed to reject estimate')
    }
  }

  const handleQuickPDF = async () => {
    try {
      setPdfLoading(true)
      console.log('📄 Generating Quick PDF for estimate:', estimateId)
      
      if (!estimate) {
        toast.error('Estimate data not loaded')
        return
      }

      // Always regenerate PDF to ensure it uses latest estimate data
      // The PDF generation API will automatically use the latest estimate line items
      console.log('🔄 Regenerating PDF to ensure latest estimate data is used...')
      toast.info('Generating PDF... This may take a moment.')
      
      // Get job measurements and other data needed for PDF generation
      const { data: jobDetails } = await supabase
        .from('jobs')
        .select(`
          *,
          measurements(*),
          leads!lead_id(name, email, phone, address)
        `)
        .eq('id', estimate.jobs.id)
        .single()

      if (!jobDetails) {
        toast.error('Job details not found')
        return
      }

      // Call PDF generation API (same as jobs page)
      const response = await fetch(`/api/jobs/${estimate.jobs.id}/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          measurements: jobDetails.measurements || [],
          jobName: jobDetails.job_name || 'Spray Foam Estimate',
          customerName: jobDetails.leads?.name || 'Valued Customer',
          jobPhotos: [],
          additionalData: {
            customerPhone: jobDetails.leads?.phone || '',
            customerEmail: jobDetails.leads?.email || '',
            projectAddress: jobDetails.project_address || '',
            projectCity: jobDetails.project_city || '',
            projectState: jobDetails.project_state || '',
            projectZipCode: jobDetails.project_zip_code || '',
            salespersonName: estimate.created_by_user.full_name,
            salespersonEmail: estimate.created_by_user.email,
            salespersonPhone: '617-596-2476',
            companyWebsite: 'EconovaEnergySavings.com'
          }
        })
      })

      const result = await response.json()

      if (result.success && result.pdfUrl) {
        console.log('✅ PDF generated successfully, opening...')
        
        // Open the generated PDF (same logic as jobs page)
        const pdfUrl = result.pdfUrl
        if (pdfUrl.startsWith('data:')) {
          const byteCharacters = atob(pdfUrl.split(',')[1])
          const byteNumbers = new Array(byteCharacters.length)
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i)
          }
          const byteArray = new Uint8Array(byteNumbers)
          const blob = new Blob([byteArray], { type: 'application/pdf' })
          const url = URL.createObjectURL(blob)
          window.open(url, '_blank')
          setTimeout(() => URL.revokeObjectURL(url), 1000)
        } else {
          window.open(pdfUrl, '_blank')
        }
        
        toast.success('✅ PDF generated and opened successfully!')
      } else {
        console.error('PDF generation failed:', result)
        toast.error('Failed to generate PDF: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('❌ Error generating PDF:', error)
      toast.error('Failed to generate PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  const saveChanges = async () => {
    try {
      console.log('💾 Saving changes...', editedItems)
      
      // Save edited line items
      const updates = Object.entries(editedItems).map(([itemId, changes]: [string, any]) => ({
        id: itemId,
        ...changes
      }))

      if (updates.length > 0) {
        console.log('📝 Updating line items:', updates)
        
        for (const update of updates) {
          const lineTotal = update.quantity * update.unit_price
          console.log(`Updating item ${update.id}: ${update.quantity} × ${update.unit_price} = ${lineTotal}`)
          
          const { error } = await supabase
            .from('estimate_line_items')
            .update({
              quantity: update.quantity,
              unit_price: update.unit_price,
              line_total: lineTotal
            })
            .eq('id', update.id)
            
          if (error) {
            console.error('Error updating line item:', error)
            throw error
          }
        }

        // Recalculate estimate totals
        const newSubtotal = estimate?.estimate_line_items.reduce((sum, item) => {
          const editedItem = editedItems[item.id]
          const quantity = editedItem?.quantity ?? item.quantity
          const unitPrice = editedItem?.unit_price ?? item.unit_price
          return sum + (quantity * unitPrice)
        }, 0) || 0

        const newTotal = newSubtotal // No markup for now, keep it simple

        console.log(`💰 Updating estimate totals: Subtotal=${newSubtotal}, Total=${newTotal}`)

        const { error: estimateError } = await supabase
          .from('estimates')
          .update({
            subtotal: newSubtotal,
            total_amount: newTotal
          })
          .eq('id', estimateId)
          
        if (estimateError) {
          console.error('Error updating estimate:', estimateError)
          throw estimateError
        }

        toast.success('✅ Changes saved successfully! Updates will appear everywhere.')
        setIsEditing(false)
        setEditedItems({}) // Clear edited items
        
        // Force refresh the estimate data
        await loadEstimateSummary(estimateId)
        
        // Clear any cached PDF for this job so new PDF generation uses updated data
        if (estimate?.jobs?.id) {
          try {
            await supabase
              .from('jobs')
              .update({
                latest_estimate_pdf_url: null,
                latest_estimate_pdf_name: null,
                pdf_generated_at: null
              })
              .eq('id', estimate.jobs.id)
            console.log('🗑️ Cleared cached PDF to force regeneration with updated data')
          } catch (error) {
            console.warn('Failed to clear PDF cache:', error)
          }
        }

        // Sync changes back to measurements table for jobs page consistency
        try {
          for (const [itemId, changes] of Object.entries(editedItems)) {
            const originalItem = estimate.estimate_line_items.find(item => item.id === itemId)
            if (originalItem && (changes.quantity || changes.unit_price)) {
              console.log(`🔄 Syncing changes for line item: ${originalItem.description}`)
              
              // Get all measurements for this job
              const { data: measurements } = await supabase
                .from('measurements')
                .select('id, room_name, square_feet, override_unit_price')
                .eq('job_id', estimate.jobs.id)
              
              if (measurements) {
                // Find measurement that matches this line item by room name
                const matchingMeasurement = measurements.find(m => {
                  const roomName = m.room_name.trim().toLowerCase()
                  const description = originalItem.description.toLowerCase()
                  return description.includes(roomName) || roomName.includes(description.split(' - ')[0]?.trim().toLowerCase())
                })
                
                if (matchingMeasurement) {
                  const updates: any = {}
                  
                  // Update square feet if quantity changed
                  if (changes.quantity && changes.quantity !== originalItem.quantity) {
                    updates.square_feet = changes.quantity
                    console.log(`📐 Updating measurement sqft: ${matchingMeasurement.square_feet} → ${changes.quantity}`)
                  }
                  
                  // Update unit price override if price changed
                  if (changes.unit_price && changes.unit_price !== originalItem.unit_price) {
                    updates.override_unit_price = changes.unit_price
                    updates.override_set_by = user?.id
                    updates.override_set_at = new Date().toISOString()
                    console.log(`💰 Updating measurement unit price: ${originalItem.unit_price} → ${changes.unit_price}`)
                  }
                  
                  if (Object.keys(updates).length > 0) {
                    await supabase
                      .from('measurements')
                      .update(updates)
                      .eq('id', matchingMeasurement.id)
                    console.log(`✅ Updated measurement ${matchingMeasurement.id}:`, updates)
                  }
                } else {
                  console.warn(`⚠️ No matching measurement found for line item: ${originalItem.description}`)
                }
              }
            }
          }
        } catch (error) {
          console.error('❌ Failed to sync measurements:', error)
        }
        
        // Also trigger a refresh of the parent pages by using a timestamp query param
        // This will help refresh cached data in jobs page and other components
        window.dispatchEvent(new CustomEvent('estimateUpdated', { 
          detail: { 
            estimateId, 
            newTotal: newTotal,
            timestamp: Date.now()
          } 
        }))
      } else {
        toast.info('No changes to save')
        setIsEditing(false)
      }
    } catch (error) {
      console.error('❌ Error saving changes:', error)
      toast.error('Failed to save changes: ' + (error as any).message)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'approved': return 'bg-green-100 text-green-800 border-green-300'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300'
      case 'sent': return 'bg-blue-100 text-blue-800 border-blue-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  // Group line items by service type (memoized for performance)
  const groupedLineItems = useMemo(() => {
    return estimate?.estimate_line_items?.reduce((acc, item) => {
      const serviceType = item.service_type || 'Other'
      if (!acc[serviceType]) {
        acc[serviceType] = []
      }
      acc[serviceType].push(item)
      return acc
    }, {} as Record<string, typeof estimate.estimate_line_items>) || {}
  }, [estimate?.estimate_line_items])

  if (loading) {
    // Skeleton loading state to prevent CLS - matches the actual layout structure
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header skeleton */}
        <div className="bg-slate-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Back button skeleton */}
            <div className="mb-4">
              <div className="h-8 w-32 bg-slate-200 rounded animate-pulse"></div>
            </div>
            
            {/* Header info skeleton */}
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="h-8 w-64 bg-slate-200 rounded animate-pulse mb-2"></div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div>
                  <div className="h-4 w-24 bg-slate-200 rounded animate-pulse"></div>
                  <div className="h-4 w-20 bg-slate-200 rounded animate-pulse"></div>
                  <div className="h-6 w-16 bg-slate-200 rounded animate-pulse"></div>
                </div>
              </div>
              
              {/* Toggle buttons skeleton */}
              <div className="flex gap-2">
                <div className="h-9 w-36 bg-slate-200 rounded animate-pulse"></div>
                <div className="h-9 w-28 bg-slate-200 rounded animate-pulse"></div>
              </div>
            </div>

            {/* Actions card skeleton */}
            <div className="mb-6">
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="h-6 w-20 bg-slate-200 rounded animate-pulse mb-4"></div>
                <div className="space-y-4">
                  <div className="h-9 w-full bg-slate-200 rounded animate-pulse"></div>
                  <div className="h-9 w-full bg-slate-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content skeleton */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="h-6 w-40 bg-slate-200 rounded animate-pulse mb-6"></div>
            
            {/* Service sections skeleton */}
            <div className="space-y-6">
              {[1, 2].map((i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <div className="h-6 w-24 bg-slate-200 rounded animate-pulse"></div>
                    <div className="h-6 w-20 bg-slate-200 rounded animate-pulse"></div>
                  </div>
                  
                  {/* Line items skeleton */}
                  <div className="space-y-3">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="h-5 w-48 bg-slate-200 rounded animate-pulse mb-2"></div>
                            <div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div>
                          </div>
                          <div className="h-5 w-16 bg-slate-200 rounded animate-pulse"></div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="h-4 w-20 bg-slate-200 rounded animate-pulse mb-1"></div>
                            <div className="h-8 w-full bg-slate-200 rounded animate-pulse"></div>
                          </div>
                          <div>
                            <div className="h-4 w-32 bg-slate-200 rounded animate-pulse mb-1"></div>
                            <div className="h-8 w-full bg-slate-200 rounded animate-pulse"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals skeleton */}
            <div className="bg-green-50 rounded-lg p-6 mt-8">
              <div className="h-6 w-40 bg-slate-200 rounded animate-pulse mb-4"></div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="h-5 w-20 bg-slate-200 rounded animate-pulse"></div>
                  <div className="h-5 w-24 bg-slate-200 rounded animate-pulse"></div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-6 w-16 bg-slate-200 rounded animate-pulse"></div>
                  <div className="h-6 w-28 bg-slate-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!estimate) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Estimate Not Found</h2>
          <Button onClick={() => router.push('/dashboard/estimate-approvals')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Estimates
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50" style={{ containIntrinsicSize: '1px 5000px' }}>
      {/* Header with Cards */}
      <div className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Back Button */}
          <div className="mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/estimate-approvals')}
              className="text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Estimate Approvals
            </Button>
          </div>
          
          {/* Header Info and Toggle Buttons */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{estimate.estimate_number}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>{estimate.jobs.job_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{estimate.jobs.lead.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-semibold text-green-600">{formatCurrency(estimate.total_amount)}</span>
                </div>
                <Badge className={getStatusColor(estimate.status)}>
                  {estimate.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </div>
            
            {/* Toggle Buttons */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowEstimateDetails(!showEstimateDetails)}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Estimate Details
                {showEstimateDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowClientInfo(!showClientInfo)}
                className="flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                Client Info
                {showClientInfo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Collapsible Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Estimate Details - Collapsible */}
            <div className={`transition-all duration-200 ${showEstimateDetails ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
            {showEstimateDetails && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    Estimate Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-sm text-slate-500 mb-1">Estimate Number</div>
                    <div className="text-lg font-bold text-slate-900">{estimate.estimate_number}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 mb-1">Project</div>
                    <div className="font-medium text-slate-800 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-slate-400" />
                      {estimate.jobs.job_name}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 mb-1">Date Created</div>
                    <div className="text-slate-700 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      {formatDate(estimate.created_at)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 mb-1">Status</div>
                    <Badge className={getStatusColor(estimate.status)}>
                      {estimate.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
            </div>

            {/* Client Information - Collapsible */}
            <div className={`transition-all duration-200 ${showClientInfo ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
            {showClientInfo && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5 text-green-600" />
                    Client Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-sm text-slate-500 mb-1">Client Name</div>
                    <div className="font-medium text-slate-800">{estimate.jobs.lead.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 mb-1">Email</div>
                    <div className="font-medium text-slate-800">{estimate.jobs.lead.email}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 mb-1">Phone</div>
                    <div className="font-medium text-slate-800">{estimate.jobs.lead.phone}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 mb-1">Address</div>
                    <div className="font-medium text-slate-800">
                      {estimate.jobs.lead.address}
                      {estimate.jobs.lead.city && `, ${estimate.jobs.lead.city}`}
                      {estimate.jobs.lead.state && `, ${estimate.jobs.lead.state}`}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 mb-1">Service Type</div>
                    <div className="text-slate-700 capitalize">{estimate.jobs.service_type}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 mb-1">Created By</div>
                    <div className="text-slate-700">{estimate.created_by_user.full_name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 mb-1">Total Amount</div>
                    <div className="text-2xl font-bold text-green-600">
                      <DollarSign className="h-5 w-5 inline mr-1" />
                      {formatCurrency(estimate.total_amount)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            </div>
          </div>

          {/* Actions Card - Always Visible */}
          <div className="mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5 text-orange-600" />
                  Actions
                  {/* Debug indicator */}
                  {isEditing && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 ml-2">
                      EDITING MODE
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                
                {/* Document Actions */}
                <div className="space-y-2">
                  <div className="text-sm text-slate-500 mb-2">Document Actions</div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleQuickPDF}
                    disabled={loading || pdfLoading}
                    className="w-full"
                  >
                    {pdfLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600 mr-2"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Quick PDF
                      </>
                    )}
                  </Button>
                </div>

                {/* Edit Actions */}
                <div className="space-y-2">
                  <div className="text-sm text-slate-500 mb-2">Edit Actions</div>
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <Button size="sm" onClick={saveChanges} className="bg-green-600 hover:bg-green-700 flex-1">
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => {
                        console.log('🖊️ Entering edit mode')
                        setIsEditing(true)
                      }} className="w-full">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Estimate
                      </Button>
                    )}
                  </div>
                </div>

                {/* Approval Actions */}
                {user?.role === 'manager' && estimate.status === 'pending_approval' && (
                  <div className="space-y-2">
                    <div className="text-sm text-slate-500 mb-2">Manager Actions</div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={approveEstimate}
                        className="bg-green-600 hover:bg-green-700 flex-1"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={rejectEstimate}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-1"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Measurement Photos Section */}
          {measurementPhotos.length > 0 && (
            <div className="mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Camera className="h-5 w-5 text-purple-600" />
                    Measurement Photos ({measurementPhotos.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {measurementPhotos.map((photo, index) => (
                      <div key={index} className="aspect-square bg-slate-100 rounded-lg overflow-hidden group cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all">
                        <img 
                          src={photo} 
                          alt={`Measurement photo ${index + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          onClick={() => window.open(photo, '_blank')}
                          loading="lazy"
                          width="200"
                          height="200"
                          style={{ aspectRatio: '1 / 1' }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-slate-500 mt-3">
                    Click on any photo to view full size
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Estimate Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Service Breakdown */}
            <div className="space-y-6">
              {Object.entries(groupedLineItems).map(([serviceType, items]) => {
                const serviceTotal = items.reduce((sum, item) => {
                  const editedItem = editedItems[item.id]
                  const quantity = editedItem?.quantity ?? item.quantity
                  const unitPrice = editedItem?.unit_price ?? item.unit_price
                  return sum + (quantity * unitPrice)
                }, 0)

                return (
                  <div key={serviceType} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-medium text-lg text-blue-600">{serviceType}</h3>
                      <span className="font-semibold text-green-600 text-lg">
                        {formatCurrency(serviceTotal)}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      {items.map((item) => {
                        const editedItem = editedItems[item.id] || {}
                        const currentQuantity = editedItem.quantity ?? item.quantity
                        const currentUnitPrice = editedItem.unit_price ?? item.unit_price
                        const lineTotal = currentQuantity * currentUnitPrice

                        return (
                          <div key={item.id} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-medium text-slate-900">{item.description}</h4>
                                <p className="text-sm text-slate-600">
                                  2x6 Framing • 1 wall
                                </p>
                              </div>
                              <span className="font-semibold text-green-600 text-lg">
                                {formatCurrency(lineTotal)}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm text-slate-600 mb-1">
                                  Square Feet
                                </label>
                                {isEditing ? (
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={currentQuantity}
                                    onChange={(e) => {
                                      const newQuantity = parseFloat(e.target.value) || 0
                                      console.log(`📝 Updating quantity for ${item.id}: ${newQuantity}`)
                                      setEditedItems(prev => ({
                                        ...prev,
                                        [item.id]: { ...prev[item.id], quantity: newQuantity }
                                      }))
                                    }}
                                    className="w-full border-2 border-blue-300 rounded px-3 py-2 text-lg font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                                    placeholder="Enter sq ft"
                                  />
                                ) : (
                                  <div className="text-lg font-medium">{currentQuantity} sq ft</div>
                                )}
                              </div>
                              
                              <div>
                                <label className="block text-sm text-slate-600 mb-1">
                                  Unit Price ($/sq ft)
                                </label>
                                {isEditing ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={currentUnitPrice}
                                    onChange={(e) => {
                                      const newPrice = parseFloat(e.target.value) || 0
                                      console.log(`💰 Updating price for ${item.id}: $${newPrice}`)
                                      setEditedItems(prev => ({
                                        ...prev,
                                        [item.id]: { ...prev[item.id], unit_price: newPrice }
                                      }))
                                    }}
                                    className="w-full border-2 border-blue-300 rounded px-3 py-2 text-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                                    placeholder="Enter price per sq ft"
                                  />
                                ) : (
                                  <div className="text-lg">
                                    {formatCurrency(currentUnitPrice)}
                                    <span className="text-sm text-slate-500 ml-2">
                                      ({formatCurrency(currentUnitPrice)} default)
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            <Separator className="my-8" />

            {/* Totals */}
            <div className="bg-green-50 rounded-lg p-6">
              <h3 className="font-bold text-lg mb-4">ESTIMATE TOTALS</h3>
              
              <div className="space-y-3">
                {(() => {
                  const calculatedSubtotal = estimate.estimate_line_items.reduce((sum, item) => {
                    const editedItem = editedItems[item.id]
                    const quantity = editedItem?.quantity ?? item.quantity
                    const unitPrice = editedItem?.unit_price ?? item.unit_price
                    return sum + (quantity * unitPrice)
                  }, 0)
                  
                  const calculatedTotal = calculatedSubtotal

                  return (
                    <>
                      <div className="flex justify-between items-center text-lg">
                        <span className="font-medium text-slate-700">Subtotal:</span>
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(calculatedSubtotal)}
                        </span>
                      </div>
                      
                      <Separator />
                      
                      <div className="flex justify-between items-center text-2xl">
                        <span className="font-bold text-slate-900">TOTAL:</span>
                        <span className="font-bold text-green-600">
                          {formatCurrency(calculatedTotal)}
                        </span>
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>

            {/* Footer Info */}
            <div className="mt-8 pt-6 border-t text-center text-sm text-slate-500">
              Created by {estimate.created_by_user.full_name} ({estimate.created_by_user.email})
              <br />
              Service Type: {estimate.jobs.service_type}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
