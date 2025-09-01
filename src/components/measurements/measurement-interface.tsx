"use client"

import { useState, useEffect, useCallback } from "react"
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
import { ScrollArea } from "@/components/ui/scroll-area"
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

// Helper function to get Massachusetts R-value requirements
function getMassachusettsRValueRequirement(projectType: string | null, areaType: string): number | null {
  if (!projectType || !areaType) return null
  
  if (projectType === 'new_construction') {
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
    address?: string
  }
  measurements?: Measurement[]
}

// Using InsulationMeasurement type from database
interface Measurement extends Omit<InsulationMeasurement, 'id' | 'job_id' | 'created_at' | 'updated_at'> {
  id: string
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
  insulation_type: z.enum(["closed_cell", "open_cell", "batt", "blown_in", "hybrid"]).optional(),
  closed_cell_inches: z.number().min(0).optional(),
  open_cell_inches: z.number().min(0).optional(),
  target_r_value: z.number().min(0).optional(),
  notes: z.string().optional(),
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
            notes: ""
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
            notes: ""
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
    if (measurements.length === 0) {
      toast.error('No measurements to save')
      return
    }

    try {
      let total = 0
      let lineItems: any[] = []

      // For now, only handle insulation measurements
      if (job.service_type !== 'insulation') {
        toast.error('Estimate creation is currently only supported for insulation jobs')
        return
      }

      // Create grouped line items for insulation (same logic as display)
      const groupedMeasurements = measurements.reduce((groups, measurement) => {
        // Extract base room name by removing "- Wall X" suffix
        const baseRoomName = measurement.room_name.replace(/ - Wall \d+$/, '')
        const key = `${baseRoomName}-${measurement.area_type}`
        if (!groups[key]) {
          groups[key] = {
            room_name: baseRoomName,
            area_type: measurement.area_type,
            measurements: [],
            total_square_feet: 0,
            insulation_type: measurement.insulation_type,
            r_value: measurement.r_value,
            framing_size: measurement.framing_size,
            is_hybrid_system: measurement.is_hybrid_system,
            closed_cell_inches: measurement.closed_cell_inches,
            open_cell_inches: measurement.open_cell_inches,
            wall_count: 0
          }
        }
        groups[key].measurements.push(measurement)
        groups[key].total_square_feet += measurement.square_feet
        groups[key].wall_count += 1
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

      // Calculate total using the SAME logic as the display
      total = Object.values(groupedMeasurements).reduce((sum, group) => {
        if (group.is_hybrid_system && group.insulation_type === 'hybrid') {
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
        const areaDisplayName = group.area_type ? getAreaDisplayName(group.area_type) : 'Unknown Area'
        let unitPrice = 0
        
        if (group.is_hybrid_system && group.insulation_type === 'hybrid') {
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
              Number(group.r_value) || 0
            )
            unitPrice = price.pricePerSqft
          }
        }
        
        return {
          description: `${group.room_name} - ${areaDisplayName} (${group.total_square_feet} sq ft, ${group.wall_count} wall${group.wall_count !== 1 ? 's' : ''})`,
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

      // Create estimate record
      const response = await fetch('/api/estimates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_id: job.id,
          total_amount: total,
          subtotal: total,
          status: 'pending_approval',
          service_type: job.service_type,
          line_items: lineItems
        })
      })

      const result = await response.json()
      console.log('💾 Estimate save result:', result)
      
      if (result.success) {
        toast.success(`Estimate saved! Total: ${formatCurrency(total)}`)
        console.log('✅ Estimate saved with ID:', result.data?.id)
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

  useEffect(() => {
    loadMeasurements()
    loadPricing(serviceType)
  }, [loadMeasurements, loadPricing, serviceType])

  // Handle service type change
  const handleServiceTypeChange = (newServiceType: 'insulation' | 'hvac' | 'plaster') => {
    setServiceType(newServiceType)
    loadPricing(newServiceType)
  }

  // Calculate total square feet
  const totalSquareFeet = measurements.reduce((total, measurement) => {
    return total + measurement.square_feet
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
    acc[key].total_square_feet += measurement.square_feet
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
        const projectType = (job.project_type as ProjectType) || 'new_construction'
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
            const hybridCalc = calculateHybridRValue(closedCellInches, openCellInches)
            finalRValue = hybridCalc.totalRValue.toString()
          }
        } else if (insulationData.insulation_type === 'closed_cell') {
          closedCellInches = insulationData.closed_cell_inches || 0
          if (closedCellInches > 0) {
            finalRValue = (closedCellInches * 7.0).toString()
          }
        } else if (insulationData.insulation_type === 'open_cell') {
          openCellInches = insulationData.open_cell_inches || 0
          if (openCellInches > 0) {
            finalRValue = (openCellInches * 3.8).toString()
          }
        }

        const newMeasurement: Measurement = {
          id: `temp-${Date.now()}-${i}`,
          room_name: validWalls.length > 1 ? `${insulationData.room_name} - Wall ${i + 1}` : insulationData.room_name,
          floor_level: insulationData.floor_level || null,
          area_type: insulationData.area_type,
          surface_type: insulationData.surface_type,
          framing_size: insulationData.framing_size,
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
          photo_file: null
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
              notes: measurement.notes
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
        return total + (wall.height * wall.width)
      }
      return total
    }, 0)
  }

  // Calculate real-time pricing
  const calculateRealtimePrice = () => {
    const insulationType = form.watch('insulation_type')
    const totalSqFt = calculateTotalSquareFeet()
    
    if (!insulationType || totalSqFt === 0) return null
    
    // Handle hybrid systems
    if (insulationType === 'hybrid') {
      const closedCellInches = form.watch('closed_cell_inches') || 0
      const openCellInches = form.watch('open_cell_inches') || 0
      
      if (closedCellInches === 0 && openCellInches === 0) {
        return { pricePerSqft: 0, totalPrice: 0 }
      }
      
      const hybridCalc = calculateHybridRValue(closedCellInches, openCellInches)
      const hybridPricing = calculateHybridPricing(hybridCalc)
      
      return {
        pricePerSqft: hybridPricing.totalPricePerSqft,
        totalPrice: totalSqFt * hybridPricing.totalPricePerSqft
      }
    }
    
    // Regular system pricing
    const projectType = (job.project_type as ProjectType) || 'new_construction'
    const areaType = form.watch('area_type')
    const rValueResult = areaType ? calculateRValue(projectType, areaType) : { rValue: 0 }
    const rValue = rValueResult?.rValue || 0
    
    return calculateMeasurementPrice(totalSqFt, insulationType as InsulationType, rValue)
  }

  // Watch form changes to update real-time calculations
  const realtimePrice = calculateRealtimePrice()
  const totalSqFt = calculateTotalSquareFeet()

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
                  
                  // Auto-suggest thickness if framing size is already selected
                  const framingSize = form.getValues('framing_size')
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
                      form.setValue('closed_cell_inches', suggestedInches)
                      form.setValue('open_cell_inches', 0)
                    } else if (value === 'open_cell') {
                      form.setValue('open_cell_inches', suggestedInches)
                      form.setValue('closed_cell_inches', 0)
                    } else if (value === 'hybrid') {
                      // For hybrid, suggest 2" closed cell and remainder as open cell
                      const closedCellInches = Math.min(2, suggestedInches)
                      const openCellInches = Math.max(0, suggestedInches - 2)
                      form.setValue('closed_cell_inches', closedCellInches)
                      form.setValue('open_cell_inches', openCellInches)
                    } else {
                      // Clear thickness for non-spray foam types (batt and blown_in don't need thickness)
                      form.setValue('closed_cell_inches', 0)
                      form.setValue('open_cell_inches', 0)
                    }
                  }
                }} 
                defaultValue={field.value}
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
                  <SelectItem value="blown_in">Fiberglass Blown-in</SelectItem>
                  <SelectItem value="hybrid">Hybrid (Open + Closed Cell)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

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
                          max="12"
                          placeholder="6.0"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) || 0 : 0)}
                        />
                      </FormControl>
                      <FormMessage />
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
              
              if (insulationType === 'hybrid' && (closedInches > 0 || openInches > 0)) {
                const calculation = calculateHybridRValue(closedInches, openInches)
                return (
                  <div className="bg-white border border-blue-300 rounded-lg p-3">
                    <h4 className="font-semibold text-blue-900 text-sm mb-2">R-Value Calculation:</h4>
                    <div className="text-sm space-y-1">
                      {calculation.closedCellInches > 0 && (
                        <div className="text-slate-700">
                          {calculation.closedCellInches}" Closed Cell = R-{calculation.closedCellRValue.toFixed(0)} ({calculation.closedCellInches} × 7.0)
                        </div>
                      )}
                      {calculation.openCellInches > 0 && (
                        <div className="text-slate-700">
                          {calculation.openCellInches}" Open Cell = R-{calculation.openCellRValue.toFixed(0)} ({calculation.openCellInches} × 3.8)
                        </div>
                      )}
                      <div className="font-semibold text-blue-900 border-t border-blue-200 pt-2">
                        Total R-value = R-{approximateRValue(calculation.totalRValue)}
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
                const rValue = openInches * 3.8
                return (
                  <div className="bg-white border border-blue-300 rounded-lg p-3">
                    <h4 className="font-semibold text-blue-900 text-sm mb-2">R-Value Calculation:</h4>
                    <div className="text-sm">
                      <div className="text-slate-700">
                        {openInches}" Open Cell = R-{approximateRValue(rValue)} ({openInches} × 3.8)
                      </div>
                    </div>
                  </div>
                )
              }
              return null
            })()}
          </div>
        )}

        {/* Area Type and Framing */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="area_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Area Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  const requiredRValue = getMassachusettsRValueRequirement(job.project_type, selectedAreaType)
                  
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
                    
                    // Auto-suggest insulation thickness based on framing size
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
                    } else if (insulationType === 'open_cell') {
                      form.setValue('open_cell_inches', suggestedInches)
                    } else if (insulationType === 'hybrid') {
                      // For hybrid, suggest 2" closed cell and remainder as open cell
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
                    <SelectItem value="2x4">2x4 (4" depth)</SelectItem>
                    <SelectItem value="2x6">2x6 (6" depth)</SelectItem>
                    <SelectItem value="2x8">2x8 (8" depth)</SelectItem>
                    <SelectItem value="2x10">2x10 (10" depth)</SelectItem>
                    <SelectItem value="2x12">2x12 (12" depth)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
                {field.value && (
                  <div className="text-xs text-blue-600 mt-1 p-2 bg-blue-50 border border-blue-200 rounded">
                    💡 Framing depth: {
                      field.value === '2x4' ? '4"' :
                      field.value === '2x6' ? '6"' :
                      field.value === '2x8' ? '8"' :
                      field.value === '2x10' ? '10"' :
                      field.value === '2x12' ? '12"' : ''
                    } - Auto-filled insulation thickness
                  </div>
                )}
              </FormItem>
            )}
          />
        </div>

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
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) || 0 : 0)}
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
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) || 0 : 0)}
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
                    return height && width ? (height * width).toFixed(1) : '0'
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
            
            {realtimePrice && realtimePrice.pricePerSqft > 0 && (
              <>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Price per sq ft:</span>
                  <span className="font-medium text-green-600">{formatCurrency(realtimePrice.pricePerSqft)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700">Estimated Total:</span>
                  <span className="text-xl font-bold text-green-700">{formatCurrency(realtimePrice.totalPrice)}</span>
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

        <Button type="submit" className="w-full" disabled={saving || totalSqFt === 0}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Measurement {totalSqFt > 0 && `($${realtimePrice ? Math.round(realtimePrice.totalPrice) : '0'})`}
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
        return renderHvacForm()
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


      {/* Project Summary */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-orange-600" />
              <span className="text-lg font-semibold text-orange-900">
                Total Square Feet: {totalSquareFeet.toFixed(1)} sq ft
              </span>
            </div>
            <div className="text-sm text-orange-700">
              {measurements.length} measurement{measurements.length !== 1 ? 's' : ''}
            </div>
          </div>
          
          {/* Project Type Display */}
          {job.project_type && (
            <div className="flex items-center gap-2 mb-4">
              <Building className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-900">
                Project Type: {job.project_type === 'new_construction' ? 'New Construction' : 'Remodel'}
              </span>
            </div>
          )}
          
          {/* Area Totals Summary */}
          {Object.keys(aggregatedMeasurements).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-orange-900 mb-2">Area Totals:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Object.values(aggregatedMeasurements).map((area) => (
                  <div key={`${area.floor_level}-${area.area_type}`} className="bg-white rounded p-3 border border-orange-100">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-sm font-medium text-slate-900">
                          {area.floor_level} - {getAreaDisplayName(area.area_type)}
                        </span>
                        <div className="text-xs text-slate-500">
                          R-{approximateRValue(Number(area.r_value))} • {area.insulation_type || 'Not specified'}
                        </div>
                      </div>
                      <span className="text-sm font-bold text-orange-600">
                        {area.total_square_feet.toFixed(1)} sq ft
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                      // Generate quick PDF estimate without saving to database
                      try {
                        await generateQuickEstimatePDF(
                          measurements as any,
                          job.job_name || 'Spray Foam Estimate',
                          job.lead?.name || 'Customer'
                        )
                        
                        // Also show the total in a toast
                        const estimate = calculateTotalEstimate(
                          measurements.map(m => ({
                            squareFeet: m.square_feet,
                            insulationType: m.insulation_type as InsulationType,
                            rValue: m.r_value ? Number(m.r_value) : 0
                          }))
                        )
                        
                        toast.success(
                          <div className="space-y-2">
                            <p className="font-semibold">Quick PDF Generated!</p>
                            <p>Downloading PDF...</p>
                            <p className="text-lg font-bold">Total: {formatCurrency(estimate.total)}</p>
                          </div>
                        )
                      } catch (error) {
                        console.error('Error generating PDF:', error)
                        toast.error('Failed to generate PDF. Please try again.')
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
            <ScrollArea className="h-[600px]">
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
                    // Group measurements by base room_name (without "- Wall X") + area_type
                    const groupedMeasurements = measurements.reduce((groups, measurement) => {
                      // Extract base room name by removing "- Wall X" suffix
                      const baseRoomName = measurement.room_name.replace(/ - Wall \d+$/, '')
                      const key = `${baseRoomName}-${measurement.area_type}`
                      if (!groups[key]) {
                        groups[key] = {
                          room_name: baseRoomName,
                          area_type: measurement.area_type,
                          measurements: [],
                          total_square_feet: 0,
                          insulation_type: measurement.insulation_type,
                          r_value: measurement.r_value,
                          framing_size: measurement.framing_size,
                          is_hybrid_system: measurement.is_hybrid_system,
                          closed_cell_inches: measurement.closed_cell_inches,
                          open_cell_inches: measurement.open_cell_inches
                        }
                      }
                      groups[key].measurements.push(measurement)
                      groups[key].total_square_feet += measurement.square_feet
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
                    }>)

                    return Object.values(groupedMeasurements).map((group, index) => {
                      // Calculate pricing for hybrid and regular systems
                      let priceBreakdown
                      let totalPrice = 0
                      const wallCount = group.measurements.length
                      
                      if (group.is_hybrid_system && group.insulation_type === 'hybrid') {
                        // Calculate hybrid pricing
                        const hybridCalc = calculateHybridRValue(
                          group.closed_cell_inches || 0, 
                          group.open_cell_inches || 0
                        )
                        const hybridPricing = calculateHybridPricing(hybridCalc)
                        totalPrice = group.total_square_feet * hybridPricing.totalPricePerSqft
                        
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
                              {group.framing_size} Framing • {wallCount} wall{wallCount !== 1 ? 's' : ''}
                            </div>
                          </div>
                        )
                      } else {
                        // Regular system pricing - use inches if available
                        let pricePerSqft = 0
                        if ((group.insulation_type === 'closed_cell' || group.insulation_type === 'open_cell') && 
                            (group.closed_cell_inches || group.open_cell_inches)) {
                          const inches = group.insulation_type === 'closed_cell' ? (group.closed_cell_inches || 0) : (group.open_cell_inches || 0)
                          if (inches > 0) {
                            const pricing = calculatePriceByInches(group.total_square_feet, group.insulation_type, inches)
                            pricePerSqft = pricing.pricePerSqft
                            totalPrice = pricing.totalPrice
                          }
                        } else {
                          // Fallback to R-value pricing
                          pricePerSqft = calculateMeasurementPrice(
                            group.total_square_feet, 
                            group.insulation_type as InsulationType, 
                            Number(group.r_value) || 0
                          )?.pricePerSqft || 0
                          totalPrice = group.total_square_feet * pricePerSqft
                        }
                        
                        // Check if we have inches data for this group
                        const hasInches = (group.insulation_type === 'closed_cell' && group.closed_cell_inches) || 
                                         (group.insulation_type === 'open_cell' && group.open_cell_inches)
                        const inches = group.insulation_type === 'closed_cell' ? 
                                      (group.closed_cell_inches || 0) : (group.open_cell_inches || 0)
                        
                        // For batt insulation, get inches from framing size
                        const framingToInches: Record<string, number> = {
                          '2x4': 4, '2x6': 6, '2x8': 8, '2x10': 10, '2x12': 12
                        }
                        const battInches = group.insulation_type === 'batt' ? framingToInches[group.framing_size] || 0 : 0
                        
                        priceBreakdown = (
                          <div className="text-sm font-medium text-slate-700 bg-blue-50 rounded p-2">
                            <div className="font-semibold text-blue-900 mb-1">
                              {group.insulation_type === 'closed_cell' ? 'Closed Cell' : 
                               group.insulation_type === 'open_cell' ? 'Open Cell' : 
                               group.insulation_type === 'batt' ? 'Fiberglass Batt' :
                               group.insulation_type === 'blown_in' ? 'Fiberglass Blown-in' :
                               group.insulation_type}{
                               (hasInches && inches > 0) ? 
                                ` - ${inches}" (R-${group.insulation_type === 'closed_cell' ? approximateRValue(inches * 7.0) : approximateRValue(inches * 3.8)})` : 
                               (group.insulation_type === 'batt' && battInches > 0) ?
                                ` - ${battInches}" (R-${approximateRValue(Number(group.r_value))})` :
                                ` - R-${approximateRValue(Number(group.r_value))}`}
                            </div>
                            <div className="text-xs text-slate-600">
                              {group.framing_size} Framing • {wallCount} wall{wallCount !== 1 ? 's' : ''}
                            </div>
                          </div>
                        )
                      }
                      
                      return (
                        <div key={`${group.room_name}-${group.area_type}`} className="border rounded-lg p-4 bg-white">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="font-semibold text-slate-900 mb-2">
{group.room_name} - {getAreaDisplayName(group.area_type)}
                              </div>
                              {priceBreakdown}
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
                                  if (confirm(`Are you sure you want to delete all ${wallCount} wall${wallCount !== 1 ? 's' : ''} in ${group.room_name} - ${getAreaDisplayName(group.area_type)}?`)) {
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
                  {measurements.length > 0 && (() => {
                    // Use the same grouped calculation as line items
                    const groupedMeasurements = measurements.reduce((groups, measurement) => {
                      // Extract base room name by removing "- Wall X" suffix
                      const baseRoomName = measurement.room_name.replace(/ - Wall \d+$/, '')
                      const key = `${baseRoomName}-${measurement.area_type}`
                      if (!groups[key]) {
                        groups[key] = {
                          room_name: baseRoomName,
                          area_type: measurement.area_type,
                          measurements: [],
                          total_square_feet: 0,
                          insulation_type: measurement.insulation_type,
                          r_value: measurement.r_value,
                          framing_size: measurement.framing_size,
                          is_hybrid_system: measurement.is_hybrid_system,
                          closed_cell_inches: measurement.closed_cell_inches,
                          open_cell_inches: measurement.open_cell_inches
                        }
                      }
                      groups[key].measurements.push(measurement)
                      groups[key].total_square_feet += measurement.square_feet
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
                    }>)

                    // Calculate total using grouped measurements
                    const subtotal = Object.values(groupedMeasurements).reduce((sum, group) => {
                      if (group.is_hybrid_system && group.insulation_type === 'hybrid') {
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
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
      
      {/* Final Output Summary */}
      {Object.keys(aggregatedMeasurements).length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <Calculator className="h-5 w-5" />
              Final Project Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="font-semibold text-green-900">
                  Project Type: {job.project_type === 'new_construction' ? 'New Construction' : 'Remodel'}
                </span>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-green-900">Total Areas:</h4>
                {Object.values(aggregatedMeasurements)
                  .sort((a, b) => {
                    // Sort by floor level (alphabetically), then by area type
                    const areaOrder = { 'roof': 1, 'exterior_walls': 2, 'interior_walls': 3, 'basement_walls': 4, 'ceiling': 5, 'gable': 6 }
                    
                    // First sort by floor level alphabetically
                    const floorCompare = a.floor_level.localeCompare(b.floor_level)
                    if (floorCompare !== 0) {
                      return floorCompare
                    }
                    // Then by area type
                    return areaOrder[a.area_type] - areaOrder[b.area_type]
                  })
                  .map((area) => (
                    <div key={`${area.floor_level}-${area.area_type}`} className="bg-white rounded-lg p-4 border border-green-200">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <span className="font-medium text-slate-900">
                            {getAreaDisplayName(area.area_type)}: {area.total_square_feet.toFixed(0)} sq ft
                          </span>
                          <div className="text-sm text-slate-600 mt-1">
                            → R-{approximateRValue(Number(area.r_value))} → {area.insulation_type ? area.insulation_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'Not specified'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
              
              <div className="text-xs text-green-700 mt-4 p-3 bg-green-100 rounded">
                <div className="font-semibold mb-2">📋 Massachusetts Building Code Requirements:</div>
                {job.project_type === 'new_construction' ? (
                  <div className="space-y-1">
                    <div><strong>New Construction:</strong></div>
                    <div>• Roof: R-60 minimum</div>
                    <div>• Exterior Walls: R-30 minimum</div>
                    <div>• Basement: R-15 minimum</div>
                  </div>
                ) : job.project_type === 'remodel' ? (
                  <div className="space-y-1">
                    <div><strong>Renovation/Remodel:</strong></div>
                    <div>• Roof: R-49 minimum</div>
                    <div>• Exterior Walls: R-21 minimum</div>
                    <div>• Basement: R-15 minimum</div>
                  </div>
                ) : (
                  <div>ℹ️ Massachusetts building code compliance - R-values automatically assigned based on project type</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
    measurement.square_feet,
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
              {getAreaDisplayName(measurement.area_type)}
            </Badge>
          )}
          <Badge 
            variant="outline" 
            className="border-purple-300 text-purple-700"
          >
            {measurement.surface_type === 'wall' ? 'Wall' : 'Ceiling'}
          </Badge>
          {measurement.framing_size && (
            <Badge 
              variant="outline" 
              className="border-orange-300 text-orange-700"
            >
              {measurement.framing_size}
            </Badge>
          )}
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
          <div className="font-bold text-orange-600">{measurement.square_feet.toFixed(1)} sq ft</div>
        </div>
        <div>
          <Label className="text-xs text-slate-500">Type</Label>
          <div className="font-medium text-purple-600">{measurement.surface_type}</div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        {measurement.framing_size && (
          <div>
            <Label className="text-xs text-slate-500">Framing</Label>
            <div className="font-medium text-orange-600">{measurement.framing_size}</div>
          </div>
        )}
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