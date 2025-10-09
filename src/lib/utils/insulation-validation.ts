/**
 * Validation utilities for insulation measurements
 * Ensures data integrity for hybrid systems and framing constraints
 */

// Framing cavity depths (actual depths, not nominal sizes)
const FRAMING_CAVITY_DEPTHS: Record<string, number> = {
  '2x4': 3.5,
  '2x6': 5.5,
  '2x8': 7.25,
  '2x10': 9.25,
  '2x12': 11.25
}

export interface ValidationResult {
  valid: boolean
  message?: string
  warnings?: string[]
}

/**
 * Validate that hybrid system inches don't exceed framing cavity depth
 */
export function validateHybridSystem(
  framingSize: string,
  closedCellInches: number,
  openCellInches: number
): ValidationResult {
  const totalInches = closedCellInches + openCellInches
  const maxDepth = FRAMING_CAVITY_DEPTHS[framingSize]

  if (!maxDepth) {
    return {
      valid: false,
      message: `Invalid framing size: ${framingSize}. Must be one of: 2x4, 2x6, 2x8, 2x10, 2x12`
    }
  }

  if (totalInches > maxDepth) {
    return {
      valid: false,
      message: `Total insulation ${totalInches}" exceeds ${framingSize} cavity depth of ${maxDepth}"`
    }
  }

  // Warning if using less than 50% of available cavity
  const warnings: string[] = []
  if (totalInches < maxDepth * 0.5) {
    warnings.push(
      `Only using ${totalInches}" of ${maxDepth}" available cavity depth (${Math.round((totalInches / maxDepth) * 100)}%)`
    )
  }

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined
  }
}

/**
 * Validate closed cell inches don't exceed maximum thickness
 */
export function validateClosedCellThickness(
  inches: number,
  maxThickness: number = 7
): ValidationResult {
  if (inches <= 0) {
    return {
      valid: false,
      message: 'Closed cell thickness must be greater than 0'
    }
  }

  if (inches > maxThickness) {
    return {
      valid: false,
      message: `Closed cell thickness ${inches}" exceeds maximum of ${maxThickness}"`
    }
  }

  return { valid: true }
}

/**
 * Validate open cell inches don't exceed maximum thickness
 */
export function validateOpenCellThickness(
  inches: number,
  maxThickness: number = 13
): ValidationResult {
  if (inches <= 0) {
    return {
      valid: false,
      message: 'Open cell thickness must be greater than 0'
    }
  }

  if (inches > maxThickness) {
    return {
      valid: false,
      message: `Open cell thickness ${inches}" exceeds maximum of ${maxThickness}"`
    }
  }

  return { valid: true }
}

/**
 * Validate measurement dimensions are within business rules
 */
export function validateMeasurementDimensions(
  height: number,
  width: number,
  minHeight: number = 0.5,
  maxHeight: number = 30,
  minWidth: number = 0.5,
  maxWidth: number = 100
): ValidationResult {
  if (height < minHeight || height > maxHeight) {
    return {
      valid: false,
      message: `Height must be between ${minHeight} and ${maxHeight} feet`
    }
  }

  if (width < minWidth || width > maxWidth) {
    return {
      valid: false,
      message: `Width must be between ${minWidth} and ${maxWidth} feet`
    }
  }

  const squareFeet = height * width

  if (squareFeet < 1 || squareFeet > 10000) {
    return {
      valid: false,
      message: `Total area ${squareFeet.toFixed(1)} sq ft must be between 1 and 10,000 sq ft`
    }
  }

  return { valid: true }
}

/**
 * Validate R-value is achievable with given framing and insulation type
 */
export function validateRValueForFraming(
  rValue: number,
  framingSize: string,
  insulationType: 'closed_cell' | 'open_cell' | 'hybrid'
): ValidationResult {
  const maxDepth = FRAMING_CAVITY_DEPTHS[framingSize]

  if (!maxDepth) {
    return {
      valid: false,
      message: `Invalid framing size: ${framingSize}`
    }
  }

  let maxAchievableR = 0

  switch (insulationType) {
    case 'closed_cell':
      maxAchievableR = maxDepth * 7.0 // R-7 per inch
      break
    case 'open_cell':
      maxAchievableR = maxDepth * 3.8 // R-3.8 per inch
      break
    case 'hybrid':
      // Best case: use maximum cavity depth with optimal mix
      // Assume 3" closed + rest open as common practice
      const closedInches = Math.min(3, maxDepth)
      const openInches = Math.max(0, maxDepth - closedInches)
      maxAchievableR = (closedInches * 7.0) + (openInches * 3.8)
      break
  }

  if (rValue > maxAchievableR) {
    return {
      valid: false,
      message: `R-${rValue} cannot be achieved in ${framingSize} framing with ${insulationType} (max: R-${Math.round(maxAchievableR)})`
    }
  }

  return { valid: true }
}

/**
 * Get framing cavity depth for a given framing size
 */
export function getFramingDepth(framingSize: string): number | null {
  return FRAMING_CAVITY_DEPTHS[framingSize] || null
}

/**
 * Get all validation errors for a measurement
 */
export function validateMeasurement(measurement: {
  framingSize?: string | null
  closedCellInches?: number | null
  openCellInches?: number | null
  insulationType?: string | null
  rValue?: string | null
  height: number
  width: number
}): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate dimensions
  const dimensionResult = validateMeasurementDimensions(
    measurement.height,
    measurement.width
  )
  if (!dimensionResult.valid) {
    errors.push(dimensionResult.message!)
  }

  // Validate hybrid system if applicable
  if (
    measurement.insulationType === 'hybrid' &&
    measurement.framingSize &&
    (measurement.closedCellInches || measurement.openCellInches)
  ) {
    const hybridResult = validateHybridSystem(
      measurement.framingSize,
      measurement.closedCellInches || 0,
      measurement.openCellInches || 0
    )

    if (!hybridResult.valid) {
      errors.push(hybridResult.message!)
    }
    if (hybridResult.warnings) {
      warnings.push(...hybridResult.warnings)
    }
  }

  // Validate R-value if applicable
  if (
    measurement.rValue &&
    measurement.framingSize &&
    measurement.insulationType &&
    ['closed_cell', 'open_cell', 'hybrid'].includes(measurement.insulationType)
  ) {
    const rValueNum = parseFloat(measurement.rValue.replace('R-', '').replace('R', ''))
    if (!isNaN(rValueNum)) {
      const rValueResult = validateRValueForFraming(
        rValueNum,
        measurement.framingSize,
        measurement.insulationType as 'closed_cell' | 'open_cell' | 'hybrid'
      )

      if (!rValueResult.valid) {
        errors.push(rValueResult.message!)
      }
    }
  }

  return {
    valid: errors.length === 0,
    message: errors.length > 0 ? errors.join('; ') : undefined,
    warnings: warnings.length > 0 ? warnings : undefined
  }
}
