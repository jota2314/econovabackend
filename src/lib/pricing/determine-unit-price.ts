/**
 * Centralized insulation pricing orchestrator
 * Applies pricing precedence: override → database → hybrid → inches → R-value
 */

export interface DetermineUnitPriceOptions {
  sqft: number
  kind: "closed_cell" | "open_cell" | "hybrid"
  r: number
  ccInches?: number
  ocInches?: number
  override?: number
  // Injected helper functions
  getDbUnitPrice: (kind: "closed_cell" | "open_cell" | "hybrid", r: number) => Promise<number | null>
  hybridPerSqft: (ccInches: number, ocInches: number) => number
  perInch: (sqft: number, kind: "closed_cell" | "open_cell", inches: number) => number
  perRValue: (sqft: number, kind: "closed_cell" | "open_cell" | "hybrid", r: number) => number
}

export interface DetermineUnitPriceResult {
  unitPrice: number
  source: "override" | "database" | "hybrid" | "per_inch" | "per_r_value"
  details?: {
    ccInches?: number
    ocInches?: number
    rValue?: number
    fallback?: boolean
  }
}

/**
 * Determine unit price with proper precedence
 */
export async function determineUnitPrice(
  opts: DetermineUnitPriceOptions
): Promise<DetermineUnitPriceResult> {
  const { sqft, kind, r, ccInches = 0, ocInches = 0, override } = opts

  // 1. Manager override (highest precedence)
  if (typeof override === 'number' && override > 0) {
    return {
      unitPrice: override,
      source: "override",
      details: { rValue: r }
    }
  }

  // 2. Database price (if available)
  try {
    const dbPrice = await opts.getDbUnitPrice(kind, r)
    if (dbPrice !== null && dbPrice > 0) {
      return {
        unitPrice: dbPrice,
        source: "database",
        details: { rValue: r }
      }
    }
  } catch (error) {
    console.warn('Database pricing failed, falling back to next method:', error)
  }

  // 3. Hybrid system (if ccInches or ocInches are set)
  if (kind === "hybrid" && (ccInches > 0 || ocInches > 0)) {
    const hybridPrice = opts.hybridPerSqft(ccInches, ocInches)
    return {
      unitPrice: hybridPrice,
      source: "hybrid",
      details: { ccInches, ocInches, rValue: r }
    }
  }

  // 4. Per-inch pricing (for closed/open cell with inches data)
  if ((kind === "closed_cell" || kind === "open_cell") && 
      ((kind === "closed_cell" && ccInches > 0) || 
       (kind === "open_cell" && ocInches > 0))) {
    const inches = kind === "closed_cell" ? ccInches : ocInches
    const perInchPrice = opts.perInch(sqft, kind, inches)
    return {
      unitPrice: perInchPrice,
      source: "per_inch",
      details: { 
        ccInches: kind === "closed_cell" ? ccInches : undefined,
        ocInches: kind === "open_cell" ? ocInches : undefined,
        rValue: r 
      }
    }
  }

  // 5. Per-R-value fallback
  const fallbackPrice = opts.perRValue(sqft, kind, r)
  return {
    unitPrice: fallbackPrice,
    source: "per_r_value",
    details: { rValue: r, fallback: true }
  }
}
