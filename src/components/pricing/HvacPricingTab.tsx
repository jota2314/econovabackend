'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  DollarSign, 
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Filter
} from 'lucide-react'
import { toast } from 'sonner'
import { type HvacSystemCatalog, type HvacCatalogFormData, HVAC_SYSTEM_TYPES } from '@/types/hvac-simple'

interface HvacPricingTabProps {
  refreshTrigger?: number
}

export function HvacPricingTab({ refreshTrigger }: HvacPricingTabProps) {
  const [systems, setSystems] = useState<HvacSystemCatalog[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [manufacturerFilter, setManufacturerFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  
  // Form state for adding/editing
  const [formData, setFormData] = useState<HvacCatalogFormData>({
    system_name: '',
    system_type: '',
    manufacturer: '',
    condenser_model: '',
    tonnage: 0,
    seer2: 0,
    hspf2: 0,
    eer2: 0,
    head_unit_model: '',
    ahri_certified_ref: '',
    base_price: 0,
    system_description: '',
    is_active: true
  })

  // Fetch HVAC catalog systems
  const fetchSystems = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/hvac-catalog')
      const result = await response.json()

      if (result.success) {
        setSystems(result.data.systems)
      } else {
        throw new Error(result.error || 'Failed to fetch HVAC systems')
      }
    } catch (error) {
      console.error('Error fetching HVAC systems:', error)
      toast.error('Failed to load HVAC systems')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSystems()
  }, [refreshTrigger])

  // Create new system
  const handleCreateSystem = async () => {
    try {
      if (!formData.system_name || !formData.system_type || formData.base_price < 0) {
        toast.error('Please fill in required fields')
        return
      }

      const response = await fetch('/api/hvac-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (result.success) {
        toast.success('HVAC system created successfully')
        setSystems([...systems, result.data.system])
        resetForm()
        setShowAddDialog(false)
      } else {
        toast.error(result.error || 'Failed to create HVAC system')
      }
    } catch (error) {
      console.error('Error creating HVAC system:', error)
      toast.error('Failed to create HVAC system')
    }
  }

  // Update system
  const handleUpdateSystem = async (system: HvacSystemCatalog) => {
    try {
      const response = await fetch(`/api/hvac-catalog/${system.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(system)
      })

      const result = await response.json()

      if (result.success) {
        toast.success('HVAC system updated successfully')
        setSystems(systems.map(s => s.id === system.id ? result.data.system : s))
        setEditingId(null)
      } else {
        toast.error(result.error || 'Failed to update HVAC system')
      }
    } catch (error) {
      console.error('Error updating HVAC system:', error)
      toast.error('Failed to update HVAC system')
    }
  }

  // Delete system
  const handleDeleteSystem = async (id: string) => {
    try {
      if (!confirm('Are you sure you want to delete this HVAC system?')) {
        return
      }

      const response = await fetch(`/api/hvac-catalog/${id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        toast.success('HVAC system deleted successfully')
        setSystems(systems.filter(s => s.id !== id))
      } else {
        toast.error(result.error || 'Failed to delete HVAC system')
      }
    } catch (error) {
      console.error('Error deleting HVAC system:', error)
      toast.error('Failed to delete HVAC system')
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      system_name: '',
      system_type: '',
      manufacturer: '',
      condenser_model: '',
      tonnage: 0,
      seer2: 0,
      hspf2: 0,
      eer2: 0,
      head_unit_model: '',
      ahri_certified_ref: '',
      base_price: 0,
      system_description: '',
      is_active: true
    })
  }

  // Get filtered systems
  const filteredSystems = systems.filter(system => {
    const matchesSearch = searchTerm === '' || 
      system.system_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (system.manufacturer && system.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesManufacturer = manufacturerFilter === 'all' || 
      system.manufacturer === manufacturerFilter

    const matchesType = typeFilter === 'all' || 
      system.system_type === typeFilter

    return matchesSearch && matchesManufacturer && matchesType && system.is_active
  })

  // Get unique manufacturers and types for filters
  const manufacturers = Array.from(new Set(systems.map(s => s.manufacturer).filter(Boolean)))
  const systemTypes = Array.from(new Set(systems.map(s => s.system_type)))

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return <div className="text-center py-8">Loading HVAC systems...</div>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              HVAC Systems Catalog
            </CardTitle>
            <CardDescription>
              Manage your HVAC systems catalog for quick selection in jobs
            </CardDescription>
          </div>
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add HVAC System
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New HVAC System</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>System Name *</Label>
                    <Input
                      value={formData.system_name}
                      onChange={(e) => setFormData({ ...formData, system_name: e.target.value })}
                      placeholder="e.g., Carrier 3-Ton 16 SEER Heat Pump"
                    />
                  </div>
                  <div>
                    <Label>System Type *</Label>
                    <Select
                      value={formData.system_type}
                      onValueChange={(value) => setFormData({ ...formData, system_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select system type" />
                      </SelectTrigger>
                      <SelectContent>
                        {HVAC_SYSTEM_TYPES.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Manufacturer</Label>
                    <Input
                      value={formData.manufacturer || ''}
                      onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                      placeholder="e.g., Carrier, Trane, Lennox"
                    />
                  </div>
                  <div>
                    <Label>Condenser Model</Label>
                    <Input
                      value={formData.condenser_model || ''}
                      onChange={(e) => setFormData({ ...formData, condenser_model: e.target.value })}
                      placeholder="Model number"
                    />
                  </div>

                  <div>
                    <Label>Tonnage</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.tonnage || ''}
                      onChange={(e) => setFormData({ ...formData, tonnage: parseFloat(e.target.value) || 0 })}
                      placeholder="2.5"
                    />
                  </div>
                  <div>
                    <Label>AHRI Certified Ref #</Label>
                    <Input
                      value={formData.ahri_certified_ref || ''}
                      onChange={(e) => setFormData({ ...formData, ahri_certified_ref: e.target.value })}
                      placeholder="Certification reference"
                    />
                  </div>

                  <div>
                    <Label>SEER2 Rating</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.seer2 || ''}
                      onChange={(e) => setFormData({ ...formData, seer2: parseFloat(e.target.value) || 0 })}
                      placeholder="16.0"
                    />
                  </div>
                  <div>
                    <Label>HSPF2 Rating</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.hspf2 || ''}
                      onChange={(e) => setFormData({ ...formData, hspf2: parseFloat(e.target.value) || 0 })}
                      placeholder="9.0"
                    />
                  </div>

                  <div>
                    <Label>EER2 Rating</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.eer2 || ''}
                      onChange={(e) => setFormData({ ...formData, eer2: parseFloat(e.target.value) || 0 })}
                      placeholder="12.0"
                    />
                  </div>
                  <div>
                    <Label>Head Unit Model</Label>
                    <Input
                      value={formData.head_unit_model || ''}
                      onChange={(e) => setFormData({ ...formData, head_unit_model: e.target.value })}
                      placeholder="Indoor unit model"
                    />
                  </div>

                  <div>
                    <Label>Base Price *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.base_price || ''}
                      onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) || 0 })}
                      placeholder="5000.00"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleCreateSystem}>Add System</Button>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex-1 min-w-64">
            <Input
              placeholder="Search systems..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select value={manufacturerFilter} onValueChange={setManufacturerFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Manufacturers</SelectItem>
              {manufacturers.map(mfg => (
                <SelectItem key={mfg} value={mfg}>{mfg}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {systemTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Badge variant="outline" className="ml-auto">
            {filteredSystems.length} systems
          </Badge>
        </div>

        {/* HVAC Systems Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>System Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Manufacturer</TableHead>
              <TableHead>Tonnage</TableHead>
              <TableHead>SEER2</TableHead>
              <TableHead>Base Price</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSystems.map((system) => (
              <TableRow key={system.id}>
                <TableCell>
                  {editingId === system.id ? (
                    <Input
                      value={system.system_name}
                      onChange={(e) => {
                        setSystems(systems.map(s => 
                          s.id === system.id ? { ...s, system_name: e.target.value } : s
                        ))
                      }}
                      className="min-w-48"
                    />
                  ) : (
                    <div>
                      <div className="font-medium">{system.system_name}</div>
                      {system.condenser_model && (
                        <div className="text-sm text-muted-foreground">
                          Model: {system.condenser_model}
                        </div>
                      )}
                    </div>
                  )}
                </TableCell>

                <TableCell>
                  {editingId === system.id ? (
                    <Select
                      value={system.system_type}
                      onValueChange={(value) => {
                        setSystems(systems.map(s => 
                          s.id === system.id ? { ...s, system_type: value } : s
                        ))
                      }}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HVAC_SYSTEM_TYPES.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary">{system.system_type}</Badge>
                  )}
                </TableCell>

                <TableCell>
                  {editingId === system.id ? (
                    <Input
                      value={system.manufacturer || ''}
                      onChange={(e) => {
                        setSystems(systems.map(s => 
                          s.id === system.id ? { ...s, manufacturer: e.target.value } : s
                        ))
                      }}
                      className="w-32"
                    />
                  ) : (
                    system.manufacturer || 'N/A'
                  )}
                </TableCell>

                <TableCell>
                  {editingId === system.id ? (
                    <Input
                      type="number"
                      step="0.1"
                      value={system.tonnage || ''}
                      onChange={(e) => {
                        setSystems(systems.map(s => 
                          s.id === system.id ? { ...s, tonnage: parseFloat(e.target.value) || 0 } : s
                        ))
                      }}
                      className="w-20"
                    />
                  ) : (
                    system.tonnage ? `${system.tonnage} tons` : 'N/A'
                  )}
                </TableCell>

                <TableCell>
                  {editingId === system.id ? (
                    <Input
                      type="number"
                      step="0.1"
                      value={system.seer2 || ''}
                      onChange={(e) => {
                        setSystems(systems.map(s => 
                          s.id === system.id ? { ...s, seer2: parseFloat(e.target.value) || 0 } : s
                        ))
                      }}
                      className="w-20"
                    />
                  ) : (
                    system.seer2 || 'N/A'
                  )}
                </TableCell>

                <TableCell>
                  {editingId === system.id ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={system.base_price}
                      onChange={(e) => {
                        setSystems(systems.map(s => 
                          s.id === system.id ? { ...s, base_price: parseFloat(e.target.value) || 0 } : s
                        ))
                      }}
                      className="w-28"
                    />
                  ) : (
                    <span className="font-medium">{formatCurrency(system.base_price)}</span>
                  )}
                </TableCell>

                <TableCell>
                  <div className="flex gap-1">
                    {editingId === system.id ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateSystem(system)}
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingId(system.id)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteSystem(system.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            
            {filteredSystems.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  {searchTerm || manufacturerFilter !== 'all' || typeFilter !== 'all'
                    ? 'No HVAC systems match your filters.'
                    : 'No HVAC systems found. Add one to get started.'
                  }
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}