/**
 * Enhanced HVAC Measurement Form Component - Professional HVAC System Form
 */

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, Wrench, Save, Award, Zap, Settings, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { 
  EnhancedHvacMeasurement,
  EnhancedHvacMeasurementFormData,
  enhancedHvacMeasurementSchema,
  DEFAULT_ENHANCED_HVAC_MEASUREMENT,
  HVAC_MANUFACTURERS
} from './types-enhanced'
import { hvacPricingService } from './pricing-service'

interface EnhancedHvacFormProps {
  measurements: EnhancedHvacMeasurement[]
  onMeasurementsChange: (measurements: EnhancedHvacMeasurement[]) => void
  onSave: (measurements: EnhancedHvacMeasurement[]) => Promise<void>
  jobId: string
  loading?: boolean
  saving?: boolean
  isManager?: boolean
}

export function EnhancedHvacForm({ 
  measurements, 
  onMeasurementsChange, 
  onSave, 
  jobId,
  loading = false,
  saving = false,
  isManager = false
}: EnhancedHvacFormProps) {
  const form = useForm<{ measurements: EnhancedHvacMeasurementFormData[] }>({
    resolver: zodResolver(enhancedHvacMeasurementSchema),
    defaultValues: {
      measurements: measurements.length > 0 ? 
        measurements.map(m => ({
          system_number: m.system_number,
          system_description: m.system_description,
          system_type: m.system_type,
          ahri_certificate: {
            ahri_number: m.ahri_number,
            outdoor_model: m.outdoor_model,
            indoor_model: m.indoor_model,
            manufacturer: m.manufacturer,
            tonnage: m.tonnage,
            seer2_rating: m.seer2_rating || undefined,
            hspf2_rating: m.hspf2_rating || undefined,
            eer2_rating: m.eer2_rating || undefined,
            certified: m.ahri_certified
          },
          ductwork_linear_feet: m.ductwork_linear_feet,
          supply_vents: m.supply_vents,
          return_vents: m.return_vents,
          installation_complexity: m.installation_complexity,
          existing_system_removal: m.existing_system_removal,
          electrical_upgrade_required: m.electrical_upgrade_required,
          permit_required: m.permit_required,
          startup_testing_required: m.startup_testing_required,
          installation_location: m.installation_location || '',
          special_requirements: m.special_requirements || '',
          notes: m.notes || '',
          price_override: m.price_override || undefined,
          override_reason: m.override_reason || ''
        })) : [DEFAULT_ENHANCED_HVAC_MEASUREMENT]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'measurements'
  })

  const handleAddSystem = () => {
    const nextSystemNumber = Math.max(...fields.map((_, index) => 
      form.getValues(`measurements.${index}.system_number`) || 0
    )) + 1

    append({
      ...DEFAULT_ENHANCED_HVAC_MEASUREMENT,
      system_number: nextSystemNumber,
      system_description: `HVAC System ${nextSystemNumber}`
    })
  }

  const handleRemoveSystem = (index: number) => {
    if (fields.length > 1) {
      remove(index)
    }
  }

  const handleSave = async (data: { measurements: EnhancedHvacMeasurementFormData[] }) => {
    const enhancedMeasurements: EnhancedHvacMeasurement[] = data.measurements.map((measurement, index) => ({
      ...measurement,
      id: measurements[index]?.id,
      job_id: jobId,
      room_name: measurement.system_description,
      
      // Flatten AHRI certificate data
      ahri_number: measurement.ahri_certificate.ahri_number,
      outdoor_model: measurement.ahri_certificate.outdoor_model,
      indoor_model: measurement.ahri_certificate.indoor_model,
      manufacturer: measurement.ahri_certificate.manufacturer,
      tonnage: measurement.ahri_certificate.tonnage,
      seer2_rating: measurement.ahri_certificate.seer2_rating || null,
      hspf2_rating: measurement.ahri_certificate.hspf2_rating || null,
      eer2_rating: measurement.ahri_certificate.eer2_rating || null,
      ahri_certified: measurement.ahri_certificate.certified,
      
      // Optional fields
      installation_location: measurement.installation_location || null,
      special_requirements: measurement.special_requirements || null,
      notes: measurement.notes || null,
      override_reason: measurement.override_reason || null,
      
      // Calculated pricing
      calculated_price: hvacPricingService.calculateSystemPricing({
        ...measurement,
        id: measurements[index]?.id || '',
        job_id: jobId,
        room_name: measurement.system_description,
        ahri_number: measurement.ahri_certificate.ahri_number,
        outdoor_model: measurement.ahri_certificate.outdoor_model,
        indoor_model: measurement.ahri_certificate.indoor_model,
        manufacturer: measurement.ahri_certificate.manufacturer,
        tonnage: measurement.ahri_certificate.tonnage,
        seer2_rating: measurement.ahri_certificate.seer2_rating || null,
        hspf2_rating: measurement.ahri_certificate.hspf2_rating || null,
        eer2_rating: measurement.ahri_certificate.eer2_rating || null,
        ahri_certified: measurement.ahri_certificate.certified,
        installation_location: measurement.installation_location || null,
        special_requirements: measurement.special_requirements || null,
        notes: measurement.notes || null,
        override_reason: measurement.override_reason || null,
        calculated_price: null,
        created_at: measurements[index]?.created_at,
        updated_at: measurements[index]?.updated_at,
      }).finalTotal,
      
      created_at: measurements[index]?.created_at,
      updated_at: measurements[index]?.updated_at,
    }))

    onMeasurementsChange(enhancedMeasurements)
    await onSave(enhancedMeasurements)
  }

  const getSystemTypeIcon = (systemType: string) => {
    switch (systemType) {
      case 'central_air': return '❄️'
      case 'heat_pump': return '🔥❄️'
      case 'furnace': return '🔥'
      case 'mini_split': return '💨'
      default: return '🏠'
    }
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
            <h3 className="text-lg font-semibold">Professional HVAC Systems</h3>
            <Badge variant="secondary">{fields.length} System{fields.length !== 1 ? 's' : ''}</Badge>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddSystem}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add System
          </Button>
        </div>

        {/* Systems */}
        <div className="space-y-6">
          {fields.map((field, index) => {
            const systemType = form.watch(`measurements.${index}.system_type`)
            const tonnage = form.watch(`measurements.${index}.ahri_certificate.tonnage`)
            const complexity = form.watch(`measurements.${index}.installation_complexity`)
            
            return (
              <Card key={field.id} className="relative border-l-4 border-l-primary">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getSystemTypeIcon(systemType)}</span>
                      <div>
                        <CardTitle className="text-lg">
                          System {form.watch(`measurements.${index}.system_number`)}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={getComplexityColor(complexity)}>
                            {complexity}
                          </Badge>
                          {tonnage && (
                            <Badge variant="outline">
                              {tonnage} Ton{tonnage !== 1 ? 's' : ''}
                            </Badge>
                          )}
                          <Badge variant="outline">
                            {systemType?.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSystem(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <Accordion type="multiple" defaultValue={["system-info", "specs"]} className="w-full">
                    {/* System Information */}
                    <AccordionItem value="system-info">
                      <AccordionTrigger className="text-left">
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          System Information
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* System Description */}
                          <FormField
                            control={form.control}
                            name={`measurements.${index}.system_description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>System Description</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="e.g., Main Floor HVAC System" />
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
                                    <SelectItem value="central_air">
                                      <div className="flex items-center gap-2">
                                        <span>❄️</span>
                                        Central Air Conditioning
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="heat_pump">
                                      <div className="flex items-center gap-2">
                                        <span>🔥❄️</span>
                                        Heat Pump
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="furnace">
                                      <div className="flex items-center gap-2">
                                        <span>🔥</span>
                                        Furnace
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="mini_split">
                                      <div className="flex items-center gap-2">
                                        <span>💨</span>
                                        Mini Split
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* AHRI Specifications */}
                    <AccordionItem value="specs">
                      <AccordionTrigger className="text-left">
                        <div className="flex items-center gap-2">
                          <Award className="h-4 w-4" />
                          AHRI Certification & Technical Specifications
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* AHRI Number */}
                          <FormField
                            control={form.control}
                            name={`measurements.${index}.ahri_certificate.ahri_number`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>AHRI Certification Number</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="e.g., 12345678" />
                                </FormControl>
                                <FormDescription>
                                  Air-Conditioning, Heating, and Refrigeration Institute certification
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Certified Checkbox */}
                          <FormField
                            control={form.control}
                            name={`measurements.${index}.ahri_certificate.certified`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-8">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="flex items-center gap-2">
                                    <Award className="h-4 w-4" />
                                    AHRI Certified System
                                  </FormLabel>
                                  <FormDescription>
                                    System meets AHRI performance standards
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />

                          {/* Manufacturer */}
                          <FormField
                            control={form.control}
                            name={`measurements.${index}.ahri_certificate.manufacturer`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Manufacturer</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select manufacturer" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {HVAC_MANUFACTURERS.map(manufacturer => (
                                      <SelectItem key={manufacturer} value={manufacturer}>
                                        {manufacturer}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Tonnage */}
                          <FormField
                            control={form.control}
                            name={`measurements.${index}.ahri_certificate.tonnage`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>System Tonnage</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="number"
                                    step="0.5"
                                    min="0.5"
                                    max="20"
                                    placeholder="e.g., 3.0"
                                  />
                                </FormControl>
                                <FormDescription>
                                  Cooling capacity in tons (1 ton = 12,000 BTU/h)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Outdoor Model */}
                          <FormField
                            control={form.control}
                            name={`measurements.${index}.ahri_certificate.outdoor_model`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Outdoor Unit Model</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="e.g., 25HCB336A003" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Indoor Model */}
                          <FormField
                            control={form.control}
                            name={`measurements.${index}.ahri_certificate.indoor_model`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Indoor Unit Model</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="e.g., FX4CNF003000" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* SEER2 Rating */}
                          <FormField
                            control={form.control}
                            name={`measurements.${index}.ahri_certificate.seer2_rating`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>SEER2 Rating</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="number"
                                    step="0.1"
                                    min="10"
                                    max="30"
                                    placeholder="e.g., 16.0"
                                  />
                                </FormControl>
                                <FormDescription>
                                  Seasonal Energy Efficiency Ratio 2 (cooling efficiency)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* HSPF2 Rating (for heat pumps) */}
                          {systemType === 'heat_pump' && (
                            <FormField
                              control={form.control}
                              name={`measurements.${index}.ahri_certificate.hspf2_rating`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>HSPF2 Rating</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      type="number"
                                      step="0.1"
                                      min="6"
                                      max="15"
                                      placeholder="e.g., 9.5"
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Heating Seasonal Performance Factor 2 (heating efficiency)
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}

                          {/* EER2 Rating */}
                          <FormField
                            control={form.control}
                            name={`measurements.${index}.ahri_certificate.eer2_rating`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>EER2 Rating (Optional)</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="number"
                                    step="0.1"
                                    min="8"
                                    max="20"
                                    placeholder="e.g., 12.5"
                                  />
                                </FormControl>
                                <FormDescription>
                                  Energy Efficiency Ratio 2 (steady-state efficiency)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Installation Details */}
                    <AccordionItem value="installation">
                      <AccordionTrigger className="text-left">
                        <div className="flex items-center gap-2">
                          <Wrench className="h-4 w-4" />
                          Installation Details
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Ductwork */}
                          <FormField
                            control={form.control}
                            name={`measurements.${index}.ductwork_linear_feet`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Ductwork (Linear Feet)</FormLabel>
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

                          {/* Supply Vents */}
                          <FormField
                            control={form.control}
                            name={`measurements.${index}.supply_vents`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Supply Vents</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="number"
                                    min="0"
                                    placeholder="e.g., 8"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Return Vents */}
                          <FormField
                            control={form.control}
                            name={`measurements.${index}.return_vents`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Return Vents</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="number"
                                    min="0"
                                    placeholder="e.g., 3"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

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
                                      <Badge className="bg-green-100 text-green-800">Standard</Badge>
                                      <span className="text-sm">Normal access, standard installation</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="moderate">
                                    <div className="flex items-center gap-2">
                                      <Badge className="bg-yellow-100 text-yellow-800">Moderate</Badge>
                                      <span className="text-sm">Some access challenges</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="complex">
                                    <div className="flex items-center gap-2">
                                      <Badge className="bg-red-100 text-red-800">Complex</Badge>
                                      <span className="text-sm">Difficult access, custom work required</span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Installation Location */}
                        <FormField
                          control={form.control}
                          name={`measurements.${index}.installation_location`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Installation Location (Optional)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g., Basement, Attic, Garage" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </AccordionContent>
                    </AccordionItem>

                    {/* Additional Services */}
                    <AccordionItem value="services">
                      <AccordionTrigger className="text-left">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          Additional Services
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
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
                                    <FormDescription>
                                      Disconnect and remove old HVAC equipment
                                    </FormDescription>
                                  </div>
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`measurements.${index}.electrical_upgrade_required`}
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
                                      Electrical Upgrade Required
                                    </FormLabel>
                                    <FormDescription>
                                      Panel upgrade or new circuit installation
                                    </FormDescription>
                                  </div>
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="space-y-4">
                            <FormField
                              control={form.control}
                              name={`measurements.${index}.permit_required`}
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel>Building Permit Required</FormLabel>
                                    <FormDescription>
                                      Municipality permit and inspection fees
                                    </FormDescription>
                                  </div>
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`measurements.${index}.startup_testing_required`}
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel>Startup & Testing</FormLabel>
                                    <FormDescription>
                                      System commissioning and performance testing
                                    </FormDescription>
                                  </div>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Manager Price Override */}
                    {isManager && (
                      <AccordionItem value="pricing">
                        <AccordionTrigger className="text-left">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Manager Price Override
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`measurements.${index}.price_override`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Override Price ($)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      placeholder="e.g., 12500.00"
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Leave empty to use calculated pricing
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`measurements.${index}.override_reason`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Override Reason</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Reason for price adjustment" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Notes & Special Requirements */}
                    <AccordionItem value="notes">
                      <AccordionTrigger className="text-left">
                        <div className="flex items-center gap-2">
                          <span>📝</span>
                          Notes & Special Requirements
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name={`measurements.${index}.special_requirements`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Special Requirements</FormLabel>
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  placeholder="Special installation requirements, access restrictions, etc."
                                  rows={2}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`measurements.${index}.notes`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Additional Notes</FormLabel>
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  placeholder="Additional notes about this HVAC system..."
                                  rows={3}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            )
          })}
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
                Save HVAC Systems
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}