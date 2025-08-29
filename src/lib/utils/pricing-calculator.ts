// Pricing calculator for spray foam insulation
// Prices include material + labor

export type InsulationType = 'open_cell' | 'closed_cell' | 'fiberglass_batt' | 'fiberglass_blown' | 'hybrid' | null

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
  { minRValue: 29, maxRValue: 30, pricePerSqft: 2.40, thickness: '8"' },
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
  { minRValue: 14, maxRValue: 15, pricePerSqft: 2.80, thickness: '2"' },
  { minRValue: 16, maxRValue: 19, pricePerSqft: 3.60, thickness: '2.5"' },
  { minRValue: 20, maxRValue: 21, pricePerSqft: 3.90, thickness: '3"' },
  { minRValue: 22, maxRValue: 30, pricePerSqft: 5.70, thickness: '4"' },
  { minRValue: 31, maxRValue: 38, pricePerSqft: 6.80, thickness: '5"' },
  { minRValue: 39, maxRValue: 49, pricePerSqft: 8.70, thickness: '7"' },
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
    case 'fiberglass_batt':
      pricingTable = FIBERGLASS_BATT_PRICING
      break
    case 'fiberglass_blown':
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
  }>,
  taxRate: number = 0
): {
  subtotal: number
  tax: number
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
  const tax = subtotal * taxRate
  const total = subtotal + tax
  
  return {
    subtotal,
    tax,
    total,
    itemizedPrices
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}