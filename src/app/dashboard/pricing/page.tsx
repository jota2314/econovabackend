"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { 
  DollarSign, 
  Plus,
  Pencil,
  Trash2,
  Save,
  AlertTriangle,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'

interface PricingCatalogItem {
  id: string
  service_type: 'insulation' | 'hvac' | 'plaster'
  description?: string
  item_name: string
  unit: string
  base_price: number
  markup_percentage: number
  notes?: string
  created_at: string
  updated_at: string
}

export default function PricingPage() {
  const [pricingItems, setPricingItems] = useState<PricingCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [selectedProductType, setSelectedProductType] = useState<string>('all')
  const [newItem, setNewItem] = useState<Partial<PricingCatalogItem>>({
    service_type: 'insulation',
    item_name: '',
    unit: 'sq ft',
    base_price: 0,
    markup_percentage: 0,
    notes: ''
  })
  const [showAddForm, setShowAddForm] = useState(false)

  // Fetch pricing data
  const fetchPricingData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/pricing-catalog')
      const result = await response.json()

      if (result.success) {
        setPricingItems(result.data)
      } else {
        throw new Error(result.error || 'Failed to fetch pricing data')
      }
    } catch (error) {
      console.error('Error fetching pricing data:', error)
      toast.error('Failed to load pricing data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPricingData()
  }, [])

  // Create new pricing item
  const handleCreateItem = async () => {
    try {
      if (!newItem.item_name || !newItem.base_price) {
        toast.error('Please fill in required fields')
        return
      }

      const response = await fetch('/api/pricing-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Pricing item created successfully')
        setPricingItems([...pricingItems, result.data])
        setNewItem({
          service_type: 'insulation',
          item_name: '',
          unit: 'sq ft',
          base_price: 0,
          markup_percentage: 0,
          notes: ''
        })
        setShowAddForm(false)
      } else {
        throw new Error(result.error || 'Failed to create pricing item')
      }
    } catch (error) {
      console.error('Error creating pricing item:', error)
      toast.error('Failed to create pricing item')
    }
  }

  // Update pricing item
  const handleUpdateItem = async (item: PricingCatalogItem) => {
    try {
      const response = await fetch('/api/pricing-catalog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Pricing item updated successfully')
        setPricingItems(pricingItems.map(i => i.id === item.id ? result.data : i))
        setEditingItem(null)
      } else {
        throw new Error(result.error || 'Failed to update pricing item')
      }
    } catch (error) {
      console.error('Error updating pricing item:', error)
      toast.error('Failed to update pricing item')
    }
  }

  // Delete pricing item
  const handleDeleteItem = async (id: string) => {
    try {
      if (!confirm('Are you sure you want to delete this pricing item?')) {
        return
      }

      const response = await fetch(`/api/pricing-catalog?id=${id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Pricing item deleted successfully')
        setPricingItems(pricingItems.filter(i => i.id !== id))
      } else {
        throw new Error(result.error || 'Failed to delete pricing item')
      }
    } catch (error) {
      console.error('Error deleting pricing item:', error)
      toast.error('Failed to delete pricing item')
    }
  }

  // Filter items by service type
  const getItemsByService = (serviceType: string) => {
    return pricingItems.filter(item => item.service_type === serviceType)
  }

  // Filter items by product type (description)
  const getFilteredItems = (serviceType: string) => {
    const serviceItems = getItemsByService(serviceType)
    
    if (selectedProductType === 'all') {
      return serviceItems
    }
    
    return serviceItems.filter(item => {
      const description = item.description?.toLowerCase() || ''
      const filterType = selectedProductType.toLowerCase()
      
      switch (filterType) {
        case 'closed-cell':
          return description.includes('closed cell')
        case 'open-cell':
          return description.includes('open cell')
        case 'fiberglass-batt':
          return description.includes('fiberglass batt')
        case 'fiberglass-faced':
          return description.includes('fiberglass faced')
        default:
          return true
      }
    })
  }

  // Get unique product types for filter dropdown
  const getProductTypes = () => {
    const types = new Set<string>()
    pricingItems.forEach(item => {
      if (item.description) {
        const desc = item.description.toLowerCase()
        if (desc.includes('closed cell')) types.add('closed-cell')
        if (desc.includes('open cell')) types.add('open-cell')
        if (desc.includes('fiberglass batt')) types.add('fiberglass-batt')
        if (desc.includes('fiberglass faced')) types.add('fiberglass-faced')
      }
    })
    return Array.from(types)
  }

  // Calculate final price with markup
  const getFinalPrice = (basePrice: number, markupPercentage: number) => {
    return basePrice * (1 + markupPercentage / 100)
  }

  // Helper functions to parse pricing data for display format
  const parseThickness = (itemName: string) => {
    // Extract just the thickness from item names like '1" (R-7)' or '6.5–7" (R-49)'
    const match = itemName.match(/^([^(]+)/)
    return match ? match[1].trim() : '-'
  }

  const parseRValue = (itemName: string) => {
    // Extract R-value from item names like '1" (R-7)' or '2.5" (R-17/19)'
    const match = itemName.match(/\(R-([^)]+)\)/)
    return match ? `R-${match[1]}` : '-'
  }

  // Helper to get clean description (without thickness/R-value details)
  const getCleanDescription = (description: string) => {
    // Remove any thickness or R-value details from description
    return description?.replace(/\d+\.?\d*"?\s*\(R-[^)]+\)/g, '').trim() || '-'
  }

  const calculateCoverage = (notes: string) => {
    // Extract coverage from notes field (e.g., "4400sq coverage" or "~116 sqft per bag")
    if (!notes) return '-'
    
    // Look for patterns like "4400sq" or "116 sqft"
    const coverageMatch = notes.match(/(\d+)sq/)
    if (coverageMatch) {
      return `${coverageMatch[1]}sq`
    }
    
    // Look for patterns like "~116 sqft per bag"
    const bagMatch = notes.match(/~(\d+(?:\.\d+)?)\s*sqft per bag/)
    if (bagMatch) {
      return `${bagMatch[1]}sq/bag`
    }
    
    return notes.includes('varies') ? 'Varies' : '-'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <DollarSign className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Pricing Management</h1>
          <RefreshCw className="h-4 w-4 animate-spin" />
        </div>
        <p className="text-muted-foreground">Loading pricing data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-8 w-8" />
            Pricing Management
          </h1>
          <p className="text-muted-foreground">
            Manage pricing for all services. Changes affect new estimates only.
          </p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Pricing Item
        </Button>
      </div>

      {/* Add New Item Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Pricing Item</CardTitle>
            <CardDescription>Create a new pricing entry for your catalog</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="service_type">Service Type</Label>
                <Select 
                  value={newItem.service_type} 
                  onValueChange={(value: 'insulation' | 'hvac' | 'plaster') => 
                    setNewItem({...newItem, service_type: value})
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="insulation">Insulation</SelectItem>
                    <SelectItem value="hvac">HVAC</SelectItem>
                    <SelectItem value="plaster">Plaster</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="item_name">Item Name</Label>
                <Input
                  id="item_name"
                  value={newItem.item_name || ''}
                  onChange={(e) => setNewItem({...newItem, item_name: e.target.value})}
                  placeholder="e.g., Closed Cell Spray Foam"
                />
              </div>
              <div>
                <Label htmlFor="unit">Unit</Label>
                <Select 
                  value={newItem.unit} 
                  onValueChange={(value) => setNewItem({...newItem, unit: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sq ft">sq ft</SelectItem>
                    <SelectItem value="linear ft">linear ft</SelectItem>
                    <SelectItem value="ton">ton</SelectItem>
                    <SelectItem value="unit">unit</SelectItem>
                    <SelectItem value="hour">hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="base_price">Base Price</Label>
                <Input
                  id="base_price"
                  type="number"
                  step="0.01"
                  value={newItem.base_price || ''}
                  onChange={(e) => setNewItem({...newItem, base_price: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="markup_percentage">Markup %</Label>
                <Input
                  id="markup_percentage"
                  type="number"
                  value={newItem.markup_percentage || ''}
                  onChange={(e) => setNewItem({...newItem, markup_percentage: parseFloat(e.target.value) || 0})}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={newItem.notes || ''}
                  onChange={(e) => setNewItem({...newItem, notes: e.target.value})}
                  placeholder="Optional notes"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateItem}>Create Item</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing Tables by Service Type */}
      <Tabs defaultValue="insulation" className="space-y-4">
        <TabsList>
          <TabsTrigger value="insulation">
            Insulation ({getItemsByService('insulation').length})
          </TabsTrigger>
          <TabsTrigger value="hvac">
            HVAC ({getItemsByService('hvac').length})
          </TabsTrigger>
          <TabsTrigger value="plaster">
            Plaster ({getItemsByService('plaster').length})
          </TabsTrigger>
        </TabsList>

        {(['insulation', 'hvac', 'plaster'] as const).map((serviceType) => (
          <TabsContent key={serviceType} value={serviceType}>
            <Card>
                      <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Products
          </CardTitle>
          <CardDescription>
            Manage pricing for all spray foam products
          </CardDescription>
        </CardHeader>
              <CardContent>
                {/* Product Type Filter */}
                <div className="flex items-center gap-4 mb-6">
                  <Label htmlFor="product-filter" className="text-sm font-medium">
                    Filter by Product Type:
                  </Label>
                  <Select 
                    value={selectedProductType} 
                    onValueChange={setSelectedProductType}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select product type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Products</SelectItem>
                      <SelectItem value="closed-cell">Closed Cell Spray Foam</SelectItem>
                      <SelectItem value="open-cell">Open Cell Spray Foam</SelectItem>
                      <SelectItem value="fiberglass-batt">Fiberglass Batt</SelectItem>
                      <SelectItem value="fiberglass-faced">Fiberglass Faced</SelectItem>
                    </SelectContent>
                  </Select>
                  <Badge variant="outline" className="ml-auto">
                    {getFilteredItems(serviceType).length} items
                  </Badge>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Inches</TableHead>
                      <TableHead>R-Value</TableHead>
                      <TableHead>Coverage</TableHead>
                      <TableHead>Price/Sq ft</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredItems(serviceType).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {editingItem === item.id ? (
                            <Input
                              value={item.description || ''}
                              onChange={(e) => {
                                const updated = pricingItems.map(i => 
                                  i.id === item.id ? {...i, description: e.target.value} : i
                                )
                                setPricingItems(updated)
                              }}
                              className="w-32"
                              placeholder="Product description"
                            />
                          ) : (
                            getCleanDescription(item.description || '')
                          )}
                        </TableCell>
                        <TableCell>
                          {editingItem === item.id ? (
                            <Input
                              value={parseThickness(item.item_name)}
                              onChange={(e) => {
                                const thickness = e.target.value
                                const baseName = item.item_name.replace(/\([^)]*\)/, `(${thickness})`)
                                const updated = pricingItems.map(i => 
                                  i.id === item.id ? {...i, item_name: baseName} : i
                                )
                                setPricingItems(updated)
                              }}
                              className="w-16"
                            />
                          ) : (
                            parseThickness(item.item_name)
                          )}
                        </TableCell>
                        <TableCell>
                          {editingItem === item.id ? (
                            <Input
                              value={parseRValue(item.item_name)}
                              onChange={(e) => {
                                const rValue = e.target.value
                                const thickness = parseThickness(item.item_name)
                                const newItemName = `${thickness} (R-${rValue})`
                                const updated = pricingItems.map(i => 
                                  i.id === item.id ? {...i, item_name: newItemName} : i
                                )
                                setPricingItems(updated)
                              }}
                              className="w-24"
                            />
                          ) : (
                            parseRValue(item.item_name)
                          )}
                        </TableCell>
                        <TableCell>
                          {calculateCoverage(item.notes || '')}
                        </TableCell>
                        <TableCell>
                          {editingItem === item.id ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={item.base_price}
                              onChange={(e) => {
                                const updated = pricingItems.map(i => 
                                  i.id === item.id ? {...i, base_price: parseFloat(e.target.value) || 0} : i
                                )
                                setPricingItems(updated)
                              }}
                              className="w-24"
                            />
                          ) : (
                            <strong>${getFinalPrice(item.base_price, item.markup_percentage).toFixed(2)}</strong>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {editingItem === item.id ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateItem(item)}
                                >
                                  <Save className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingItem(null)}
                                >
                                  ✕
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingItem(item.id)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteItem(item.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {getFilteredItems(serviceType).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          {selectedProductType === 'all' 
                            ? `No ${serviceType} pricing items found. Add one to get started.`
                            : `No ${selectedProductType.replace('-', ' ')} items found for ${serviceType}.`
                          }
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Important Notice */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-800">Pricing Update Impact</h3>
              <p className="text-sm text-orange-700">
                Changes to pricing will only affect new estimates created after the update. 
                Approved estimates cannot be modified and will retain their original pricing.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}