// Massachusetts R-Value Calculator for Spray Foam Insulation

export type ProjectType = 'new_construction' | 'remodel'
export type AreaType = 'roof' | 'exterior_walls' | 'interior_walls' | 'basement_walls'
export type FloorLevel = 'first_floor' | 'second_floor' | 'basement'

// Massachusetts Building Code R-Values
const MA_R_VALUES: Record<ProjectType, Record<AreaType, number>> = {
  new_construction: {
    roof: 60,
    exterior_walls: 30,
    interior_walls: 13,
    basement_walls: 15,
  },
  remodel: {
    roof: 49,
    exterior_walls: 21,
    interior_walls: 13,
    basement_walls: 15,
  },
}

export interface RValueResult {
  rValue: number
  projectType: ProjectType
  areaType: AreaType
  description: string
}

/**
 * Calculate R-value based on Massachusetts building code requirements
 * @param projectType - Whether it's new construction or remodel
 * @param areaType - The type of area being insulated
 * @returns RValueResult with the calculated R-value and description
 */
export function calculateRValue(
  projectType: ProjectType,
  areaType: AreaType
): RValueResult {
  const rValue = MA_R_VALUES[projectType][areaType]
  
  return {
    rValue,
    projectType,
    areaType,
    description: `Massachusetts ${projectType === 'new_construction' ? 'New Construction' : 'Remodel'} - ${getAreaDisplayName(areaType)}: R-${rValue}`,
  }
}

/**
 * Get display-friendly name for area type
 */
export function getAreaDisplayName(areaType: AreaType): string {
  switch (areaType) {
    case 'roof':
      return 'Roof'
    case 'exterior_walls':
      return 'Exterior Walls'
    case 'interior_walls':
      return 'Interior Walls'
    case 'basement_walls':
      return 'Basement Walls'
    default:
      return areaType
  }
}

/**
 * Get display-friendly name for floor level
 */
export function getFloorDisplayName(floorLevel: FloorLevel): string {
  switch (floorLevel) {
    case 'first_floor':
      return 'First Floor'
    case 'second_floor':
      return 'Second Floor'
    case 'basement':
      return 'Basement'
    default:
      return floorLevel
  }
}

/**
 * Get available area types for a specific floor level
 */
export function getAreaTypesForFloor(floorLevel: FloorLevel): AreaType[] {
  switch (floorLevel) {
    case 'first_floor':
    case 'second_floor':
      return ['roof', 'exterior_walls', 'interior_walls']
    case 'basement':
      return ['basement_walls']
    default:
      return []
  }
}

/**
 * Get all R-values for a project type
 */
export function getAllRValuesForProject(projectType: ProjectType): Record<AreaType, number> {
  return MA_R_VALUES[projectType]
}