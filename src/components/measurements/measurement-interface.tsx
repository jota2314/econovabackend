"use client"

import { useState, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
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
  ChevronRight
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
  room_name: string
  floor_level?: 'first_floor' | 'second_floor' | 'basement'
  area_type?: 'roof' | 'exterior_walls' | 'interior_walls' | 'basement_walls'
  surface_type: 'wall' | 'ceiling'
  height: number
  width: number
  square_feet: number
  insulation_type?: 'closed_cell' | 'open_cell' | 'hybrid' | 'fiberglass' | 'roxul' | null
  r_value?: number | null
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

const measurementSchema = z.object({
  room_name: z.string().min(1, "Room name is required"),
  floor_level: z.enum(["first_floor", "second_floor", "basement"]).optional(),
  area_type: z.enum(["roof", "exterior_walls", "interior_walls", "basement_walls"]).optional(),
  surface_type: z.enum(["wall", "ceiling"]),
  height: z.number().min(0.1, "Height must be greater than 0"),
  width: z.number().min(0.1, "Width must be greater than 0"),
  insulation_type: z.enum(["closed_cell", "open_cell", "hybrid", "fiberglass", "roxul"]).optional(),
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
      room_name: "",
      floor_level: "first_floor",
      area_type: "exterior_walls",
      surface_type: "wall",
      height: 0,
      width: 0,
      insulation_type: "closed_cell",
      notes: ""
    }
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

  // Group measurements by floor and area type for aggregation
  const aggregatedMeasurements = measurements.reduce((acc, measurement) => {
    // Use surface type as fallback if area_type is not available
    const areaType = measurement.area_type || (measurement.surface_type === 'ceiling' ? 'roof' : 'exterior_walls')
    const floorLevel = measurement.floor_level || 'first_floor'
    const key = `${floorLevel}-${areaType}`
    
    if (!acc[key]) {
      acc[key] = {
        floor_level: floorLevel as FloorLevel,
        area_type: areaType as AreaType,
        total_square_feet: 0,
        measurements: [],
        r_value: measurement.r_value || 0,
        insulation_type: measurement.insulation_type
      }
    }
    acc[key].total_square_feet += measurement.square_feet
    acc[key].measurements.push(measurement)
    return acc
  }, {} as Record<string, {
    floor_level: FloorLevel
    area_type: AreaType
    total_square_feet: number
    measurements: Measurement[]
    r_value: number
    insulation_type?: string | null
  }>)

  // Add new measurement
  const addMeasurement = async (data: MeasurementFormData) => {
    try {
      setSaving(true)
      const square_feet = data.height * data.width
      
      // Calculate R-value based on project type and area type
      const projectType = (job.project_type as ProjectType) || 'new_construction'
      const rValueResult = calculateRValue(projectType, data.area_type)
      
      const newMeasurement: Measurement = {
        id: `temp-${Date.now()}`,
        room_name: data.room_name,
        floor_level: data.floor_level,
        area_type: data.area_type,
        surface_type: data.surface_type,
        height: data.height,
        width: data.width,
        square_feet,
        insulation_type: data.insulation_type || null,
        r_value: rValueResult.rValue,
        notes: data.notes || null,
        photo_url: null,
        photo_file: null
      }

      setMeasurements(prev => [...prev, newMeasurement])
      
      // Save to database
      const response = await fetch(`/api/jobs/${job.id}/measurements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room_name: data.room_name,
          floor_level: data.floor_level,
          area_type: data.area_type,
          surface_type: data.surface_type,
          height: data.height,
          width: data.width,
          insulation_type: data.insulation_type,
          notes: data.notes
        })
      })

      const result = await response.json()

      if (result.success) {
        // Update the temporary measurement with the real ID
        setMeasurements(prev => prev.map(m => 
          m.id === newMeasurement.id 
            ? { ...m, id: result.data.id }
            : m
        ))
        
        toast.success(`${getAreaDisplayName(data.area_type)} measurement added: ${square_feet.toFixed(1)} sq ft`)
        form.reset({
          room_name: data.room_name, // Keep room name for next measurement
          floor_level: data.floor_level, // Keep floor level
          area_type: data.area_type, // Keep area type
          surface_type: "wall",
          height: 0,
          width: 0,
          insulation_type: data.insulation_type,
          notes: ""
        })
      } else {
        // Remove the temporary measurement on error
        setMeasurements(prev => prev.filter(m => m.id !== newMeasurement.id))
        toast.error(`Failed to save measurement: ${result.error}`)
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
    try {
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
        toast.success('Photo uploaded successfully')
      } else {
        toast.error('Failed to upload photo')
      }
    } catch (error) {
      console.error('Error uploading photo:', error)
      toast.error('Failed to upload photo')
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
                          {getFloorDisplayName(area.floor_level)} - {getAreaDisplayName(area.area_type)}
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
                          <Home className="h-4 w-4" />
                          Room Name
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Living Room, Kitchen, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="floor_level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Floor Level
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="first_floor">First Floor</SelectItem>
                              <SelectItem value="second_floor">Second Floor</SelectItem>
                              <SelectItem value="basement">Basement</SelectItem>
                            </SelectContent>
                          </Select>
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
                              const projectType = (job.project_type as ProjectType) || 'new_construction'
                              const rValueResult = calculateRValue(projectType, value as AreaType)
                              // Note: R-value will be calculated when saving
                            }} 
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {getAreaTypesForFloor(form.watch('floor_level')).map((areaType) => (
                                <SelectItem key={areaType} value={areaType}>
                                  {getAreaDisplayName(areaType)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                              <SelectItem value="hybrid">Hybrid</SelectItem>
                              <SelectItem value="fiberglass">Fiberglass</SelectItem>
                              <SelectItem value="roxul">Roxul</SelectItem>
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
                      name="height"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Ruler className="h-4 w-4" />
                            Height (ft)
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1" 
                              min="0.1"
                              placeholder="8.0"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="width"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Ruler className="h-4 w-4 rotate-90" />
                            Width (ft)
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1" 
                              min="0.1"
                              placeholder="12.0"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Auto-calculated square footage and R-value */}
                  {form.watch('height') > 0 && form.watch('width') > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Square className="h-4 w-4 text-green-600" />
                        <span className="text-green-900 font-medium">
                          = {(form.watch('height') * form.watch('width')).toFixed(1)} sq ft
                        </span>
                      </div>
                      {form.watch('area_type') && job.project_type && (
                        <div className="text-sm text-green-700">
                          R-Value: R-{calculateRValue(job.project_type as ProjectType, form.watch('area_type')).rValue}
                          <span className="ml-2 text-xs">
                            (MA {job.project_type === 'new_construction' ? 'New Construction' : 'Remodel'} Code)
                          </span>
                        </div>
                      )}
                    </div>
                  )}

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
                    // Sort by floor level, then by area type
                    const floorOrder = { 'first_floor': 1, 'second_floor': 2, 'basement': 3 }
                    const areaOrder = { 'roof': 1, 'exterior_walls': 2, 'interior_walls': 3, 'basement_walls': 4 }
                    
                    if (floorOrder[a.floor_level] !== floorOrder[b.floor_level]) {
                      return floorOrder[a.floor_level] - floorOrder[b.floor_level]
                    }
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
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onPhotoUpload(measurement.id, file)
    }
  }

  return (
    <div className="border border-slate-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {measurement.floor_level && (
            <Badge 
              variant="outline" 
              className="border-blue-300 text-blue-700"
            >
              {getFloorDisplayName(measurement.floor_level)}
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
            className={measurement.surface_type === 'wall' ? 'border-purple-300 text-purple-700' : 'border-indigo-300 text-indigo-700'}
          >
            {measurement.surface_type === 'wall' ? 'Wall' : 'Ceiling'}
          </Badge>
          <h4 className="font-medium text-slate-900">{measurement.room_name}</h4>
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
          <Label className="text-xs text-slate-500">R-Value</Label>
          <div className="font-medium text-green-600">R-{measurement.r_value || 'N/A'}</div>
        </div>
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
        <div className="relative">
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            id={`photo-${measurement.id}`}
          />
          <Button variant="outline" size="sm" className="relative">
            <Camera className="h-4 w-4 mr-2" />
            {measurement.photo_url ? 'Change Photo' : 'Add Photo'}
          </Button>
        </div>
        
        {measurement.photo_url && (
          <Badge variant="secondary" className="text-green-700">
            Photo uploaded
          </Badge>
        )}
      </div>
    </div>
  )
}