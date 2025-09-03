/**
 * Validation schemas using Zod
 */

import { z } from 'zod'
import { SERVICE_AREAS, LEAD_STATUSES, LEAD_SOURCES, SERVICE_TYPES } from '@/lib/constants/business'

// Phone number regex (flexible format)
const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/

// Lead validation schema
export const leadSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  
  email: z.string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),
  
  phone: z.string()
    .regex(phoneRegex, 'Invalid phone number format')
    .min(10, 'Phone number must be at least 10 digits'),
  
  company: z.string()
    .max(100, 'Company name must be less than 100 characters')
    .optional(),
  
  address: z.string()
    .max(200, 'Address must be less than 200 characters')
    .optional(),
  
  city: z.string()
    .max(50, 'City must be less than 50 characters')
    .optional(),
  
  state: z.enum(SERVICE_AREAS).optional(),
  
  status: z.enum(LEAD_STATUSES).optional(),
  
  lead_source: z.enum(LEAD_SOURCES).optional(),
  
  notes: z.string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional()
})

// Job validation schema
export const jobSchema = z.object({
  lead_id: z.string().uuid('Invalid lead ID'),
  
  job_name: z.string()
    .min(2, 'Job name must be at least 2 characters')
    .max(100, 'Job name must be less than 100 characters'),
  
  measurement_type: z.enum(['field', 'drawings']),
  
  service_type: z.enum(SERVICE_TYPES),
  
  building_type: z.enum(['residential', 'commercial', 'industrial']),
  
  project_type: z.enum(['new_construction', 'remodel']).optional(),
  
  total_square_feet: z.number()
    .min(1, 'Square footage must be at least 1')
    .max(100000, 'Square footage seems unreasonably large'),
  
  scope_of_work: z.string()
    .max(2000, 'Scope of work must be less than 2000 characters')
    .optional()
})

// Measurement validation schema
export const measurementSchema = z.object({
  job_id: z.string().uuid('Invalid job ID'),
  
  room_name: z.string()
    .min(1, 'Room name is required')
    .max(50, 'Room name must be less than 50 characters'),
  
  surface_type: z.enum(['wall', 'ceiling']),
  
  height: z.number()
    .min(0.1, 'Height must be at least 0.1 feet')
    .max(30, 'Height cannot exceed 30 feet'),
  
  width: z.number()
    .min(0.1, 'Width must be at least 0.1 feet')
    .max(100, 'Width cannot exceed 100 feet'),
  
    insulation_type: z.enum(['closed_cell', 'open_cell', 'batt', 'blown_in', 'hybrid', 'mineral_wool']).optional(),

  r_value: z.string().optional(),

  closed_cell_inches: z.number()
    .min(0, 'Thickness cannot be negative')
    .max(6, 'Closed cell thickness cannot exceed 6 inches')
    .default(0),
  
  open_cell_inches: z.number()
    .min(0, 'Thickness cannot be negative')
    .max(12, 'Open cell thickness cannot exceed 12 inches')
    .default(0),
  
  notes: z.string()
    .max(500, 'Notes must be less than 500 characters')
    .optional()
})

// Estimate validation schema
export const estimateSchema = z.object({
  job_id: z.string().uuid('Invalid job ID'),
  
  estimate_number: z.string()
    .min(1, 'Estimate number is required')
    .max(20, 'Estimate number must be less than 20 characters'),
  
  subtotal: z.number()
    .min(0, 'Subtotal cannot be negative'),
  
  markup_percentage: z.number()
    .min(10, 'Markup must be at least 10%')
    .max(50, 'Markup cannot exceed 50%'),
  
  total_amount: z.number()
    .min(1, 'Total amount must be at least $1'),
  
  valid_until: z.string()
    .datetime('Invalid date format')
    .optional()
})

// User validation schema
export const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  
  full_name: z.string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .optional(),
  
  role: z.enum(['manager', 'salesperson', 'admin']),
  
  phone: z.string()
    .regex(phoneRegex, 'Invalid phone number format')
    .optional(),
  
  commission_rate: z.number()
    .min(0, 'Commission rate cannot be negative')
    .max(1, 'Commission rate cannot exceed 100%')
    .default(0.05)
})

// CSV import validation
export const csvLeadSchema = leadSchema.extend({
  name: z.string().min(1, 'Name is required for CSV import'),
  phone: z.string().min(10, 'Phone is required for CSV import')
})

// Filter validation schemas
export const leadFiltersSchema = z.object({
  status: z.array(z.enum(LEAD_STATUSES)).optional(),
  source: z.array(z.enum(LEAD_SOURCES)).optional(),
  assigned_to: z.array(z.string().uuid()).optional(),
  state: z.array(z.enum(SERVICE_AREAS)).optional(),
  date_range: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }).optional()
})

export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  per_page: z.number().min(1).max(100).default(20)
})

// Type exports for use in components
export type LeadInput = z.infer<typeof leadSchema>
export type JobInput = z.infer<typeof jobSchema>
export type MeasurementInput = z.infer<typeof measurementSchema>
export type EstimateInput = z.infer<typeof estimateSchema>
export type UserInput = z.infer<typeof userSchema>
export type LeadFiltersInput = z.infer<typeof leadFiltersSchema>