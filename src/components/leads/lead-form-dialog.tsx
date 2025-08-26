"use client"

import { useState, useEffect } from "react"
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Lead, TablesInsert } from "@/lib/types/database"
import { Loader2 } from "lucide-react"

const leadFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().min(10, "Phone number must be at least 10 digits").max(20),
  company: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.enum(['MA', 'NH']).optional(),
  lead_source: z.enum(['drive_by', 'permit', 'referral', 'website', 'csv_import', 'other']).optional(),
  status: z.enum(['new', 'contacted', 'measurement_scheduled', 'measured', 'quoted', 'proposal_sent', 'closed_won', 'closed_lost']).optional(),
  notes: z.string().optional(),
})

type LeadFormData = z.infer<typeof leadFormSchema>

interface LeadFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead?: Lead | null
  onSubmit: (data: TablesInsert<'leads'>) => Promise<void>
  loading?: boolean
}

const leadSources = [
  { value: "drive_by", label: "Drive-by" },
  { value: "permit", label: "Building Permit" },
  { value: "referral", label: "Referral" },
  { value: "website", label: "Website" },
  { value: "csv_import", label: "CSV Import" },
  { value: "other", label: "Other" }
]

const states = [
  { value: "MA", label: "Massachusetts" },
  { value: "NH", label: "New Hampshire" }
]

const statusOptions = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "measurement_scheduled", label: "Measurement Scheduled" },
  { value: "measured", label: "Measured" },
  { value: "quoted", label: "Quoted" },
  { value: "proposal_sent", label: "Proposal Sent" },
  { value: "closed_won", label: "Closed Won" },
  { value: "closed_lost", label: "Closed Lost" }
]

export function LeadFormDialog({ 
  open, 
  onOpenChange, 
  lead, 
  onSubmit, 
  loading = false 
}: LeadFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
      address: "",
      city: "",
      state: "MA",
      lead_source: "other",
      status: "new",
      notes: "",
    },
  })

  // Reset form when dialog opens/closes or lead changes
  useEffect(() => {
    if (open) {
      if (lead) {
        // Editing existing lead
        form.reset({
          name: lead.name,
          email: lead.email || "",
          phone: lead.phone,
          company: lead.company || "",
          address: lead.address || "",
          city: lead.city || "",
          state: lead.state || "MA",
          lead_source: lead.lead_source || "other",
          status: lead.status,
          notes: lead.notes || "",
        })
      } else {
        // Adding new lead
        form.reset({
          name: "",
          email: "",
          phone: "",
          company: "",
          address: "",
          city: "",
          state: "MA",
          lead_source: "other",
          status: "new",
          notes: "",
        })
      }
    }
  }, [open, lead, form])

  const handleSubmit = async (data: LeadFormData) => {
    setIsSubmitting(true)
    try {
      // Convert form data to database format
      const leadData: TablesInsert<'leads'> = {
        ...data,
        email: data.email || null,
        company: data.company || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        lead_source: data.lead_source || null,
        notes: data.notes || null,
      }

      await onSubmit(leadData)
      onOpenChange(false)
    } catch (error) {
      console.error('Error submitting lead:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    
    // Format as (XXX) XXX-XXXX
    if (digits.length >= 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
    }
    return value
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {lead ? "Edit Lead" : "Add New Lead"}
          </DialogTitle>
          <DialogDescription>
            {lead 
              ? "Update the lead information below." 
              : "Enter the details for the new lead."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="John Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company</FormLabel>
                  <FormControl>
                    <Input placeholder="ABC Corp" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="(555) 123-4567" 
                        {...field}
                        onChange={(e) => {
                          const formatted = formatPhoneNumber(e.target.value)
                          field.onChange(formatted)
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main Street" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="Boston" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {states.map((state) => (
                          <SelectItem key={state.value} value={state.value}>
                            {state.label}
                          </SelectItem>
                        ))}
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
                name="lead_source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead Source</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {leadSources.map((source) => (
                          <SelectItem key={source.value} value={source.value}>
                            {source.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes about this lead..."
                      className="min-h-[80px]"
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
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {lead ? "Update Lead" : "Add Lead"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}