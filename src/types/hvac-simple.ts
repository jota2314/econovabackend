/**
 * Simplified HVAC system types for catalog-based system selection
 */

import { z } from 'zod'

// HVAC Systems Catalog Types
export interface HvacSystemCatalog {
  id: string
  created_at: string
  updated_at: string
  
  // System identification
  system_name: string
  system_description?: string | null
  
  // System specifications
  system_type: string
  ahri_certified_ref?: string | null
  manufacturer?: string | null
  condenser_model?: string | null
  tonnage?: number | null
  seer2?: number | null
  hspf2?: number | null
  eer2?: number | null
  head_unit_model?: string | null
  
  // Pricing
  base_price: number
  
  // Status
  is_active: boolean
  category: string
}

// Job HVAC Systems
export interface JobHvacSystem {
  id: string
  job_id: string
  created_at: string
  updated_at: string
  
  // Reference to catalog (optional for custom systems)
  catalog_system_id?: string | null
  system_number: number
  
  // System data (editable per job)
  system_name: string
  system_type: string
  ahri_certified_ref?: string | null
  manufacturer?: string | null
  condenser_model?: string | null
  tonnage?: number | null
  seer2?: number | null
  hspf2?: number | null
  eer2?: number | null
  head_unit_model?: string | null
  
  // Job-specific data
  labor_material_description?: string | null
  
  // Pricing (can override catalog)
  unit_price: number
  quantity: number
  total_amount: number // computed field
  
  // Ductwork (preserved as requested)
  ductwork_linear_feet: number
  ductwork_price_per_foot: number
  ductwork_total: number // computed field
}

// Form validation schemas
export const hvacCatalogSchema = z.object({
  system_name: z.string().min(1, "System name is required"),
  system_description: z.string().optional(),
  system_type: z.string().min(1, "System type is required"),
  ahri_certified_ref: z.string().optional(),
  manufacturer: z.string().optional(),
  condenser_model: z.string().optional(),
  tonnage: z.coerce.number().positive().optional(),
  seer2: z.coerce.number().positive().optional(),
  hspf2: z.coerce.number().positive().optional(),
  eer2: z.coerce.number().positive().optional(),
  head_unit_model: z.string().optional(),
  base_price: z.coerce.number().min(0, "Price cannot be negative"),
  is_active: z.boolean().default(true)
})

export const jobHvacSystemSchema = z.object({
  catalog_system_id: z.string().uuid().optional(),
  system_number: z.coerce.number().min(1, "System number must be at least 1"),
  system_name: z.string().min(1, "System name is required"),
  system_type: z.string().min(1, "System type is required"),
  ahri_certified_ref: z.string().optional(),
  manufacturer: z.string().optional(),
  condenser_model: z.string().optional(),
  tonnage: z.coerce.number().positive().optional(),
  seer2: z.coerce.number().positive().optional(),
  hspf2: z.coerce.number().positive().optional(),
  eer2: z.coerce.number().positive().optional(),
  head_unit_model: z.string().optional(),
  labor_material_description: z.string().optional(),
  unit_price: z.coerce.number().min(0, "Price cannot be negative"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1").default(1),
  ductwork_linear_feet: z.coerce.number().min(0).default(0),
  ductwork_price_per_foot: z.coerce.number().min(0).default(0)
})

export type HvacCatalogFormData = z.infer<typeof hvacCatalogSchema>
export type JobHvacSystemFormData = z.infer<typeof jobHvacSystemSchema>

// System type options
export const HVAC_SYSTEM_TYPES = [
  "Central Air Conditioning",
  "Heat Pump System",
  "Furnace System",
  "Mini-Split System",
  "Ductless System",
  "Hybrid System",
  "Commercial HVAC",
  "Geothermal System"
] as const

// Search result type for autocomplete
export interface HvacSystemSearchResult {
  id: string
  system_name: string
  system_type: string
  manufacturer?: string
  condenser_model?: string
  tonnage?: number
  base_price: number
  // Highlighted search terms for UI
  highlighted_name?: string
}

// Summary type for job totals
export interface JobHvacSummary {
  total_systems: number
  total_amount: number
  total_ductwork: number
  systems_breakdown: Array<{
    system_number: number
    system_name: string
    unit_price: number
    quantity: number
    total_amount: number
    ductwork_total: number
  }>
}

// API response types
export interface HvacCatalogResponse {
  success: boolean
  data?: {
    systems: HvacSystemCatalog[]
    total: number
  }
  error?: string
}

export interface JobHvacSystemsResponse {
  success: boolean
  data?: {
    systems: JobHvacSystem[]
    summary: JobHvacSummary
  }
  error?: string
}

export interface HvacSearchResponse {
  success: boolean
  data?: {
    results: HvacSystemSearchResult[]
    total: number
  }
  error?: string
}