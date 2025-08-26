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
  EyeOff
} from "lucide-react"

interface Measurement {
  id: string
  room_name: string
  surface_type: 'wall' | 'ceiling'
  height: number
  width: number
  square_feet: number
  photo_url?: string | null
  notes?: string | null
  photo_file?: File | null
}

interface Job {
  id: string
  job_name: string
  lead_id: string
  total_square_feet: number
  structural_framing: string
  roof_rafters: string
}

const measurementSchema = z.object({
  room_name: z.string().min(1, "Room name is required"),
  surface_type: z.enum(["wall", "ceiling"], {
    required_error: "Surface type is required"
  }),
  height: z.number().min(0.1, "Height must be greater than 0"),
  width: z.number().min(0.1, "Width must be greater than 0"),
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
      surface_type: "wall",
      height: 0,
      width: 0,
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

  // Add new measurement
  const addMeasurement = async (data: MeasurementFormData) => {
    try {
      setSaving(true)
      const square_feet = data.height * data.width
      
      const newMeasurement: Measurement = {
        id: `temp-${Date.now()}`,
        room_name: data.room_name,
        surface_type: data.surface_type,
        height: data.height,
        width: data.width,
        square_feet,
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
          surface_type: data.surface_type,
          height: data.height,
          width: data.width,
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
        
        toast.success(`${data.surface_type === 'wall' ? 'Wall' : 'Ceiling'} measurement added: ${square_feet.toFixed(1)} sq ft`)
        form.reset({
          room_name: data.room_name, // Keep room name for next measurement
          surface_type: "wall",
          height: 0,
          width: 0,
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

      {/* Total Summary */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
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

                  {/* Auto-calculated square footage */}
                  {form.watch('height') > 0 && form.watch('width') > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Square className="h-4 w-4 text-green-600" />
                        <span className="text-green-900 font-medium">
                          = {(form.watch('height') * form.watch('width')).toFixed(1)} sq ft
                        </span>
                      </div>
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
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={measurement.surface_type === 'wall' ? 'border-blue-300 text-blue-700' : 'border-purple-300 text-purple-700'}
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

      <div className="grid grid-cols-3 gap-4 text-sm">
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
      </div>

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