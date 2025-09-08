/**
 * HVAC Measurement Form Component
 */

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, Zap, Wrench, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  HvacMeasurement, 
  HvacMeasurementFormData, 
  hvacMeasurementSchema,
  DEFAULT_HVAC_MEASUREMENT 
} from './types'

interface HvacFormProps {
  measurements: HvacMeasurement[]
  onMeasurementsChange: (measurements: HvacMeasurement[]) => void
  onSave: (measurements: HvacMeasurement[]) => Promise<void>
  jobId: string
  loading?: boolean
  saving?: boolean
}

export function HvacForm({ 
  measurements, 
  onMeasurementsChange, 
  onSave, 
  jobId,
  loading = false,
  saving = false 
}: HvacFormProps) {
  const form = useForm<{ measurements: HvacMeasurementFormData[] }>({
    resolver: zodResolver(hvacMeasurementSchema),
    defaultValues: {
      measurements: measurements.length > 0 ? measurements : [DEFAULT_HVAC_MEASUREMENT]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'measurements'
  })

  const handleAddMeasurement = () => {
    append(DEFAULT_HVAC_MEASUREMENT)
  }

  const handleRemoveMeasurement = (index: number) => {
    if (fields.length > 1) {
      remove(index)
    }
  }

  const handleSave = async (data: { measurements: HvacMeasurementFormData[] }) => {
    const hvacMeasurements: HvacMeasurement[] = data.measurements.map((measurement, index) => ({
      ...measurement,
      id: measurements[index]?.id,
      job_id: jobId,
      created_at: measurements[index]?.created_at,
      updated_at: measurements[index]?.updated_at,
    }))

    onMeasurementsChange(hvacMeasurements)
    await onSave(hvacMeasurements)
  }

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'standard': return 'bg-green-100 text-green-800'
      case 'moderate': return 'bg-yellow-100 text-yellow-800'
      case 'complex': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">HVAC System Measurements</h3>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddMeasurement}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add System
          </Button>
        </div>

        {/* Measurement Fields */}
        <div className="space-y-4">
          {fields.map((field, index) => (
            <Card key={field.id} className="relative">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    HVAC System {index + 1}
                  </CardTitle>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMeasurement(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Room Name */}
                  <FormField
                    control={form.control}
                    name={`measurements.${index}.room_name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Room/Area Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Main Floor, Basement" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* System Type */}
                  <FormField
                    control={form.control}
                    name={`measurements.${index}.system_type`}
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

                  {/* Tonnage */}
                  <FormField
                    control={form.control}
                    name={`measurements.${index}.tonnage`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tonnage</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number"
                            step="0.5"
                            min="0.5"
                            max="10"
                            placeholder="e.g., 2.5"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* SEER Rating */}
                  <FormField
                    control={form.control}
                    name={`measurements.${index}.seer_rating`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SEER Rating (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number"
                            min="10"
                            max="30"
                            placeholder="e.g., 16"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Ductwork Linear Feet */}
                  <FormField
                    control={form.control}
                    name={`measurements.${index}.ductwork_linear_feet`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ductwork Linear Feet</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number"
                            min="0"
                            placeholder="e.g., 150"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Installation Complexity */}
                  <FormField
                    control={form.control}
                    name={`measurements.${index}.installation_complexity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Installation Complexity</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="standard">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-green-100 text-green-800">
                                  Standard
                                </Badge>
                                <span className="text-sm text-muted-foreground">Normal access</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="moderate">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                                  Moderate
                                </Badge>
                                <span className="text-sm text-muted-foreground">Some challenges</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="complex">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-red-100 text-red-800">
                                  Complex
                                </Badge>
                                <span className="text-sm text-muted-foreground">Difficult access</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Additional Options */}
                <div className="space-y-3">
                  <div className="flex items-center gap-6">
                    <FormField
                      control={form.control}
                      name={`measurements.${index}.existing_system_removal`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="flex items-center gap-2">
                              <Trash2 className="h-4 w-4" />
                              Remove Existing System
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`measurements.${index}.electrical_work_required`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="flex items-center gap-2">
                              <Zap className="h-4 w-4" />
                              Electrical Work Required
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name={`measurements.${index}.notes`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Additional notes about this HVAC system..."
                            rows={2}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={saving}
            className="flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save HVAC Measurements
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}