/**
 * HVAC-specific measurement types
 */

import { z } from 'zod'
import { BaseMeasurement } from '../../types'

export const hvacMeasurementSchema = z.object({
  room_name: z.string().min(1, "Room name is required"),
  system_type: z.enum(["central_air", "heat_pump", "furnace"], {
    required_error: "System type is required"
  }),
  tonnage: z.coerce.number().positive("Tonnage must be positive"),
  seer_rating: z.coerce.number().min(10).max(30).optional(),
  ductwork_linear_feet: z.coerce.number().positive("Ductwork linear feet must be positive"),
  installation_complexity: z.enum(["standard", "moderate", "complex"]).default("standard"),
  existing_system_removal: z.boolean().default(false),
  electrical_work_required: z.boolean().default(false),
  notes: z.string().optional()
})

export type HvacMeasurementFormData = z.infer<typeof hvacMeasurementSchema>

export interface HvacMeasurement extends BaseMeasurement {
  system_type: 'central_air' | 'heat_pump' | 'furnace'
  tonnage: number
  seer_rating?: number | null
  ductwork_linear_feet: number
  installation_complexity: 'standard' | 'moderate' | 'complex'
  existing_system_removal: boolean
  electrical_work_required: boolean
  notes?: string | null
}

export interface HvacPricingFactors {
  basePrice: number
  tonnageMultiplier: number
  complexityMultiplier: number
  ductworkPricePerFoot: number
  removalCost: number
  electricalCost: number
}

export interface HvacEstimate {
  systemCost: number
  ductworkCost: number
  installationCost: number
  removalCost: number
  electricalCost: number
  totalCost: number
  laborHours: number
}

export const DEFAULT_HVAC_MEASUREMENT: Omit<HvacMeasurement, 'id' | 'job_id' | 'created_at' | 'updated_at'> = {
  room_name: '',
  system_type: 'central_air',
  tonnage: 2.5,
  seer_rating: 16,
  ductwork_linear_feet: 0,
  installation_complexity: 'standard',
  existing_system_removal: false,
  electrical_work_required: false,
  notes: null
}

export const HVAC_PRICING_FACTORS: HvacPricingFactors = {
  basePrice: 3000, // Base price for 1-ton system
  tonnageMultiplier: 800, // Additional cost per ton
  complexityMultiplier: 1.2, // Multiplier for complex installations
  ductworkPricePerFoot: 25, // Price per linear foot of ductwork
  removalCost: 500, // Cost to remove existing system
  electricalCost: 800 // Cost for electrical work
}