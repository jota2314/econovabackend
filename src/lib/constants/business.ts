/**
 * Business constants for the Spray Foam CRM system
 */

export const SERVICE_AREAS = ['MA', 'NH'] as const
export type ServiceArea = typeof SERVICE_AREAS[number]

export const LEAD_STATUSES = [
  'new',
  'contacted',
  'measurement_scheduled',
  'measured',
  'quoted',
  'proposal_sent',
  'closed_won',
  'closed_lost'
] as const

export const LEAD_SOURCES = [
  'drive_by',
  'permit',
  'referral',
  'website',
  'csv_import',
  'other'
] as const

export const SERVICE_TYPES = ['insulation', 'hvac', 'plaster'] as const
export const BUILDING_TYPES = ['residential', 'commercial', 'industrial'] as const
export const MEASUREMENT_TYPES = ['field', 'drawings'] as const

export const STRUCTURAL_FRAMING_OPTIONS = [
  '2x4',
  '2x6', 
  '2x8',
  '2x10',
  '2x12'
] as const

export const INSULATION_TYPES = [
  'closed_cell',
  'open_cell',
  'batt',
  'blown_in',
  'hybrid'
] as const

export const SURFACE_TYPES = ['wall', 'ceiling'] as const
export const AREA_TYPES = [
  'exterior_walls',
  'interior_walls',
  'ceiling',
  'gable',
  'roof',
  'concrete'
] as const

export const USER_ROLES = ['manager', 'salesperson', 'admin'] as const

export const JOB_STATUSES = ['pending', 'in_progress', 'won', 'lost'] as const

export const ESTIMATE_STATUSES = [
  'draft',
  'pending_approval',
  'sent',
  'approved',
  'rejected'
] as const

// Business rules
export const BUSINESS_RULES = {
  ESTIMATES: {
    AUTO_APPROVAL_THRESHOLD: 5000, // Estimates under this amount auto-approve
    MARKUP_PERCENTAGE_MIN: 10,
    MARKUP_PERCENTAGE_MAX: 50,
    VALIDITY_DAYS: 30
  },
  MEASUREMENTS: {
    MIN_ROOM_SIZE_SQFT: 1,
    MAX_ROOM_SIZE_SQFT: 10000,
    MIN_HEIGHT_FEET: 0.5,
    MAX_HEIGHT_FEET: 30,
    MIN_WIDTH_FEET: 0.5,
    MAX_WIDTH_FEET: 100
  },
  COMMISSION: {
    FRONTEND_RATE: 0.02, // 2% when profitable
    BACKEND_RATE: 0.01,  // 1% when completed
    MIN_JOB_VALUE: 500
  }
} as const