/**
 * HVAC Pricing Service - Professional HVAC System Pricing Calculations
 */

import { 
  EnhancedHvacMeasurement, 
  HvacPricingConfig, 
  HvacPricingBreakdown, 
  HvacJobSummary,
  DEFAULT_HVAC_PRICING_CONFIG,
  HvacSystemType 
} from './types-enhanced'
import { logger } from '@/lib/services/logger'
import { formatCurrency } from '@/lib/utils/pricing-calculator'

export class HvacPricingService {
  private config: HvacPricingConfig

  constructor(config: HvacPricingConfig = DEFAULT_HVAC_PRICING_CONFIG) {
    this.config = config
  }

  /**
   * Calculate pricing for a single HVAC system
   */
  calculateSystemPricing(measurement: EnhancedHvacMeasurement): HvacPricingBreakdown {
    logger.debug('Calculating HVAC system pricing', {
      systemNumber: measurement.system_number,
      systemType: measurement.system_type,
      tonnage: measurement.tonnage
    })

    // Base system cost
    const baseSystemCost = this.config.basePrices[measurement.system_type]
    
    // Tonnage-based cost
    const tonnageCost = measurement.tonnage * this.config.tonnageMultipliers[measurement.system_type]
    
    // Ductwork cost
    const ductworkCost = Math.max(
      measurement.ductwork_linear_feet * this.config.ductwork.pricePerFoot,
      measurement.ductwork_linear_feet > 0 ? this.config.ductwork.minimumCharge : 0
    )
    
    // Vents cost
    const supplyVentsCost = measurement.supply_vents * this.config.vents.supplyVentPrice
    const returnVentsCost = measurement.return_vents * this.config.vents.returnVentPrice
    const totalVentsCost = supplyVentsCost + returnVentsCost
    
    // Additional services
    const systemRemovalCost = measurement.existing_system_removal ? 
      this.config.additionalServices.systemRemoval : 0
    const electricalUpgradeCost = measurement.electrical_upgrade_required ? 
      this.config.additionalServices.electricalUpgrade : 0
    const permitFeeCost = measurement.permit_required ? 
      this.config.additionalServices.permitFee : 0
    const startupTestingCost = measurement.startup_testing_required ? 
      this.config.additionalServices.startupTesting : 0
    
    const totalAdditionalServices = systemRemovalCost + electricalUpgradeCost + 
      permitFeeCost + startupTestingCost
    
    // Labor calculations
    const baseLabor = this.config.labor.baseHours * this.config.labor.hourlyRate
    const tonnageLabor = measurement.tonnage * this.config.labor.hoursPerTon * this.config.labor.hourlyRate
    const complexityMultiplier = this.config.complexityMultipliers[measurement.installation_complexity]
    const totalLaborHours = (this.config.labor.baseHours + (measurement.tonnage * this.config.labor.hoursPerTon)) * complexityMultiplier
    const totalLaborCost = totalLaborHours * this.config.labor.hourlyRate
    
    // Subtotal before complexity adjustment
    const subtotal = baseSystemCost + tonnageCost + ductworkCost + totalVentsCost + totalAdditionalServices
    
    // Apply complexity multiplier to material costs
    const totalBeforeOverride = (subtotal * complexityMultiplier) + totalLaborCost
    
    // Apply price override if present
    const finalTotal = measurement.price_override || totalBeforeOverride

    const breakdown: HvacPricingBreakdown = {
      baseSystemCost,
      tonnageCost,
      ductworkCost,
      
      ventsCost: {
        supplyVents: supplyVentsCost,
        returnVents: returnVentsCost,
        total: totalVentsCost
      },
      
      additionalServices: {
        systemRemoval: systemRemovalCost,
        electricalUpgrade: electricalUpgradeCost,
        permitFee: permitFeeCost,
        startupTesting: startupTestingCost,
        total: totalAdditionalServices
      },
      
      laborCost: {
        baseLabor,
        complexityAdjustment: totalLaborCost - baseLabor - tonnageLabor,
        totalHours: totalLaborHours,
        totalCost: totalLaborCost
      },
      
      subtotal,
      complexityMultiplier,
      totalBeforeOverride,
      priceOverride: measurement.price_override,
      finalTotal,
      
      calculatedAt: new Date(),
      systemSpecs: {
        systemType: measurement.system_type,
        tonnage: measurement.tonnage,
        manufacturer: measurement.manufacturer,
        model: `${measurement.outdoor_model} / ${measurement.indoor_model}`
      }
    }

    logger.debug('HVAC pricing calculation completed', {
      systemNumber: measurement.system_number,
      finalTotal: formatCurrency(finalTotal),
      breakdown: {
        baseSystem: formatCurrency(baseSystemCost),
        tonnage: formatCurrency(tonnageCost),
        ductwork: formatCurrency(ductworkCost),
        labor: formatCurrency(totalLaborCost),
        additional: formatCurrency(totalAdditionalServices)
      }
    })

    return breakdown
  }

  /**
   * Calculate pricing for multiple HVAC systems in a job
   */
  calculateJobSummary(measurements: EnhancedHvacMeasurement[]): HvacJobSummary {
    logger.info('Calculating HVAC job summary', { systemCount: measurements.length })

    if (measurements.length === 0) {
      return {
        systems: [],
        totalSystems: 0,
        totalTonnage: 0,
        totalDuctwork: 0,
        totalVents: 0,
        pricing: {
          individualBreakdowns: [],
          jobTotals: {
            subtotal: 0,
            totalLabor: 0,
            totalMaterials: 0,
            totalAdditionalServices: 0,
            grandTotal: 0
          }
        },
        timeline: {
          estimatedInstallDays: 0,
          estimatedLaborHours: 0
        }
      }
    }

    // Calculate individual system breakdowns
    const individualBreakdowns = measurements.map(measurement => 
      this.calculateSystemPricing(measurement)
    )

    // Aggregate totals
    const jobTotals = individualBreakdowns.reduce(
      (totals, breakdown) => ({
        subtotal: totals.subtotal + breakdown.subtotal,
        totalLabor: totals.totalLabor + breakdown.laborCost.totalCost,
        totalMaterials: totals.totalMaterials + (breakdown.subtotal - breakdown.additionalServices.total),
        totalAdditionalServices: totals.totalAdditionalServices + breakdown.additionalServices.total,
        grandTotal: totals.grandTotal + breakdown.finalTotal
      }),
      {
        subtotal: 0,
        totalLabor: 0,
        totalMaterials: 0,
        totalAdditionalServices: 0,
        grandTotal: 0
      }
    )

    // Calculate aggregates
    const totalTonnage = measurements.reduce((sum, m) => sum + m.tonnage, 0)
    const totalDuctwork = measurements.reduce((sum, m) => sum + m.ductwork_linear_feet, 0)
    const totalVents = measurements.reduce((sum, m) => sum + m.supply_vents + m.return_vents, 0)
    const totalLaborHours = individualBreakdowns.reduce((sum, b) => sum + b.laborCost.totalHours, 0)

    // Estimate installation timeline
    const estimatedInstallDays = Math.ceil(totalLaborHours / 8) // Assuming 8-hour work days
    
    const summary: HvacJobSummary = {
      systems: measurements,
      totalSystems: measurements.length,
      totalTonnage,
      totalDuctwork,
      totalVents,
      
      pricing: {
        individualBreakdowns,
        jobTotals
      },
      
      timeline: {
        estimatedInstallDays,
        estimatedLaborHours: totalLaborHours
      }
    }

    logger.info('HVAC job summary completed', {
      totalSystems: measurements.length,
      totalTonnage,
      grandTotal: formatCurrency(jobTotals.grandTotal),
      estimatedDays: estimatedInstallDays
    })

    return summary
  }

  /**
   * Get pricing estimate for system specifications without full measurement
   */
  getQuickEstimate(
    systemType: HvacSystemType,
    tonnage: number,
    ductworkFeet: number = 0,
    complexity: 'standard' | 'moderate' | 'complex' = 'standard'
  ): { estimatedPrice: number; priceRange: { min: number; max: number } } {
    const baseSystem = this.config.basePrices[systemType]
    const tonnageCost = tonnage * this.config.tonnageMultipliers[systemType]
    const ductworkCost = ductworkFeet * this.config.ductwork.pricePerFoot
    const complexityMultiplier = this.config.complexityMultipliers[complexity]
    
    const baseEstimate = (baseSystem + tonnageCost + ductworkCost) * complexityMultiplier
    const laborEstimate = (this.config.labor.baseHours + (tonnage * this.config.labor.hoursPerTon)) * 
      this.config.labor.hourlyRate * complexityMultiplier
    
    const estimatedPrice = baseEstimate + laborEstimate
    
    // Provide a range with ±15% variance
    const variance = 0.15
    const priceRange = {
      min: Math.round(estimatedPrice * (1 - variance)),
      max: Math.round(estimatedPrice * (1 + variance))
    }

    return { estimatedPrice: Math.round(estimatedPrice), priceRange }
  }

  /**
   * Validate system specifications for pricing accuracy
   */
  validateSystemSpecs(measurement: EnhancedHvacMeasurement): {
    isValid: boolean
    warnings: string[]
    recommendations: string[]
  } {
    const warnings: string[] = []
    const recommendations: string[] = []

    // Tonnage validation
    if (measurement.tonnage < 1 || measurement.tonnage > 10) {
      warnings.push(`Tonnage ${measurement.tonnage} is outside typical residential range (1-10 tons)`)
    }

    // SEER2 validation for energy efficiency
    if (measurement.seer2_rating && measurement.seer2_rating < 14) {
      warnings.push(`SEER2 rating ${measurement.seer2_rating} is below minimum efficiency standards`)
      recommendations.push('Consider upgrading to a higher SEER2 rating for energy savings')
    }

    // Heat pump specific validations
    if (measurement.system_type === 'heat_pump') {
      if (!measurement.hspf2_rating) {
        warnings.push('Heat pump systems should have an HSPF2 rating specified')
      }
    }

    // Ductwork recommendations
    const recommendedDuctwork = measurement.tonnage * 150 // Rule of thumb: 150 ft per ton
    if (measurement.ductwork_linear_feet > 0 && 
        Math.abs(measurement.ductwork_linear_feet - recommendedDuctwork) > 100) {
      recommendations.push(
        `Consider reviewing ductwork quantity. Typical: ~${recommendedDuctwork} ft for ${measurement.tonnage} tons`
      )
    }

    // Venting recommendations
    const recommendedSupplyVents = Math.ceil(measurement.tonnage * 2) // 2 vents per ton
    if (measurement.supply_vents > 0 && 
        Math.abs(measurement.supply_vents - recommendedSupplyVents) > 2) {
      recommendations.push(
        `Consider ${recommendedSupplyVents} supply vents for optimal airflow with ${measurement.tonnage} tons`
      )
    }

    return {
      isValid: warnings.length === 0,
      warnings,
      recommendations
    }
  }

  /**
   * Update pricing configuration
   */
  updateConfig(newConfig: Partial<HvacPricingConfig>): void {
    this.config = { ...this.config, ...newConfig }
    logger.info('HVAC pricing configuration updated', { 
      updatedFields: Object.keys(newConfig) 
    })
  }

  /**
   * Get current pricing configuration
   */
  getConfig(): HvacPricingConfig {
    return { ...this.config }
  }
}

// Export singleton instance
export const hvacPricingService = new HvacPricingService()