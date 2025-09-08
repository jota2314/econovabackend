/**
 * Enhanced HVAC-specific measurement types for professional HVAC systems
 */

import { z } from 'zod'
import { BaseMeasurement } from '../../types'

// HVAC System Types
export type HvacSystemType = 'central_air' | 'heat_pump' | 'furnace' | 'mini_split'

// AHRI Certificate validation schema
export const ahriCertificateSchema = z.object({
  ahri_number: z.string().min(1, "AHRI number is required"),
  outdoor_model: z.string().min(1, "Outdoor unit model is required"),
  indoor_model: z.string().min(1, "Indoor unit model is required"),
  manufacturer: z.string().min(1, "Manufacturer is required"),
  tonnage: z.coerce.number().min(0.5).max(20, "Tonnage must be between 0.5 and 20 tons"),
  seer2_rating: z.coerce.number().min(10).max(30, "SEER2 must be between 10 and 30").optional(),
  hspf2_rating: z.coerce.number().min(6).max(15, "HSPF2 must be between 6 and 15").optional(),
  eer2_rating: z.coerce.number().min(8).max(20, "EER2 must be between 8 and 20").optional(),
  certified: z.boolean().default(false)
})

// Enhanced HVAC Measurement Schema
export const enhancedHvacMeasurementSchema = z.object({
  // System Identification
  system_number: z.coerce.number().min(1, "System number must be at least 1"),
  system_description: z.string().min(1, "System description is required"),
  system_type: z.enum(["central_air", "heat_pump", "furnace", "mini_split"], {
    required_error: "System type is required"
  }),
  
  // AHRI Certification Details
  ahri_certificate: ahriCertificateSchema,
  
  // Installation Specifications
  ductwork_linear_feet: z.coerce.number().min(0, "Ductwork linear feet cannot be negative").default(0),
  supply_vents: z.coerce.number().min(0, "Supply vents cannot be negative").default(0),
  return_vents: z.coerce.number().min(0, "Return vents cannot be negative").default(0),
  installation_complexity: z.enum(["standard", "moderate", "complex"]).default("standard"),
  
  // Additional Services
  existing_system_removal: z.boolean().default(false),
  electrical_upgrade_required: z.boolean().default(false),
  permit_required: z.boolean().default(true),
  startup_testing_required: z.boolean().default(true),
  
  // Project Details
  installation_location: z.string().optional(),
  special_requirements: z.string().optional(),
  notes: z.string().optional(),
  
  // Pricing Overrides (for managers)
  price_override: z.coerce.number().optional(),
  override_reason: z.string().optional(),
})

export type EnhancedHvacMeasurementFormData = z.infer<typeof enhancedHvacMeasurementSchema>
export type AhriCertificate = z.infer<typeof ahriCertificateSchema>

// Database Interface
export interface EnhancedHvacMeasurement extends BaseMeasurement {
  // System Identification
  system_number: number
  system_description: string
  system_type: HvacSystemType
  
  // AHRI Certification
  ahri_number: string
  outdoor_model: string
  indoor_model: string
  manufacturer: string
  tonnage: number
  seer2_rating?: number | null
  hspf2_rating?: number | null
  eer2_rating?: number | null
  ahri_certified: boolean
  
  // Installation Details
  ductwork_linear_feet: number
  supply_vents: number
  return_vents: number
  installation_complexity: 'standard' | 'moderate' | 'complex'
  
  // Additional Services
  existing_system_removal: boolean
  electrical_upgrade_required: boolean
  permit_required: boolean
  startup_testing_required: boolean
  
  // Project Details
  installation_location?: string | null
  special_requirements?: string | null
  notes?: string | null
  
  // Pricing
  price_override?: number | null
  override_reason?: string | null
  calculated_price?: number | null
}

// Pricing Configuration
export interface HvacPricingConfig {
  // Base System Prices by Type
  basePrices: {
    central_air: number
    heat_pump: number
    furnace: number
    mini_split: number
  }
  
  // Per-Tonnage Multipliers
  tonnageMultipliers: {
    central_air: number
    heat_pump: number
    furnace: number
    mini_split: number
  }
  
  // Installation Components
  ductwork: {
    pricePerFoot: number
    minimumCharge: number
  }
  
  vents: {
    supplyVentPrice: number
    returnVentPrice: number
  }
  
  // Additional Services
  additionalServices: {
    systemRemoval: number
    electricalUpgrade: number
    permitFee: number
    startupTesting: number
  }
  
  // Complexity Multipliers
  complexityMultipliers: {
    standard: number
    moderate: number
    complex: number
  }
  
  // Labor Rates
  labor: {
    hourlyRate: number
    baseHours: number
    hoursPerTon: number
  }
}

// Pricing Calculation Result
export interface HvacPricingBreakdown {
  // System Components
  baseSystemCost: number
  tonnageCost: number
  ductworkCost: number
  ventsCost: {
    supplyVents: number
    returnVents: number
    total: number
  }
  
  // Additional Services
  additionalServices: {
    systemRemoval: number
    electricalUpgrade: number
    permitFee: number
    startupTesting: number
    total: number
  }
  
  // Labor
  laborCost: {
    baseLabor: number
    complexityAdjustment: number
    totalHours: number
    totalCost: number
  }
  
  // Totals
  subtotal: number
  complexityMultiplier: number
  totalBeforeOverride: number
  priceOverride?: number
  finalTotal: number
  
  // Metadata
  calculatedAt: Date
  systemSpecs: {
    systemType: HvacSystemType
    tonnage: number
    manufacturer: string
    model: string
  }
}

// Multi-System Job Summary
export interface HvacJobSummary {
  systems: EnhancedHvacMeasurement[]
  totalSystems: number
  totalTonnage: number
  totalDuctwork: number
  totalVents: number
  
  pricing: {
    individualBreakdowns: HvacPricingBreakdown[]
    jobTotals: {
      subtotal: number
      totalLabor: number
      totalMaterials: number
      totalAdditionalServices: number
      grandTotal: number
    }
  }
  
  timeline: {
    estimatedInstallDays: number
    estimatedLaborHours: number
  }
}

// Default Configuration
export const DEFAULT_HVAC_PRICING_CONFIG: HvacPricingConfig = {
  basePrices: {
    central_air: 4500,
    heat_pump: 5200,
    furnace: 3800,
    mini_split: 2200
  },
  
  tonnageMultipliers: {
    central_air: 800,
    heat_pump: 950,
    furnace: 650,
    mini_split: 400
  },
  
  ductwork: {
    pricePerFoot: 35,
    minimumCharge: 500
  },
  
  vents: {
    supplyVentPrice: 125,
    returnVentPrice: 150
  },
  
  additionalServices: {
    systemRemoval: 750,
    electricalUpgrade: 1200,
    permitFee: 250,
    startupTesting: 300
  },
  
  complexityMultipliers: {
    standard: 1.0,
    moderate: 1.25,
    complex: 1.6
  },
  
  labor: {
    hourlyRate: 85,
    baseHours: 8,
    hoursPerTon: 3
  }
}

// Default Measurement Template
export const DEFAULT_ENHANCED_HVAC_MEASUREMENT: Omit<EnhancedHvacMeasurement, 'id' | 'job_id' | 'created_at' | 'updated_at'> = {
  room_name: '',
  system_number: 1,
  system_description: '',
  system_type: 'central_air',
  
  // AHRI Certification
  ahri_number: '',
  outdoor_model: '',
  indoor_model: '',
  manufacturer: '',
  tonnage: 2.5,
  seer2_rating: 16,
  hspf2_rating: null,
  eer2_rating: null,
  ahri_certified: false,
  
  // Installation Details
  ductwork_linear_feet: 0,
  supply_vents: 0,
  return_vents: 0,
  installation_complexity: 'standard',
  
  // Additional Services
  existing_system_removal: false,
  electrical_upgrade_required: false,
  permit_required: true,
  startup_testing_required: true,
  
  // Project Details
  installation_location: null,
  special_requirements: null,
  notes: null,
  
  // Pricing
  price_override: null,
  override_reason: null,
  calculated_price: null
}

// Manufacturer Options (expandable)
export const HVAC_MANUFACTURERS = [
  'Carrier', 'Trane', 'Lennox', 'Rheem', 'Goodman', 'American Standard',
  'York', 'Daikin', 'Mitsubishi', 'LG', 'Samsung', 'Fujitsu', 'Other'
] as const

export type HvacManufacturer = typeof HVAC_MANUFACTURERS[number]