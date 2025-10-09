// Database-driven pricing calculator
// This replaces the hardcoded pricing arrays with database lookups

import { createClient } from '@/lib/supabase/client'

interface PricingItem {
  id: string
  service_type: string
  item_name: string
  unit: string
  base_price: number
  markup_percentage: number
  notes?: string
}

// Cache for pricing data to avoid repeated database calls
let pricingCache: PricingItem[] | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour (pricing rarely changes)

/**
 * Fetch pricing data from database with caching
 */
async function getPricingCatalog(): Promise<PricingItem[]> {
  const now = Date.now()
  
  // Return cached data if still valid
  if (pricingCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return pricingCache
  }

  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('pricing_catalog')
      .select('*')
      .eq('service_type', 'insulation')
      .order('base_price', { ascending: true })

    if (error) {
      console.error('Error fetching pricing catalog:', error)
      // Fallback to hardcoded values if database fails
      return []
    }

    // Update cache
    pricingCache = data || []
    cacheTimestamp = now
    
    return pricingCache
  } catch (error) {
    console.error('Error in getPricingCatalog:', error)
    return []
  }
}

/**
 * Find the best pricing option for a given R-value and insulation type
 */
export async function getDatabasePricePerSqft(
  insulationType: 'open_cell' | 'closed_cell' | 'hybrid',
  rValue: number
): Promise<number> {
  if (!insulationType || !rValue) return 0

  try {
    const pricingData = await getPricingCatalog()
    
    if (pricingData.length === 0) {
      console.warn('No pricing data available, using fallback pricing')
      // Fallback pricing if database is unavailable
      if (insulationType === 'closed_cell' && rValue >= 22 && rValue <= 30.9) {
        return 5.70 // Your current closed cell R-22-30.9 price
      }
      return 2.40 // Fallback price
    }

    // Filter by insulation type
    const typeFilter = insulationType === 'closed_cell' ? 'Closed Cell' : 'Open Cell'
    const relevantItems = pricingData.filter(item => 
      item.item_name.includes(typeFilter)
    )

    if (relevantItems.length === 0) {
      console.warn(`No pricing data found for ${insulationType}`)
      return 0
    }

    // Find the item that covers this R-value
    for (const item of relevantItems) {
      const notes = item.notes || ''
      const rangeMatch = notes.match(/Range: R-(\d+(?:\.\d+)?) to R-(\d+(?:\.\d+)?)/)
      
      if (rangeMatch) {
        const minR = parseFloat(rangeMatch[1])
        const maxR = parseFloat(rangeMatch[2])
        
        if (rValue >= minR && rValue <= maxR) {
          const finalPrice = item.base_price * (1 + item.markup_percentage / 100)
          console.log(`Found pricing for ${insulationType} R-${rValue}: $${finalPrice}/sq ft (${item.item_name})`)
          return finalPrice
        }
      }
    }

    // If no exact match, find the closest higher option
    const sortedItems = relevantItems.sort((a, b) => a.base_price - b.base_price)
    const fallbackItem = sortedItems[Math.floor(sortedItems.length / 2)] // Use middle option as fallback
    
    if (fallbackItem) {
      const finalPrice = fallbackItem.base_price * (1 + fallbackItem.markup_percentage / 100)
      console.log(`Using fallback pricing for ${insulationType} R-${rValue}: $${finalPrice}/sq ft`)
      return finalPrice
    }

    return 0
  } catch (error) {
    console.error('Error in getDatabasePricePerSqft:', error)
    return 0
  }
}

/**
 * Calculate measurement price using database pricing
 */
export async function calculateDatabaseMeasurementPrice(
  squareFeet: number,
  insulationType: 'open_cell' | 'closed_cell' | 'hybrid',
  rValue: number
): Promise<{
  pricePerSqft: number
  totalPrice: number
}> {
  if (!squareFeet || !insulationType || !rValue) {
    return { pricePerSqft: 0, totalPrice: 0 }
  }

  const pricePerSqft = await getDatabasePricePerSqft(insulationType, rValue)
  const totalPrice = squareFeet * pricePerSqft

  return {
    pricePerSqft,
    totalPrice
  }
}

/**
 * Clear the pricing cache (useful when pricing is updated)
 */
export function clearPricingCache(): void {
  pricingCache = null
  cacheTimestamp = 0
}
