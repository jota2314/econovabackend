/**
 * HVAC Measurement Component - Main orchestrator for HVAC measurements
 */

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Wrench, Calculator, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { HvacForm } from './HvacForm'
import { HvacPricing } from './HvacPricing'
import { useMeasurementApi } from '../../shared/hooks/useMeasurementApi'
import { HvacMeasurement as HvacMeasurementType } from './types'
import { MeasurementFormProps } from '../../types'
import { logger } from '@/lib/services/logger'

interface HvacMeasurementProps extends Omit<MeasurementFormProps<HvacMeasurementType>, 'serviceType'> {
  onEstimateGenerate?: (measurements: HvacMeasurementType[]) => void
  onPdfGenerate?: (measurements: HvacMeasurementType[]) => void
  showPricing?: boolean
  showEstimateActions?: boolean
}

export function HvacMeasurement({ 
  jobId,
  measurements: initialMeasurements = [],
  onMeasurementsChange,
  onSave,
  onEstimateGenerate,
  onPdfGenerate,
  isManager = false,
  loading: externalLoading = false,
  showPricing = true,
  showEstimateActions = false
}: HvacMeasurementProps) {
  const [measurements, setMeasurements] = useState<HvacMeasurementType[]>(initialMeasurements)
  const [activeTab, setActiveTab] = useState('measurements')
  const [generatingEstimate, setGeneratingEstimate] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  const api = useMeasurementApi<HvacMeasurementType>('hvac', 'hvac_measurements')

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

  const loadMeasurements = async () => {
    try {
      logger.info('Loading HVAC measurements', { jobId })
      const data = await api.loadMeasurements(jobId)
      setMeasurements(data)
      onMeasurementsChange?.(data)
    } catch (error) {
      logger.error('Failed to load HVAC measurements', error, { jobId })
      // Error already handled in API hook
    }
  }

  const handleMeasurementsChange = (newMeasurements: HvacMeasurementType[]) => {
    setMeasurements(newMeasurements)
    onMeasurementsChange?.(newMeasurements)
  }

  const handleSave = async (measurementsToSave: HvacMeasurementType[]) => {
    try {
      logger.info('Saving HVAC measurements', { jobId, count: measurementsToSave.length })
      
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
      logger.error('Failed to save HVAC measurements', error, { jobId })
      // Error already handled in API hook
    }
  }

  const handleGenerateEstimate = async () => {
    if (measurements.length === 0) {
      toast.error('Please add HVAC measurements first')
      return
    }

    setGeneratingEstimate(true)
    try {
      logger.info('Generating HVAC estimate', { jobId, measurementCount: measurements.length })
      
      if (onEstimateGenerate) {
        await onEstimateGenerate(measurements)
        toast.success('HVAC estimate generated successfully')
      } else {
        toast.error('Estimate generation not configured')
      }
    } catch (error) {
      logger.error('Failed to generate HVAC estimate', error, { jobId })
      toast.error('Failed to generate estimate')
    } finally {
      setGeneratingEstimate(false)
    }
  }

  const handleGeneratePdf = async () => {
    if (measurements.length === 0) {
      toast.error('Please add HVAC measurements first')
      return
    }

    setGeneratingPdf(true)
    try {
      logger.info('Generating HVAC PDF', { jobId, measurementCount: measurements.length })
      
      if (onPdfGenerate) {
        await onPdfGenerate(measurements)
        toast.success('HVAC PDF generated successfully')
      } else {
        toast.error('PDF generation not configured')
      }
    } catch (error) {
      logger.error('Failed to generate HVAC PDF', error, { jobId })
      toast.error('Failed to generate PDF')
    } finally {
      setGeneratingPdf(false)
    }
  }

  const isLoading = externalLoading || api.loading
  const isSaving = api.saving

  if (isLoading && measurements.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading HVAC measurements...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const tabsList = [
    { value: 'measurements', label: 'Measurements', icon: Wrench }
  ]

  if (showPricing) {
    tabsList.push({ value: 'pricing', label: 'Pricing', icon: Calculator })
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          {tabsList.map(tab => {
            const Icon = tab.icon
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            )
          })}
        </TabsList>

        <TabsContent value="measurements" className="space-y-4">
          <HvacForm
            jobId={jobId}
            measurements={measurements}
            onMeasurementsChange={handleMeasurementsChange}
            onSave={handleSave}
            loading={isLoading}
            saving={isSaving}
          />
        </TabsContent>

        {showPricing && (
          <TabsContent value="pricing" className="space-y-4">
            <HvacPricing measurements={measurements} />
            
            {showEstimateActions && measurements.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Estimate Actions</h4>
                      <p className="text-sm text-muted-foreground">
                        Generate formal estimates and documentation
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleGenerateEstimate}
                        disabled={generatingEstimate || measurements.length === 0}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        {generatingEstimate ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Calculator className="h-4 w-4" />
                        )}
                        Generate Estimate
                      </Button>
                      <Button
                        onClick={handleGeneratePdf}
                        disabled={generatingPdf || measurements.length === 0}
                        className="flex items-center gap-2"
                      >
                        {generatingPdf ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                        Generate PDF
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}