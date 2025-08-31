"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
// Simple checkbox component
const Checkbox = ({ checked, onCheckedChange }: { checked: boolean, onCheckedChange: (checked: boolean) => void }) => (
  <input
    type="checkbox"
    checked={checked}
    onChange={(e) => onCheckedChange(e.target.checked)}
    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
  />
)
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { 
  Calculator, 
  DollarSign, 
  FileText, 
  AlertCircle,
  CheckCircle2,
  X,
  Send,
  Save,
  Loader2
} from "lucide-react"
import { 
  calculateTotalEstimate, 
  formatCurrency, 
  type InsulationType 
} from "@/lib/utils/pricing-calculator"
import { Job as DatabaseJob, InsulationMeasurement } from "@/lib/types/database"

// Extended Job interface
interface Job extends DatabaseJob {
  lead?: {
    name: string
    phone: string
    address?: string
  }
  measurements?: Measurement[]
}

interface Measurement extends Omit<InsulationMeasurement, 'id' | 'job_id' | 'created_at' | 'updated_at'> {
  id: string
}

interface EstimateBuilderProps {
  job: Job
  measurements: Measurement[]
  onClose: () => void
  onEstimateCreated: (estimate: any) => void
}

const estimateSchema = z.object({
  prepWork: z.boolean(),
  fireRetardant: z.boolean(),
  complexityMultiplier: z.number().min(1.0).max(2.0),
  discount: z.number().min(0).max(50),
  notes: z.string().optional()
})

type EstimateFormData = z.infer<typeof estimateSchema>

export function EstimateBuilder({ job, measurements, onClose, onEstimateCreated }: EstimateBuilderProps) {
  const [creating, setCreating] = useState(false)
  const [estimate, setEstimate] = useState<any>(null)

  const form = useForm<EstimateFormData>({
    resolver: zodResolver(estimateSchema),
    defaultValues: {
      prepWork: false,
      fireRetardant: false,
      complexityMultiplier: 1.0,
      discount: 0,
      notes: ""
    }
  })

  // Watch form values for real-time calculation
  const formValues = form.watch()
  
  // Calculate preview estimate
  const calculatePreview = () => {
    if (measurements.length === 0) return null

    // Calculate base estimate
    const baseEstimate = calculateTotalEstimate(
      measurements.map(m => ({
        squareFeet: m.square_feet,
        insulationType: m.insulation_type as InsulationType,
        rValue: m.r_value ? Number(m.r_value) : 0
      }))
    )

    const totalSquareFeet = measurements.reduce((sum, m) => sum + m.square_feet, 0)
    
    // Apply complexity multiplier
    let adjustedSubtotal = baseEstimate.subtotal * formValues.complexityMultiplier
    
    // Add prep work
    let prepWorkCost = 0
    if (formValues.prepWork) {
      prepWorkCost = totalSquareFeet * 0.50
      adjustedSubtotal += prepWorkCost
    }

    // Add fire retardant
    let fireRetardantCost = 0
    if (formValues.fireRetardant) {
      fireRetardantCost = totalSquareFeet * 1.10
      adjustedSubtotal += fireRetardantCost
    }

    // Apply discount
    const discountAmount = adjustedSubtotal * (formValues.discount / 100)
    const subtotalAfterDiscount = adjustedSubtotal - discountAmount
    const total = subtotalAfterDiscount

    return {
      baseSubtotal: baseEstimate.subtotal,
      complexityAdjustment: baseEstimate.subtotal * (formValues.complexityMultiplier - 1),
      prepWorkCost,
      fireRetardantCost,
      adjustedSubtotal,
      discountAmount,
      subtotalAfterDiscount,
      total,
      totalSquareFeet,
      requiresApproval: total > 10000
    }
  }

  const previewEstimate = calculatePreview()

  // Create estimate
  const createEstimate = async (data: EstimateFormData) => {
    try {
      setCreating(true)
      
      const response = await fetch(`/api/jobs/${job.id}/estimate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prepWork: data.prepWork,
          fireRetardant: data.fireRetardant,
          complexityMultiplier: data.complexityMultiplier,
          discount: data.discount,
          notes: data.notes
        })
      })

      const result = await response.json()

      if (result.success) {
        setEstimate(result.data.estimate)
        onEstimateCreated(result.data.estimate)
      } else {
        toast.error(`Failed to create estimate: ${result.error}`)
      }
    } catch (error) {
      console.error('Error creating estimate:', error)
      toast.error('Failed to create estimate')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] bg-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Generate Estimate - {job.job_name}
            </CardTitle>
            <p className="text-sm text-slate-600 mt-1">
              {measurements.length} measurements • {previewEstimate?.totalSquareFeet.toFixed(1) || 0} sq ft total
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <ScrollArea className="h-[70vh]">
            <div className="space-y-6">
              
              {/* Measurements Summary */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Measurements Summary</h3>
                <div className="grid gap-2">
                  {measurements.map((measurement) => {
                    const pricing = calculateTotalEstimate([{
                      squareFeet: measurement.square_feet,
                      insulationType: measurement.insulation_type as InsulationType,
                      rValue: measurement.r_value ? Number(measurement.r_value) : 0
                    }])
                    
                    return (
                      <div key={measurement.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <div className="flex-1">
                          <span className="font-medium">{measurement.room_name}</span>
                          <div className="text-sm text-slate-600">
                            {measurement.square_feet.toFixed(1)} sq ft • {measurement.insulation_type?.replace('_', ' ')} • R-{measurement.r_value}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(pricing.subtotal)}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <Separator />

              {/* Estimate Configuration Form */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(createEstimate)} className="space-y-6">
                  
                  {/* Additional Services */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Additional Services</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <FormField
                        control={form.control}
                        name="prepWork"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-medium">
                                Surface Preparation (+$0.50/sq ft)
                              </FormLabel>
                              <p className="text-xs text-slate-600">
                                Cleaning, masking, and surface prep work
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="fireRetardant"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-medium">
                                Fire Retardant Coating (+$1.10/sq ft)
                              </FormLabel>
                              <p className="text-xs text-slate-600">
                                Required for certain applications
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Adjustments */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Price Adjustments</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      <FormField
                        control={form.control}
                        name="complexityMultiplier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Complexity Multiplier</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(parseFloat(value))} 
                              value={field.value.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="1.0">Standard (1.0x)</SelectItem>
                                <SelectItem value="1.1">Slightly Complex (1.1x)</SelectItem>
                                <SelectItem value="1.2">Moderately Complex (1.2x)</SelectItem>
                                <SelectItem value="1.3">Complex (1.3x)</SelectItem>
                                <SelectItem value="1.4">Very Complex (1.4x)</SelectItem>
                                <SelectItem value="1.5">Extremely Complex (1.5x)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="discount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Discount %</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.5"
                                min="0"
                                max="50"
                                placeholder="0"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                    </div>
                  </div>

                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimate Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Special conditions, warranty terms, scheduling notes..."
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Estimate Preview */}
                  {previewEstimate && (
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border-2 border-green-200">
                      <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Estimate Preview
                      </h3>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Base Insulation ({previewEstimate.totalSquareFeet.toFixed(1)} sq ft):</span>
                          <span>{formatCurrency(previewEstimate.baseSubtotal)}</span>
                        </div>
                        
                        {previewEstimate.complexityAdjustment > 0 && (
                          <div className="flex justify-between text-orange-700">
                            <span>Complexity Adjustment ({((formValues.complexityMultiplier - 1) * 100).toFixed(1)}%):</span>
                            <span>+{formatCurrency(previewEstimate.complexityAdjustment)}</span>
                          </div>
                        )}
                        
                        {previewEstimate.prepWorkCost > 0 && (
                          <div className="flex justify-between text-blue-700">
                            <span>Surface Preparation:</span>
                            <span>+{formatCurrency(previewEstimate.prepWorkCost)}</span>
                          </div>
                        )}
                        
                        {previewEstimate.fireRetardantCost > 0 && (
                          <div className="flex justify-between text-purple-700">
                            <span>Fire Retardant Coating:</span>
                            <span>+{formatCurrency(previewEstimate.fireRetardantCost)}</span>
                          </div>
                        )}
                        
                        <Separator />
                        
                        <div className="flex justify-between font-medium">
                          <span>Subtotal:</span>
                          <span>{formatCurrency(previewEstimate.adjustedSubtotal)}</span>
                        </div>
                        
                        {previewEstimate.discountAmount > 0 && (
                          <div className="flex justify-between text-green-700">
                            <span>Discount ({formValues.discount}%):</span>
                            <span>-{formatCurrency(previewEstimate.discountAmount)}</span>
                          </div>
                        )}
                        
                        
                        <Separator />
                        
                        <div className="flex justify-between text-xl font-bold">
                          <span>Total:</span>
                          <span className="text-green-700">{formatCurrency(previewEstimate.total)}</span>
                        </div>

                        {previewEstimate.requiresApproval && (
                          <div className="flex items-center gap-2 text-amber-700 text-sm mt-2 p-2 bg-amber-100 rounded">
                            <AlertCircle className="h-4 w-4" />
                            <span>Estimate over $10,000 - requires approval</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      disabled={creating}
                    >
                      Cancel
                    </Button>
                    
                    <Button
                      type="submit"
                      className="bg-green-600 hover:bg-green-700"
                      disabled={creating || !previewEstimate}
                    >
                      {creating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Estimate...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Create Estimate {previewEstimate && `(${formatCurrency(previewEstimate.total)})`}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>

            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}