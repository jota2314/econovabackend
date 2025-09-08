"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import React from "react"
import { Lead } from "@/lib/types/database"
import { toast } from "sonner"
import { Loader2, Briefcase, User, Home, FileText, Wind, Thermometer, Hammer, Building, MapPin } from "lucide-react"

const jobSchema = z.object({
  job_name: z.string().min(1, "Job name is required"),
  lead_id: z.string().min(1, "Lead selection is required"),
  service_type: z.enum(["insulation", "hvac", "plaster"]),
  building_type: z.enum(["residential", "commercial"]),
  measurement_type: z.enum(["field", "drawings"]),
  // Project address fields (required)
  project_address: z.string().min(1, "Project address is required"),
  project_city: z.string().min(1, "City is required"),
  project_state: z.string().min(1, "State is required"),
  project_zip_code: z.string().min(5, "ZIP code is required").max(10, "ZIP code too long"),
  // Project type fields (required)
  construction_type: z.enum(["new", "remodel"]),
  // Service-specific optional fields
  // HVAC fields
  system_type: z.enum(["central_air", "heat_pump", "furnace"]).optional(),
  install_type: z.enum(["new_install", "replacement"]).optional(),
  tonnage_estimate: z.string().optional(),
  // Plaster fields
  plaster_job_type: z.enum(["repair", "new", "skim_coat"]).optional(),
  number_of_rooms: z.string().optional(),
  approximate_sqft: z.string().optional(),
  scope_of_work: z.string().optional(),
})

type JobFormData = z.infer<typeof jobSchema>

interface JobCreationFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leads: Lead[]
  selectedLead?: Lead | null
  onJobCreated: (jobId: string) => void
}

export function JobCreationForm({ 
  open, 
  onOpenChange, 
  leads, 
  selectedLead, 
  onJobCreated 
}: JobCreationFormProps) {
  const [isCreating, setIsCreating] = useState(false)

  const form = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      job_name: selectedLead ? `${selectedLead.name} - Service Project` : "",
      lead_id: selectedLead?.id || "",
      service_type: "insulation",
      building_type: "residential",
      measurement_type: "field",
      project_address: "",
      project_city: "",
      project_state: "MA",
      project_zip_code: "",
      construction_type: "new",
      system_type: "central_air",
      install_type: "new_install",
      tonnage_estimate: "",
      plaster_job_type: "repair",
      number_of_rooms: "",
      approximate_sqft: "",
      scope_of_work: ""
    }
  })

  const onSubmit = async (data: JobFormData) => {
    try {
      setIsCreating(true)
      console.log('Creating job:', data)

      // Prepare job data with service-specific fields
      const jobData = {
        ...data,
        job_complexity: 'standard', // Default complexity
        // Clean up optional fields based on service type
        ...(data.service_type === 'hvac' && {
          system_type: data.system_type,
          install_type: data.install_type,
          tonnage_estimate: data.tonnage_estimate,
        }),
        ...(data.service_type === 'plaster' && {
          plaster_job_type: data.plaster_job_type,
          number_of_rooms: data.number_of_rooms,
          approximate_sqft: data.approximate_sqft,
        }),
      }

      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const responseText = await response.text()
      console.log('💾 Raw job creation response:', responseText)
      
      if (!responseText) {
        throw new Error('Empty response from server')
      }

      const result = JSON.parse(responseText)

      if (result.success) {
        const jobId = result.data.id
        const serviceType = data.service_type
        
        toast.success(`${serviceType.charAt(0).toUpperCase() + serviceType.slice(1)} job "${data.job_name}" created successfully!`)
        form.reset()
        onOpenChange(false)
        
        // Service-specific routing
        if (window.location.pathname.includes('/jobs')) {
          // If we're on the jobs page, call the onJobCreated callback
          onJobCreated(jobId)
        } else {
          // Otherwise, redirect to service-specific measurement page
          const serviceRoutes = {
            insulation: `/jobs/${jobId}/measurements/insulation`,
            hvac: `/jobs/${jobId}/measurements/hvac`,
            plaster: `/jobs/${jobId}/measurements/plaster`
          }
          
          const targetRoute = serviceRoutes[serviceType as keyof typeof serviceRoutes]
          if (targetRoute) {
            window.location.href = targetRoute
          } else {
            onJobCreated(jobId)
          }
        }
      } else {
        console.error('Job creation failed:', result)
        toast.error(`Failed to create job: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error creating job:', error)
      toast.error(`Failed to create job: ${error instanceof Error ? error.message : 'Network error'}`)
    } finally {
      setIsCreating(false)
    }
  }

  const selectedLeadData = leads.find(lead => lead.id === form.watch('lead_id'))
  const serviceType = form.watch('service_type')
  const buildingType = form.watch('building_type')

  // Dynamic job name based on service type
  const updateJobName = (leadName: string, service: string) => {
    const serviceNames = {
      insulation: 'Spray Foam Project',
      hvac: 'HVAC Project',
      plaster: 'Plaster Project'
    }
    return `${leadName} - ${serviceNames[service as keyof typeof serviceNames]}`
  }

  // Watch for lead and service type changes to update job name
  React.useEffect(() => {
    if (selectedLeadData && serviceType) {
      const newJobName = updateJobName(selectedLeadData.name, serviceType)
      if (form.getValues('job_name') !== newJobName) {
        form.setValue('job_name', newJobName)
      }
    }
  }, [selectedLeadData, serviceType, form])

  // Debug leads data
  React.useEffect(() => {
    console.log('🔍 JobCreationForm - Leads data:', {
      leadsLength: leads.length,
      leads: leads.slice(0, 3), // Show first 3 leads for debugging
      hasLeads: leads.length > 0
    })
  }, [leads])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Create New Measurement Job
          </DialogTitle>
          <DialogDescription>
            Create a new job for insulation, HVAC, or plaster services with field measurements and planning.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Lead Selection */}
            <FormField
              control={form.control}
              name="lead_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Customer
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          leads.length === 0 
                            ? "Loading customers..." 
                            : "Select a lead/customer"
                        } />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {leads.length === 0 ? (
                        <SelectItem value="" disabled>
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Loading customers...</span>
                          </div>
                        </SelectItem>
                      ) : (
                        leads.map((lead) => (
                          <SelectItem key={lead.id} value={lead.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{lead.name}</span>
                              <span className="text-sm text-muted-foreground">
                                {lead.phone} • {lead.address}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Customer Info Display */}
            {selectedLeadData && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Customer Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div><strong>Name:</strong> {selectedLeadData.name}</div>
                  <div><strong>Phone:</strong> {selectedLeadData.phone}</div>
                  <div><strong>Email:</strong> {selectedLeadData.email || 'N/A'}</div>
                  <div><strong>Status:</strong> {selectedLeadData.status}</div>
                  {selectedLeadData.address && (
                    <div className="md:col-span-2">
                      <strong>Address:</strong> {selectedLeadData.address}
                      {selectedLeadData.city && selectedLeadData.state && 
                        `, ${selectedLeadData.city}, ${selectedLeadData.state}`
                      }
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Project Address Section */}
            <div className="space-y-4 border-l-4 border-orange-500 pl-4">
              <h3 className="font-semibold text-orange-900 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Project Address
              </h3>
              
              {/* Street Address */}
              <FormField
                control={form.control}
                name="project_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address *</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main Street" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* City, State, ZIP Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="project_city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City *</FormLabel>
                      <FormControl>
                        <Input placeholder="Boston" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="project_state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MA">Massachusetts</SelectItem>
                          <SelectItem value="NH">New Hampshire</SelectItem>
                          <SelectItem value="CT">Connecticut</SelectItem>
                          <SelectItem value="RI">Rhode Island</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="project_zip_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code *</FormLabel>
                      <FormControl>
                        <Input placeholder="02101" maxLength={10} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Service Type */}
            <FormField
              control={form.control}
              name="service_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Service Type *
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select service type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="insulation">
                        <div className="flex items-center gap-2">
                          <Wind className="h-4 w-4 text-blue-600" />
                          <span>Insulation</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="hvac">
                        <div className="flex items-center gap-2">
                          <Thermometer className="h-4 w-4 text-green-600" />
                          <span>HVAC</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="plaster">
                        <div className="flex items-center gap-2">
                          <Hammer className="h-4 w-4 text-yellow-600" />
                          <span>Plaster</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Building Type */}
            <FormField
              control={form.control}
              name="building_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Building Type *
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select building type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="residential">Residential</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Job Name */}
            <FormField
              control={form.control}
              name="job_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Job Name
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Enter job name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Measurement Type */}
            <FormField
              control={form.control}
              name="measurement_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Measurement Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="field">Field Measurement</SelectItem>
                      <SelectItem value="drawings">From Drawings</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Project Type Section - For all building types */}
            {buildingType === 'residential' && (
              <FormField
                control={form.control}
                name="construction_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Construction Type *
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select construction type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="new">New Construction</SelectItem>
                        <SelectItem value="remodel">Remodeling</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Service-Specific Fields */}

            {serviceType === 'hvac' && (
              <div className="space-y-4 border-l-4 border-green-500 pl-4">
                <h3 className="font-semibold text-green-900 flex items-center gap-2">
                  <Thermometer className="h-4 w-4" />
                  HVAC Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="system_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>System Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
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

                  <FormField
                    control={form.control}
                    name="install_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Installation Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="new_install">New Installation</SelectItem>
                            <SelectItem value="replacement">Replacement</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="tonnage_estimate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tonnage Estimate</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 3 ton, 4 ton" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {serviceType === 'plaster' && (
              <div className="space-y-4 border-l-4 border-yellow-500 pl-4">
                <h3 className="font-semibold text-yellow-900 flex items-center gap-2">
                  <Hammer className="h-4 w-4" />
                  Plaster Details
                </h3>
                
                <FormField
                  control={form.control}
                  name="plaster_job_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="repair">Repair</SelectItem>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="skim_coat">Skim Coat</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="number_of_rooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Rooms</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 3" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="approximate_sqft"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Approximate Square Footage</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 1200" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Scope of Work */}
            <FormField
              control={form.control}
              name="scope_of_work"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Scope of Work (Optional)
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={`Enter details about the ${serviceType} work to be performed...`}
                      className="min-h-[80px] resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create {serviceType ? serviceType.charAt(0).toUpperCase() + serviceType.slice(1) : ''} Job & Start Measuring
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}