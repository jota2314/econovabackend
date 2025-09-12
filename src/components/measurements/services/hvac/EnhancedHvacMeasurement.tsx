/**
 * Enhanced HVAC Measurement Component - Main orchestrator for professional HVAC systems
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Wrench, 
  Calculator, 
  FileText, 
  Loader2,
  Settings,
  Award,
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { toast } from 'sonner'

import { EnhancedHvacForm } from './EnhancedHvacForm'
import { EnhancedHvacPricing } from './EnhancedHvacPricing'
import { PhotoUpload } from '../../shared/components/PhotoUpload'
import { useMeasurementApi } from '../../shared/hooks/useMeasurementApi'
import { 
  EnhancedHvacMeasurement as EnhancedHvacMeasurementType,
  HvacJobSummary
} from './types-enhanced'
import { hvacPricingService } from './pricing-service'
import { MeasurementFormProps } from '../../types'
import { logger } from '@/lib/services/logger'

interface EnhancedHvacMeasurementProps extends Omit<MeasurementFormProps<EnhancedHvacMeasurementType>, 'serviceType'> {
  onEstimateGenerate?: (measurements: EnhancedHvacMeasurementType[], summary: HvacJobSummary) => void
  onPdfGenerate?: (measurements: EnhancedHvacMeasurementType[], summary: HvacJobSummary) => void
  showPricing?: boolean
  showEstimateActions?: boolean
  showPhotos?: boolean
  showValidation?: boolean
}

export function EnhancedHvacMeasurement({ 
  jobId,
  measurements: initialMeasurements = [],
  onMeasurementsChange,
  onSave,
  onEstimateGenerate,
  onPdfGenerate,
  isManager = false,
  loading: externalLoading = false,
  showPricing = true,
  showEstimateActions = false,
  showPhotos = true,
  showValidation = true
}: EnhancedHvacMeasurementProps) {
  const [measurements, setMeasurements] = useState<EnhancedHvacMeasurementType[]>(initialMeasurements)
  const [activeTab, setActiveTab] = useState('measurements')
  const [generatingEstimate, setGeneratingEstimate] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [jobPhotos, setJobPhotos] = useState<string[]>([])
  const [jobSummary, setJobSummary] = useState<HvacJobSummary | null>(null)

  const api = useMeasurementApi<EnhancedHvacMeasurementType>('hvac', 'enhanced_hvac_measurements')

  const loadMeasurements = async () => {
    try {
      logger.info('Loading enhanced HVAC measurements', { jobId })
      const data = await api.loadMeasurements(jobId)
      setMeasurements(data)
      onMeasurementsChange?.(data)
    } catch (error) {
      logger.error('Failed to load enhanced HVAC measurements', error, { jobId })
    }
  }

  // Load measurements on mount if not provided
  useEffect(() => {
    if (initialMeasurements.length === 0 && jobId) {
      loadMeasurements()
    }
  }, [jobId, initialMeasurements.length])

  // Sync with external measurements prop
  useEffect(() => {
    if (initialMeasurements.length > 0) {
      setMeasurements(initialMeasurements)
    }
  }, [initialMeasurements])

  // Calculate job summary when measurements change
  useEffect(() => {
    if (measurements.length > 0) {
      const summary = hvacPricingService.calculateJobSummary(measurements)
      setJobSummary(summary)
    } else {
      setJobSummary(null)
    }
  }, [measurements])

  const handleMeasurementsChange = useCallback((newMeasurements: EnhancedHvacMeasurementType[]) => {
    setMeasurements(newMeasurements)
    onMeasurementsChange?.(newMeasurements)
  }, [onMeasurementsChange])

  const handleSave = async (measurementsToSave: EnhancedHvacMeasurementType[]) => {
    try {
      logger.info('Saving enhanced HVAC measurements', { 
        jobId, 
        count: measurementsToSave.length 
      })
      
      const savedMeasurements = await api.saveMeasurements(jobId, measurementsToSave)
      setMeasurements(savedMeasurements)
      onMeasurementsChange?.(savedMeasurements)
      
      if (onSave) {
        await onSave(savedMeasurements)
      }

      // Switch to pricing tab after successful save
      if (showPricing && savedMeasurements.length > 0) {
        setActiveTab('pricing')
      }
    } catch (error) {
      logger.error('Failed to save enhanced HVAC measurements', error, { jobId })
    }
  }

  const handleEstimateGenerate = async () => {
    if (measurements.length === 0) {
      toast.error('Please add HVAC systems first')
      return
    }

    if (!jobSummary) {
      toast.error('Pricing calculation not available')
      return
    }

    setGeneratingEstimate(true)
    try {
      logger.info('Generating enhanced HVAC estimate', { 
        jobId, 
        systemCount: measurements.length,
        totalCost: jobSummary.pricing.jobTotals.grandTotal
      })
      
      if (onEstimateGenerate) {
        await onEstimateGenerate(measurements, jobSummary)
        toast.success(`HVAC estimate generated for ${measurements.length} system${measurements.length !== 1 ? 's' : ''}`)
      } else {
        toast.error('Estimate generation not configured')
      }
    } catch (error) {
      logger.error('Failed to generate enhanced HVAC estimate', error, { jobId })
      toast.error('Failed to generate estimate')
    } finally {
      setGeneratingEstimate(false)
    }
  }

  const handlePdfGenerate = async () => {
    if (measurements.length === 0) {
      toast.error('Please add HVAC systems first')
      return
    }

    if (!jobSummary) {
      toast.error('Pricing calculation not available')
      return
    }

    setGeneratingPdf(true)
    try {
      logger.info('Generating enhanced HVAC PDF', { 
        jobId, 
        systemCount: measurements.length,
        totalCost: jobSummary.pricing.jobTotals.grandTotal
      })
      
      if (onPdfGenerate) {
        await onPdfGenerate(measurements, jobSummary)
        toast.success('Professional HVAC proposal generated')
      } else {
        toast.error('PDF generation not configured')
      }
    } catch (error) {
      logger.error('Failed to generate enhanced HVAC PDF', error, { jobId })
      toast.error('Failed to generate PDF')
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handleQuickEstimate = (systemType: string, tonnage: number) => {
    const estimate = hvacPricingService.getQuickEstimate(
      systemType as any, 
      tonnage, 
      150, // Default ductwork
      'standard'
    )
    
    toast.info(
      `Quick Estimate: ${systemType.replace('_', ' ')} (${tonnage}T) = ${
        new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD' 
        }).format(estimate.estimatedPrice)
      }`,
      { duration: 5000 }
    )
  }

  const isLoading = externalLoading || api.loading
  const isSaving = api.saving

  // Get validation status
  const hasValidationIssues = jobSummary?.systems.some(system => 
    !hvacPricingService.validateSystemSpecs(system).isValid
  )

  if (isLoading && measurements.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading professional HVAC measurements...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const tabsList = [
    { value: 'measurements', label: 'Systems', icon: Wrench, count: measurements.length },
    ...(showPricing ? [{ value: 'pricing', label: 'Pricing', icon: Calculator, count: null }] : []),
    ...(showPhotos ? [{ value: 'photos', label: 'Photos', icon: FileText, count: jobPhotos.length }] : [])
  ]

  return (
    <div className="space-y-6">
      {/* Header with Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold">Professional HVAC Systems</h2>
          </div>
          
          {measurements.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Settings className="h-3 w-3" />
                {measurements.length} System{measurements.length !== 1 ? 's' : ''}
              </Badge>
              
              {jobSummary && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {jobSummary.totalTonnage} Tons Total
                </Badge>
              )}
              
              {showValidation && hasValidationIssues && (
                <Badge className="bg-amber-100 text-amber-800 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Review Needed
                </Badge>
              )}
              
              {showValidation && !hasValidationIssues && measurements.length > 0 && (
                <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Validated
                </Badge>
              )}
            </div>
          )}
        </div>
        
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </div>
        )}
      </div>

      {/* Tabs Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          {tabsList.map(tab => {
            const Icon = tab.icon
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.count !== null && tab.count > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                    {tab.count}
                  </Badge>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {/* Measurements Tab */}
        <TabsContent value="measurements" className="space-y-4">
          <EnhancedHvacForm
            jobId={jobId}
            measurements={measurements}
            onMeasurementsChange={handleMeasurementsChange}
            onSave={handleSave}
            loading={isLoading}
            saving={isSaving}
            isManager={isManager}
          />
        </TabsContent>

        {/* Pricing Tab */}
        {showPricing && (
          <TabsContent value="pricing" className="space-y-4">
            <EnhancedHvacPricing 
              measurements={measurements}
              showDetailed={true}
              showValidation={showValidation}
              onQuickEstimate={handleQuickEstimate}
            />
            
            {showEstimateActions && measurements.length > 0 && jobSummary && (
              <Card className="border-l-4 border-l-green-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Professional Documentation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Project Summary</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>• {measurements.length} HVAC system{measurements.length !== 1 ? 's' : ''}</div>
                        <div>• {jobSummary.totalTonnage} tons total capacity</div>
                        <div>• {jobSummary.timeline.estimatedInstallDays} day installation</div>
                        <div>• Total project value: {new Intl.NumberFormat('en-US', { 
                          style: 'currency', 
                          currency: 'USD' 
                        }).format(jobSummary.pricing.jobTotals.grandTotal)}</div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={handleEstimateGenerate}
                        disabled={generatingEstimate || measurements.length === 0}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        {generatingEstimate ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Calculator className="h-4 w-4" />
                            Generate Estimate
                          </>
                        )}
                      </Button>
                      
                      <Button
                        onClick={handlePdfGenerate}
                        disabled={generatingPdf || measurements.length === 0}
                        className="flex items-center gap-2"
                      >
                        {generatingPdf ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Generating PDF...
                          </>
                        ) : (
                          <>
                            <Award className="h-4 w-4" />
                            Generate Professional Proposal
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* Photos Tab */}
        {showPhotos && (
          <TabsContent value="photos" className="space-y-4">
            <PhotoUpload
              jobId={jobId}
              photos={jobPhotos}
              onPhotosChange={setJobPhotos}
              maxPhotos={20}
              allowMultiple={true}
              className="min-h-[300px]"
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}