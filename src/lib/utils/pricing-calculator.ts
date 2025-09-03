// Pricing calculator for spray foam insulation
// Prices include material + labor

export type InsulationType = 'open_cell' | 'closed_cell' | 'batt' | 'blown_in' | 'hybrid' | 'mineral_wool' | null

interface PricingRule {
  minRValue: number
  maxRValue: number
  pricePerSqft: number
  thickness?: string
  notes?: string // For specifying Wall/Ceiling application in Mineral Wool
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

// Mineral Wool Batt pricing
export const MINERAL_WOOL_PRICING: PricingRule[] = [
  // Wall pricing
  { minRValue: 0, maxRValue: 15, pricePerSqft: 1.95, thickness: '3"', notes: 'Wall' },
  { minRValue: 16, maxRValue: 25, pricePerSqft: 3.00, thickness: '6"', notes: 'Wall' },
  // Ceiling pricing
  { minRValue: 0, maxRValue: 15, pricePerSqft: 2.05, thickness: '3"', notes: 'Ceiling' },
  { minRValue: 16, maxRValue: 25, pricePerSqft: 3.10, thickness: '6"', notes: 'Ceiling' }
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
export function getPricePerSqft(
  insulationType: InsulationType,
  rValue: number,
  areaType?: string
): number {
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
    case 'mineral_wool':
      // For mineral wool, choose pricing by application (Wall vs Ceiling).
      // Prefer explicit areaType when provided, otherwise infer from R-value.
      // - Interior Walls -> 'Wall'
      // - Ceiling -> 'Ceiling'
      // If unknown, fall back to R-15 => Wall, R-25 => Ceiling.
      {
        const normalizedArea = (areaType || '').toLowerCase()
        const isWall = normalizedArea.includes('wall')
          ? true
          : normalizedArea.includes('ceiling')
            ? false
            : rValue === 15
        pricingTable = MINERAL_WOOL_PRICING.filter(rule => {
          return (
            rule.notes === (isWall ? 'Wall' : 'Ceiling') &&
            rValue >= rule.minRValue && rValue <= rule.maxRValue
          )
        })
      }
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
// Accurate R-value lookup based on pricing catalog
function getRValueFromInches(insulationType: 'closed_cell' | 'open_cell', inches: number): number {
  if (insulationType === 'closed_cell') {
    // Closed cell: ~R7 per inch
    return inches * 7.0
  } else if (insulationType === 'open_cell') {
    // Open cell: Based on pricing catalog
    const openCellMap = [
      { inches: 3.5, rValue: 13 },
      { inches: 5.5, rValue: 21 },
      { inches: 7, rValue: 27 },
      { inches: 8, rValue: 30 },
      { inches: 9, rValue: 34 },
      { inches: 10, rValue: 38 },
      { inches: 12, rValue: 45 },
      { inches: 13, rValue: 49 }
    ]
    
    // Find exact match first
    const exactMatch = openCellMap.find(item => item.inches === inches)
    if (exactMatch) return exactMatch.rValue
    
    // Find closest match for interpolation
    const sorted = openCellMap.sort((a, b) => a.inches - b.inches)
    
    if (inches <= sorted[0].inches) return sorted[0].rValue
    if (inches >= sorted[sorted.length - 1].inches) return sorted[sorted.length - 1].rValue
    
    // Linear interpolation between closest values
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i]
      const next = sorted[i + 1]
      
      if (inches >= current.inches && inches <= next.inches) {
        const ratio = (inches - current.inches) / (next.inches - current.inches)
        return Math.round(current.rValue + (next.rValue - current.rValue) * ratio)
      }
    }
    
    // Fallback to linear calculation
    return inches * 3.8
  }
  
  return 0
}

export function calculatePriceByInches(
  squareFeet: number,
  insulationType: 'closed_cell' | 'open_cell',
  inches: number
): {
  pricePerSqft: number
  totalPrice: number
  rValue: number
} {
  // Calculate R-value from inches using pricing catalog
  const rValue = getRValueFromInches(insulationType, inches)
  
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
  rValue: number,
  areaType?: string
): {
  pricePerSqft: number
  totalPrice: number
} {
  const pricePerSqft = getPricePerSqft(insulationType, rValue, areaType)
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