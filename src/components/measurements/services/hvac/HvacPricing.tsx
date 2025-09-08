/**
 * HVAC Pricing Calculator Component
 */

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { DollarSign, Zap, Wrench, Trash2 } from 'lucide-react'
import { HvacMeasurement, HvacEstimate, HVAC_PRICING_FACTORS } from './types'
import { formatCurrency } from '@/lib/utils/pricing-calculator'

interface HvacPricingProps {
  measurements: HvacMeasurement[]
  className?: string
}

function calculateHvacEstimate(measurement: HvacMeasurement): HvacEstimate {
  const factors = HVAC_PRICING_FACTORS
  
  // Base system cost calculation
  const systemCost = factors.basePrice + (measurement.tonnage * factors.tonnageMultiplier)
  
  // Ductwork cost
  const ductworkCost = measurement.ductwork_linear_feet * factors.ductworkPricePerFoot
  
  // Installation cost with complexity multiplier
  const complexityMultiplier = measurement.installation_complexity === 'complex' ? 1.5 : 
                               measurement.installation_complexity === 'moderate' ? 1.25 : 1.0
  const installationCost = systemCost * 0.3 * complexityMultiplier
  
  // Additional costs
  const removalCost = measurement.existing_system_removal ? factors.removalCost : 0
  const electricalCost = measurement.electrical_work_required ? factors.electricalCost : 0
  
  // Total cost
  const totalCost = systemCost + ductworkCost + installationCost + removalCost + electricalCost
  
  // Estimated labor hours
  const baseLaborHours = 8 + (measurement.tonnage * 2)
  const laborHours = baseLaborHours * complexityMultiplier

  return {
    systemCost,
    ductworkCost,
    installationCost,
    removalCost,
    electricalCost,
    totalCost,
    laborHours
  }
}

export function HvacPricing({ measurements, className }: HvacPricingProps) {
  const estimates = useMemo(() => {
    return measurements.map(measurement => ({
      measurement,
      estimate: calculateHvacEstimate(measurement)
    }))
  }, [measurements])

  const totalEstimate = useMemo(() => {
    return estimates.reduce((total, { estimate }) => total + estimate.totalCost, 0)
  }, [estimates])

  const totalLaborHours = useMemo(() => {
    return estimates.reduce((total, { estimate }) => total + estimate.laborHours, 0)
  }, [estimates])

  if (measurements.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No HVAC measurements to price
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            HVAC Pricing Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Total Summary */}
            <div className="bg-primary/5 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-lg font-semibold">Total Project Cost</span>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(totalEstimate)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Estimated Labor Hours</span>
                <span>{Math.round(totalLaborHours)} hours</span>
              </div>
            </div>

            <Separator />

            {/* Individual System Estimates */}
            <div className="space-y-4">
              {estimates.map(({ measurement, estimate }, index) => (
                <Card key={measurement.id || index} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold">{measurement.room_name}</h4>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline">
                            {measurement.system_type.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <Badge variant="outline">
                            {measurement.tonnage} Ton
                          </Badge>
                          <Badge variant="outline">
                            {measurement.installation_complexity}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold">
                          {formatCurrency(estimate.totalCost)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {Math.round(estimate.laborHours)} hrs
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">System Cost:</span>
                          <span>{formatCurrency(estimate.systemCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Installation:</span>
                          <span>{formatCurrency(estimate.installationCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ductwork:</span>
                          <span>{formatCurrency(estimate.ductworkCost)}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        {estimate.removalCost > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Trash2 className="h-3 w-3" />
                              Removal:
                            </span>
                            <span>{formatCurrency(estimate.removalCost)}</span>
                          </div>
                        )}
                        {estimate.electricalCost > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              Electrical:
                            </span>
                            <span>{formatCurrency(estimate.electricalCost)}</span>
                          </div>
                        )}
                        {measurement.notes && (
                          <div className="text-xs text-muted-foreground mt-2 italic">
                            "{measurement.notes}"
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pricing Details */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <h5 className="font-medium mb-2 flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Pricing Factors
                </h5>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Base Price: {formatCurrency(HVAC_PRICING_FACTORS.basePrice)}</div>
                  <div>Per Ton: {formatCurrency(HVAC_PRICING_FACTORS.tonnageMultiplier)}</div>
                  <div>Ductwork/ft: {formatCurrency(HVAC_PRICING_FACTORS.ductworkPricePerFoot)}</div>
                  <div>Electrical: {formatCurrency(HVAC_PRICING_FACTORS.electricalCost)}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}