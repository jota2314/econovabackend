/**
 * Client helper to fetch database unit pricing
 */

interface FetchDbUnitPriceRequest {
  kind: "closed_cell" | "open_cell" | "hybrid"
  r: number
  ccInches?: number
  ocInches?: number
}

interface FetchDbUnitPriceResponse {
  success: boolean
  price?: number
  error?: string
  details?: {
    kind: string
    r: number
    ccInches?: number
    ocInches?: number
  }
}

/**
 * Fetch database unit price from API endpoint
 * Returns null if pricing is not available or fails
 */
export async function fetchDbUnitPrice(
  kind: "closed_cell" | "open_cell" | "hybrid",
  r: number,
  ccInches?: number,
  ocInches?: number
): Promise<number | null> {
  try {
    const response = await fetch('/api/pricing/insulation/unit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        kind,
        r,
        ccInches,
        ocInches
      } as FetchDbUnitPriceRequest)
    })

    if (!response.ok) {
      console.warn(`Database pricing API returned ${response.status}`)
      return null
    }

    const data: FetchDbUnitPriceResponse = await response.json()

    if (!data.success) {
      console.warn('Database pricing API error:', data.error)
      return null
    }

    return data.price || null
  } catch (error) {
    console.warn('Failed to fetch database unit price:', error)
    return null
  }
}
