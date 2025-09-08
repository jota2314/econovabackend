/**
 * Enhanced HVAC Pricing Display Component - Professional HVAC Pricing Breakdown
 */

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  DollarSign, 
  Zap, 
  Wrench, 
  Trash2, 
  Award,
  AlertTriangle,
  Clock,
  Calculator,
  TrendingUp,
  CheckCircle,
  XCircle
} from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { 
  EnhancedHvacMeasurement,
  HvacJobSummary
} from './types-enhanced'
import { hvacPricingService } from './pricing-service'
import { formatCurrency } from '@/lib/utils/pricing-calculator'

interface EnhancedHvacPricingProps {
  measurements: EnhancedHvacMeasurement[]
  showDetailed?: boolean
  showValidation?: boolean
  className?: string
  onQuickEstimate?: (systemType: string, tonnage: number) => void
}

export function EnhancedHvacPricing({ 
  measurements, 
  showDetailed = true,
  showValidation = true,
  className,
  onQuickEstimate
}: EnhancedHvacPricingProps) {
  
  const jobSummary = useMemo<HvacJobSummary>(() => {
    return hvacPricingService.calculateJobSummary(measurements)
  }, [measurements])

  const validationResults = useMemo(() => {
    if (!showValidation) return []
    return measurements.map((measurement, index) => ({
      systemNumber: measurement.system_number,
      ...hvacPricingService.validateSystemSpecs(measurement)
    }))
  }, [measurements, showValidation])

  if (measurements.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground space-y-4">
            <Calculator className="h-12 w-12 mx-auto opacity-50" />
            <div>
              <h3 className="font-semibold text-lg mb-2">No HVAC Systems to Price</h3>
              <p>Add HVAC systems to see pricing calculations</p>
            </div>
            
            {onQuickEstimate && (
              <div className="pt-4">
                <h4 className="font-medium mb-3">Quick Estimate Calculator</h4>
                <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onQuickEstimate('central_air', 2.5)}
                  >
                    2.5T Central Air
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onQuickEstimate('heat_pump', 3.0)}
                  >
                    3T Heat Pump
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onQuickEstimate('furnace', 4.0)}
                  >
                    4T Furnace
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onQuickEstimate('mini_split', 1.5)}
                  >
                    1.5T Mini Split
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const getSystemTypeIcon = (systemType: string) => {
    switch (systemType) {
      case 'central_air': return '❄️'
      case 'heat_pump': return '🔥❄️'
      case 'furnace': return '🔥'
      case 'mini_split': return '💨'
      default: return '🏠'
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Job Summary Header */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            HVAC Project Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Total Cost */}
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {formatCurrency(jobSummary.pricing.jobTotals.grandTotal)}
              </div>
              <div className="text-sm text-muted-foreground">Total Project Cost</div>
            </div>
            
            {/* Systems Count */}
            <div className="text-center">
              <div className="text-2xl font-semibold">{jobSummary.totalSystems}</div>
              <div className="text-sm text-muted-foreground">
                HVAC System{jobSummary.totalSystems !== 1 ? 's' : ''}
              </div>
            </div>
            
            {/* Total Tonnage */}
            <div className="text-center">
              <div className="text-2xl font-semibold">{jobSummary.totalTonnage}</div>
              <div className="text-sm text-muted-foreground">Total Tons</div>
            </div>
            
            {/* Timeline */}
            <div className="text-center">
              <div className="text-2xl font-semibold flex items-center justify-center gap-1">
                <Clock className="h-5 w-5" />
                {jobSummary.timeline.estimatedInstallDays}
              </div>
              <div className="text-sm text-muted-foreground">
                Estimated Install Days
              </div>
              <div className="text-xs text-muted-foreground">
                ({Math.round(jobSummary.timeline.estimatedLaborHours)} labor hours)
              </div>
            </div>
          </div>

          {/* Cost Breakdown Bar */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Cost Breakdown</span>
              <span className="text-sm text-muted-foreground">
                {formatCurrency(jobSummary.pricing.jobTotals.grandTotal)}
              </span>
            </div>
            
            <div className="space-y-2">
              {/* Materials */}
              <div className="flex items-center gap-2">
                <div className="w-16 text-xs text-muted-foreground">Materials</div>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full"
                    style={{
                      width: `${(jobSummary.pricing.jobTotals.totalMaterials / jobSummary.pricing.jobTotals.grandTotal) * 100}%`
                    }}
                  />
                </div>
                <div className="w-20 text-xs text-right">
                  {formatCurrency(jobSummary.pricing.jobTotals.totalMaterials)}
                </div>
              </div>
              
              {/* Labor */}
              <div className="flex items-center gap-2">
                <div className="w-16 text-xs text-muted-foreground">Labor</div>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full"
                    style={{
                      width: `${(jobSummary.pricing.jobTotals.totalLabor / jobSummary.pricing.jobTotals.grandTotal) * 100}%`
                    }}
                  />
                </div>
                <div className="w-20 text-xs text-right">
                  {formatCurrency(jobSummary.pricing.jobTotals.totalLabor)}
                </div>
              </div>
              
              {/* Additional Services */}
              {jobSummary.pricing.jobTotals.totalAdditionalServices > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-16 text-xs text-muted-foreground">Services</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full"
                      style={{
                        width: `${(jobSummary.pricing.jobTotals.totalAdditionalServices / jobSummary.pricing.jobTotals.grandTotal) * 100}%`
                      }}
                    />
                  </div>
                  <div className="w-20 text-xs text-right">
                    {formatCurrency(jobSummary.pricing.jobTotals.totalAdditionalServices)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Validations */}
      {showValidation && validationResults.some(v => !v.isValid || v.recommendations.length > 0) && (
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
              System Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {validationResults.map((result, index) => (
                <div key={index}>
                  {(!result.isValid || result.recommendations.length > 0) && (
                    <div className="border rounded-lg p-3">
                      <div className="font-medium mb-2 flex items-center gap-2">
                        {result.isValid ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        System {result.systemNumber}
                      </div>
                      
                      {result.warnings.length > 0 && (
                        <div className="mb-2">
                          <div className="text-sm font-medium text-amber-700 mb-1">Warnings:</div>
                          <ul className="text-sm text-amber-600 space-y-1 ml-4">
                            {result.warnings.map((warning, i) => (
                              <li key={i} className="list-disc">{warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {result.recommendations.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-blue-700 mb-1">Recommendations:</div>
                          <ul className="text-sm text-blue-600 space-y-1 ml-4">
                            {result.recommendations.map((rec, i) => (
                              <li key={i} className="list-disc">{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual System Breakdowns */}
      {showDetailed && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Individual System Pricing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" defaultValue={measurements.length === 1 ? ['system-0'] : []}>
              {jobSummary.pricing.individualBreakdowns.map((breakdown, index) => {
                const measurement = measurements[index]
                const isOverridden = !!measurement.price_override
                
                return (
                  <AccordionItem key={index} value={`system-${index}`}>
                    <AccordionTrigger>
                      <div className="flex items-center justify-between w-full mr-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">
                            {getSystemTypeIcon(measurement.system_type)}
                          </span>
                          <div className="text-left">
                            <div className="font-semibold">
                              System {measurement.system_number}: {measurement.system_description}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Badge variant="outline" className="bg-blue-50">
                                {measurement.tonnage} Ton{measurement.tonnage !== 1 ? 's' : ''}
                              </Badge>
                              <Badge variant="outline">
                                {measurement.system_type.replace('_', ' ').toUpperCase()}
                              </Badge>
                              {measurement.manufacturer && (
                                <Badge variant="outline">
                                  {measurement.manufacturer}
                                </Badge>
                              )}
                              {isOverridden && (
                                <Badge className="bg-orange-100 text-orange-800">
                                  Price Override
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            {formatCurrency(breakdown.finalTotal)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {Math.round(breakdown.laborCost.totalHours)} hours
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    
                    <AccordionContent>
                      <div className="space-y-4 mt-4">
                        {/* System Specifications */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <Award className="h-4 w-4" />
                            System Specifications
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <div className="font-medium">AHRI #</div>
                              <div className="text-muted-foreground">
                                {measurement.ahri_number || 'Not specified'}
                              </div>
                            </div>
                            <div>
                              <div className="font-medium">SEER2</div>
                              <div className="text-muted-foreground">
                                {measurement.seer2_rating || 'N/A'}
                              </div>
                            </div>
                            {measurement.system_type === 'heat_pump' && (
                              <div>
                                <div className="font-medium">HSPF2</div>
                                <div className="text-muted-foreground">
                                  {measurement.hspf2_rating || 'N/A'}
                                </div>
                              </div>
                            )}
                            <div>
                              <div className="font-medium">Certified</div>
                              <div className="text-muted-foreground">
                                {measurement.ahri_certified ? '✓ Yes' : '✗ No'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Cost Breakdown */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Materials & Equipment */}
                          <div className="space-y-3">
                            <h4 className="font-medium">Materials & Equipment</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Base System Cost:</span>
                                <span>{formatCurrency(breakdown.baseSystemCost)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Tonnage Premium:</span>
                                <span>{formatCurrency(breakdown.tonnageCost)}</span>
                              </div>
                              {breakdown.ductworkCost > 0 && (
                                <div className="flex justify-between">
                                  <span>Ductwork ({measurement.ductwork_linear_feet} ft):</span>
                                  <span>{formatCurrency(breakdown.ductworkCost)}</span>
                                </div>
                              )}
                              {breakdown.ventsCost.total > 0 && (
                                <div className="flex justify-between">
                                  <span>Vents ({measurement.supply_vents + measurement.return_vents} total):</span>
                                  <span>{formatCurrency(breakdown.ventsCost.total)}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Labor & Services */}
                          <div className="space-y-3">
                            <h4 className="font-medium">Labor & Additional Services</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Installation Labor:</span>
                                <span>{formatCurrency(breakdown.laborCost.totalCost)}</span>
                              </div>
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>({Math.round(breakdown.laborCost.totalHours)} hours × complexity)</span>
                                <span>{breakdown.complexityMultiplier}x multiplier</span>
                              </div>
                              
                              {breakdown.additionalServices.total > 0 && (
                                <>
                                  <Separator className="my-2" />
                                  <div className="font-medium">Additional Services:</div>
                                  {breakdown.additionalServices.systemRemoval > 0 && (
                                    <div className="flex justify-between items-center">
                                      <span className="flex items-center gap-1">
                                        <Trash2 className="h-3 w-3" />
                                        System Removal
                                      </span>
                                      <span>{formatCurrency(breakdown.additionalServices.systemRemoval)}</span>
                                    </div>
                                  )}
                                  {breakdown.additionalServices.electricalUpgrade > 0 && (
                                    <div className="flex justify-between items-center">
                                      <span className="flex items-center gap-1">
                                        <Zap className="h-3 w-3" />
                                        Electrical Upgrade
                                      </span>
                                      <span>{formatCurrency(breakdown.additionalServices.electricalUpgrade)}</span>
                                    </div>
                                  )}
                                  {breakdown.additionalServices.permitFee > 0 && (
                                    <div className="flex justify-between">
                                      <span>Permit Fee</span>
                                      <span>{formatCurrency(breakdown.additionalServices.permitFee)}</span>
                                    </div>
                                  )}
                                  {breakdown.additionalServices.startupTesting > 0 && (
                                    <div className="flex justify-between">
                                      <span>Startup & Testing</span>
                                      <span>{formatCurrency(breakdown.additionalServices.startupTesting)}</span>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Totals */}
                        <div className="border-t pt-3">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Subtotal (before complexity):</span>
                              <span>{formatCurrency(breakdown.subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-muted-foreground">
                              <span>Complexity Adjustment ({breakdown.complexityMultiplier}x):</span>
                              <span>+{formatCurrency(breakdown.totalBeforeOverride - breakdown.subtotal - breakdown.laborCost.totalCost)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-muted-foreground">
                              <span>Labor Cost:</span>
                              <span>{formatCurrency(breakdown.laborCost.totalCost)}</span>
                            </div>
                            
                            {isOverridden && (
                              <>
                                <div className="flex justify-between text-sm text-muted-foreground line-through">
                                  <span>Calculated Total:</span>
                                  <span>{formatCurrency(breakdown.totalBeforeOverride)}</span>
                                </div>
                                <div className="flex justify-between text-orange-700 font-medium">
                                  <span className="flex items-center gap-1">
                                    <AlertTriangle className="h-4 w-4" />
                                    Override Price:
                                  </span>
                                  <span>{formatCurrency(breakdown.priceOverride!)}</span>
                                </div>
                                {measurement.override_reason && (
                                  <div className="text-xs text-muted-foreground italic">
                                    Reason: {measurement.override_reason}
                                  </div>
                                )}
                              </>
                            )}
                            
                            <div className="flex justify-between text-lg font-bold border-t pt-2">
                              <span>System Total:</span>
                              <span>{formatCurrency(breakdown.finalTotal)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Installation Notes */}
                        {(measurement.special_requirements || measurement.notes) && (
                          <div className="bg-blue-50 rounded-lg p-4">
                            <h4 className="font-medium mb-2">Installation Notes</h4>
                            {measurement.special_requirements && (
                              <div className="text-sm mb-2">
                                <span className="font-medium">Special Requirements:</span> {measurement.special_requirements}
                              </div>
                            )}
                            {measurement.notes && (
                              <div className="text-sm">
                                <span className="font-medium">Notes:</span> {measurement.notes}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Project Insights */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Project Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-lg">
                {Math.round(jobSummary.totalTonnage / jobSummary.totalSystems * 10) / 10}
              </div>
              <div className="text-muted-foreground">Average System Size (Tons)</div>
            </div>
            
            <div className="text-center">
              <div className="font-semibold text-lg">
                {formatCurrency(jobSummary.pricing.jobTotals.grandTotal / jobSummary.totalTonnage)}
              </div>
              <div className="text-muted-foreground">Cost per Ton</div>
            </div>
            
            <div className="text-center">
              <div className="font-semibold text-lg">
                {Math.round(jobSummary.pricing.jobTotals.totalLabor / jobSummary.timeline.estimatedLaborHours)}
              </div>
              <div className="text-muted-foreground">Labor Rate (/hour)</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}