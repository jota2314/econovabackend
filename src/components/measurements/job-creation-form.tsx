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
import { Lead } from "@/lib/types/database"
import { toast } from "sonner"
import { Loader2, Briefcase, User, Home, FileText } from "lucide-react"

const jobSchema = z.object({
  job_name: z.string().min(1, "Job name is required"),
  lead_id: z.string().min(1, "Lead selection is required"),
  measurement_type: z.enum(["field", "drawings"], {
    required_error: "Measurement type is required"
  }),
  structural_framing: z.enum(["2x4", "2x6", "2x8", "2x10", "2x12"], {
    required_error: "Structural framing is required"
  }),
  roof_rafters: z.enum(["2x4", "2x6", "2x8", "2x10", "2x12"], {
    required_error: "Roof rafters size is required"
  }),
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
      job_name: selectedLead ? `${selectedLead.name} - Spray Foam Project` : "",
      lead_id: selectedLead?.id || "",
      measurement_type: "field",
      structural_framing: "2x6",
      roof_rafters: "2x6",
      scope_of_work: ""
    }
  })

  const onSubmit = async (data: JobFormData) => {
    try {
      setIsCreating(true)
      console.log('Creating job:', data)

      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`Job "${data.job_name}" created successfully!`)
        form.reset()
        onOpenChange(false)
        onJobCreated(result.data.id)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Create New Measurement Job
          </DialogTitle>
          <DialogDescription>
            Create a new job for field measurements and spray foam installation planning.
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
                        <SelectValue placeholder="Select a lead/customer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {leads.map((lead) => (
                        <SelectItem key={lead.id} value={lead.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{lead.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {lead.phone} • {lead.address}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
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

            {/* Structural Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="structural_framing"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Structural Framing</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
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
                name="roof_rafters"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Roof Rafters</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
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
            </div>

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
                      placeholder="Enter details about the spray foam work to be performed..."
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
                Create Job & Start Measuring
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}