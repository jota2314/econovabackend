/**
 * Currency formatting utilities
 */

/**
 * Formats a number as USD currency
 */
export function formatCurrency(
  amount: number,
  options: {
    showCents?: boolean
    showSymbol?: boolean
    compact?: boolean
  } = {}
): string {
  const {
    showCents = true,
    showSymbol = true,
    compact = false
  } = options

  if (compact && amount >= 1000000) {
    const millions = amount / 1000000
    return `${showSymbol ? '$' : ''}${millions.toFixed(1)}M`
  }

  if (compact && amount >= 1000) {
    const thousands = amount / 1000
    return `${showSymbol ? '$' : ''}${thousands.toFixed(1)}K`
  }

  const formatter = new Intl.NumberFormat('en-US', {
    style: showSymbol ? 'currency' : 'decimal',
    currency: 'USD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0
  })

  return formatter.format(amount)
}

/**
 * Formats a number as a percentage
 */
export function formatPercentage(
  value: number,
  options: {
    decimals?: number
    showSign?: boolean
  } = {}
): string {
  const { decimals = 1, showSign = false } = options

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    signDisplay: showSign ? 'always' : 'auto'
  })

  return formatter.format(value / 100)
}

/**
 * Parses a currency string to number
 */
export function parseCurrency(currencyString: string): number {
  // Remove currency symbols, commas, and spaces
  const cleaned = currencyString.replace(/[$,\s]/g, '')
  const parsed = parseFloat(cleaned)
  
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Formats square footage
 */
export function formatSquareFeet(sqft: number): string {
  return `${sqft.toLocaleString()} sq ft`
}

/**
 * Formats commission rate
 */
export function formatCommissionRate(rate: number): string {
  return formatPercentage(rate * 100, { decimals: 1 })
}