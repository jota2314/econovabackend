/**
 * Insulation calculation utilities
 * Handles R-value calculations, pricing, and hybrid systems
 */

import { DEFAULT_PRICING } from '@/lib/constants/pricing'
import type { InsulationType, HybridSystemCalculation } from '@/types'

export interface InsulationCalculation {
  square_feet: number
  insulation_type: InsulationType
  thickness_inches?: number
  r_value: string
  material_cost: number
  labor_cost: number
  total_cost: number
}

/**
 * Calculates R-value for given insulation type and thickness
 */
export function calculateRValue(
  insulationType: InsulationType, 
  thicknessInches: number
): number {
  const rValueMap = {
    closed_cell: DEFAULT_PRICING.INSULATION.closed_cell.r_value_per_inch,
    open_cell: DEFAULT_PRICING.INSULATION.open_cell.r_value_per_inch,
    batt: 3.2, // Standard fiberglass batt
    blown_in: 2.2, // Blown-in fiberglass
    hybrid: 0 // Calculated separately
  }

  return (rValueMap[insulationType as keyof typeof rValueMap] || 0) * thicknessInches
}

/**
 * Calculates hybrid system R-value and pricing
 */
export function calculateHybridSystem(
  closedCellInches: number,
  openCellInches: number,
  squareFeet: number
): HybridSystemCalculation {
  const closedCellRValue = calculateRValue('closed_cell', closedCellInches)
  const openCellRValue = calculateRValue('open_cell', openCellInches)
  const totalRValue = closedCellRValue + openCellRValue

  const closedCellCost = squareFeet * closedCellInches * DEFAULT_PRICING.INSULATION.closed_cell.base_price_per_sqft
  const openCellCost = squareFeet * openCellInches * DEFAULT_PRICING.INSULATION.open_cell.base_price_per_sqft
  const complexityFactor = DEFAULT_PRICING.INSULATION.hybrid.complexity_multiplier

  const totalCost = (closedCellCost + openCellCost) * complexityFactor
  const costPerSqft = totalCost / squareFeet

  return {
    closed_cell_inches: closedCellInches,
    open_cell_inches: openCellInches,
    total_r_value: `R-${totalRValue.toFixed(1)}`,
    cost_per_sqft: Number(costPerSqft.toFixed(2))
  }
}

/**
 * Calculates insulation cost for a given area
 */
export function calculateInsulationCost(
  squareFeet: number,
  insulationType: InsulationType,
  thicknessInches: number = 1
): InsulationCalculation {
  let materialCostPerSqft = 0
  let rValue = 0

  switch (insulationType) {
    case 'closed_cell':
      materialCostPerSqft = DEFAULT_PRICING.INSULATION.closed_cell.base_price_per_sqft * thicknessInches
      rValue = calculateRValue('closed_cell', thicknessInches)
      break
    case 'open_cell':
      materialCostPerSqft = DEFAULT_PRICING.INSULATION.open_cell.base_price_per_sqft * thicknessInches
      rValue = calculateRValue('open_cell', thicknessInches)
      break
    case 'batt':
      materialCostPerSqft = 1.20 * thicknessInches // Estimated pricing
      rValue = calculateRValue('batt', thicknessInches)
      break
    case 'blown_in':
      materialCostPerSqft = 0.90 * thicknessInches // Estimated pricing
      rValue = calculateRValue('blown_in', thicknessInches)
      break
  }

  const materialCost = squareFeet * materialCostPerSqft
  const laborCost = squareFeet * 0.75 // Estimated labor cost per sq ft
  const totalCost = materialCost + laborCost

  return {
    square_feet: squareFeet,
    insulation_type: insulationType,
    thickness_inches: thicknessInches,
    r_value: `R-${rValue.toFixed(1)}`,
    material_cost: Number(materialCost.toFixed(2)),
    labor_cost: Number(laborCost.toFixed(2)),
    total_cost: Number(totalCost.toFixed(2))
  }
}

/**
 * Validates insulation parameters
 */
export function validateInsulationParameters(
  insulationType: InsulationType,
  thicknessInches: number
): { valid: boolean; message?: string } {
  if (thicknessInches <= 0) {
    return { valid: false, message: 'Thickness must be greater than 0' }
  }

  const maxThickness = {
    closed_cell: DEFAULT_PRICING.INSULATION.closed_cell.max_thickness_inches,
    open_cell: DEFAULT_PRICING.INSULATION.open_cell.max_thickness_inches,
    batt: 12,
    blown_in: 24,
    hybrid: 18
  }

  if (thicknessInches > maxThickness[insulationType as keyof typeof maxThickness]) {
    return {
      valid: false,
      message: `Maximum thickness for ${insulationType} is ${maxThickness[insulationType as keyof typeof maxThickness]} inches`
    }
  }

  return { valid: true }
}

/**
 * Gets recommended R-value for climate zone
 */
export function getRecommendedRValue(
  climateZone: 'MA' | 'NH',
  applicationArea: 'wall' | 'ceiling' | 'crawlspace'
): number {
  const recommendations = {
    MA: {
      wall: 20,
      ceiling: 49,
      crawlspace: 19
    },
    NH: {
      wall: 20,
      ceiling: 49,
      crawlspace: 19
    }
  }

  return recommendations[climateZone][applicationArea]
}