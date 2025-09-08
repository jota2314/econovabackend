'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, Edit, Save, X, Calculator } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { HvacSystemSearch } from './HvacSystemSearch'
import { jobHvacSystemSchema, type JobHvacSystemFormData, type JobHvacSystem, type HvacSystemSearchResult, type JobHvacSummary } from '@/types/hvac-simple'

interface SimpleHvacJobFormProps {
  jobId: string
  existingSystems?: JobHvacSystem[]
  onSystemsChange?: (systems: JobHvacSystem[], summary: JobHvacSummary) => void
  className?: string
}

export function SimpleHvacJobForm({ 
  jobId, 
  existingSystems = [], 
  onSystemsChange,
  className 
}: SimpleHvacJobFormProps) {
  const [systems, setSystems] = useState<JobHvacSystem[]>(existingSystems)
  const [isAddingSystem, setIsAddingSystem] = useState(false)
  const [editingSystemId, setEditingSystemId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Form for adding/editing systems
  const form = useForm<JobHvacSystemFormData>({
    resolver: zodResolver(jobHvacSystemSchema),
    defaultValues: {
      system_number: getNextSystemNumber(),
      system_name: '',
      system_type: '',
      unit_price: 0,
      quantity: 1,
      ductwork_linear_feet: 0,
      ductwork_price_per_foot: 35 // Default ductwork price
    }
  })

  // Get next available system number
  function getNextSystemNumber() {
    if (systems.length === 0) return 1
    const maxNumber = Math.max(...systems.map(s => s.system_number))
    return maxNumber + 1
  }

  // Handle system selection from search
  const handleSystemSelect = (searchResult: HvacSystemSearchResult) => {
    form.reset({
      system_number: getNextSystemNumber(),
      system_name: searchResult.system_name,
      system_type: searchResult.system_type,
      ahri_certified_ref: searchResult.manufacturer || '',
      manufacturer: searchResult.manufacturer || '',
      condenser_model: searchResult.condenser_model || '',
      tonnage: searchResult.tonnage || 0,
      head_unit_model: '',
      labor_material_description: `Provide labor & material to install ${searchResult.system_name}`,
      unit_price: searchResult.base_price,
      quantity: 1,
      ductwork_linear_feet: 0,
      ductwork_price_per_foot: 35,
      catalog_system_id: searchResult.id
    })
  }

  // Handle adding new system
  const handleAddSystem = async (data: JobHvacSystemFormData) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/jobs/${jobId}/hvac-systems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()
      
      if (result.success) {
        setSystems(prev => [...prev, result.data.system])
        setIsAddingSystem(false)
        form.reset({
          system_number: getNextSystemNumber(),
          system_name: '',
          system_type: '',
          unit_price: 0,
          quantity: 1,
          ductwork_linear_feet: 0,
          ductwork_price_per_foot: 35
        })
        toast.success('HVAC system added successfully')
      } else {
        toast.error(result.error || 'Failed to add system')
      }
    } catch (error) {
      console.error('Error adding system:', error)
      toast.error('Failed to add system')
    } finally {
      setLoading(false)
    }
  }

  // Handle editing system
  const handleEditSystem = (system: JobHvacSystem) => {
    setEditingSystemId(system.id)
    form.reset({
      system_number: system.system_number,
      system_name: system.system_name,
      system_type: system.system_type,
      ahri_certified_ref: system.ahri_certified_ref || '',
      manufacturer: system.manufacturer || '',
      condenser_model: system.condenser_model || '',
      tonnage: system.tonnage || 0,
      seer2: system.seer2 || 0,
      hspf2: system.hspf2 || 0,
      eer2: system.eer2 || 0,
      head_unit_model: system.head_unit_model || '',
      labor_material_description: system.labor_material_description || '',
      unit_price: system.unit_price,
      quantity: system.quantity,
      ductwork_linear_feet: system.ductwork_linear_feet,
      ductwork_price_per_foot: system.ductwork_price_per_foot,
      catalog_system_id: system.catalog_system_id || undefined
    })
  }

  // Handle deleting system
  const handleDeleteSystem = async (systemId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/jobs/${jobId}/hvac-systems/${systemId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setSystems(prev => prev.filter(s => s.id !== systemId))
        toast.success('System deleted successfully')
      } else {
        toast.error('Failed to delete system')
      }
    } catch (error) {
      console.error('Error deleting system:', error)
      toast.error('Failed to delete system')
    } finally {
      setLoading(false)
    }
  }

  // Calculate summary when systems change
  useEffect(() => {
    const summary: JobHvacSummary = {
      total_systems: systems.length,
      total_amount: systems.reduce((sum, sys) => sum + sys.total_amount, 0),
      total_ductwork: systems.reduce((sum, sys) => sum + sys.ductwork_total, 0),
      systems_breakdown: systems.map(sys => ({
        system_number: sys.system_number,
        system_name: sys.system_name,
        unit_price: sys.unit_price,
        quantity: sys.quantity,
        total_amount: sys.total_amount,
        ductwork_total: sys.ductwork_total
      }))
    }
    
    onSystemsChange?.(systems, summary)
  }, [systems, onSystemsChange])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>HVAC Systems</CardTitle>
          {!isAddingSystem && (
            <Button 
              onClick={() => setIsAddingSystem(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add HVAC System
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {/* Existing Systems */}
          {systems.map((system, index) => (
            <Card key={system.id} className="mb-4">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">System {system.system_number}</Badge>
                    <span className="font-medium">{system.system_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditSystem(system)}
                      disabled={editingSystemId === system.id}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteSystem(system.id)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Type</Label>
                    <p>{system.system_type}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Manufacturer</Label>
                    <p>{system.manufacturer || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Tonnage</Label>
                    <p>{system.tonnage ? `${system.tonnage} tons` : 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Unit Price</Label>
                    <p>{formatCurrency(system.unit_price)}</p>
                  </div>
                </div>

                {system.ductwork_linear_feet > 0 && (
                  <div className="mt-3 p-3 bg-muted/50 rounded">
                    <Label className="text-muted-foreground text-sm">Ductwork</Label>
                    <p className="text-sm">
                      {system.ductwork_linear_feet} ft × {formatCurrency(system.ductwork_price_per_foot)}/ft = {formatCurrency(system.ductwork_total)}
                    </p>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Qty: {system.quantity} × {formatCurrency(system.unit_price)}
                    {system.ductwork_total > 0 && ` + ${formatCurrency(system.ductwork_total)} ductwork`}
                  </span>
                  <span className="font-medium">{formatCurrency(system.total_amount + system.ductwork_total)}</span>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add/Edit System Form */}
          {(isAddingSystem || editingSystemId) && (
            <Card className="border-dashed">
              <CardContent className="pt-4">
                <form onSubmit={form.handleSubmit(handleAddSystem)} className="space-y-4">
                  {/* System Search */}
                  {isAddingSystem && (
                    <div>
                      <Label>Search Existing Systems</Label>
                      <HvacSystemSearch
                        onSystemSelect={handleSystemSelect}
                        onCreateNew={() => {
                          // Just continue with manual entry
                        }}
                        placeholder="Start typing to search systems..."
                      />
                    </div>
                  )}

                  {/* System Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>System Name *</Label>
                      <Input {...form.register('system_name')} />
                      {form.formState.errors.system_name && (
                        <p className="text-sm text-destructive">{form.formState.errors.system_name.message}</p>
                      )}
                    </div>

                    <div>
                      <Label>System Type *</Label>
                      <Input {...form.register('system_type')} placeholder="e.g., Heat Pump System" />
                    </div>

                    <div>
                      <Label>AHRI Certified Ref #</Label>
                      <Input {...form.register('ahri_certified_ref')} />
                    </div>

                    <div>
                      <Label>Manufacturer</Label>
                      <Input {...form.register('manufacturer')} />
                    </div>

                    <div>
                      <Label>Condenser Model</Label>
                      <Input {...form.register('condenser_model')} />
                    </div>

                    <div>
                      <Label>Head Unit Model #</Label>
                      <Input {...form.register('head_unit_model')} />
                    </div>

                    <div>
                      <Label>Tonnage</Label>
                      <Input 
                        type="number" 
                        step="0.1" 
                        {...form.register('tonnage', { valueAsNumber: true })} 
                      />
                    </div>

                    <div>
                      <Label>SEER2</Label>
                      <Input 
                        type="number" 
                        step="0.1" 
                        {...form.register('seer2', { valueAsNumber: true })} 
                      />
                    </div>

                    <div>
                      <Label>HSPF2</Label>
                      <Input 
                        type="number" 
                        step="0.1" 
                        {...form.register('hspf2', { valueAsNumber: true })} 
                      />
                    </div>

                    <div>
                      <Label>EER2</Label>
                      <Input 
                        type="number" 
                        step="0.1" 
                        {...form.register('eer2', { valueAsNumber: true })} 
                      />
                    </div>
                  </div>

                  {/* Pricing Section */}
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Unit Price *</Label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        {...form.register('unit_price', { valueAsNumber: true })} 
                      />
                    </div>

                    <div>
                      <Label>Quantity *</Label>
                      <Input 
                        type="number" 
                        {...form.register('quantity', { valueAsNumber: true })} 
                      />
                    </div>

                    <div className="flex items-end">
                      <div className="w-full">
                        <Label>Total</Label>
                        <div className="h-10 px-3 py-2 border rounded-md bg-muted/50 flex items-center">
                          {formatCurrency((form.watch('unit_price') || 0) * (form.watch('quantity') || 1))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ductwork Section */}
                  <div>
                    <Label className="flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Ductwork Calculation
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                      <div>
                        <Label className="text-sm">Linear Feet</Label>
                        <Input 
                          type="number" 
                          {...form.register('ductwork_linear_feet', { valueAsNumber: true })} 
                        />
                      </div>

                      <div>
                        <Label className="text-sm">Price per Foot</Label>
                        <Input 
                          type="number" 
                          step="0.01" 
                          {...form.register('ductwork_price_per_foot', { valueAsNumber: true })} 
                        />
                      </div>

                      <div>
                        <Label className="text-sm">Ductwork Total</Label>
                        <div className="h-10 px-3 py-2 border rounded-md bg-muted/50 flex items-center">
                          {formatCurrency((form.watch('ductwork_linear_feet') || 0) * (form.watch('ductwork_price_per_foot') || 0))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Labor & Material Description */}
                  <div>
                    <Label>Provide labor & material to install:</Label>
                    <Textarea 
                      {...form.register('labor_material_description')}
                      placeholder="Describe the installation work included..."
                      rows={3}
                    />
                  </div>

                  {/* Form Actions */}
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={loading} className="gap-2">
                      <Save className="h-4 w-4" />
                      {editingSystemId ? 'Update System' : 'Add System'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setIsAddingSystem(false)
                        setEditingSystemId(null)
                        form.reset()
                      }}
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          {systems.length > 0 && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Job Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Systems:</span>
                  <p className="font-medium">{systems.length}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Systems Total:</span>
                  <p className="font-medium">{formatCurrency(systems.reduce((sum, sys) => sum + sys.total_amount, 0))}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Ductwork Total:</span>
                  <p className="font-medium">{formatCurrency(systems.reduce((sum, sys) => sum + sys.ductwork_total, 0))}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Grand Total:</span>
                  <p className="font-medium text-lg">{formatCurrency(systems.reduce((sum, sys) => sum + sys.total_amount + sys.ductwork_total, 0))}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}