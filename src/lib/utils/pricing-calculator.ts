// Pricing calculator for spray foam insulation
// Prices include material + labor

export type InsulationType = 'open_cell' | 'closed_cell' | 'batt' | 'blown_in' | 'hybrid' | null

interface PricingRule {
  minRValue: number
  maxRValue: number
  pricePerSqft: number
  thickness?: string
}

// Open Cell Foam pricing (per sqft, includes material + labor)
export const OPEN_CELL_PRICING: PricingRule[] = [
  { minRValue: 0, maxRValue: 15, pricePerSqft: 1.65, thickness: '3.5"' },
  { minRValue: 16, maxRValue: 21, pricePerSqft: 1.90, thickness: '5.5"' },
  { minRValue: 22, maxRValue: 28, pricePerSqft: 2.20, thickness: '7"' },
  { minRValue: 29, maxRValue: 30.9, pricePerSqft: 2.40, thickness: '8"' }, // Extended to cover 30.4
  { minRValue: 31, maxRValue: 34, pricePerSqft: 2.60, thickness: '9"' },
  { minRValue: 35, maxRValue: 38, pricePerSqft: 2.90, thickness: '10"' },
  { minRValue: 39, maxRValue: 45, pricePerSqft: 3.30, thickness: '12"' },
  { minRValue: 46, maxRValue: 49, pricePerSqft: 3.50, thickness: '13"' },
  { minRValue: 50, maxRValue: 999, pricePerSqft: 3.50, thickness: '13+"' }, // Default for higher R-values
]

// Closed Cell Foam pricing (per sqft, includes material + labor)
export const CLOSED_CELL_PRICING: PricingRule[] = [
  { minRValue: 0, maxRValue: 7, pricePerSqft: 1.80, thickness: '1"' },
  { minRValue: 8, maxRValue: 13, pricePerSqft: 2.30, thickness: '1.5"' },
  { minRValue: 14, maxRValue: 15.9, pricePerSqft: 2.80, thickness: '2"' }, // Extended to avoid gaps
  { minRValue: 16, maxRValue: 19, pricePerSqft: 3.60, thickness: '2.5"' },
  { minRValue: 20, maxRValue: 21.9, pricePerSqft: 3.90, thickness: '3"' }, // Extended to avoid gaps
  { minRValue: 22, maxRValue: 30.9, pricePerSqft: 5.70, thickness: '4"' }, // Extended to avoid gaps
  { minRValue: 31, maxRValue: 38.9, pricePerSqft: 6.80, thickness: '5"' }, // Extended to avoid gaps
  { minRValue: 39, maxRValue: 49.9, pricePerSqft: 8.70, thickness: '7"' }, // Extended to avoid gaps
  { minRValue: 50, maxRValue: 999, pricePerSqft: 8.70, thickness: '7+"' }, // Default for higher R-values
]

// Fiberglass Batt insulation pricing 
export const FIBERGLASS_BATT_PRICING: PricingRule[] = [
  { minRValue: 0, maxRValue: 13, pricePerSqft: 0.80 },
  { minRValue: 14, maxRValue: 19, pricePerSqft: 1.00 },
  { minRValue: 20, maxRValue: 30, pricePerSqft: 1.20 },
  { minRValue: 31, maxRValue: 38, pricePerSqft: 1.50 },
  { minRValue: 39, maxRValue: 999, pricePerSqft: 1.80 },
]

// Fiberglass Blown-in insulation pricing
export const FIBERGLASS_BLOWN_PRICING: PricingRule[] = [
  { minRValue: 0, maxRValue: 19, pricePerSqft: 0.90 },
  { minRValue: 20, maxRValue: 30, pricePerSqft: 1.10 },
  { minRValue: 31, maxRValue: 38, pricePerSqft: 1.30 },
  { minRValue: 39, maxRValue: 49, pricePerSqft: 1.60 },
  { minRValue: 50, maxRValue: 999, pricePerSqft: 1.90 },
]

// Hybrid insulation pricing (average of closed cell and open cell)
export const HYBRID_PRICING: PricingRule[] = [
  { minRValue: 0, maxRValue: 15, pricePerSqft: 1.72, thickness: '3.5"' }, // Average of open/closed for this range
  { minRValue: 16, maxRValue: 21, pricePerSqft: 2.90, thickness: '4"' },   // Average pricing
  { minRValue: 22, maxRValue: 30, pricePerSqft: 3.95, thickness: '5.5"' }, // Average pricing
  { minRValue: 31, maxRValue: 38, pricePerSqft: 4.75, thickness: '7.5"' }, // Average pricing
  { minRValue: 39, maxRValue: 999, pricePerSqft: 6.10, thickness: '10"' }, // Average pricing
]

/**
 * Get price per square foot based on insulation type and R-value
 */
export function getPricePerSqft(insulationType: InsulationType, rValue: number): number {
  if (!insulationType || !rValue) return 0

  let pricingTable: PricingRule[]
  
  switch (insulationType) {
    case 'open_cell':
      pricingTable = OPEN_CELL_PRICING
      break
    case 'closed_cell':
      pricingTable = CLOSED_CELL_PRICING
      break
    case 'batt':
      pricingTable = FIBERGLASS_BATT_PRICING
      break
    case 'blown_in':
      pricingTable = FIBERGLASS_BLOWN_PRICING
      break
    case 'hybrid':
      pricingTable = HYBRID_PRICING
      break
    default:
      return 0
  }

  // Find the matching price rule based on R-value
  const rule = pricingTable.find(
    rule => rValue >= rule.minRValue && rValue <= rule.maxRValue
  )

  return rule ? rule.pricePerSqft : 0
}

/**
 * Calculate pricing directly from inches (for spray foam only)
 */
export function calculatePriceByInches(
  squareFeet: number,
  insulationType: 'closed_cell' | 'open_cell',
  inches: number
): {
  pricePerSqft: number
  totalPrice: number
  rValue: number
} {
  // Calculate R-value from inches
  const rValue = insulationType === 'closed_cell' ? inches * 7.0 : inches * 3.8
  
  // Get price per sqft based on R-value
  const pricePerSqft = getPricePerSqft(insulationType, rValue)
  const totalPrice = squareFeet * pricePerSqft
  
  return {
    pricePerSqft,
    totalPrice,
    rValue
  }
}

/**
 * Calculate total price for a measurement
 */
export function calculateMeasurementPrice(
  squareFeet: number,
  insulationType: InsulationType,
  rValue: number
): {
  pricePerSqft: number
  totalPrice: number
} {
  const pricePerSqft = getPricePerSqft(insulationType, rValue)
  const totalPrice = squareFeet * pricePerSqft
  
  return {
    pricePerSqft,
    totalPrice
  }
}

/**
 * Calculate total estimate for multiple measurements
 */
export function calculateTotalEstimate(
  measurements: Array<{
    squareFeet: number
    insulationType: InsulationType
    rValue: number
  }>
): {
  subtotal: number
  total: number
  itemizedPrices: Array<{
    pricePerSqft: number
    totalPrice: number
  }>
} {
  const itemizedPrices = measurements.map(m => 
    calculateMeasurementPrice(m.squareFeet, m.insulationType, m.rValue)
  )
  
  const subtotal = itemizedPrices.reduce((sum, item) => sum + item.totalPrice, 0)
  const total = subtotal
  
  return {
    subtotal,
    total,
    itemizedPrices
  }
}

/**
 * Approximate R-values to common insulation standards
 */
export function approximateRValue(rValue: number): number {
  // Common R-value targets for approximation
  const commonRValues = [
    13, 15, 19, 21, 25, 30, 38, 49, 60, 70, 80, 90, 100
  ]
  
  // Find the closest common R-value
  let closest = commonRValues[0]
  let minDifference = Math.abs(rValue - closest)
  
  for (const commonR of commonRValues) {
    const difference = Math.abs(rValue - commonR)
    if (difference < minDifference) {
      minDifference = difference
      closest = commonR
    }
  }
  
  return closest
}

/**
 * Format currency for display (whole dollars only)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(amount))
}