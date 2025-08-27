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
  Loader2
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

interface Measurement {
  id: string
  room_name: string  // Description/name of the wall section
  floor_level?: string | null  // Text field for floor level
  area_type?: 'exterior_walls' | 'interior_walls' | 'ceiling' | 'gable' | 'roof' | null
  surface_type: 'wall' | 'ceiling'  // Keep original surface type
  framing_size?: '2x4' | '2x6' | '2x8' | '2x10' | '2x12' | null
  height: number
  width: number
  square_feet: number
  insulation_type?: 'closed_cell' | 'open_cell' | 'fiberglass' | 'roxul' | null
  r_value?: string | null  // Changed to string to match schema
  photo_url?: string | null
  notes?: string | null
  photo_file?: File | null
}

interface Job {
  id: string
  job_name: string
  lead_id: string
  project_type?: 'new_construction' | 'remodel' | null
  total_square_feet: number
  structural_framing: string
  roof_rafters: string
}

const wallDimensionSchema = z.object({
  height: z.number().min(0.1, "Height must be greater than 0"),
  width: z.number().min(0.1, "Width must be greater than 0"),
})

const measurementSchema = z.object({
  room_name: z.string().min(1, "Wall section name is required"),
  floor_level: z.string().optional(),
  area_type: z.enum(["exterior_walls", "interior_walls", "ceiling", "gable", "roof"]).optional(),
  surface_type: z.enum(["wall", "ceiling"]),
  framing_size: z.enum(["2x4", "2x6", "2x8", "2x10", "2x12"]).optional(),
  wall_dimensions: z.array(wallDimensionSchema).min(1, "At least one wall section is required"),
  insulation_type: z.enum(["closed_cell", "open_cell", "fiberglass", "roxul"]).optional(),
  notes: z.string().optional(),
})

type MeasurementFormData = z.infer<typeof measurementSchema>

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

  const form = useForm<MeasurementFormData>({
    resolver: zodResolver(measurementSchema),
    defaultValues: {
      room_name: "",  // Wall section name
      floor_level: "",
      area_type: "exterior_walls",
      surface_type: "wall",
      framing_size: "2x6",
      wall_dimensions: [{ height: undefined as any, width: undefined as any }],
      insulation_type: "closed_cell",
      notes: ""
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "wall_dimensions"
  })

  // Load existing measurements
  const loadMeasurements = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/jobs/${job.id}/measurements`)
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
  }, [loadMeasurements])

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
  const addMeasurement = async (data: MeasurementFormData) => {
    try {
      setSaving(true)
      
      // Calculate R-value based on project type and area type
      const projectType = (job.project_type as ProjectType) || 'new_construction'
      const rValueResult = data.area_type 
        ? calculateRValue(projectType, data.area_type)
        : { rValue: 0 }  // Default if no area type

      // Create a measurement for each valid wall dimension
      const validWalls = data.wall_dimensions.filter(wall => wall.height > 0 && wall.width > 0)
      const newMeasurements: Measurement[] = []
      
      for (let i = 0; i < validWalls.length; i++) {
        const wall = validWalls[i]
        const square_feet = wall.height * wall.width
        
        const newMeasurement: Measurement = {
          id: `temp-${Date.now()}-${i}`,
          room_name: validWalls.length > 1 ? `${data.room_name} - Wall ${i + 1}` : data.room_name,
          floor_level: data.floor_level || null,
          area_type: data.area_type,
          surface_type: data.surface_type,
          framing_size: data.framing_size || null,
          height: wall.height,
          width: wall.width,
          square_feet,
          insulation_type: data.insulation_type || null,
          r_value: rValueResult?.rValue?.toString() || null,
          notes: data.notes || null,
          photo_url: null,
          photo_file: null
        }
        newMeasurements.push(newMeasurement)
      }

      // Add all measurements to local state first
      setMeasurements(prev => [...prev, ...newMeasurements])
      
      // Save each measurement to database
      const savedMeasurements = []
      let errorCount = 0
      
      for (const measurement of newMeasurements) {
        try {
          const response = await fetch(`/api/jobs/${job.id}/measurements`, {
            method: 'POST',
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
        form.reset({
          room_name: "", // Clear for next measurement
          floor_level: data.floor_level, // Keep floor level
          area_type: data.area_type, // Keep area type
          surface_type: "wall", // Reset to default
          framing_size: data.framing_size, // Keep framing size
          wall_dimensions: [{ height: undefined as any, width: undefined as any }], // Reset to single wall
          insulation_type: data.insulation_type, // Keep insulation type
          notes: ""
        })
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
                          R-{area.r_value} • {area.insulation_type || 'Not specified'}
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
                Add New Measurement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(addMeasurement)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="room_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Floor Level
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="First Floor, Second Floor, Basement, etc." 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="area_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Area Type</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value)
                            // Auto-calculate R-value when area type changes
                            if (value) {
                              const projectType = (job.project_type as ProjectType) || 'new_construction'
                              const rValueResult = calculateRValue(projectType, value as AreaType)
                              // Note: R-value will be calculated when saving
                            }
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select area type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="roof">Roof</SelectItem>
                            <SelectItem value="exterior_walls">Exterior Walls</SelectItem>
                            <SelectItem value="interior_walls">Interior Walls</SelectItem>
                            <SelectItem value="basement_walls">Basement Walls</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="surface_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Surface Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="wall">Wall</SelectItem>
                              <SelectItem value="ceiling">Ceiling</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="framing_size"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Framing Size</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select framing" />
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
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="insulation_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Insulation Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select insulation type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="closed_cell">Closed Cell</SelectItem>
                              <SelectItem value="open_cell">Open Cell</SelectItem>
                              <SelectItem value="fiberglass">Fiberglass</SelectItem>
                              <SelectItem value="roxul">Roxul</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Wall Dimensions Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold text-slate-900">Wall Dimensions</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ height: undefined as any, width: undefined as any })}
                        className="text-orange-600 border-orange-200 hover:bg-orange-50"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Wall
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {fields.map((field, index) => (
                        <div key={field.id} className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg bg-slate-50">
                          <div className="flex-1 grid grid-cols-2 gap-3">
                            <FormField
                              control={form.control}
                              name={`wall_dimensions.${index}.height`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-2 text-sm">
                                    <Ruler className="h-3 w-3" />
                                    Height (ft)
                                  </FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      step="0.1" 
                                      min="0.1"
                                      placeholder="8.0"
                                      {...field}
                                      value={field.value || ''}
                                      onChange={(e) => {
                                        const value = e.target.value
                                        field.onChange(value === '' ? undefined : parseFloat(value))
                                      }}
                                      className="h-9"
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
                                <FormItem>
                                  <FormLabel className="flex items-center gap-2 text-sm">
                                    <Ruler className="h-3 w-3 rotate-90" />
                                    Width (ft)
                                  </FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      step="0.1" 
                                      min="0.1"
                                      placeholder="12.0"
                                      {...field}
                                      value={field.value || ''}
                                      onChange={(e) => {
                                        const value = e.target.value
                                        field.onChange(value === '' ? undefined : parseFloat(value))
                                      }}
                                      className="h-9"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="flex flex-col items-center gap-2">
                            <div className="text-xs text-slate-500 text-center">
                              Wall {index + 1}
                            </div>
                            {form.watch(`wall_dimensions.${index}.height`) && form.watch(`wall_dimensions.${index}.width`) && 
                             form.watch(`wall_dimensions.${index}.height`) > 0 && form.watch(`wall_dimensions.${index}.width`) > 0 && (
                              <div className="text-xs text-green-600 font-medium text-center">
                                {(form.watch(`wall_dimensions.${index}.height`) * form.watch(`wall_dimensions.${index}.width`)).toFixed(1)} sq ft
                              </div>
                            )}
                            {fields.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => remove(index)}
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Auto-calculated total square footage and R-value */}
                  {(() => {
                    const wallDimensions = form.watch('wall_dimensions') || []
                    const totalSquareFeet = wallDimensions
                      .filter(wall => wall.height > 0 && wall.width > 0)
                      .reduce((sum, wall) => sum + (wall.height * wall.width), 0)
                    
                    return totalSquareFeet > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Square className="h-4 w-4 text-green-600" />
                          <span className="text-green-900 font-medium">
                            Total: {totalSquareFeet.toFixed(1)} sq ft ({wallDimensions.filter(w => w.height > 0 && w.width > 0).length} wall{wallDimensions.filter(w => w.height > 0 && w.width > 0).length !== 1 ? 's' : ''})
                          </span>
                        </div>
                        {form.watch('area_type') && job.project_type && (
                          <div className="text-sm text-green-700">
                            R-Value: R-{calculateRValue(job.project_type as ProjectType, form.watch('area_type') as AreaType).rValue}
                            <span className="ml-2 text-xs">
                              (MA {job.project_type === 'new_construction' ? 'New Construction' : 'Remodel'} Code)
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Any special notes about this measurement..."
                            className="resize-none"
                            rows={2}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full bg-orange-600 hover:bg-orange-700"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Save className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Measurement
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Measurements List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Square className="h-5 w-5" />
              Measurements List
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                </div>
              ) : measurements.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Square className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                  <p>No measurements yet</p>
                  <p className="text-sm">Add your first measurement to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {measurements.map((measurement) => (
                    <MeasurementCard
                      key={measurement.id}
                      measurement={measurement}
                      onDelete={deleteMeasurement}
                      onPhotoUpload={handlePhotoUpload}
                    />
                  ))}
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
                            → R-{area.r_value} → {area.insulation_type ? area.insulation_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'Not specified'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
              
              <div className="text-xs text-green-700 mt-4 p-3 bg-green-100 rounded">
                ℹ️ Massachusetts building code compliance - R-values automatically assigned based on project type
              </div>
            </div>
          </CardContent>
        </Card>
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
            <div className="font-medium text-green-600">R-{measurement.r_value}</div>
          </div>
        )}
      </div>
      
      {measurement.insulation_type && (
        <div className="text-sm">
          <Label className="text-xs text-slate-500">Insulation Type</Label>
          <div className="font-medium capitalize">{measurement.insulation_type.replace('_', ' ')}</div>
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