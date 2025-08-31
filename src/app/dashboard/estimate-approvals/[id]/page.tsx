"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { 
  ArrowLeft,
  CheckCircle2, 
  XCircle, 
  DollarSign, 
  Calendar,
  User,
  MapPin,
  Phone,
  Mail,
  FileText,
  Calculator,
  Ruler,
  Home,
  Building2,
  Hash,
  Edit,
  Printer,
  Send,
  Download
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

interface EstimateDetail {
  id: string
  estimate_number: string
  subtotal: number
  total_amount: number
  markup_percentage: number
  status: string
  created_at: string
  jobs: {
    id: string
    job_name: string
    service_type: string
    total_square_feet: number
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
  measurements: any[]
  estimate_line_items: any[]
}

export default function EstimateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [estimate, setEstimate] = useState<EstimateDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [estimateId, setEstimateId] = useState<string>('')
  const [editedMeasurements, setEditedMeasurements] = useState<any>({})
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const resolvedParams = await params
      setEstimateId(resolvedParams.id)
      loadUser()
      loadEstimateDetail(resolvedParams.id)
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

  const loadEstimateDetail = async (id: string) => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      // Fetch estimate details
      const response = await fetch(`/api/estimates/${id}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      const result = await response.json()
      
      if (result.success) {
        // Fetch measurements for the job
        const measurementsResponse = await fetch(`/api/jobs/${result.data.jobs.id}/measurements`, {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          }
        })
        const measurementsResult = await measurementsResponse.json()
        
        const enhancedEstimate = {
          ...result.data,
          measurements: measurementsResult.success ? measurementsResult.data : []
        }
        
        setEstimate(enhancedEstimate)
      }
    } catch (error) {
      console.error('Error loading estimate:', error)
      toast.error('Failed to load estimate details')
    } finally {
      setLoading(false)
    }
  }

  const approveEstimate = async () => {
    if (user?.role !== 'manager') {
      toast.error('Only managers can approve estimates')
      return
    }

    try {
      const response = await fetch(`/api/estimates/${estimateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'approved',
          approved_at: new Date().toISOString()
        })
      })

      if (response.ok) {
        toast.success('Estimate approved successfully')
        loadEstimateDetail(estimateId)
      }
    } catch (error) {
      toast.error('Failed to approve estimate')
    }
  }

  const rejectEstimate = async () => {
    if (user?.role !== 'manager') {
      toast.error('Only managers can reject estimates')
      return
    }

    try {
      const response = await fetch(`/api/estimates/${estimateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' })
      })

      if (response.ok) {
        toast.success('Estimate rejected')
        loadEstimateDetail(estimateId)
      }
    } catch (error) {
      toast.error('Failed to reject estimate')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading estimate details...</p>
        </div>
      </div>
    )
  }

  if (!estimate) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="text-center py-12">
            <p>Estimate not found</p>
            <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Group measurements by area type for better organization
  const groupedMeasurements = estimate.measurements?.reduce((acc: any, m: any) => {
    const key = m.area_type || 'other'
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard/estimate-approvals')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Estimates
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-xl font-bold">{estimate.estimate_number}</h1>
                <p className="text-sm text-slate-600">{estimate.jobs.job_name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge className={getStatusColor(estimate.status)}>
                {estimate.status.replace('_', ' ').toUpperCase()}
              </Badge>
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                {user?.role === 'manager' && estimate.status === 'pending_approval' && (
                  <>
                    <Button
                      size="sm"
                      onClick={approveEstimate}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={rejectEstimate}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Single Large Card Invoice Style */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="shadow-xl">
          {/* Header Section - Client Info */}
          <div className="bg-gradient-to-r from-blue-50 to-green-50 p-8 border-b">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Side - Bill To */}
              <div>
                <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3">Bill To:</h2>
                <div className="space-y-1">
                  <p className="text-xl font-bold text-slate-900">{estimate.jobs.lead?.name}</p>
                  <p className="text-slate-700">{estimate.jobs.lead?.address}</p>
                  <p className="text-slate-700">{estimate.jobs.lead?.city}, {estimate.jobs.lead?.state}</p>
                  <div className="flex items-center gap-4 mt-3 text-sm">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {estimate.jobs.lead?.phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {estimate.jobs.lead?.email}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Right Side - Estimate Info */}
              <div className="text-right">
                <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3">Estimate Details:</h2>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-slate-900">{estimate.estimate_number}</p>
                  <p className="text-sm text-slate-600">Date: {new Date(estimate.created_at).toLocaleDateString()}</p>
                  <p className="text-sm text-slate-600">Valid Until: {estimate.valid_until ? new Date(estimate.valid_until).toLocaleDateString() : 'N/A'}</p>
                  <p className="text-sm text-slate-600">Prepared By: {estimate.created_by_user?.full_name}</p>
                  <p className="text-sm text-slate-600">Service: <span className="font-medium capitalize">{estimate.jobs.service_type}</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Section - Measurements */}
          <div className="p-8">
            <h3 className="text-lg font-semibold mb-4">Spray Foam Installation - Line Items</h3>
            
            {estimate.measurements && estimate.measurements.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-300">
                      <th className="text-left py-3 px-2 text-sm font-semibold text-slate-700">Room/Area</th>
                      <th className="text-left py-3 px-2 text-sm font-semibold text-slate-700">Type</th>
                      <th className="text-center py-3 px-2 text-sm font-semibold text-slate-700">Inches</th>
                      <th className="text-center py-3 px-2 text-sm font-semibold text-slate-700">Sq Ft</th>
                      <th className="text-right py-3 px-2 text-sm font-semibold text-slate-700">Price/Sq Ft</th>
                      <th className="text-right py-3 px-2 text-sm font-semibold text-slate-700">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estimate.measurements.map((m: any, idx: number) => {
                      // Get insulation thickness in inches
                      const inches = m.closed_cell_inches || m.open_cell_inches || 
                                   (m.insulation_type === 'closed_cell' ? 3 : 
                                    m.insulation_type === 'open_cell' ? 6 : 4)
                      
                      // Use edited values if available, otherwise use original
                      const currentSqFt = editedMeasurements[m.id]?.square_feet || m.square_feet
                      const currentPricePerSqFt = editedMeasurements[m.id]?.price_per_sqft || 
                                                 (m.insulation_type === 'closed_cell' ? 5.70 : 
                                                  m.insulation_type === 'open_cell' ? 3.20 : 4.50)
                      const lineTotal = currentSqFt * currentPricePerSqFt
                      
                      return (
                        <tr key={m.id || idx} className="border-b hover:bg-slate-50">
                          <td className="py-3 px-2">
                            <div>
                              <p className="font-medium">{m.room_name}</p>
                              <p className="text-xs text-slate-500">{m.area_type} - {m.surface_type}</p>
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <span className="text-sm font-medium">{m.insulation_type || 'TBD'}</span>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className="text-sm font-medium">{inches}"</span>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <input
                              type="number"
                              step="0.1"
                              defaultValue={currentSqFt?.toFixed(1)}
                              className="w-20 text-center border rounded px-2 py-1 text-sm font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              onChange={(e) => {
                                const newSqFt = parseFloat(e.target.value) || 0
                                setEditedMeasurements(prev => ({
                                  ...prev,
                                  [m.id]: { ...prev[m.id], square_feet: newSqFt }
                                }))
                              }}
                            />
                          </td>
                          <td className="py-3 px-2 text-right">
                            <input
                              type="number"
                              step="0.01"
                              defaultValue={currentPricePerSqFt.toFixed(2)}
                              className="w-24 text-right border rounded px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              onChange={(e) => {
                                const newPrice = parseFloat(e.target.value) || 0
                                setEditedMeasurements(prev => ({
                                  ...prev,
                                  [m.id]: { ...prev[m.id], price_per_sqft: newPrice }
                                }))
                              }}
                            />
                          </td>
                          <td className="py-3 px-2 text-right font-medium">{formatCurrency(lineTotal)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                No measurements found for this estimate
              </div>
            )}
            
            {/* Totals Section */}
            <div className="mt-8 pt-6 border-t-2 border-slate-300">
              <div className="max-w-md ml-auto space-y-2">
                {(() => {
                  // Calculate updated totals based on edited values
                  let totalSqFt = 0
                  let calculatedSubtotal = 0
                  
                  estimate.measurements?.forEach((m: any) => {
                    const currentSqFt = editedMeasurements[m.id]?.square_feet || m.square_feet || 0
                    const currentPrice = editedMeasurements[m.id]?.price_per_sqft || 
                                       (m.insulation_type === 'closed_cell' ? 5.70 : 
                                        m.insulation_type === 'open_cell' ? 3.20 : 4.50)
                    
                    totalSqFt += currentSqFt
                    calculatedSubtotal += currentSqFt * currentPrice
                  })
                  
                  const markupAmount = calculatedSubtotal * ((estimate.markup_percentage || 6.25) / 100)
                  const totalAmount = calculatedSubtotal + markupAmount
                  
                  return (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Total Square Feet:</span>
                        <span className="font-semibold">{totalSqFt.toFixed(1)} ft²</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Subtotal:</span>
                        <span className="font-semibold">{formatCurrency(calculatedSubtotal)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Markup ({estimate.markup_percentage || 6.25}%):</span>
                        <span className="font-semibold">{formatCurrency(markupAmount)}</span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between items-center text-xl">
                        <span className="font-bold">Total Amount:</span>
                        <span className="font-bold text-green-600">{formatCurrency(totalAmount)}</span>
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>

            {/* Notes Section if needed */}
            {estimate.notes && (
              <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">Notes:</h4>
                <p className="text-sm text-slate-600">{estimate.notes}</p>
              </div>
            )}

            {/* Manager Approval Section */}
            {user?.role === 'manager' && estimate.status === 'pending_approval' && (
              <div className="mt-8 p-6 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                <h4 className="font-semibold text-lg mb-4 text-yellow-800">Manager Approval Required</h4>
                <div className="flex gap-4">
                  <Button
                    onClick={approveEstimate}
                    className="bg-green-600 hover:bg-green-700 flex-1"
                    size="lg"
                  >
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Approve Estimate
                  </Button>
                  <Button
                    variant="outline"
                    onClick={rejectEstimate}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-1"
                    size="lg"
                  >
                    <XCircle className="h-5 w-5 mr-2" />
                    Reject Estimate
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
