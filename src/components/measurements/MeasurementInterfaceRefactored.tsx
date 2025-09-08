/**
 * Refactored Measurement Interface - Proof of Concept
 * This demonstrates how to integrate the modular service-specific components
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Wrench, 
  Home, 
  Palette, 
  Settings,
  ArrowLeft,
  Loader2
} from 'lucide-react'

// Import HVAC service components
import { HvacMeasurement, HvacMeasurement as HvacMeasurementType } from './services/hvac'
import { ServiceType } from './types'
import { logger } from '@/lib/services/logger'

interface Job {
  id: string
  job_name: string
  service_type: ServiceType
  // Add other job properties as needed
}

interface MeasurementInterfaceRefactoredProps {
  job: Job
  onJobUpdate: (updatedJob: Job) => void
  onClose: () => void
}

export function MeasurementInterfaceRefactored({ 
  job, 
  onJobUpdate, 
  onClose 
}: MeasurementInterfaceRefactoredProps) {
  const [serviceType, setServiceType] = useState<ServiceType>(job.service_type || 'insulation')
  const [loading, setLoading] = useState(false)

  // Service-specific state
  const [hvacMeasurements, setHvacMeasurements] = useState<HvacMeasurementType[]>([])

  useEffect(() => {
    logger.info('Measurement interface initialized', { 
      jobId: job.id, 
      serviceType: job.service_type 
    })
  }, [job.id, job.service_type])

  const handleServiceTypeChange = async (newServiceType: ServiceType) => {
    setLoading(true)
    try {
      logger.info('Changing service type', { 
        from: serviceType, 
        to: newServiceType, 
        jobId: job.id 
      })

      setServiceType(newServiceType)
      
      // Update job service type
      const updatedJob = { ...job, service_type: newServiceType }
      onJobUpdate(updatedJob)

      // Clear measurements when switching service types
      // In a real implementation, you might want to save before switching
      if (newServiceType !== 'hvac') {
        setHvacMeasurements([])
      }
    } catch (error) {
      logger.error('Failed to change service type', error, { jobId: job.id })
    } finally {
      setLoading(false)
    }
  }

  const handleHvacMeasurementsChange = (measurements: HvacMeasurementType[]) => {
    setHvacMeasurements(measurements)
    logger.debug('HVAC measurements updated', { 
      jobId: job.id, 
      count: measurements.length 
    })
  }

  const handleHvacSave = async (measurements: HvacMeasurementType[]) => {
    logger.info('HVAC measurements saved', { 
      jobId: job.id, 
      count: measurements.length 
    })
    // Additional logic after save if needed
  }

  const handleHvacEstimateGenerate = async (measurements: HvacMeasurementType[]) => {
    logger.info('Generating HVAC estimate', { 
      jobId: job.id, 
      measurementCount: measurements.length 
    })
    
    // Integration with estimate generation API
    try {
      const response = await fetch(`/api/jobs/${job.id}/estimate/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceType: 'hvac',
          measurements
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate estimate')
      }

      const data = await response.json()
      logger.info('HVAC estimate generated successfully', { jobId: job.id, estimateId: data.id })
    } catch (error) {
      logger.error('Failed to generate HVAC estimate', error, { jobId: job.id })
      throw error
    }
  }

  const handleHvacPdfGenerate = async (measurements: HvacMeasurementType[]) => {
    logger.info('Generating HVAC PDF', { 
      jobId: job.id, 
      measurementCount: measurements.length 
    })
    
    // Integration with PDF generation API
    try {
      const response = await fetch(`/api/jobs/${job.id}/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceType: 'hvac',
          measurements
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `hvac-measurements-${job.id}.pdf`
      a.click()
      
      logger.info('HVAC PDF generated successfully', { jobId: job.id })
    } catch (error) {
      logger.error('Failed to generate HVAC PDF', error, { jobId: job.id })
      throw error
    }
  }

  const getServiceIcon = (type: ServiceType) => {
    switch (type) {
      case 'hvac': return Wrench
      case 'insulation': return Home
      case 'plaster': return Palette
      default: return Settings
    }
  }

  const getServiceColor = (type: ServiceType) => {
    switch (type) {
      case 'hvac': return 'bg-blue-100 text-blue-800'
      case 'insulation': return 'bg-green-100 text-green-800'
      case 'plaster': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const renderServiceContent = () => {
    switch (serviceType) {
      case 'hvac':
        return (
          <HvacMeasurement
            jobId={job.id}
            measurements={hvacMeasurements}
            onMeasurementsChange={handleHvacMeasurementsChange}
            onSave={handleHvacSave}
            onEstimateGenerate={handleHvacEstimateGenerate}
            onPdfGenerate={handleHvacPdfGenerate}
            loading={loading}
            showPricing={true}
            showEstimateActions={true}
          />
        )
      
      case 'insulation':
        return (
          <Card>
            <CardContent className="p-6 text-center">
              <Home className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Insulation Measurements</h3>
              <p className="text-muted-foreground mb-4">
                Insulation measurement component will be implemented next
              </p>
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                Coming Soon
              </Badge>
            </CardContent>
          </Card>
        )
      
      case 'plaster':
        return (
          <Card>
            <CardContent className="p-6 text-center">
              <Palette className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Plaster Measurements</h3>
              <p className="text-muted-foreground mb-4">
                Plaster measurement component will be implemented next
              </p>
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                Coming Soon
              </Badge>
            </CardContent>
          </Card>
        )
      
      default:
        return (
          <Card>
            <CardContent className="p-6 text-center">
              <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Please select a service type to begin measurements
              </p>
            </CardContent>
          </Card>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{job.job_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-muted-foreground">Service Type:</span>
              <Badge className={getServiceColor(serviceType)}>
                {serviceType.charAt(0).toUpperCase() + serviceType.slice(1)}
              </Badge>
            </div>
          </div>
        </div>
        
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        )}
      </div>

      {/* Service Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Service Type</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={serviceType} onValueChange={(value) => handleServiceTypeChange(value as ServiceType)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="hvac" className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                HVAC
              </TabsTrigger>
              <TabsTrigger value="insulation" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Insulation
              </TabsTrigger>
              <TabsTrigger value="plaster" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Plaster
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Service-Specific Content */}
      <div className="min-h-[400px]">
        {renderServiceContent()}
      </div>
    </div>
  )
}

// Export for easy integration
export default MeasurementInterfaceRefactored