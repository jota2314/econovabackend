"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { SimpleHvacJobForm } from '@/components/hvac/SimpleHvacJobForm'
import { useApprovalsStore } from '@/stores/approvals-store'

import { ImageGallery, ImageThumbnailGrid } from '@/components/ui/image-gallery'
import { toast } from "sonner"
import { 
  Plus, 
  Trash2, 
  Calculator, 
  Camera, 
  Home, 
  Square, 
  Ruler,
  Upload,
  X,
  Save,
  Eye,
  EyeOff,
  Building,
  Building2,
  ChevronDown,
  ChevronRight,
  Loader2,
  FileText,
  DollarSign,
  Edit,
  Check
} from "lucide-react"
import { 
  calculateRValue, 
  getAreaDisplayName, 
  getFloorDisplayName, 
  getAreaTypesForFloor,
  type ProjectType,
  type AreaType,
  type FloorLevel
} from "@/lib/utils/r-value-calculator"
import { 
  calculateMeasurementPrice, 
  calculatePriceByInches,
  formatCurrency, 
  calculateTotalEstimate,
  approximateRValue,
  type InsulationType 
} from "@/lib/utils/pricing-calculator"
import { 
  calculateDatabaseMeasurementPrice,
  clearPricingCache 
} from "@/lib/utils/database-pricing-calculator"
import { generateQuickEstimatePDF } from "@/lib/utils/estimate-pdf-generator"
import { Job as DatabaseJob, PricingCatalog, Database } from "@/lib/types/database"
import { EstimateBuilder } from "./estimate-builder"
import { 
  calculateHybridRValue, 
  calculateInchesForTargetRValue, 
  getHybridBreakdownText, 
  formatHybridSystemDescription,
  shouldUseHybridSystem,
  calculateHybridPricing,
  type HybridSystemCalculation 
} from "@/lib/utils/hybrid-calculator"
import { useRole } from "@/contexts/role-context"
import { determineUnitPrice } from "@/lib/pricing/determine-unit-price"
import { fetchDbUnitPrice } from "@/lib/pricing/fetchDbUnitPrice"

// Interface for grouped measurements
interface MeasurementGroup {
  room_name: string
  area_type: string
  measurements: Measurement[]
  total_square_feet: number
  insulation_type: InsulationType
  r_value: string | null
  framing_size: string | null
  is_hybrid_system: boolean | null
  closed_cell_inches: number | null
  open_cell_inches: number | null
  wall_count: number
}

// Open cell catalog values from pricing
const OPEN_CELL_CATALOG = [
  { inches: 3.5, rValue: 13 },
  { inches: 5.5, rValue: 21 },
  { inches: 7, rValue: 27 },
  { inches: 8, rValue: 30 },
  { inches: 9, rValue: 34 },
  { inches: 10, rValue: 38 },
  { inches: 12, rValue: 45 },
  { inches: 13, rValue: 49 }
]

// Snap to closest catalog value for open cell
function snapToClosestCatalogValue(inches: number): number {
  if (inches <= 0) return 0
  
  let closest = OPEN_CELL_CATALOG[0]
  let minDiff = Math.abs(inches - closest.inches)
  
  for (const item of OPEN_CELL_CATALOG) {
    const diff = Math.abs(inches - item.inches)
    if (diff < minDiff) {
      minDiff = diff
      closest = item
    }
  }
  
  return closest.inches
}

// Get suggested insulation thickness based on framing size, type, and area
function getSuggestedInsulation(framingSize: string, insulationType: string, areaType?: string) {
  // Special handling for roof scenarios to meet R49 code
  if (areaType === 'roof') {
    if (framingSize === '2x8') {
      // 2x8 roof requires all closed cell to meet R49
      return {
        closed_cell_inches: 7,
        open_cell_inches: 0,
        rValue: 49,
        reason: '7" closed cell achieves R49 in 2x8 rafters',
        isHybrid: false
      }
    } else if (framingSize === '2x10') {
      // 2x10 roof uses hybrid 5" closed + 4" open = R49
      return {
        closed_cell_inches: 5,
        open_cell_inches: 4,
        rValue: 49,
        reason: '5" closed + 4" open achieves R49 in 2x10 rafters',
        isHybrid: true
      }
    } else if (framingSize === '2x12') {
      // 2x12 roof uses hybrid 3" closed + 8" open = R49+
      return {
        closed_cell_inches: 3,
        open_cell_inches: 8,
        rValue: 49,
        reason: '3" closed + 8" open achieves R49 in 2x12 rafters',
        isHybrid: true
      }
    }
  }

  // For 2x4 wall remodel work, recommend closed cell for better R-value per inch
  if (framingSize === '2x4' && areaType !== 'roof') {
    if (insulationType === 'closed_cell') {
      // 3" closed cell = R21 (ideal for 2x4 remodel to meet code)
      return {
        closed_cell_inches: 3,
        open_cell_inches: 0,
        rValue: 21,
        reason: '3" closed cell achieves R21 in 2x4 walls',
        isHybrid: false
      }
    } else if (insulationType === 'open_cell') {
      // 3.5" open cell = R13 (fills cavity but lower R-value)
      return {
        closed_cell_inches: 0,
        open_cell_inches: 3.5,
        rValue: 13,
        reason: 'fills 2x4 cavity, consider closed cell for R21',
        isHybrid: false
      }
    }
  }
  
  // For standard walls, open cell typically fills the cavity
  const framingToOpenCell: Record<string, { inches: number, rValue: number }> = {
    '2x4': { inches: 3.5, rValue: 13 },   // fills cavity
    '2x6': { inches: 5.5, rValue: 21 },   // fills cavity → R21
    '2x8': { inches: 7, rValue: 27 },     // close to cavity fill
    '2x10': { inches: 9, rValue: 34 },    // close to cavity fill
    '2x12': { inches: 10, rValue: 38 }    // practical thickness
  }
  
  const suggestion = framingToOpenCell[framingSize] || { inches: 5.5, rValue: 21 }
  return {
    closed_cell_inches: 0,
    open_cell_inches: suggestion.inches,
    rValue: suggestion.rValue,
    reason: `fills ${framingSize} cavity`,
    isHybrid: false
  }
}

// Backward compatibility function for open cell
function getSuggestedOpenCellInches(framingSize: string): number {
  return getSuggestedInsulation(framingSize, 'open_cell').open_cell_inches
}

// R-value lookup based on pricing catalog
function getRValueFromInches(insulationType: 'closed_cell' | 'open_cell', inches: number): number {
  if (insulationType === 'closed_cell') {
    // Closed cell: ~R7 per inch (keeping existing logic)
    return inches * 7.0
  } else if (insulationType === 'open_cell') {
    // Find exact match first
    const exactMatch = OPEN_CELL_CATALOG.find(item => item.inches === inches)
    if (exactMatch) return exactMatch.rValue
    
    // Find closest match for interpolation
    const sorted = OPEN_CELL_CATALOG.sort((a, b) => a.inches - b.inches)
    
    if (inches <= sorted[0].inches) return sorted[0].rValue
    if (inches >= sorted[sorted.length - 1].inches) return sorted[sorted.length - 1].rValue
    
    // Linear interpolation between closest values
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i]
      const next = sorted[i + 1]
      
      if (inches >= current.inches && inches <= next.inches) {
        const ratio = (inches - current.inches) / (next.inches - current.inches)
        return Math.round(current.rValue + (next.rValue - current.rValue) * ratio)
      }
    }
    
    // Fallback to linear calculation
    return inches * 3.8
  }
  
  return 0
}

// Feature flag for new pricing logic
const USE_NEW_PRICING = process.env.NEXT_PUBLIC_USE_NEW_PRICING === 'true' || false

// Helper function to get Massachusetts R-value requirements
function getMassachusettsRValueRequirement(projectType: 'new' | 'remodel' | null, areaType: string): number | null {
  if (!projectType || !areaType) return null
  
  if (projectType === 'new') {
    switch (areaType) {
      case 'roof':
        return 60
      case 'exterior_walls':
        return 30
      case 'basement_walls':
        return 15
      default:
        return null
    }
  } else if (projectType === 'remodel') {
    switch (areaType) {
      case 'roof':
        return 49
      case 'exterior_walls':
        return 21
      case 'basement_walls':
        return 15
      default:
        return null
    }
  }
  
  return null
}

// Type definitions
type InsulationMeasurement = Database['public']['Tables']['measurements']['Row']

// Extended Job interface with lead information
interface Job extends DatabaseJob {
  lead?: {
    name: string
    phone: string
    email?: string | null
    address?: string
  }
  measurements?: Measurement[]
}

// Using InsulationMeasurement type from database
interface Measurement extends Omit<InsulationMeasurement, 'id' | 'job_id' | 'created_at' | 'updated_at'> {
  id: string
  framing_size?: string | null
}

interface MeasurementGroup {
  room_name: string
  area_type: string
  measurements: Measurement[]
  total_square_feet: number
  insulation_type: InsulationType
  r_value: string | null
  framing_size: string | null
  is_hybrid_system: boolean | null
  closed_cell_inches: number | null
  open_cell_inches: number | null
  wall_count: number
  photo_file?: File | null
}

// Insulation Schema
const wallDimensionSchema = z.object({
  height: z.number().min(0.1, "Height must be greater than 0"),
  width: z.number().min(0.1, "Width must be greater than 0"),
})

const insulationMeasurementSchema = z.object({
  room_name: z.string().min(1, "Wall section name is required"),
  floor_level: z.string().optional(),
  area_type: z.enum(["exterior_walls", "interior_walls", "ceiling", "gable", "roof"]).optional(),
  surface_type: z.enum(["wall", "ceiling"]),
  framing_size: z.enum(["2x4", "2x6", "2x8", "2x10", "2x12"]),
  wall_dimensions: z.array(wallDimensionSchema).min(1, "At least one wall section is required"),
  insulation_type: z.enum(["closed_cell", "open_cell", "batt", "blown_in", "hybrid", "mineral_wool"]).optional(),
  r_value: z.string().optional(),
  closed_cell_inches: z.number().min(0).optional(),
  open_cell_inches: z.number().min(0).optional(),
  target_r_value: z.number().min(0).optional(),
  notes: z.string().optional(),
  // Manager-only override inputs (client-side optional)
  override_closed_cell_price_per_sqft: z.number().min(0).optional(),
  override_open_cell_price_per_sqft: z.number().min(0).optional(),
})

// HVAC Schema
const hvacMeasurementSchema = z.object({
  room_name: z.string().min(1, "Room name is required"),
  system_type: z.enum(["central_air", "heat_pump", "furnace"]),
  tonnage: z.number().min(0.5, "Tonnage must be at least 0.5").max(20, "Tonnage must be less than 20"),
  seer_rating: z.number().min(8, "SEER rating must be at least 8").max(30, "SEER rating must be less than 30").optional(),
  ductwork_linear_feet: z.number().min(0, "Ductwork linear feet must be positive"),
  return_vents_count: z.number().min(0, "Return vents count must be positive"),
  supply_vents_count: z.number().min(0, "Supply vents count must be positive"),
  notes: z.string().optional(),
})

// Plaster Schema
const plasterMeasurementSchema = z.object({
  room_name: z.string().min(1, "Room name is required"),
  wall_condition: z.enum(["good", "fair", "poor"]),
  ceiling_condition: z.enum(["good", "fair", "poor"]),
  wall_square_feet: z.number().min(0, "Wall square feet must be positive"),
  ceiling_square_feet: z.number().min(0, "Ceiling square feet must be positive"),
  prep_work_hours: z.number().min(0, "Prep work hours must be positive"),
  notes: z.string().optional(),
})

type InsulationMeasurementFormData = z.infer<typeof insulationMeasurementSchema>
type HvacMeasurementFormData = z.infer<typeof hvacMeasurementSchema>
type PlasterMeasurementFormData = z.infer<typeof plasterMeasurementSchema>

type MeasurementFormData = InsulationMeasurementFormData | HvacMeasurementFormData | PlasterMeasurementFormData

interface MeasurementInterfaceProps {
  job: Job
  onJobUpdate: (updatedJob: Job) => void
  onClose: () => void
}

export function MeasurementInterface({ job, onJobUpdate, onClose }: MeasurementInterfaceProps) {
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(true)
  const [serviceType, setServiceType] = useState<'insulation' | 'hvac' | 'plaster'>(job.service_type || 'insulation')
  const [pricing, setPricing] = useState<PricingCatalog[]>([])
  const [loadingPricing, setLoadingPricing] = useState(false)
  const [showEstimateBuilder, setShowEstimateBuilder] = useState(false)
  const [jobPhotos, setJobPhotos] = useState<string[]>([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [realtimePricing, setRealtimePricing] = useState<{ pricePerSqft: number; totalPrice: number } | null>(null)
  const { user: roleUser } = useRole()
  const isManager = roleUser?.role === 'manager'
  const [groupOverrides, setGroupOverrides] = useState<Record<string, { sqft?: number; unitPrice?: number }>>({})

  // Dynamic form based on service type
  const getFormConfig = (serviceType: string) => {
    switch (serviceType) {
      case 'insulation':
        return {
          schema: insulationMeasurementSchema,
          defaultValues: {
            room_name: "",
            floor_level: "",
            area_type: "exterior_walls" as const,
            surface_type: "wall" as const,
            framing_size: "2x6" as const,
            wall_dimensions: [{ height: 0, width: 0 }],
            insulation_type: "closed_cell" as const,
            closed_cell_inches: 0,
            open_cell_inches: 0,
            target_r_value: 0,
            r_value: "",
            notes: "",
            override_closed_cell_price_per_sqft: undefined,
            override_open_cell_price_per_sqft: undefined,
          }
        }
      case 'hvac':
        return {
          schema: hvacMeasurementSchema,
          defaultValues: {
            room_name: "",
            system_type: "central_air" as const,
            tonnage: 0,
            seer_rating: 0,
            ductwork_linear_feet: 0,
            return_vents_count: 0,
            supply_vents_count: 0,
            notes: ""
          }
        }
      case 'plaster':
        return {
          schema: plasterMeasurementSchema,
          defaultValues: {
            room_name: "",
            wall_condition: "good" as const,
            ceiling_condition: "good" as const,
            wall_square_feet: 0,
            ceiling_square_feet: 0,
            prep_work_hours: 0,
            notes: ""
          }
        }
      default:
        return {
          schema: insulationMeasurementSchema,
          defaultValues: {
            room_name: "",
            floor_level: "",
            area_type: "exterior_walls" as const,
            surface_type: "wall" as const,
            framing_size: "2x6" as const,
            wall_dimensions: [{ height: 0, width: 0 }],
            insulation_type: "closed_cell" as const,
            closed_cell_inches: 0,
            open_cell_inches: 0,
            target_r_value: 0,
            r_value: "",
            notes: "",
            override_closed_cell_price_per_sqft: undefined,
            override_open_cell_price_per_sqft: undefined,
          }
        }
    }
  }

  const formConfig = getFormConfig(serviceType)
  const form = useForm<any>({
    resolver: zodResolver(formConfig.schema),
    defaultValues: formConfig.defaultValues
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "wall_dimensions"
  })

  // Reset form when service type changes
  useEffect(() => {
    const newFormConfig = getFormConfig(serviceType)
    form.reset(newFormConfig.defaultValues)
  }, [serviceType, form])

  // Load pricing data for the selected service type
  const loadPricing = useCallback(async (service: string) => {
    try {
      setLoadingPricing(true)
      const response = await fetch(`/api/pricing/${service}`)
      const result = await response.json()

      if (result.success) {
        setPricing(result.data || [])
      } else {
        toast.error('Failed to load pricing data')
      }
    } catch (error) {
      console.error('Error loading pricing:', error)
      toast.error('Failed to load pricing data')
    } finally {
      setLoadingPricing(false)
    }
  }, [])

  // Load existing measurements
  // Save estimate and send for approval
  const saveEstimateForApproval = async () => {
    console.log('🔄 saveEstimateForApproval called with measurements:', measurements.length)
    
    if (measurements.length === 0) {
      toast.error('No measurements to save')
      console.log('❌ No measurements found, aborting estimate save')
      return
    }

    console.log('📋 Starting estimate save process...')
    try {
      let total = 0
      let lineItems: any[] = []

      // For now, only handle insulation measurements
      if (job.service_type !== 'insulation') {
        toast.error('Estimate creation is currently only supported for insulation jobs')
        return
      }

      // Create grouped line items for insulation (same logic as display)
      // Filter out photo measurements (those with room_name starting with "Photo:")
      // Photos are now handled separately in the jobPhotos state and PDF photos section
      const realMeasurements = measurements.filter(m => !m.room_name.startsWith('Photo:'))
      const groupedMeasurements = realMeasurements.reduce((groups, measurement) => {
        // Extract base room name by removing "- Wall X" suffix
        const baseRoomName = measurement.room_name.replace(/ - Wall \d+$/, '')
        
        // Create unique key that includes insulation specifications
        let insulationKey = measurement.insulation_type || 'unknown'
        if (measurement.is_hybrid_system) {
          insulationKey = `hybrid-${measurement.closed_cell_inches || 0}cc-${measurement.open_cell_inches || 0}oc`
        } else if (measurement.closed_cell_inches && measurement.closed_cell_inches > 0) {
          insulationKey = `${measurement.insulation_type}-${measurement.closed_cell_inches}in`
        } else if (measurement.open_cell_inches && measurement.open_cell_inches > 0) {
          insulationKey = `${measurement.insulation_type}-${measurement.open_cell_inches}in`
        } else if (measurement.r_value) {
          insulationKey = `${measurement.insulation_type}-R${measurement.r_value}`
        }
        
        const key = `${baseRoomName}-${measurement.area_type || 'unknown'}-${insulationKey}`
        if (!groups[key]) {
          const newGroup: MeasurementGroup = {
            room_name: baseRoomName,
            area_type: measurement.area_type || 'exterior_walls',
            measurements: [],
            total_square_feet: 0,
            insulation_type: measurement.insulation_type as InsulationType || 'closed_cell',
            r_value: measurement.r_value,
            framing_size: measurement.framing_size || null,
            is_hybrid_system: measurement.is_hybrid_system,
            closed_cell_inches: measurement.closed_cell_inches,
            open_cell_inches: measurement.open_cell_inches,
            wall_count: 0
          }
          groups[key] = newGroup
        }
        groups[key].measurements.push(measurement)
        groups[key].total_square_feet += measurement.square_feet || 0
        groups[key].wall_count += 1
        return groups
      }, {} as Record<string, MeasurementGroup>)

      // Calculate total using override prices if available, otherwise use standard pricing
      total = Object.values(groupedMeasurements).reduce((sum, group) => {
        // Check for manager override price first (use first measurement in group)
        const firstMeasurement = group.measurements[0] as any
        if (firstMeasurement?.override_unit_price !== null && firstMeasurement?.override_unit_price !== undefined) {
          const overridePrice = Number(firstMeasurement.override_unit_price)
          console.log(`💰 Total calculation using override price for ${group.room_name}: ${group.total_square_feet} × $${overridePrice} = $${group.total_square_feet * overridePrice}`)
          return sum + (group.total_square_feet * overridePrice)
        } else if (group.is_hybrid_system && group.insulation_type === 'hybrid') {
          // Calculate hybrid pricing
          const hybridCalc = calculateHybridRValue(
            group.closed_cell_inches || 0, 
            group.open_cell_inches || 0
          )
          const hybridPricing = calculateHybridPricing(hybridCalc)
          return sum + (group.total_square_feet * hybridPricing.totalPricePerSqft)
        } else {
          // Regular system pricing - use inches if available
          if ((group.insulation_type === 'closed_cell' || group.insulation_type === 'open_cell') && 
              (group.closed_cell_inches || group.open_cell_inches)) {
            const inches = group.insulation_type === 'closed_cell' ? (group.closed_cell_inches || 0) : (group.open_cell_inches || 0)
            if (inches > 0) {
              const pricing = calculatePriceByInches(group.total_square_feet, group.insulation_type, inches)
              return sum + pricing.totalPrice
            }
          }
          
          // Fallback to R-value pricing
          const pricePerSqft = calculateMeasurementPrice(
            group.total_square_feet, 
            group.insulation_type as InsulationType, 
            Number(group.r_value) || 0
          )?.pricePerSqft || 0
          return sum + (group.total_square_feet * pricePerSqft)
        }
      }, 0)

      lineItems = Object.values(groupedMeasurements).map(group => {
        const areaDisplayName = group.area_type ? getAreaDisplayName(group.area_type as any) : 'Unknown Area'
        let unitPrice = 0
        
        // Check for manager override price first (use first measurement in group)
        const firstMeasurement = group.measurements[0] as any
        if (firstMeasurement?.override_unit_price !== null && firstMeasurement?.override_unit_price !== undefined) {
          unitPrice = Number(firstMeasurement.override_unit_price)
          console.log(`💰 Using override price for ${group.room_name}: $${unitPrice}/sq ft`)
        } else if (group.is_hybrid_system && group.insulation_type === 'hybrid') {
          // Hybrid pricing
          const hybridCalc = calculateHybridRValue(
            group.closed_cell_inches || 0, 
            group.open_cell_inches || 0
          )
          const hybridPricing = calculateHybridPricing(hybridCalc)
          unitPrice = hybridPricing.totalPricePerSqft
        } else {
          // Regular pricing - use inches if available
          if ((group.insulation_type === 'closed_cell' || group.insulation_type === 'open_cell') && 
              (group.closed_cell_inches || group.open_cell_inches)) {
            const inches = group.insulation_type === 'closed_cell' ? (group.closed_cell_inches || 0) : (group.open_cell_inches || 0)
            if (inches > 0) {
              const pricing = calculatePriceByInches(group.total_square_feet, group.insulation_type, inches)
              unitPrice = pricing.pricePerSqft
            }
          } else {
            // Fallback to R-value pricing
            const price = calculateMeasurementPrice(
              group.total_square_feet,
              group.insulation_type as InsulationType,
              Number(group.r_value) || 0,
              group.area_type
            )
            unitPrice = price.pricePerSqft
          }
        }
        
        return {
          description: `${group.room_name} - ${areaDisplayName}`,
          framing_size: group.measurements[0]?.framing_size || '',
          quantity: group.total_square_feet,
          unit_price: unitPrice,
          unit: 'sq ft',
          service_type: 'insulation'
        }
      })

      if (total === 0) {
        toast.error('Cannot create estimate with $0 total')
        return
      }

      console.log('💰 About to save estimate with total:', formatCurrency(total))
      console.log('📋 Line items:', lineItems)

      // First check if an estimate already exists for this job
      console.log('🔍 Checking for existing estimates for job:', job.id)
      const existingEstimatesResponse = await fetch(`/api/estimates?job_id=${job.id}`, {
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      const existingEstimatesResult = await existingEstimatesResponse.json()
      console.log('📊 Existing estimates result:', existingEstimatesResult)
      
      let response
      let existingEstimate = null
      
      // Look for pending estimates for this job
      if (existingEstimatesResult.success && existingEstimatesResult.data?.estimates?.length > 0) {
        existingEstimate = existingEstimatesResult.data.estimates.find((est: any) => 
          est.jobs?.id === job.id && est.status === 'pending_approval'
        )
      }
      
      if (existingEstimate) {
        // Update existing estimate
        console.log('🔄 Updating existing estimate:', existingEstimate.id)
        response = await fetch(`/api/estimates/${existingEstimate.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            total_amount: total,
            subtotal: total,
            line_items: lineItems // This will replace the line items
          })
        })
      } else {
        // Create new estimate
        console.log('➕ Creating new estimate for job:', job.id)
        response = await fetch('/api/estimates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            job_id: job.id,
            total_amount: total,
            subtotal: total,
            status: 'pending_approval',
            line_items: lineItems
          })
        })
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const responseText = await response.text()
      console.log('💾 Raw response:', responseText)
      
      if (!responseText) {
        throw new Error('Empty response from server')
      }

      const result = JSON.parse(responseText)
      console.log('💾 Estimate save result:', result)
      
      if (result.success) {
        const action = existingEstimate ? 'updated' : 'created'
        toast.success(`Estimate ${action}! Total: ${formatCurrency(total)} (${lineItems.length} line items)`)
        console.log(`✅ Estimate ${action} with ID:`, result.data?.id || existingEstimate?.id)
        console.log('🎯 Total line items included:', lineItems.length)
        
        // Update the approvals store immediately
        const approvalsStore = useApprovalsStore.getState()
        
        // If the estimate is pending_approval, refresh the approvals store
        if (result.data?.status === 'pending_approval' || (!existingEstimate && result.data)) {
          console.log('🔄 Refreshing approvals store after estimate creation/update')
          approvalsStore.refresh()
        }
        
        // Keep the window event for backwards compatibility
        window.dispatchEvent(new CustomEvent('estimateUpdated', { 
          detail: { 
            estimateId: result.data?.id || existingEstimate?.id,
            jobId: job.id,
            newTotal: total,
            timestamp: Date.now(),
            source: 'measurements_page'
          } 
        }))
        console.log('📡 Broadcasted estimate update event from measurements page')
        
        // Optionally update job status or refresh data
      } else {
        console.error('❌ Estimate save failed:', result.error)
        toast.error(`Failed to save estimate: ${result.error}`)
      }
    } catch (error) {
      console.error('Error saving estimate:', error)
      toast.error('Failed to save estimate')
    }
  }

  const loadMeasurements = useCallback(async () => {
    try {
      setLoading(true)
      console.log(`🔄 Loading measurements for job ${job.id} (${job.service_type})`)
      const response = await fetch(`/api/jobs/${job.id}/measurements`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      console.log(`📡 Measurements API response: ${response.status} ${response.statusText}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ Measurements API error: ${response.status} - ${errorText}`)
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()

      if (result.success) {
        setMeasurements(result.data || [])
        // Extract photo URLs from measurements
        const photos = result.data
          ?.map((m: any) => m.photo_url)
          .filter((url: string) => url) || []
        setJobPhotos(photos)
        console.log('📸 Loaded job photos:', photos.length)
      } else {
        toast.error('Failed to load measurements')
      }
    } catch (error) {
      console.error('Error loading measurements:', error)
      toast.error('Failed to load measurements')
    } finally {
      setLoading(false)
    }
  }, [job.id])

  // Photo upload function
  const uploadJobPhoto = async (file: File) => {
    try {
      setUploadingPhoto(true)
      console.log('📤 Uploading job photo:', file.name)
      
      // Create a data URL for immediate display and database storage
      const reader = new FileReader()
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string
        
        // Add to job photos immediately for instant feedback
        setJobPhotos(prev => [...prev, dataUrl])
        
        // Save the photo to the database as a measurement record
        await createPhotoMeasurement(file.name, dataUrl)
        
        console.log('✅ Photo uploaded and saved to database')
      }
      reader.readAsDataURL(file)
      
    } catch (error) {
      console.error('Error uploading photo:', error)
      toast.error('Failed to upload photo')
    } finally {
      setUploadingPhoto(false)
    }
  }

  // Create a photo measurement record
  const createPhotoMeasurement = async (fileName: string, photoUrl: string) => {
    try {
      console.log('📤 Creating photo measurement for:', fileName)
      const payload = {
        room_name: `Photo: ${fileName}`,
        surface_type: 'wall', // Required field
        height: 0, // Required field  
        width: 0, // Required field
        photo_url: photoUrl,
        notes: `Job photo uploaded: ${fileName}`,
        area_type: 'exterior_walls',
        framing_size: '2x4'
      }
      console.log('📋 Photo measurement payload:', payload)
      
      const response = await fetch(`/api/jobs/${job.id}/measurements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()
      console.log('📸 Photo measurement API response:', result)
      
      if (result.success) {
        console.log('✅ Photo measurement created successfully:', result.data?.id)
        toast.success(`Photo "${fileName}" uploaded successfully`)
        // Refresh measurements to get the saved photo
        await loadMeasurements()
      } else {
        console.error('❌ Failed to create photo measurement:', result.error)
        toast.error('Failed to save photo')
      }
    } catch (error) {
      console.error('💥 Error creating photo measurement:', error)
      toast.error('Failed to save photo')
    }
  }

  useEffect(() => {
    loadMeasurements()
    loadPricing(serviceType)
    
    // Listen for estimate updates from other parts of the app
    const handleEstimateUpdate = (event: CustomEvent) => {
      console.log('🔄 Estimate updated elsewhere, refreshing measurement data...', event.detail)
      loadMeasurements() // Refresh measurements to show any updates
    }
    
    window.addEventListener('estimateUpdated', handleEstimateUpdate as EventListener)
    
    return () => {
      window.removeEventListener('estimateUpdated', handleEstimateUpdate as EventListener)
    }
  }, [loadMeasurements, loadPricing, serviceType])

  // Handle service type change
  const handleServiceTypeChange = (newServiceType: 'insulation' | 'hvac' | 'plaster') => {
    setServiceType(newServiceType)
    loadPricing(newServiceType)
  }

  // Calculate total square feet
  const totalSquareFeet = measurements.reduce((total, measurement) => {
    return total + (measurement.square_feet || 0)
  }, 0)

  // Group measurements by floor level and area type for aggregation
  const aggregatedMeasurements = measurements.reduce((acc, measurement) => {
    // Default to exterior_walls if area_type is not available
    const areaType = measurement.area_type || 'exterior_walls'
    const floorLevel = measurement.floor_level || 'Unknown Floor'
    const key = `${floorLevel}-${areaType}`
    
    if (!acc[key]) {
      acc[key] = {
        floor_level: floorLevel,  // This is now a string from room_name
        area_type: areaType as AreaType,
        total_square_feet: 0,
        measurements: [],
        r_value: Number(measurement.r_value) || 0,
        insulation_type: measurement.insulation_type
      }
    }
    acc[key].total_square_feet += (measurement.square_feet || 0)
    acc[key].measurements.push(measurement)
    return acc
  }, {} as Record<string, {
    floor_level: string  // Changed from FloorLevel to string
    area_type: AreaType
    total_square_feet: number
    measurements: Measurement[]
    r_value: number
    insulation_type?: string | null
  }>)

  // Add new measurement(s) - one for each wall dimension
  const addMeasurement = async (data: any) => {
    try {
      setSaving(true)
      
      if (serviceType === 'insulation') {
        // Handle insulation measurements
        const insulationData = data as InsulationMeasurementFormData
        
        // Calculate R-value based on project type and area type
        const projectType = job.construction_type || 'remodel'
        const rValueResult = insulationData.area_type 
          ? calculateRValue(projectType, insulationData.area_type)
          : { rValue: 0 }  // Default if no area type

        // Create a measurement for each valid wall dimension
        const validWalls = insulationData.wall_dimensions.filter((wall: any) => wall.height > 0 && wall.width > 0)
        const newMeasurements: Measurement[] = []
      
      for (let i = 0; i < validWalls.length; i++) {
        const wall = validWalls[i]
        const square_feet = wall.height * wall.width
        
        // Calculate R-value for hybrid or regular systems
        let finalRValue = rValueResult?.rValue?.toString() || null
        let closedCellInches = 0
        let openCellInches = 0
        let isHybridSystem = false

        if (insulationData.insulation_type === 'hybrid') {
          closedCellInches = insulationData.closed_cell_inches || 0
          openCellInches = insulationData.open_cell_inches || 0
          isHybridSystem = true
          
          if (closedCellInches > 0 || openCellInches > 0) {
            const hybridCalc = calculateHybridRValue(
              closedCellInches,
              openCellInches,
              insulationData.framing_size,
              insulationData.area_type,
              job?.construction_type
            )
            finalRValue = hybridCalc.totalRValue.toString()
          }
        } else if (insulationData.insulation_type === 'closed_cell') {
          closedCellInches = insulationData.closed_cell_inches || 0
          if (closedCellInches > 0) {
            finalRValue = getRValueFromInches('closed_cell', closedCellInches).toString()
          }
        } else if (insulationData.insulation_type === 'open_cell') {
          openCellInches = insulationData.open_cell_inches || 0
          if (openCellInches > 0) {
            finalRValue = getRValueFromInches('open_cell', openCellInches).toString()
          }
        } else if (insulationData.insulation_type === 'mineral_wool') {
          // For Mineral Wool, take the selected R-value (15 or 25) from the form
          // This prevents defaulting to code target like R60
          finalRValue = insulationData.r_value || '15'
        }

        const newMeasurement: Measurement = {
          id: `temp-${Date.now()}-${i}`,
          room_name: validWalls.length > 1 ? `${insulationData.room_name} - Wall ${i + 1}` : insulationData.room_name,
          floor_level: insulationData.floor_level || null,
          area_type: insulationData.area_type || null,
          surface_type: insulationData.surface_type,
          // framing_size: insulationData.framing_size, // Property doesn't exist in DB
          height: wall.height,
          width: wall.width,
          square_feet,
          insulation_type: insulationData.insulation_type || null,
          r_value: finalRValue,
          closed_cell_inches: closedCellInches,
          open_cell_inches: openCellInches,
          is_hybrid_system: isHybridSystem,
          notes: insulationData.notes || null,
          photo_url: null,
          locked_by_estimate_id: null,
          is_locked: null,
          locked_at: null,
          override_closed_cell_price_per_sqft: null,
          override_open_cell_price_per_sqft: null,
          override_set_by: null,
          override_set_at: null
        }
        newMeasurements.push(newMeasurement)
      }

      // Add all measurements to local state first
      setMeasurements(prev => [...prev, ...newMeasurements])
      
      // Save each measurement to database
      const savedMeasurements: { tempId: string; realId: string }[] = []
      let errorCount = 0
      
      for (const measurement of newMeasurements) {
        try {
          const response = await fetch(`/api/jobs/${job.id}/measurements`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              room_name: measurement.room_name,
              floor_level: measurement.floor_level,
              area_type: measurement.area_type,
              surface_type: measurement.surface_type,
              framing_size: measurement.framing_size,
              height: measurement.height,
              width: measurement.width,
              insulation_type: measurement.insulation_type,
              r_value: measurement.r_value,
              closed_cell_inches: measurement.closed_cell_inches,
              open_cell_inches: measurement.open_cell_inches,
              is_hybrid_system: measurement.is_hybrid_system,
              notes: measurement.notes,
              // Send override fields if manager filled them (server enforces role check)
              override_closed_cell_price_per_sqft: isManager ? form.getValues('override_closed_cell_price_per_sqft') : undefined,
              override_open_cell_price_per_sqft: isManager ? form.getValues('override_open_cell_price_per_sqft') : undefined
            })
          })

          const result = await response.json()

          if (result.success) {
            savedMeasurements.push({ tempId: measurement.id, realId: result.data.id })
          } else {
            errorCount++
            console.error('Failed to save measurement:', result.error)
          }
        } catch (err) {
          errorCount++
          console.error('Error saving measurement:', err)
        }
      }

      // Update measurements with real IDs
      if (savedMeasurements.length > 0) {
        setMeasurements(prev => prev.map(m => {
          const saved = savedMeasurements.find(s => s.tempId === m.id)
          return saved ? { ...m, id: saved.realId } : m
        }))
      }

      // Remove failed measurements from local state
      if (errorCount > 0) {
        const failedIds = newMeasurements
          .filter(m => !savedMeasurements.find(s => s.tempId === m.id))
          .map(m => m.id)
        setMeasurements(prev => prev.filter(m => !failedIds.includes(m.id)))
      }

      const totalSquareFeet = validWalls.reduce((sum, wall) => sum + (wall.height * wall.width), 0)
      
      if (savedMeasurements.length > 0) {
        toast.success(`${savedMeasurements.length} wall${savedMeasurements.length !== 1 ? 's' : ''} added: ${totalSquareFeet.toFixed(1)} sq ft total`)
      }
      
      if (errorCount > 0) {
        toast.error(`${errorCount} wall${errorCount !== 1 ? 's' : ''} failed to save`)
      }

        if (savedMeasurements.length > 0) {
          form.reset(formConfig.defaultValues)
        }
      } else if (serviceType === 'hvac') {
        // Handle HVAC measurements
        const hvacData = data as HvacMeasurementFormData
        
        const newMeasurement = {
          room_name: hvacData.room_name,
          system_type: hvacData.system_type,
          tonnage: hvacData.tonnage,
          seer_rating: hvacData.seer_rating,
          ductwork_linear_feet: hvacData.ductwork_linear_feet,
          return_vents_count: hvacData.return_vents_count,
          supply_vents_count: hvacData.supply_vents_count,
          notes: hvacData.notes
        }

        const response = await fetch(`/api/jobs/${job.id}/measurements`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newMeasurement)
        })

        const result = await response.json()

        if (result.success) {
          // Add to local state with temp ID until we reload
          setMeasurements(prev => [...prev, { 
            ...newMeasurement, 
            id: result.data.id,
            square_feet: 0, // HVAC doesn't use square feet
            height: 0,
            width: 0,
            surface_type: 'wall',
            framing_size: null,
            area_type: null,
            floor_level: null,
            insulation_type: null,
            r_value: null,
            photo_url: null
          } as any])
          
          toast.success('HVAC measurement added successfully')
          form.reset(formConfig.defaultValues)
        } else {
          console.error('Failed to save HVAC measurement:', result.error)
          toast.error(`Failed to add HVAC measurement: ${result.error}`)
        }
      } else if (serviceType === 'plaster') {
        // Handle Plaster measurements
        const plasterData = data as PlasterMeasurementFormData
        
        const newMeasurement = {
          room_name: plasterData.room_name,
          wall_condition: plasterData.wall_condition,
          ceiling_condition: plasterData.ceiling_condition,
          wall_square_feet: plasterData.wall_square_feet,
          ceiling_square_feet: plasterData.ceiling_square_feet,
          prep_work_hours: plasterData.prep_work_hours,
          notes: plasterData.notes
        }

        const response = await fetch(`/api/jobs/${job.id}/measurements`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newMeasurement)
        })

        const result = await response.json()

        if (result.success) {
          // Add to local state with temp ID until we reload
          setMeasurements(prev => [...prev, { 
            ...newMeasurement, 
            id: result.data.id,
            square_feet: plasterData.wall_square_feet + plasterData.ceiling_square_feet,
            height: 0,
            width: 0,
            surface_type: 'wall',
            framing_size: null,
            area_type: null,
            floor_level: null,
            insulation_type: null,
            r_value: null,
            photo_url: null
          } as any])
          
          toast.success('Plaster measurement added successfully')
          form.reset(formConfig.defaultValues)
        } else {
          console.error('Failed to save plaster measurement:', result.error)
          toast.error(`Failed to add plaster measurement: ${result.error}`)
        }
      }
    } catch (error) {
      console.error('Error adding measurement:', error)
      toast.error('Failed to add measurement')
    } finally {
      setSaving(false)
    }
  }

  // Delete measurement
  const deleteMeasurement = async (measurementId: string) => {
    if (!confirm('Are you sure you want to delete this measurement?')) return

    try {
      const response = await fetch(`/api/measurements/${measurementId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        setMeasurements(prev => prev.filter(m => m.id !== measurementId))
        toast.success('Measurement deleted')
      } else {
        toast.error('Failed to delete measurement')
      }
    } catch (error) {
      console.error('Error deleting measurement:', error)
      toast.error('Failed to delete measurement')
    }
  }

  // Handle photo upload
  const handlePhotoUpload = async (measurementId: string, file: File) => {
    console.log('handlePhotoUpload called:', measurementId, file.name)
    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      console.log('Invalid file type:', file.type)
      toast.error('Please upload a valid image file (JPG, PNG, or WebP)')
      return
    }
    
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 10MB')
      return
    }
    
    try {
      toast.info('Uploading photo...')
      
      const formData = new FormData()
      formData.append('photo', file)
      formData.append('measurementId', measurementId)

      const response = await fetch(`/api/measurements/${measurementId}/photo`, {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        setMeasurements(prev => prev.map(m =>
          m.id === measurementId
            ? { ...m, photo_url: result.photoUrl }
            : m
        ))
        toast.success(result.message || 'Photo uploaded successfully')
      } else {
        console.error('Photo upload failed:', result)
        toast.error(`Failed to upload photo: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error uploading photo:', error)
      toast.error('Failed to upload photo - please check your connection')
    }
  }

  // Update job total
  const updateJobTotal = async () => {
    try {
      const response = await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          total_square_feet: totalSquareFeet
        })
      })

      const result = await response.json()

      if (result.success) {
        onJobUpdate({ ...job, total_square_feet: totalSquareFeet })
        toast.success('Job total updated')
      }
    } catch (error) {
      console.error('Error updating job total:', error)
    }
  }

  // Auto-update job total when measurements change
  useEffect(() => {
    if (measurements.length > 0) {
      const debounceTimer = setTimeout(() => {
        updateJobTotal()
      }, 1000)

      return () => clearTimeout(debounceTimer)
    }
  }, [totalSquareFeet])

  // Calculate total square footage from form dimensions
  const calculateTotalSquareFeet = () => {
    const wallDimensions = form.watch('wall_dimensions') || []
    return wallDimensions.reduce((total: number, wall: any) => {
      if (wall?.height && wall?.width) {
        const height = typeof wall.height === 'string' ? parseFloat(wall.height) || 0 : wall.height || 0
        const width = typeof wall.width === 'string' ? parseFloat(wall.width) || 0 : wall.width || 0
        return total + (height * width)
      }
      return total
    }, 0)
  }

  // New centralized pricing function using orchestrator
  const calculateRealtimePriceWithOrchestrator = async () => {
    const insulationType = form.watch('insulation_type')
    const totalSqFt = calculateTotalSquareFeet()
    
    if (!insulationType || totalSqFt === 0) {
      setRealtimePricing(null)
      return
    }

    try {
      const projectType = job.construction_type || 'remodel'
      const areaType = form.watch('area_type')
      const rValueResult = areaType ? calculateRValue(projectType, areaType) : { rValue: 0 }
      const rValue = rValueResult?.rValue || 0

      const closedCellInches = form.watch('closed_cell_inches') || 0
      const openCellInches = form.watch('open_cell_inches') || 0
      
      // Get override values for managers
      const overrideClosed = form.watch('override_closed_cell_price_per_sqft')
      const overrideOpen = form.watch('override_open_cell_price_per_sqft')
      let override: number | undefined
      
      if (isManager) {
        if (insulationType === 'closed_cell' && typeof overrideClosed === 'number') {
          override = overrideClosed
        } else if (insulationType === 'open_cell' && typeof overrideOpen === 'number') {
          override = overrideOpen
        }
      }

      // Use the orchestrator with injected helpers
      const result = await determineUnitPrice({
        sqft: totalSqFt,
        kind: insulationType as "closed_cell" | "open_cell" | "hybrid",
        r: rValue,
        ccInches: closedCellInches,
        ocInches: openCellInches,
        override,
        // Injected helper functions
        getDbUnitPrice: async (kind, r) => {
          return await fetchDbUnitPrice(kind, r, closedCellInches, openCellInches)
        },
        hybridPerSqft: (ccInches, ocInches) => {
          const hybridCalc = calculateHybridRValue(ccInches, ocInches)
          const hybridPricing = calculateHybridPricing(hybridCalc)
          return hybridPricing.totalPricePerSqft
        },
        perInch: (sqft, kind, inches) => {
          const pricing = calculatePriceByInches(sqft, kind, inches)
          return pricing.pricePerSqft
        },
        perRValue: (sqft, kind, r) => {
          const pricing = calculateMeasurementPrice(sqft, kind as InsulationType, r)
          return pricing.pricePerSqft
        }
      })

      setRealtimePricing({
        pricePerSqft: result.unitPrice,
        totalPrice: totalSqFt * result.unitPrice
      })

      // Log for debugging
      console.log('New pricing result:', {
        source: result.source,
        unitPrice: result.unitPrice,
        details: result.details,
        totalPrice: totalSqFt * result.unitPrice
      })

    } catch (error) {
      console.error('Error in new pricing orchestrator:', error)
      // Fall back to old logic if new logic fails
      await calculateRealtimePriceAsync()
    }
  }

  // Calculate real-time pricing using database
  const calculateRealtimePriceAsync = async () => {
    const insulationType = form.watch('insulation_type')
    const totalSqFt = calculateTotalSquareFeet()
    
    if (!insulationType || totalSqFt === 0) {
      setRealtimePricing(null)
      return
    }
    
    try {
      // Handle hybrid systems
      if (insulationType === 'hybrid') {
        const closedCellInches = form.watch('closed_cell_inches') || 0
        const openCellInches = form.watch('open_cell_inches') || 0
        
        if (closedCellInches === 0 && openCellInches === 0) {
          setRealtimePricing({ pricePerSqft: 0, totalPrice: 0 })
          return
        }
        
        const hybridCalc = calculateHybridRValue(closedCellInches, openCellInches)
        const hybridPricing = calculateHybridPricing(hybridCalc)
        
        setRealtimePricing({
          pricePerSqft: hybridPricing.totalPricePerSqft,
          totalPrice: totalSqFt * hybridPricing.totalPricePerSqft
        })
        return
      }
      
      // Regular system pricing using database; apply override precedence if present and manager
      const projectType = job.construction_type || 'remodel'
      const areaType = form.watch('area_type')
      const rValueResult = areaType ? calculateRValue(projectType, areaType) : { rValue: 0 }
      const rValue = rValueResult?.rValue || 0
      
      // Use database pricing
      const databasePricing = await calculateDatabaseMeasurementPrice(
        totalSqFt, 
        insulationType as 'open_cell' | 'closed_cell' | 'hybrid', 
        rValue
      )
      // Override precedence for managers
      const overrideClosed = form.watch('override_closed_cell_price_per_sqft')
      const overrideOpen = form.watch('override_open_cell_price_per_sqft')
      let pricePerSqft = databasePricing.pricePerSqft
      if (isManager) {
        if (insulationType === 'closed_cell' && typeof overrideClosed === 'number') {
          pricePerSqft = overrideClosed
        } else if (insulationType === 'open_cell' && typeof overrideOpen === 'number') {
          pricePerSqft = overrideOpen
        }
      }
      setRealtimePricing({ pricePerSqft, totalPrice: pricePerSqft * totalSqFt })
    } catch (error) {
      console.error('Error calculating realtime pricing:', error)
      // Fallback to hardcoded pricing if database fails
      const projectType = job.construction_type || 'remodel'
      const areaType = form.watch('area_type')
      const rValueResult = areaType ? calculateRValue(projectType, areaType) : { rValue: 0 }
      const rValue = rValueResult?.rValue || 0
      
      const fallbackPricing = calculateMeasurementPrice(totalSqFt, insulationType as InsulationType, rValue)
      setRealtimePricing(fallbackPricing)
    }
  }

  // Watch form changes to update real-time calculations
  const totalSqFt = calculateTotalSquareFeet()
  
  // Effect to recalculate pricing when form values change
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (USE_NEW_PRICING) {
        calculateRealtimePriceWithOrchestrator()
      } else {
        calculateRealtimePriceAsync()
      }
    }, 300) // Debounce to avoid too many database calls

    return () => clearTimeout(debounceTimer)
  }, [
    form.watch('insulation_type'),
    form.watch('area_type'),
    form.watch('wall_dimensions'),
    form.watch('closed_cell_inches'),
    form.watch('open_cell_inches'),
    totalSqFt
  ])

  // Watch for area_type and framing_size changes to auto-set insulation type
  useEffect(() => {
    const areaType = form.watch('area_type')
    const framingSize = form.watch('framing_size')
    
    if (areaType === 'roof' && framingSize) {
      // Use setTimeout to ensure state is ready
      setTimeout(() => {
        if (framingSize === '2x8') {
          form.setValue('insulation_type', 'closed_cell', { shouldValidate: true })
          form.setValue('closed_cell_inches', 7, { shouldValidate: true })
          form.setValue('open_cell_inches', 0, { shouldValidate: true })
        } else if (framingSize === '2x10') {
          form.setValue('insulation_type', 'hybrid', { shouldValidate: true })
          form.setValue('closed_cell_inches', 5, { shouldValidate: true })
          form.setValue('open_cell_inches', 4, { shouldValidate: true })
        } else if (framingSize === '2x12') {
          form.setValue('insulation_type', 'hybrid', { shouldValidate: true })
          form.setValue('closed_cell_inches', 3, { shouldValidate: true })
          form.setValue('open_cell_inches', 8, { shouldValidate: true })
        }
      }, 0)
    }
  }, [form.watch('area_type'), form.watch('framing_size'), form])

  // Handle insulation type changes
  useEffect(() => {
    const insulationType = form.watch('insulation_type')
    const areaType = form.watch('area_type')
    const framingSize = form.watch('framing_size')
    
    if (!insulationType || !framingSize) return
    
    // For roof areas, enforce specific configurations
    if (areaType === 'roof') {
      setTimeout(() => {
        if (framingSize === '2x8') {
          form.setValue('closed_cell_inches', 7, { shouldValidate: true })
          form.setValue('open_cell_inches', 0, { shouldValidate: true })
                                } else if (framingSize === '2x10') {
                          const isNewConstruction = job?.construction_type === 'new'
                          if (isNewConstruction) {
                            form.setValue('closed_cell_inches', 7, { shouldValidate: true })
                            form.setValue('open_cell_inches', 3, { shouldValidate: true })
                          } else {
                            form.setValue('closed_cell_inches', 5, { shouldValidate: true })
                            form.setValue('open_cell_inches', 4, { shouldValidate: true })
                          }
                                } else if (framingSize === '2x12') {
                          const isNewConstruction = job?.construction_type === 'new'
                          if (isNewConstruction) {
                            form.setValue('closed_cell_inches', 5, { shouldValidate: true })
                            form.setValue('open_cell_inches', 6.5, { shouldValidate: true })
                          } else {
                            form.setValue('closed_cell_inches', 3, { shouldValidate: true })
                            form.setValue('open_cell_inches', 8, { shouldValidate: true })
                          }
        }
      }, 0)
      return
    }
    
    // For non-roof areas, handle standard thickness suggestions
    const framingToInches: Record<string, number> = {
      '2x4': 4,
      '2x6': 6,
      '2x8': 8,
      '2x10': 10,
      '2x12': 12
    }
    
    const suggestedInches = framingToInches[framingSize] || 0
    
    setTimeout(() => {
      if (insulationType === 'closed_cell') {
        form.setValue('closed_cell_inches', suggestedInches, { shouldValidate: true })
        form.setValue('open_cell_inches', 0, { shouldValidate: true })
      } else if (insulationType === 'open_cell') {
        form.setValue('closed_cell_inches', 0, { shouldValidate: true })
        form.setValue('open_cell_inches', suggestedInches, { shouldValidate: true })
      } else if (insulationType === 'hybrid') {
        const closedCellInches = Math.min(2, suggestedInches)
        const openCellInches = Math.max(0, suggestedInches - 2)
        form.setValue('closed_cell_inches', closedCellInches, { shouldValidate: true })
        form.setValue('open_cell_inches', openCellInches, { shouldValidate: true })
      }
    }, 0)
  }, [form.watch('insulation_type'), form.watch('area_type'), form.watch('framing_size'), form])

  // Render different forms based on service type
  const renderInsulationForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(addMeasurement)} className="space-y-4">
        {/* Floor/Area Name */}
        <FormField
          control={form.control}
          name="room_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Area Name
              </FormLabel>
              <FormControl>
                <Input 
                  placeholder="Living Room, Master Bedroom, etc." 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Area Type and Framing */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="area_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Area Type</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value)
                    
                    // Auto-set insulation based on area type
                    if (value === 'interior_walls') {
                      // For interior walls, recommend Mineral Wool Batt 3" (R-15)
                      setTimeout(() => {
                        form.setValue('insulation_type', 'mineral_wool', { shouldValidate: true })
                        form.setValue('r_value', '15', { shouldValidate: true }) // 3" is more common for walls
                        form.setValue('closed_cell_inches', 0, { shouldValidate: true })
                        form.setValue('open_cell_inches', 0, { shouldValidate: true })
                      }, 0)
                    } else if (value === 'ceiling') {
                      // For ceiling, recommend Mineral Wool Batt 3" (R-15)
                      setTimeout(() => {
                        form.setValue('insulation_type', 'mineral_wool', { shouldValidate: true })
                        form.setValue('r_value', '15', { shouldValidate: true }) // 3" is more common
                        form.setValue('closed_cell_inches', 0, { shouldValidate: true })
                        form.setValue('open_cell_inches', 0, { shouldValidate: true })
                      }, 0)
                    } else if (value === 'roof') {
                      const framingSize = form.getValues('framing_size')
                      
                      // Use setTimeout to ensure the area_type change is processed first
                      setTimeout(() => {
                        if (framingSize === '2x8') {
                          form.setValue('insulation_type', 'closed_cell', { shouldValidate: true })
                          form.setValue('closed_cell_inches', 7, { shouldValidate: true })
                          form.setValue('open_cell_inches', 0, { shouldValidate: true })
                        } else if (framingSize === '2x10') {
                          form.setValue('insulation_type', 'hybrid', { shouldValidate: true })
                          form.setValue('closed_cell_inches', 5, { shouldValidate: true })
                          form.setValue('open_cell_inches', 4, { shouldValidate: true })
                        } else if (framingSize === '2x12') {
                          form.setValue('insulation_type', 'hybrid', { shouldValidate: true })
                          form.setValue('closed_cell_inches', 3, { shouldValidate: true })
                          form.setValue('open_cell_inches', 8, { shouldValidate: true })
                        }
                      }, 0)
                    }
                  }} 
                  defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select area" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="exterior_walls">Exterior Walls</SelectItem>
                    <SelectItem value="interior_walls">Interior Walls</SelectItem>
                    <SelectItem value="ceiling">Ceiling</SelectItem>
                    <SelectItem value="gable">Gable</SelectItem>
                    <SelectItem value="roof">Roof</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
                {/* Show Massachusetts R-value requirement for selected area */}
                {(() => {
                  const selectedAreaType = form.watch('area_type')
                  const requiredRValue = getMassachusettsRValueRequirement(job.construction_type, selectedAreaType)
                  
                  if (requiredRValue) {
                    return (
                      <div className="text-xs text-blue-600 mt-1 p-2 bg-blue-50 border border-blue-200 rounded">
                        📋 MA Code Requirement: R-{requiredRValue} minimum
                      </div>
                    )
                  }
                  return null
                })()}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="framing_size"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Framing Size</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value)
                    
                    const areaType = form.getValues('area_type')
                    
                    // Special handling for roof areas
                    if (areaType === 'roof') {
                      // Use setTimeout to ensure the framing_size change is processed first
                      setTimeout(() => {
                        const isNewConstruction = job?.construction_type === 'new'
                        
                        if (isNewConstruction) {
                          // New Construction: R60 target
                          if (value === '2x10') {
                            // 2x10 new construction: 3" closed + 7" open = R47.6
                            form.setValue('insulation_type', 'hybrid', { shouldValidate: true })
                                                      form.setValue('closed_cell_inches', 7, { shouldValidate: true })
                          form.setValue('open_cell_inches', 3, { shouldValidate: true })
                          } else if (value === '2x12') {
                            // 2x12 new construction: 5" closed + 7" open = R61.6
                            form.setValue('insulation_type', 'hybrid', { shouldValidate: true })
                            form.setValue('closed_cell_inches', 5, { shouldValidate: true })
                            form.setValue('open_cell_inches', 7, { shouldValidate: true })
                          }
                        } else {
                          // Remodel: R49 requirement
                          if (value === '2x8') {
                            // 2x8 remodel: 7" closed cell = R49
                            form.setValue('insulation_type', 'closed_cell', { shouldValidate: true })
                            form.setValue('closed_cell_inches', 7, { shouldValidate: true })
                            form.setValue('open_cell_inches', 0, { shouldValidate: true })
                          } else if (value === '2x10') {
                            // 2x10 remodel: 5" closed + 4" open = R49
                            form.setValue('insulation_type', 'hybrid', { shouldValidate: true })
                            form.setValue('closed_cell_inches', 5, { shouldValidate: true })
                            form.setValue('open_cell_inches', 4, { shouldValidate: true })
                          } else if (value === '2x12') {
                            // 2x12 remodel: 3" closed + 8" open = R49
                            form.setValue('insulation_type', 'hybrid', { shouldValidate: true })
                            form.setValue('closed_cell_inches', 3, { shouldValidate: true })
                            form.setValue('open_cell_inches', 8, { shouldValidate: true })
                          }
                        }
                      }, 0)
                      return
                    }
                    
                    // Standard handling for walls
                    const framingToInches: Record<string, number> = {
                      '2x4': 4,
                      '2x6': 6,
                      '2x8': 8,
                      '2x10': 10,
                      '2x12': 12
                    }
                    
                    const suggestedInches = framingToInches[value] || 0
                    const insulationType = form.getValues('insulation_type')
                    
                    // Set the suggested thickness based on insulation type
                    if (insulationType === 'closed_cell') {
                      form.setValue('closed_cell_inches', suggestedInches)
                      form.setValue('open_cell_inches', 0)
                    } else if (insulationType === 'open_cell') {
                      form.setValue('closed_cell_inches', 0)
                      form.setValue('open_cell_inches', suggestedInches)
                    } else if (insulationType === 'hybrid') {
                      // For hybrid walls, suggest 2" closed cell and remainder as open cell
                      const closedCellInches = Math.min(2, suggestedInches)
                      const openCellInches = Math.max(0, suggestedInches - 2)
                      form.setValue('closed_cell_inches', closedCellInches)
                      form.setValue('open_cell_inches', openCellInches)
                    }
                  }} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Framing" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="2x4">2x4</SelectItem>
                    <SelectItem value="2x6">2x6</SelectItem>
                    <SelectItem value="2x8">2x8</SelectItem>
                    <SelectItem value="2x10">2x10</SelectItem>
                    <SelectItem value="2x12">2x12</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
                {field.value && (
                  <div className="text-xs text-blue-600 mt-1 p-2 bg-blue-50 border border-blue-200 rounded">
                    {form.watch('area_type') === 'roof' ? (
                      <>
                        {job?.construction_type === 'new' ? (
                          <>
                            📋 MA Code: R60 minimum for new construction roofs<br/>
                            {field.value === '2x10' && (
                              job?.construction_type === 'new'
                                ? '💡 7" closed + 3" open achieves R60.0 (hybrid for best value)'
                                : '💡 5" closed + 4" open achieves R49.0 (hybrid for best value)'
                            )}
                            {field.value === '2x12' && (
                              job?.construction_type === 'new'
                                ? '💡 5" closed + 6.5" open achieves R60.0 (hybrid for best value)'
                                : '💡 3" closed + 8" open achieves R49.0 (hybrid for best value)'
                            )}
                          </>
                        ) : (
                          <>
                            📋 MA Code: R49 minimum for remodel roofs<br/>
                            {field.value === '2x8' && '💡 7" closed cell achieves R49'}
                            {field.value === '2x10' && '💡 5" closed + 4" open achieves R49'}
                            {field.value === '2x12' && '💡 3" closed + 8" open achieves R49'}
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        💡 Framing depth: {
                          field.value === '2x4' ? '4"' :
                          field.value === '2x6' ? '6"' :
                          field.value === '2x8' ? '8"' :
                          field.value === '2x10' ? '10"' :
                          field.value === '2x12' ? '12"' : ''
                        } - Auto-filled insulation thickness
                      </>
                    )}
                  </div>
                )}
              </FormItem>
            )}
          />
        </div>

        {/* Insulation Type Selection */}
        <FormField
          control={form.control}
          name="insulation_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                Insulation Type
              </FormLabel>
              <Select 
                onValueChange={(value) => {
                  field.onChange(value)
                  
                  const areaType = form.getValues('area_type')
                  const framingSize = form.getValues('framing_size')
                  
                  // Special handling for roof areas to meet R49
                  if (areaType === 'roof' && framingSize) {
                    setTimeout(() => {
                      if (framingSize === '2x8') {
                        form.setValue('closed_cell_inches', 7, { shouldValidate: true })
                        form.setValue('open_cell_inches', 0, { shouldValidate: true })
                      } else if (framingSize === '2x10') {
                        if (value === 'hybrid') {
                          form.setValue('closed_cell_inches', 5, { shouldValidate: true })
                          form.setValue('open_cell_inches', 4, { shouldValidate: true })
                        } else {
                          // Force back to hybrid for 2x10 roof
                          form.setValue('insulation_type', 'hybrid', { shouldValidate: true })
                          form.setValue('closed_cell_inches', 5, { shouldValidate: true })
                          form.setValue('open_cell_inches', 4, { shouldValidate: true })
                        }
                      } else if (framingSize === '2x12') {
                        if (value === 'hybrid') {
                          form.setValue('closed_cell_inches', 3, { shouldValidate: true })
                          form.setValue('open_cell_inches', 8, { shouldValidate: true })
                        } else {
                          // Force back to hybrid for 2x12 roof
                          form.setValue('insulation_type', 'hybrid', { shouldValidate: true })
                          form.setValue('closed_cell_inches', 3, { shouldValidate: true })
                          form.setValue('open_cell_inches', 8, { shouldValidate: true })
                        }
                      }
                    }, 0)
                    return
                  }
                  
                  // Standard handling for non-roof areas
                  if (framingSize) {
                    const framingToInches: Record<string, number> = {
                      '2x4': 4,
                      '2x6': 6,
                      '2x8': 8,
                      '2x10': 10,
                      '2x12': 12
                    }
                    
                    const suggestedInches = framingToInches[framingSize] || 0
                    
                    // Set the suggested thickness based on the new insulation type
                    if (value === 'closed_cell') {
                      form.setValue('closed_cell_inches', suggestedInches, { shouldValidate: true })
                      form.setValue('open_cell_inches', 0, { shouldValidate: true })
                    } else if (value === 'open_cell') {
                      form.setValue('open_cell_inches', suggestedInches, { shouldValidate: true })
                      form.setValue('closed_cell_inches', 0, { shouldValidate: true })
                    } else if (value === 'hybrid') {
                      // For hybrid walls, suggest 2" closed cell and remainder as open cell
                      const closedCellInches = Math.min(2, suggestedInches)
                      const openCellInches = Math.max(0, suggestedInches - 2)
                      form.setValue('closed_cell_inches', closedCellInches, { shouldValidate: true })
                      form.setValue('open_cell_inches', openCellInches, { shouldValidate: true })
                    } else {
                      // Clear thickness for non-spray foam types
                      form.setValue('closed_cell_inches', 0, { shouldValidate: true })
                      form.setValue('open_cell_inches', 0, { shouldValidate: true })
                    }
                  }
                }} 
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select insulation type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="closed_cell">Closed Cell Spray Foam</SelectItem>
                  <SelectItem value="open_cell">Open Cell Spray Foam</SelectItem>
                  <SelectItem value="batt">Fiberglass Batt</SelectItem>
                  <SelectItem value="mineral_wool">Mineral Wool Batt</SelectItem>
                  <SelectItem value="blown_in">Fiberglass Blown-in</SelectItem>
                  <SelectItem value="hybrid">Hybrid (Open + Closed Cell)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Mineral Wool Thickness Selection */}
        {form.watch('insulation_type') === 'mineral_wool' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
              <h3 className="font-semibold text-blue-900">Mineral Wool Thickness</h3>
            </div>
            <FormField
              control={form.control}
              name="r_value"
              render={({ field }) => (
                <FormItem>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value)
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select thickness" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="15">3" (R-15)</SelectItem>
                      <SelectItem value="25">6" (R-25)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Insulation Thickness Inputs - Show for closed cell, open cell, and hybrid */}
        {(form.watch('insulation_type') === 'closed_cell' || 
          form.watch('insulation_type') === 'open_cell' || 
          form.watch('insulation_type') === 'hybrid') && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
              <h3 className="font-semibold text-blue-900">
                {form.watch('insulation_type') === 'hybrid' 
                  ? 'Hybrid System Configuration' 
                  : 'Insulation Thickness'}
              </h3>
              {form.watch('framing_size') && (
                <span className="text-xs text-blue-700 ml-auto">
                  Auto-suggested based on {form.watch('framing_size')} framing
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {(form.watch('insulation_type') === 'closed_cell' || form.watch('insulation_type') === 'hybrid') && (
                <FormField
                  control={form.control}
                  name="closed_cell_inches"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Closed Cell Inches</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          max="12"
                          placeholder="3.0"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) || 0 : 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {(form.watch('insulation_type') === 'open_cell' || form.watch('insulation_type') === 'hybrid') && (
                <FormField
                  control={form.control}
                  name="open_cell_inches"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Open Cell Inches</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          max="13"
                          placeholder="5.5"
                          {...field}
                          onChange={(e) => {
                            const inputValue = e.target.value ? parseFloat(e.target.value) || 0 : 0
                            // Auto-snap to closest catalog value for better pricing accuracy
                            const snappedValue = inputValue > 0 ? snapToClosestCatalogValue(inputValue) : 0
                            field.onChange(snappedValue)
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                      <div className="text-xs text-gray-500 mt-1">
                        Standard sizes: 3.5", 5.5", 7", 8", 9", 10", 12", 13"
                        {form.watch('framing_size') === '2x4' && (
                          <div className="text-blue-600 mt-1">
                            💡 For 2x4 remodel: Consider 3" closed cell for R21
                          </div>
                        )}
                      </div>
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Real-time R-value calculation */}
                              {(() => {
                    const insulationType = form.watch('insulation_type')
                    const closedInches = form.watch('closed_cell_inches') || 0
                    const openInches = form.watch('open_cell_inches') || 0
                    const areaType = form.watch('area_type')
                    const framingSize = form.watch('framing_size')
                    
                    if (insulationType === 'hybrid' && (closedInches > 0 || openInches > 0)) {
                      const calculation = calculateHybridRValue(
                        closedInches,
                        openInches,
                        framingSize,
                        areaType,
                        job?.construction_type
                      )
                      return (
                        <div className="bg-white border border-blue-300 rounded-lg p-3">
                          <h4 className="font-semibold text-blue-900 text-sm mb-2">R-Value Calculation:</h4>
                          <div className="text-sm space-y-1">
                            {calculation.closedCellInches > 0 && (
                              <div className="text-slate-700">
                                {calculation.closedCellInches}" Closed Cell = R-{calculation.closedCellRValue.toFixed(1)} ({calculation.closedCellInches} × 7.0)
                              </div>
                            )}
                            {calculation.openCellInches > 0 && (
                              <div className="text-slate-700">
                                {calculation.openCellInches}" Open Cell = R-{calculation.openCellRValue.toFixed(1)} (from pricing catalog)
                              </div>
                            )}
                            <div className="font-semibold text-blue-900 border-t border-blue-200 pt-2">
                              Total R-value = R-{calculation.totalRValue.toFixed(1)}
                            </div>
                          </div>
                        </div>
                      )
              } else if (insulationType === 'closed_cell' && closedInches > 0) {
                const rValue = closedInches * 7.0
                return (
                  <div className="bg-white border border-blue-300 rounded-lg p-3">
                    <h4 className="font-semibold text-blue-900 text-sm mb-2">R-Value Calculation:</h4>
                    <div className="text-sm">
                      <div className="text-slate-700">
                        {closedInches}" Closed Cell = R-{approximateRValue(rValue)} ({closedInches} × 7.0)
                      </div>
                    </div>
                  </div>
                )
              } else if (insulationType === 'open_cell' && openInches > 0) {
                const rValue = getRValueFromInches('open_cell', openInches)
                return (
                  <div className="bg-white border border-blue-300 rounded-lg p-3">
                    <h4 className="font-semibold text-blue-900 text-sm mb-2">R-Value Calculation:</h4>
                    <div className="text-sm">
                      <div className="text-slate-700">
                        {openInches}" Open Cell = R-{approximateRValue(rValue)} (from pricing catalog)
                      </div>
                    </div>
                  </div>
                )
              }
              return null
            })()}
          </div>
        )}

        {/* Wall Dimensions Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Wall Dimensions</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ height: 0, width: 0 })}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Wall
            </Button>
          </div>
          
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-end">
              <FormField
                control={form.control}
                name={`wall_dimensions.${index}.height`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    {index === 0 && <FormLabel className="text-xs">Height (ft)</FormLabel>}
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="8.0"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === '') {
                            field.onChange('')
                          } else {
                            const numValue = parseFloat(value)
                            field.onChange(isNaN(numValue) ? '' : numValue)
                          }
                        }}
                        onBlur={(e) => {
                          if (e.target.value === '' || e.target.value === '0') {
                            field.onChange(0)
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name={`wall_dimensions.${index}.width`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    {index === 0 && <FormLabel className="text-xs">Width (ft)</FormLabel>}
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="12.0"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === '') {
                            field.onChange('')
                          } else {
                            const numValue = parseFloat(value)
                            field.onChange(isNaN(numValue) ? '' : numValue)
                          }
                        }}
                        onBlur={(e) => {
                          if (e.target.value === '' || e.target.value === '0') {
                            field.onChange(0)
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="w-16 text-center">
                {index === 0 && <Label className="text-xs block mb-1">Sq Ft</Label>}
                <div className="h-10 flex items-center justify-center text-sm font-medium text-slate-600 bg-slate-50 rounded border">
                  {(() => {
                    const height = form.watch(`wall_dimensions.${index}.height`)
                    const width = form.watch(`wall_dimensions.${index}.width`)
                    const numHeight = typeof height === 'string' ? parseFloat(height) || 0 : height || 0
                    const numWidth = typeof width === 'string' ? parseFloat(width) || 0 : width || 0
                    return numHeight && numWidth ? (numHeight * numWidth).toFixed(1) : '0'
                  })()}
                </div>
              </div>
              
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  className="text-red-600 hover:text-red-700 p-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Real-time Totals */}
        {totalSqFt > 0 && (
          <div className="p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-700">Total Area:</span>
              <span className="text-lg font-bold text-blue-600">{totalSqFt.toFixed(1)} sq ft</span>
            </div>
            
            {realtimePricing && realtimePricing.pricePerSqft > 0 && (
              <>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Price per sq ft:</span>
                  <span className="font-medium text-green-600">{formatCurrency(realtimePricing.pricePerSqft)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700">Estimated Total:</span>
                  <span className="text-xl font-bold text-green-700">{formatCurrency(realtimePricing.totalPrice)}</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Special Requirements (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Prep work needed, fire retardant required, access notes, etc."
                  rows={2}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Manager-only price overrides */}
        {isManager && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="override_closed_cell_price_per_sqft"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Closed Cell Override ($/sq ft)
                  </FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder="e.g. 5.70" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="override_open_cell_price_per_sqft"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Open Cell Override ($/sq ft)
                  </FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder="e.g. 1.80" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <Button type="submit" className="w-full" disabled={saving || totalSqFt === 0}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Measurement {totalSqFt > 0 && `($${realtimePricing ? Math.round(realtimePricing.totalPrice) : '0'})`}
        </Button>
      </form>
    </Form>
  )

  const renderHvacForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(addMeasurement)} className="space-y-4">
        <FormField
          control={form.control}
          name="room_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Room Name
              </FormLabel>
              <FormControl>
                <Input 
                  placeholder="Living Room, Master Bedroom, etc." 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="system_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>System Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select system type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="central_air">Central Air</SelectItem>
                  <SelectItem value="heat_pump">Heat Pump</SelectItem>
                  <SelectItem value="furnace">Furnace</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="tonnage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tonnage</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    step="0.5"
                    placeholder="2.5" 
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) || 0 : 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="seer_rating"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SEER Rating (Optional)</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    placeholder="13" 
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) || 0 : 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="ductwork_linear_feet"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ductwork Linear Feet</FormLabel>
              <FormControl>
                <Input 
                  type="number"
                  placeholder="150" 
                  {...field}
                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) || 0 : 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="return_vents_count"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Return Vents Count</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    placeholder="8" 
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="supply_vents_count"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Supply Vents Count</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    placeholder="12" 
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Additional notes about the HVAC system..."
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Measurement
        </Button>
      </form>
    </Form>
  )

  const renderPlasterForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(addMeasurement)} className="space-y-4">
        <FormField
          control={form.control}
          name="room_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Room Name
              </FormLabel>
              <FormControl>
                <Input 
                  placeholder="Living Room, Master Bedroom, etc." 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="wall_condition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Wall Condition</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ceiling_condition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ceiling Condition</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="wall_square_feet"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Wall Square Feet</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    placeholder="120" 
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) || 0 : 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ceiling_square_feet"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ceiling Square Feet</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    placeholder="200" 
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) || 0 : 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="prep_work_hours"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prep Work Hours</FormLabel>
              <FormControl>
                <Input 
                  type="number"
                  step="0.5"
                  placeholder="4" 
                  {...field}
                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) || 0 : 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Additional notes about the plaster work..."
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Measurement
        </Button>
      </form>
    </Form>
  )

  const renderCurrentForm = () => {
    switch (serviceType) {
      case 'insulation':
        return renderInsulationForm()
      case 'hvac':
        return (
          <SimpleHvacJobForm 
            jobId={job.id}
            onSystemsChange={(systems, summary) => {
              // Handle systems change if needed
              console.log('HVAC systems updated:', systems, summary)
            }}
            className="mt-4"
          />
        )
      case 'plaster':
        return renderPlasterForm()
      default:
        return renderInsulationForm()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{job.job_name}</h2>
          <p className="text-slate-600">Field Measurement Interface</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showForm ? 'Hide Form' : 'Show Form'}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>


      {/* Job Photos Upload */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-blue-600" />
              <span className="text-lg font-semibold text-blue-900">
                Job Photos
              </span>
            </div>
            <div className="text-sm text-blue-700">
              Document your work
            </div>
          </div>
          
          {/* Photo Upload Area */}
          <div className="space-y-4">
            {/* Upload Dropzone */}
            <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center bg-white/30 hover:bg-white/50 transition-colors cursor-pointer">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  if (files.length > 0) {
                    // Upload each file
                    files.forEach(uploadJobPhoto)
                  }
                  // Clear the input value to allow selecting the same file again
                  if (e.target) {
                    e.target.value = ''
                  }
                }}
              />
              <div className="cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                {uploadingPhoto ? (
                  <>
                    <Loader2 className="h-8 w-8 text-blue-500 mx-auto mb-2 animate-spin" />
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      Uploading photo...
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      Click to upload photos
                    </p>
                    <p className="text-xs text-blue-600">
                      or drag and drop images here
                    </p>
                    <p className="text-xs text-blue-500 mt-2">
                      JPG, PNG, HEIC up to 10MB each
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Photo Preview Grid */}
            {jobPhotos.length > 0 && (
              <div className="bg-white/50 rounded p-3 border border-blue-200">
                <p className="text-xs font-medium text-blue-800 mb-2">Recent Photos:</p>
                <div className="grid grid-cols-4 gap-2">
                  {jobPhotos.slice(-4).map((photo, index) => (
                    <div 
                      key={index} 
                      className="aspect-square rounded overflow-hidden bg-slate-200 cursor-pointer hover:opacity-75 transition-opacity"
                      onClick={() => {
                        // Calculate correct index for the clicked photo
                        const photoIndex = Math.max(0, jobPhotos.length - 4) + index
                        setSelectedImageIndex(photoIndex)
                        setGalleryOpen(true)
                      }}
                    >
                      <img 
                        src={photo} 
                        alt={`Job photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                  {jobPhotos.length > 4 && (
                    <div 
                      className="aspect-square rounded bg-blue-100 border-2 border-dashed border-blue-300 flex items-center justify-center cursor-pointer hover:bg-blue-200 transition-colors"
                      onClick={() => setGalleryOpen(true)}
                    >
                      <span className="text-xs font-medium text-blue-600">+{jobPhotos.length - 4}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-100"
                onClick={() => {
                  fileInputRef.current?.click()
                }}
                disabled={uploadingPhoto}
              >
                <Camera className="h-4 w-4 mr-2" />
                Add Photos
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
                onClick={() => {
                  setSelectedImageIndex(0)
                  setGalleryOpen(true)
                }}
                disabled={jobPhotos.length === 0}
              >
                <Eye className="h-4 w-4 mr-2" />
                View All ({jobPhotos.length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className={`grid gap-6 ${showForm ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Measurement Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Line Item
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderCurrentForm()}
            </CardContent>
          </Card>
        )}

        {/* Estimate Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Estimate Summary
              </CardTitle>
              <div className="flex gap-2">
                {measurements.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      // Generate and save PDF estimate using new API
                      try {
                        // Get current user info for salesperson details
                        const currentUser = 'Manager' // This should come from auth context
                        
                        // Create grouped measurements for PDF calculation (same logic as elsewhere)
                        const realMeasurements = measurements.filter(m => !m.room_name.startsWith('Photo:'))
                        const pdfGroupedMeasurements = realMeasurements.reduce((groups, measurement) => {
                          const baseRoomName = measurement.room_name.replace(/ - Wall \d+$/, '')
                          const groupKey = `${baseRoomName}-${measurement.area_type}-${measurement.insulation_type}-${measurement.r_value}-${measurement.is_hybrid_system}-${measurement.closed_cell_inches}-${measurement.open_cell_inches}`
                          
                          if (!groups[groupKey]) {
                            groups[groupKey] = {
                              room_name: baseRoomName,
                              area_type: measurement.area_type || 'exterior_walls',
                              measurements: [],
                              total_square_feet: 0,
                              insulation_type: measurement.insulation_type || 'closed_cell',
                              r_value: measurement.r_value || '',
                              framing_size: measurement.framing_size || null,
                              is_hybrid_system: measurement.is_hybrid_system || false,
                              closed_cell_inches: measurement.closed_cell_inches || 0,
                              open_cell_inches: measurement.open_cell_inches || 0,
                              wall_count: 0,
                              photo_file: null
                            } as MeasurementGroup
                          }
                          
                          groups[groupKey].measurements.push(measurement)
                          groups[groupKey].total_square_feet += (measurement.square_feet || 0)
                          groups[groupKey].wall_count += 1
                          
                          return groups
                        }, {} as Record<string, {
                          room_name: string
                          area_type: string
                          measurements: Measurement[]
                          total_square_feet: number
                          insulation_type: string | null
                          r_value: string | null
                          framing_size: string | null
                          is_hybrid_system: boolean | null
                          closed_cell_inches: number | null
                          open_cell_inches: number | null
                          wall_count: number
                        }>)

                        // Calculate total using override prices (same logic as display)
                        const estimateTotal = Object.entries(pdfGroupedMeasurements).reduce((sum, [groupKey, group]) => {
                          // Check for in-memory overrides from UI
                          const uiOverride = groupOverrides[groupKey] || {}
                          // Persisted overrides from database
                          const persistedUnit = (group.measurements[0] as any)?.override_unit_price as number | undefined
                          const persistedSqft = (group.measurements[0] as any)?.override_group_sqft as number | undefined

                          const effectiveSqft = typeof uiOverride.sqft === 'number'
                            ? uiOverride.sqft
                            : (typeof persistedSqft === 'number' ? persistedSqft : group.total_square_feet)

                          let unitPrice = 0
                          if (typeof uiOverride.unitPrice === 'number') {
                            unitPrice = uiOverride.unitPrice
                          } else if (typeof persistedUnit === 'number') {
                            unitPrice = persistedUnit
                          } else {
                            // Calculate standard price
                            if (group.is_hybrid_system && group.insulation_type === 'hybrid') {
                              const hybridCalc = calculateHybridRValue(
                                group.closed_cell_inches || 0,
                                group.open_cell_inches || 0
                              )
                              const hybridPricing = calculateHybridPricing(hybridCalc)
                              unitPrice = hybridPricing.totalPricePerSqft
                            } else if ((group.insulation_type === 'closed_cell' || group.insulation_type === 'open_cell') &&
                                       (group.closed_cell_inches || group.open_cell_inches)) {
                              const inches = group.insulation_type === 'closed_cell' ? (group.closed_cell_inches || 0) : (group.open_cell_inches || 0)
                              if (inches > 0) {
                                const pricing = calculatePriceByInches(effectiveSqft, group.insulation_type, inches)
                                unitPrice = pricing.pricePerSqft
                              }
                            } else {
                              const fallback = calculateMeasurementPrice(
                                effectiveSqft,
                                group.insulation_type as InsulationType,
                                Number(group.r_value) || 0
                              )
                              unitPrice = fallback?.pricePerSqft || 0
                            }
                          }
                          
                          return sum + (effectiveSqft * unitPrice)
                        }, 0)
                        
                        // Call API to generate and save PDF
                        const response = await fetch(`/api/jobs/${job.id}/generate-pdf`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                            measurements: measurements,
                            jobName: job.job_name || 'Spray Foam Estimate',
                            customerName: job.lead?.name || 'Customer',
                            jobPhotos: jobPhotos,
                            additionalData: {
                            customerEmail: job.lead?.email,
                            customerPhone: job.lead?.phone,
                            customerAddress: job.lead?.address,
                            projectAddress: (job as any).project_address,
                            projectCity: (job as any).project_city,
                            projectState: (job as any).project_state,
                            projectZipCode: (job as any).project_zip_code,
                            buildingType: (job as any).building_type,
                            projectType: (job as any).project_type,
                            salespersonName: currentUser,
                            salespersonEmail: 'jorge@EconovaEnergySavings.com',
                            salespersonPhone: '617-596-2476',
                              companyWebsite: 'EconovaEnergySavings.com',
                              overrideTotal: estimateTotal,
                              groupOverrides: groupOverrides,
                              groupedMeasurements: pdfGroupedMeasurements
                            }
                          })
                        })

                        if (!response.ok) {
                          throw new Error(`HTTP error! status: ${response.status}`)
                        }

                        const result = await response.json()
                        
                        if (result.success) {
                          // Also download the PDF for immediate viewing
                          window.open(result.pdfUrl, '_blank')
                          
                          // Update the job in parent component if callback provided
                          if (onJobUpdate) {
                            const updatedJob = {
                              ...job,
                              latest_estimate_pdf_url: result.pdfUrl,
                              latest_estimate_pdf_name: result.fileName,
                              pdf_generated_at: new Date().toISOString()
                            }
                            onJobUpdate(updatedJob)
                          }
                        
                        toast.success(
                          <div className="space-y-2">
                              <p className="font-semibold">PDF Generated & Saved!</p>
                              <p>PDF saved to database and opened in new tab</p>
                              <p className="text-lg font-bold">Total: {formatCurrency(estimateTotal)}</p>
                          </div>
                        )
                        } else {
                          throw new Error(result.error || 'Failed to generate PDF')
                        }
                      } catch (error) {
                        console.error('Error generating PDF:', error)
                        toast.error('Failed to generate and save PDF. Please try again.')
                      }
                    }}
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    Quick PDF
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                </div>
              ) : measurements.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <FileText className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                  <p>No line items yet</p>
                  <p className="text-sm">Add your first line item to build the estimate</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* LINE ITEMS Header */}
                  <div className="border-b pb-2">
                    <h3 className="font-semibold text-slate-900 uppercase tracking-wide text-sm">Line Items</h3>
                  </div>

                  {/* Grouped Line Items */}
                  {(() => {
                    // Group measurements by base room_name + area_type + insulation specs
                    // Filter out photo measurements (those with room_name starting with "Photo:")
                    const realMeasurements = measurements.filter(m => !m.room_name.startsWith('Photo:'))
                    const groupedMeasurements = realMeasurements.reduce((groups, measurement) => {
                      // Extract base room name by removing "- Wall X" suffix
                      const baseRoomName = measurement.room_name.replace(/ - Wall \d+$/, '')
                      
                      // Create unique key that includes insulation specifications
                      let insulationKey = measurement.insulation_type || 'unknown'
                      if (measurement.is_hybrid_system) {
                        insulationKey = `hybrid-${measurement.closed_cell_inches || 0}cc-${measurement.open_cell_inches || 0}oc`
                      } else if ((measurement.closed_cell_inches || 0) > 0) {
                        insulationKey = `${measurement.insulation_type}-${measurement.closed_cell_inches}in`
                      } else if ((measurement.open_cell_inches || 0) > 0) {
                        insulationKey = `${measurement.insulation_type}-${measurement.open_cell_inches}in`
                      } else if (measurement.r_value) {
                        insulationKey = `${measurement.insulation_type}-R${measurement.r_value}`
                      }
                      
                      const key = `${baseRoomName}-${measurement.area_type}-${insulationKey}`
                      if (!groups[key]) {
                        groups[key] = {
                          room_name: baseRoomName,
                          area_type: measurement.area_type || 'exterior_walls',
                          measurements: [],
                          total_square_feet: 0,
                          insulation_type: measurement.insulation_type as InsulationType,
                          r_value: measurement.r_value,
                          framing_size: measurement.framing_size,
                          is_hybrid_system: measurement.is_hybrid_system,
                          closed_cell_inches: measurement.closed_cell_inches,
                          open_cell_inches: measurement.open_cell_inches,
                          wall_count: 0
                        } as MeasurementGroup
                      }
                      groups[key].measurements.push(measurement)
                      groups[key].total_square_feet += (measurement.square_feet || 0)
                      return groups
                    }, {} as Record<string, {
                      room_name: string
                      area_type: string
                      measurements: Measurement[]
                      total_square_feet: number
                      insulation_type: string | null
                      r_value: string | null
                      // framing_size: string | null // Property doesn't exist in DB
                      is_hybrid_system: boolean | null
                      closed_cell_inches: number | null
                      open_cell_inches: number | null
                    }>)

                    return Object.entries(groupedMeasurements).map(([groupKey, group], index) => {
                      // Calculate pricing for hybrid and regular systems
                      let priceBreakdown
                      let totalPrice = 0
                      const wallCount = group.measurements.length
                      const overrideState = groupOverrides[groupKey] || {}
                      const persistedUnit = (group.measurements[0] as any)?.override_unit_price as number | undefined
                      const persistedSqft = (group.measurements[0] as any)?.override_group_sqft as number | undefined
                      const override = {
                        sqft: overrideState.sqft ?? persistedSqft,
                        unitPrice: overrideState.unitPrice ?? persistedUnit,
                      }
                      let currentUnitPrice = 0
                      
                      if (group.is_hybrid_system && group.insulation_type === 'hybrid') {
                        // Calculate hybrid pricing
                        const hybridCalc = calculateHybridRValue(
                          group.closed_cell_inches || 0, 
                          group.open_cell_inches || 0
                        )
                        const hybridPricing = calculateHybridPricing(hybridCalc)
                        const effectiveSqft = typeof override.sqft === 'number' ? override.sqft : group.total_square_feet
                        const effectiveUnit = typeof override.unitPrice === 'number' ? override.unitPrice : hybridPricing.totalPricePerSqft
                        currentUnitPrice = effectiveUnit
                        totalPrice = effectiveSqft * effectiveUnit
                        
                        priceBreakdown = (
                          <div className="text-sm font-medium text-slate-700 bg-blue-50 rounded p-2">
                            <div className="font-semibold text-blue-900 mb-1">Hybrid System - R-{approximateRValue(hybridCalc.totalRValue)}</div>
                            {hybridCalc.closedCellInches > 0 && (
                              <div>• {hybridCalc.closedCellInches}" Closed Cell (R-{approximateRValue(hybridCalc.closedCellRValue)})</div>
                            )}
                            {hybridCalc.openCellInches > 0 && (
                              <div>• {hybridCalc.openCellInches}" Open Cell (R-{approximateRValue(hybridCalc.openCellRValue)})</div>
                            )}
                            <div className="text-xs text-slate-600 mt-2">
                              {wallCount} wall{wallCount !== 1 ? 's' : ''}
                            </div>
                          </div>
                        )
                      } else {
                        // Regular system pricing - use inches if available
                        let pricePerSqft = 0
                        console.log('🔍 Calculating price for group:', {
                          insulation_type: group.insulation_type,
                          closed_cell_inches: group.closed_cell_inches,
                          open_cell_inches: group.open_cell_inches,
                          r_value: group.r_value,
                          total_square_feet: group.total_square_feet
                        })
                        
                        if ((group.insulation_type === 'closed_cell' || group.insulation_type === 'open_cell') && 
                            (group.closed_cell_inches || group.open_cell_inches)) {
                          const inches = group.insulation_type === 'closed_cell' ? (group.closed_cell_inches || 0) : (group.open_cell_inches || 0)
                          console.log('💡 Using inches-based pricing:', inches, 'inches')
                          if (inches > 0) {
                            const effectiveSqft = typeof override.sqft === 'number' ? override.sqft : group.total_square_feet
                            const pricing = calculatePriceByInches(effectiveSqft, group.insulation_type, inches)
                            pricePerSqft = typeof override.unitPrice === 'number' ? override.unitPrice : pricing.pricePerSqft
                            totalPrice = effectiveSqft * pricePerSqft
                            console.log('💰 Inches-based pricing result:', { pricePerSqft, totalPrice })
                          }
                        } else {
                          // Fallback to R-value pricing
                          console.log('💡 Using R-value based pricing')
                          const effectiveSqft = typeof override.sqft === 'number' ? override.sqft : group.total_square_feet
                          const measurementPrice = calculateMeasurementPrice(
                            effectiveSqft, 
                            group.insulation_type as InsulationType, 
                            Number(group.r_value) || 0,
                            group.area_type
                          )
                          pricePerSqft = typeof override.unitPrice === 'number' ? override.unitPrice : (measurementPrice?.pricePerSqft || 0)
                          console.log('💰 R-value pricing result:', { measurementPrice, pricePerSqft })
                          totalPrice = effectiveSqft * pricePerSqft
                          currentUnitPrice = pricePerSqft
                        }
                        
                        console.log('📊 Final group calculation:', {
                          room: group.room_name,
                          area_type: group.area_type,
                          insulation_type: group.insulation_type,
                          total_square_feet: group.total_square_feet,
                          pricePerSqft,
                          totalPrice
                        })
                        
                        // Check if we have inches data for this group
                        const hasInches = (group.insulation_type === 'closed_cell' && group.closed_cell_inches) || 
                                         (group.insulation_type === 'open_cell' && group.open_cell_inches)
                        const inches = group.insulation_type === 'closed_cell' ? 
                                      (group.closed_cell_inches || 0) : (group.open_cell_inches || 0)
                        
                        // For batt insulation, get inches from framing size
                        const framingToInches: Record<string, number> = {
                          '2x4': 4, '2x6': 6, '2x8': 8, '2x10': 10, '2x12': 12
                        }
                        const battInches = group.insulation_type === 'batt' ? 4 : 0 // Default to 2x4 framing since framing_size doesn't exist in DB
                        
                        priceBreakdown = (
                          <div className="text-sm font-medium text-slate-700 bg-blue-50 rounded p-2">
                            <div className="font-semibold text-blue-900 mb-1">
                              {group.insulation_type === 'closed_cell' ? 'Closed Cell' : 
                               group.insulation_type === 'open_cell' ? 'Open Cell' : 
                               group.insulation_type === 'batt' ? 'Fiberglass Batt' :
                              group.insulation_type === 'mineral_wool' ? 'Mineral Wool Batt' :
                               group.insulation_type === 'blown_in' ? 'Fiberglass Blown-in' :
                               group.insulation_type}{
                               (hasInches && inches > 0) ? 
                                ` - ${inches}" (R-${group.insulation_type === 'closed_cell' ? approximateRValue(getRValueFromInches('closed_cell', inches)) : approximateRValue(getRValueFromInches('open_cell', inches))})` : 
                               (group.insulation_type === 'batt' && battInches > 0) ?
                                ` - ${battInches}" (R-${approximateRValue(Number(group.r_value))})` :
                               (group.insulation_type === 'mineral_wool') ?
                                ` - ${Number(group.r_value) === 15 ? '3"' : '6"'} (R-${group.r_value})` :
                                ` - R-${group.r_value}`}
                            </div>
                            <div className="text-xs text-slate-600">
                              {wallCount} wall{wallCount !== 1 ? 's' : ''}
                            </div>
                          </div>
                        )
                      }
                      
                      return (
                        <div key={index} className="border rounded-lg p-4 bg-white">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="font-semibold text-slate-900 mb-2">
{group.room_name} - {getAreaDisplayName(group.area_type as any)}
                              </div>
                              {priceBreakdown}
                              
                              {/* Pricing and Square Footage Summary */}
                              <div className="mt-3 p-3 bg-slate-50 rounded border-l-4 border-blue-400">
                                <div className="flex flex-col gap-2 text-sm">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="font-medium text-slate-700 flex items-center gap-2">
                                      {isManager ? (
                                        <>
                                          <Input
                                            className="w-28 h-8"
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            value={groupOverrides[groupKey]?.sqft ?? group.total_square_feet.toFixed(1)}
                                            onChange={(e) => {
                                              const v = parseFloat(e.target.value)
                                              setGroupOverrides((prev) => ({
                                                ...prev,
                                                [groupKey]: { ...prev[groupKey], sqft: isNaN(v) ? undefined : v }
                                              }))
                                            }}
                                          />
                                          <span>sq ft</span>
                                        </>
                                      ) : (
                                        <span>{group.total_square_feet.toFixed(1)} sq ft</span>
                                      )}
                                  </div>
                                  <div className="font-bold text-green-600">
                                    {formatCurrency(totalPrice)}
                                  </div>
                                </div>
                                  {isManager && (
                                    <div className="flex items-center gap-2 text-slate-700">
                                      <span className="text-xs">Unit Price ($/sq ft):</span>
                                      <Input
                                        className="w-28 h-8"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={groupOverrides[groupKey]?.unitPrice ?? ""}
                                        placeholder={currentUnitPrice.toFixed(2)}
                                        onChange={(e) => {
                                          const v = parseFloat(e.target.value)
                                          setGroupOverrides((prev) => ({
                                            ...prev,
                                            [groupKey]: { ...prev[groupKey], unitPrice: isNaN(v) ? undefined : v }
                                          }))
                                        }}
                                      />
                                      <span className="text-xs text-slate-500">({currentUnitPrice.toFixed(2)} default)</span>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={async () => {
                                          try {
                                            // Persist overrides on each measurement in the group
                                            const updates = group.measurements.map(async (m) => {
                                              const response = await fetch(`/api/measurements/${m.id}`, {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json' },
                                                credentials: 'include',
                                                body: JSON.stringify({
                                                  override_unit_price: groupOverrides[groupKey]?.unitPrice,
                                                  override_group_sqft: groupOverrides[groupKey]?.sqft
                                                })
                                              })
                                              if (!response.ok) {
                                                throw new Error(`HTTP error! status: ${response.status}`)
                                              }
                                              return await response.json()
                                            })
                                            await Promise.all(updates)
                                            // Reload measurements to reflect the saved overrides
                                            await loadMeasurements()
                                            toast.success('Overrides saved')
                                          } catch (err) {
                                            console.error('Save error:', err)
                                            toast.error('Failed to save overrides')
                                          }
                                        }}
                                      >
                                        Save
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4 flex-shrink-0">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  toast.info('Edit functionality coming soon')
                                }}
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  // Delete all measurements in this group
                                  if (confirm(`Are you sure you want to delete all ${wallCount} wall${wallCount !== 1 ? 's' : ''} in ${group.room_name} - ${getAreaDisplayName(group.area_type as any)}?`)) {
                                    group.measurements.forEach(m => deleteMeasurement(m.id))
                                  }
                                }}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete ({wallCount})
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  })()}
                  
                  {/* ESTIMATE TOTALS */}
                  {measurements.filter(m => !m.room_name.startsWith('Photo:')).length > 0 && (() => {
                    // Use the same grouped calculation as line items
                    // Filter out photo measurements (those with room_name starting with "Photo:")
                    const realMeasurements = measurements.filter(m => !m.room_name.startsWith('Photo:'))
                    const groupedMeasurements = realMeasurements.reduce((groups, measurement) => {
                      // Extract base room name by removing "- Wall X" suffix
                      const baseRoomName = measurement.room_name.replace(/ - Wall \d+$/, '')
                      
                      // Create unique key that includes insulation specifications (same as line items)
                      let insulationKey = measurement.insulation_type || 'unknown'
                      if (measurement.is_hybrid_system) {
                        insulationKey = `hybrid-${measurement.closed_cell_inches || 0}cc-${measurement.open_cell_inches || 0}oc`
                      } else if ((measurement.closed_cell_inches || 0) > 0) {
                        insulationKey = `${measurement.insulation_type}-${measurement.closed_cell_inches}in`
                      } else if ((measurement.open_cell_inches || 0) > 0) {
                        insulationKey = `${measurement.insulation_type}-${measurement.open_cell_inches}in`
                      } else if (measurement.r_value) {
                        insulationKey = `${measurement.insulation_type}-R${measurement.r_value}`
                      }
                      
                      const key = `${baseRoomName}-${measurement.area_type}-${insulationKey}`
                      if (!groups[key]) {
                        groups[key] = {
                          room_name: baseRoomName,
                          area_type: measurement.area_type || 'exterior_walls',
                          measurements: [],
                          total_square_feet: 0,
                          insulation_type: measurement.insulation_type as InsulationType,
                          r_value: measurement.r_value,
                          framing_size: measurement.framing_size,
                          is_hybrid_system: measurement.is_hybrid_system,
                          closed_cell_inches: measurement.closed_cell_inches,
                          open_cell_inches: measurement.open_cell_inches,
                          wall_count: 0
                        } as MeasurementGroup
                      }
                      groups[key].measurements.push(measurement)
                      groups[key].total_square_feet += (measurement.square_feet || 0)
                      return groups
                    }, {} as Record<string, {
                      room_name: string
                      area_type: string
                      measurements: Measurement[]
                      total_square_feet: number
                      insulation_type: string | null
                      r_value: string | null
                      // framing_size: string | null // Property doesn't exist in DB
                      is_hybrid_system: boolean | null
                      closed_cell_inches: number | null
                      open_cell_inches: number | null
                    }>)

                    // Calculate total using grouped measurements (respect overrides if typed OR saved)
                    const subtotal = Object.entries(groupedMeasurements).reduce((sum, [groupKey, group]) => {
                      // In-memory overrides from the UI
                      const uiOverride = groupOverrides[groupKey] || {}
                      // Persisted overrides saved on measurements (use first item in group)
                      const persistedUnit = (group.measurements[0] as any)?.override_unit_price as number | undefined
                      const persistedSqft = (group.measurements[0] as any)?.override_group_sqft as number | undefined
                      const effectiveSqft = typeof uiOverride.sqft === 'number'
                        ? uiOverride.sqft
                        : (typeof persistedSqft === 'number' ? persistedSqft : group.total_square_feet)

                      if (group.is_hybrid_system && group.insulation_type === 'hybrid') {
                        const hybridCalc = calculateHybridRValue(
                          group.closed_cell_inches || 0, 
                          group.open_cell_inches || 0
                        )
                        const hybridPricing = calculateHybridPricing(hybridCalc)
                        const unit = typeof uiOverride.unitPrice === 'number'
                          ? uiOverride.unitPrice
                          : (typeof persistedUnit === 'number' ? persistedUnit : hybridPricing.totalPricePerSqft)
                        return sum + (effectiveSqft * unit)
                      } else {
                        if ((group.insulation_type === 'closed_cell' || group.insulation_type === 'open_cell') && 
                            (group.closed_cell_inches || group.open_cell_inches)) {
                          const inches = group.insulation_type === 'closed_cell' ? (group.closed_cell_inches || 0) : (group.open_cell_inches || 0)
                          if (inches > 0) {
                            const pricing = calculatePriceByInches(effectiveSqft, group.insulation_type, inches)
                            const unit = typeof uiOverride.unitPrice === 'number'
                              ? uiOverride.unitPrice
                              : (typeof persistedUnit === 'number' ? persistedUnit : pricing.pricePerSqft)
                            return sum + (effectiveSqft * unit)
                          }
                        }

                        const fallback = calculateMeasurementPrice(
                          effectiveSqft,
                          group.insulation_type as InsulationType, 
                          Number(group.r_value) || 0
                        )
                        const unit = typeof uiOverride.unitPrice === 'number'
                          ? uiOverride.unitPrice
                          : (typeof persistedUnit === 'number' ? persistedUnit : (fallback?.pricePerSqft || 0))
                        return sum + (effectiveSqft * unit)
                      }
                    }, 0)
                    
                    const total = subtotal
                    const requiresApproval = true  // All estimates require approval
                    
                    return (
                      <div className="mt-6 space-y-4">
                        {/* Divider */}
                        <div className="border-t-2 border-dashed border-slate-300 pt-4">
                          <h3 className="font-semibold text-slate-900 uppercase tracking-wide text-sm">Estimate Totals</h3>
                        </div>
                        
                        {/* Totals Breakdown */}
                        <div className="space-y-2 text-lg">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span className="font-semibold">{formatCurrency(subtotal)}</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between text-xl font-bold text-slate-900">
                            <span>TOTAL:</span>
                            <span className="text-green-600">{formatCurrency(total)}</span>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-4">
                          <Button
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={saveEstimateForApproval}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Save & Send for Approval
                          </Button>
                          
                        </div>
                        
                        {requiresApproval && (
                          <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                            ⚠️ Estimates over $10,000 require manager approval before sending to customer.
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )}
          </CardContent>
        </Card>
      </div>

      {/* Estimate Builder Modal */}
      {showEstimateBuilder && (
        <EstimateBuilder
          job={job}
          measurements={measurements}
          onClose={() => setShowEstimateBuilder(false)}
          onEstimateCreated={(estimate) => {
            toast.success(`Estimate created: ${formatCurrency(estimate.total_amount)}`)
            setShowEstimateBuilder(false)
          }}
        />
      )}
      


      {/* Image Gallery Modal */}
      <ImageGallery
        images={jobPhotos.map((photo, index) => ({
          id: `photo-${index}`,
          url: photo,
          alt: `Job photo ${index + 1}`,
          caption: `${job.job_name} - Photo ${index + 1}`
        }))}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        initialIndex={selectedImageIndex}
      />
    </div>
  )
}

// Individual Measurement Card Component
interface MeasurementCardProps {
  measurement: Measurement
  onDelete: (id: string) => void
  onPhotoUpload: (id: string, file: File) => void
}

function MeasurementCard({ measurement, onDelete, onPhotoUpload }: MeasurementCardProps) {
  const [uploading, setUploading] = useState(false)
  
  // Calculate pricing for this measurement
  const pricing = calculateMeasurementPrice(
    measurement.square_feet || 0,
    measurement.insulation_type as InsulationType,
    measurement.r_value ? Number(measurement.r_value) : 0
  )
  
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Photo change event triggered', e.target.files)
    const file = e.target.files?.[0]
    if (file) {
      console.log('File selected:', file.name, file.size, file.type)
      setUploading(true)
      try {
        await onPhotoUpload(measurement.id, file)
      } finally {
        setUploading(false)
        // Clear the input so the same file can be selected again
        e.target.value = ''
      }
    }
  }

  return (
    <div className="border border-slate-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-medium text-slate-900">{measurement.room_name}</h4>
          {measurement.floor_level && (
            <Badge 
              variant="outline" 
              className="border-blue-300 text-blue-700"
            >
              {measurement.floor_level}
            </Badge>
          )}
          {measurement.area_type && (
            <Badge 
              variant="outline" 
              className="border-green-300 text-green-700"
            >
              {getAreaDisplayName(measurement.area_type as any)}
            </Badge>
          )}
          <Badge 
            variant="outline" 
            className="border-purple-300 text-purple-700"
          >
            {measurement.surface_type === 'wall' ? 'Wall' : 'Ceiling'}
          </Badge>
          {/* framing_size property doesn't exist in DB */}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(measurement.id)}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <Label className="text-xs text-slate-500">Height</Label>
          <div className="font-medium">{measurement.height}′</div>
        </div>
        <div>
          <Label className="text-xs text-slate-500">Width</Label>
          <div className="font-medium">{measurement.width}′</div>
        </div>
        <div>
          <Label className="text-xs text-slate-500">Square Feet</Label>
          <div className="font-bold text-orange-600">{(measurement.square_feet || 0).toFixed(1)} sq ft</div>
        </div>
        <div>
          <Label className="text-xs text-slate-500">Type</Label>
          <div className="font-medium text-purple-600">{measurement.surface_type}</div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        {/* framing_size property doesn't exist in DB */}
        {measurement.r_value && (
          <div>
            <Label className="text-xs text-slate-500">R-Value</Label>
            <div className="font-medium text-green-600">R-{approximateRValue(Number(measurement.r_value))}</div>
          </div>
        )}
      </div>
      
      {measurement.insulation_type && (
        <div className="text-sm">
          <Label className="text-xs text-slate-500">Insulation Type</Label>
          <div className="font-medium capitalize">{measurement.insulation_type.replace('_', ' ')}</div>
        </div>
      )}

      {/* Pricing Information */}
      {measurement.insulation_type && measurement.r_value && pricing.pricePerSqft > 0 && (
        <div className="grid grid-cols-2 gap-4 text-sm bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-3">
          <div>
            <Label className="text-xs text-slate-600 font-semibold">Price per Sq Ft</Label>
            <div className="font-medium text-blue-700 text-base">{formatCurrency(pricing.pricePerSqft)}</div>
          </div>
          <div>
            <Label className="text-xs text-slate-600 font-semibold">Total Price</Label>
            <div className="font-bold text-green-700 text-lg">{formatCurrency(pricing.totalPrice)}</div>
          </div>
        </div>
      )}

      {measurement.notes && (
        <div>
          <Label className="text-xs text-slate-500">Notes</Label>
          <p className="text-sm text-slate-700 bg-slate-50 rounded p-2 mt-1">
            {measurement.notes}
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
        <div>
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
            id={`photo-${measurement.id}`}
            disabled={uploading}
          />
          <Button 
            variant="outline" 
            size="sm" 
            disabled={uploading}
            onClick={() => {
              console.log('Button clicked, triggering file input')
              document.getElementById(`photo-${measurement.id}`)?.click()
            }}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Camera className="h-4 w-4 mr-2" />
            )}
            {uploading ? 'Uploading...' : (measurement.photo_url ? 'Change Photo' : 'Add Photo')}
          </Button>
        </div>
        
        {measurement.photo_url && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-green-700">
              Photo uploaded
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(measurement.photo_url!, '_blank')}
              className="text-xs"
            >
              View
            </Button>
          </div>
        )}
      </div>
      
      {/* Photo Preview */}
      {measurement.photo_url && (
        <div className="mt-2">
          <img 
            src={measurement.photo_url} 
            alt={`Photo of ${measurement.room_name}`}
            className="w-full max-w-xs h-32 object-cover rounded border cursor-pointer"
            onClick={() => window.open(measurement.photo_url!, '_blank')}
            onError={(e) => {
              // Hide image if it fails to load
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
      )}
    </div>
  )
}