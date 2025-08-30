// Hybrid Spray Foam R-Value Calculator
// R-values per inch for different foam types
export const R_VALUES_PER_INCH = {
  closed_cell: 7.0,   // R-7 per inch
  open_cell: 3.8      // R-3.8 per inch
} as const

export interface HybridSystemCalculation {
  closedCellInches: number
  openCellInches: number
  closedCellRValue: number
  openCellRValue: number
  totalRValue: number
  totalInches: number
}

/**
 * Calculate R-values for a hybrid spray foam system
 */
export function calculateHybridRValue(
  closedCellInches: number, 
  openCellInches: number
): HybridSystemCalculation {
  const closedCellRValue = closedCellInches * R_VALUES_PER_INCH.closed_cell
  const openCellRValue = openCellInches * R_VALUES_PER_INCH.open_cell
  const totalRValue = closedCellRValue + openCellRValue
  const totalInches = closedCellInches + openCellInches

  return {
    closedCellInches,
    openCellInches,
    closedCellRValue,
    openCellRValue,
    totalRValue,
    totalInches
  }
}

/**
 * Calculate required inches to achieve target R-value
 * Prioritizes closed cell for first 2-3 inches for vapor barrier, then open cell
 */
export function calculateInchesForTargetRValue(
  targetRValue: number,
  maxClosedCellInches: number = 3
): HybridSystemCalculation {
  // Start with maximum closed cell inches for vapor barrier
  let closedCellInches = Math.min(maxClosedCellInches, targetRValue / R_VALUES_PER_INCH.closed_cell)
  
  // Calculate remaining R-value needed
  const closedCellRValue = closedCellInches * R_VALUES_PER_INCH.closed_cell
  const remainingRValue = targetRValue - closedCellRValue
  
  // Calculate open cell inches needed for remaining R-value
  let openCellInches = Math.max(0, remainingRValue / R_VALUES_PER_INCH.open_cell)
  
  // Round to reasonable increments (0.5 inches)
  closedCellInches = Math.round(closedCellInches * 2) / 2
  openCellInches = Math.round(openCellInches * 2) / 2
  
  return calculateHybridRValue(closedCellInches, openCellInches)
}

/**
 * Format inches display for UI
 */
export function formatInchesDisplay(inches: number): string {
  if (inches === 0) return '0"'
  if (inches % 1 === 0) return `${inches}"`
  return `${inches}"`
}

/**
 * Format hybrid system description for estimates
 */
export function formatHybridSystemDescription(calculation: HybridSystemCalculation): string {
  const parts: string[] = []
  
  if (calculation.closedCellInches > 0) {
    parts.push(`${formatInchesDisplay(calculation.closedCellInches)} Closed Cell (R-${calculation.closedCellRValue.toFixed(0)})`)
  }
  
  if (calculation.openCellInches > 0) {
    parts.push(`${formatInchesDisplay(calculation.openCellInches)} Open Cell (R-${calculation.openCellRValue.toFixed(0)})`)
  }
  
  return parts.join(' + ')
}

/**
 * Get breakdown text for real-time calculation display
 */
export function getHybridBreakdownText(calculation: HybridSystemCalculation): string {
  const lines: string[] = []
  
  if (calculation.closedCellInches > 0) {
    lines.push(
      `${formatInchesDisplay(calculation.closedCellInches)} Closed Cell = R-${calculation.closedCellRValue.toFixed(0)} ` +
      `(${calculation.closedCellInches} × ${R_VALUES_PER_INCH.closed_cell})`
    )
  }
  
  if (calculation.openCellInches > 0) {
    lines.push(
      `${formatInchesDisplay(calculation.openCellInches)} Open Cell = R-${calculation.openCellRValue.toFixed(0)} ` +
      `(${calculation.openCellInches} × ${R_VALUES_PER_INCH.open_cell})`
    )
  }
  
  lines.push(`Total R-value = R-${calculation.totalRValue.toFixed(0)}`)
  
  return lines.join('\n')
}

/**
 * Check if a measurement should use hybrid system based on R-value
 */
export function shouldUseHybridSystem(targetRValue: number): boolean {
  // Use hybrid for high R-values (typically R-30+) where cost savings are significant
  return targetRValue >= 30
}

/**
 * Get pricing for hybrid system based on database pricing
 */
export interface HybridPricing {
  closedCellPrice: number
  openCellPrice: number
  totalPricePerSqft: number
  closedCellPriceData?: { r_value: number, base_price: number, thickness: string }
  openCellPriceData?: { r_value: number, base_price: number, thickness: string }
}

/**
 * Find closest pricing match for the given inches
 */
function findClosestPricing(
  targetInches: number,
  insulationType: 'closed_cell' | 'open_cell',
  pricingData: any[]
): { r_value: number, base_price: number, thickness: string } | null {
  if (targetInches === 0) return null

  const filteredPricing = pricingData.filter(item => item.insulation_type === insulationType)
  
  if (filteredPricing.length === 0) return null

  // Find the closest thickness by calculating R-value equivalent
  const targetRValue = targetInches * (insulationType === 'closed_cell' ? R_VALUES_PER_INCH.closed_cell : R_VALUES_PER_INCH.open_cell)
  
  let closest = filteredPricing[0]
  let closestDiff = Math.abs(closest.r_value - targetRValue)

  for (const item of filteredPricing) {
    const diff = Math.abs(item.r_value - targetRValue)
    if (diff < closestDiff) {
      closest = item
      closestDiff = diff
    }
  }

  return {
    r_value: closest.r_value,
    base_price: closest.base_price,
    thickness: closest.thickness
  }
}

/**
 * Calculate hybrid pricing using database lookup
 */
export async function calculateHybridPricingFromDatabase(
  calculation: HybridSystemCalculation
): Promise<HybridPricing> {
  try {
    // Fetch pricing data
    const response = await fetch('/api/pricing/insulation')
    const pricingResponse = await response.json()
    
    if (!pricingResponse.success) {
      throw new Error('Failed to fetch pricing data')
    }

    const pricingData = pricingResponse.data

    // Find closest pricing for each type
    const closedCellPricing = findClosestPricing(calculation.closedCellInches, 'closed_cell', pricingData)
    const openCellPricing = findClosestPricing(calculation.openCellInches, 'open_cell', pricingData)

    const closedCellPrice = closedCellPricing?.base_price || 0
    const openCellPrice = openCellPricing?.base_price || 0
    const totalPricePerSqft = closedCellPrice + openCellPrice

    return {
      closedCellPrice,
      openCellPrice, 
      totalPricePerSqft,
      closedCellPriceData: closedCellPricing,
      openCellPriceData: openCellPricing
    }
  } catch (error) {
    console.error('Error fetching hybrid pricing:', error)
    
    // Fallback to static pricing if database fails
    return calculateHybridPricingStatic(calculation)
  }
}

/**
 * Simple per-inch pricing calculation
 */
export function calculateHybridPricingStatic(
  calculation: HybridSystemCalculation
): HybridPricing {
  // Price per inch calculations based on database data:
  // Open Cell: $1.65 ÷ 3.5" = $0.471/inch
  // Closed Cell: $8.70 ÷ 7" = $1.243/inch
  
  const openCellPricePerInch = 1.65 / 3.5    // $0.471 per inch
  const closedCellPricePerInch = 8.70 / 7.0  // $1.243 per inch

  const openCellPrice = calculation.openCellInches * openCellPricePerInch
  const closedCellPrice = calculation.closedCellInches * closedCellPricePerInch
  const totalPricePerSqft = closedCellPrice + openCellPrice

  return {
    closedCellPrice,
    openCellPrice,
    totalPricePerSqft
  }
}

/**
 * Backwards compatible function - now uses database pricing
 */
export function calculateHybridPricing(
  calculation: HybridSystemCalculation
): HybridPricing {
  // For now, use static pricing with correct rates derived from database
  return calculateHybridPricingStatic(calculation)
}