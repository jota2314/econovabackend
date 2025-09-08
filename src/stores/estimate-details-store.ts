/**
 * Estimate Details Store
 * 
 * Manages individual estimate details including items, photos, and pricing
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { calculateHybridRValue, calculateHybridPricing } from '@/lib/utils/hybrid-calculator'

// Types
export interface EstimateItem {
  id: string
  room_name: string
  surface_type: string
  area_type: string
  height: number
  width: number
  square_feet: number
  insulation_type?: string
  r_value?: string
  unit_price: number
  total_cost: number
  override_price?: number
  notes?: string
  // Raw measurement data for calculation
  closed_cell_inches?: number
  open_cell_inches?: number
  is_hybrid_system?: boolean
}

export interface EstimatePhoto {
  id: string
  url: string
  alt?: string
  caption?: string
  measurement_id?: string
  room_name?: string
}

export interface EstimateDetails {
  id: string
  estimate_number: string
  status: 'draft' | 'pending_approval' | 'sent' | 'approved' | 'rejected'
  total_amount: number
  subtotal: number
  created_at: string
  updated_at: string
  jobs: {
    id: string
    job_name: string
    service_type: string
    building_type: string
    lead: {
      name: string
      email?: string
      phone?: string
    }
  }
  created_by_user?: {
    full_name: string
    email: string
  }
  approved_by_user?: {
    full_name: string
    email: string
  }
  items: EstimateItem[]
  photos: EstimatePhoto[]
}

interface EstimateDetailsStore {
  // State
  estimate: EstimateDetails | null
  loading: boolean
  saving: boolean
  approving: boolean
  error?: string
  
  // Field overrides for editing
  priceOverrides: Record<string, number>
  dimensionOverrides: Record<string, { height: number; width: number; square_feet: number }>
  editingPrices: boolean
  
  // Actions
  fetchEstimate: (id: string) => Promise<void>
  updatePriceOverrides: (overrides: Record<string, number>) => Promise<void>
  setPriceOverride: (itemId: string, price: number) => void
  setDimensionOverride: (itemId: string, height: number, width: number, square_feet: number) => void
  setEditingPrices: (editing: boolean) => void
  clearPriceOverrides: () => void
  clearAllOverrides: () => void
  approveEstimate: () => Promise<void>
  reset: () => void
  
  // Computed values
  getCalculatedTotals: () => { subtotal: number; total: number }
  hasUnsavedChanges: () => boolean
}

export const useEstimateDetailsStore = create<EstimateDetailsStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      estimate: null,
      loading: false,
      saving: false,
      approving: false,
      error: undefined,
      priceOverrides: {},
      dimensionOverrides: {},
      editingPrices: false,

      // Fetch estimate details with photos from job
      fetchEstimate: async (id: string) => {
        set({ loading: true, error: undefined })
        
        try {
          // Try to get session with longer timeout
          let headers: Record<string, string> = {};
          try {
            const supabase = createClient()
            const session = await Promise.race([
              supabase.auth.getSession(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Session timeout')), 10000))
            ]) as any;
            
            if (session?.data?.session?.access_token) {
              headers['Authorization'] = `Bearer ${session.data.session.access_token}`;
            }
          } catch (sessionError) {
            // Continue without auth header - the API route will handle authentication
            console.warn('Session error in fetchEstimate, continuing without auth header:', sessionError)
          }
          
          const estimateResponse = await fetch(`/api/estimates/${id}`, { headers })
          
          if (!estimateResponse.ok) {
            throw new Error('Failed to fetch estimate')
          }
          
          const estimateData = await estimateResponse.json()
          
          // Fetch measurements and photos for this estimate
          const jobId = estimateData.data.jobs.id
          const measurementsResponse = await fetch(`/api/jobs/${jobId}/measurements`, { headers })
          
          // Get measurements data exactly as stored - no recalculation
          let realItems: EstimateItem[] = []
          let realPhotos: EstimatePhoto[] = []
          
          if (measurementsResponse.ok) {
            const measurementsData = await measurementsResponse.json()
            if (measurementsData.data && measurementsData.data.length > 0) {
              // Calculate pricing using the same hybrid logic as the job view
              realItems = measurementsData.data
                .filter((measurement: any) => measurement.square_feet && measurement.square_feet > 0)
                .map((measurement: any) => {
                  let unitPrice = 0
                  let totalCost = 0
                  let rValue = measurement.r_value || ''

                  // Check for override price first (applies to all insulation types)
                  if (measurement.override_unit_price) {
                    unitPrice = measurement.override_unit_price
                    totalCost = unitPrice * (measurement.square_feet || 0)
                  } else {
                    // Calculate pricing based on insulation type and measurements
                    if (measurement.insulation_type === 'hybrid' && measurement.is_hybrid_system) {
                      // Use hybrid pricing calculation
                      const hybridCalc = calculateHybridRValue(
                        measurement.closed_cell_inches || 0,
                        measurement.open_cell_inches || 0
                      )
                      const hybridPricing = calculateHybridPricing(hybridCalc)
                      
                      unitPrice = hybridPricing.totalPricePerSqft
                      totalCost = unitPrice * (measurement.square_feet || 0)
                      rValue = `R-${hybridCalc.totalRValue}`
                    } else {
                      // Handle non-hybrid systems (single insulation type)
                      // Calculate based on insulation type and inches
                      const totalInches = (measurement.closed_cell_inches || 0) + (measurement.open_cell_inches || 0)
                      if (measurement.insulation_type === 'closed_cell') {
                        unitPrice = totalInches * 1.243 // $1.243 per inch from hybrid calculator
                      } else if (measurement.insulation_type === 'open_cell') {
                        unitPrice = totalInches * 0.471 // $0.471 per inch from hybrid calculator
                      }
                      totalCost = unitPrice * (measurement.square_feet || 0)
                    }
                  }

                  return {
                    id: measurement.id,
                    room_name: measurement.room_name,
                    surface_type: measurement.surface_type,
                    area_type: measurement.area_type || '',
                    height: measurement.height || 0,
                    width: measurement.width || 0,
                    square_feet: measurement.square_feet || 0,
                    insulation_type: measurement.insulation_type,
                    r_value: rValue,
                    unit_price: Math.round(unitPrice * 100) / 100, // Round to 2 decimals
                    total_cost: Math.round(totalCost * 100) / 100, // Round to 2 decimals
                    notes: measurement.notes,
                    // Pass through the raw data for reference
                    closed_cell_inches: measurement.closed_cell_inches,
                    open_cell_inches: measurement.open_cell_inches,
                    is_hybrid_system: measurement.is_hybrid_system
                  }
                })
              
              // Get photos from measurement photo_url field
              realPhotos = measurementsData.data
                .filter((measurement: any) => measurement.photo_url)
                .map((measurement: any, index: number) => ({
                  id: `photo-${measurement.id}`,
                  url: measurement.photo_url,
                  alt: `${measurement.room_name} photo`,
                  caption: `${measurement.room_name} - ${measurement.surface_type}`,
                  measurement_id: measurement.id,
                  room_name: measurement.room_name
                }))
            }
          }
          
          // Calculate totals from the actual items (which include override prices)
          // This ensures the displayed totals match the current measurements state
          const calculatedSubtotal = realItems.reduce((sum, item) => sum + item.total_cost, 0)
          const calculatedTotal = calculatedSubtotal // No markup for now
          
          const estimate: EstimateDetails = {
            ...estimateData.data,
            items: realItems,
            photos: realPhotos,
            subtotal: calculatedSubtotal,
            total_amount: calculatedTotal
          }
          
          set({ 
            estimate, 
            loading: false, 
            error: undefined,
            priceOverrides: {} // Reset overrides when fetching new estimate
          })
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load estimate'
          set({ 
            loading: false, 
            error: errorMessage 
          })
          toast.error('Failed to load estimate details')
        }
      },

      // Update price overrides on server
      updatePriceOverrides: async (overrides: Record<string, number>) => {
        const { estimate } = get()
        if (!estimate) return
        
        set({ saving: true })
        
        try {
          // Get auth header with longer timeout
          let headers: Record<string, string> = { 'Content-Type': 'application/json' };
          try {
            const supabase = createClient()
            const session = await Promise.race([
              supabase.auth.getSession(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Session timeout')), 10000))
            ]) as any;
            
            if (session?.data?.session?.access_token) {
              headers['Authorization'] = `Bearer ${session.data.session.access_token}`;
            }
          } catch (sessionError) {
            // Continue without auth header - the API route will handle authentication
            console.warn('Session error in updatePriceOverrides, continuing without auth header:', sessionError)
          }
          
          const response = await fetch(`/api/estimates/${estimate.id}/items`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ price_overrides: overrides })
          })
          
          if (!response.ok) {
            throw new Error('Failed to update prices')
          }
          
          toast.success('Prices updated successfully')
          set({ 
            saving: false, 
            editingPrices: false,
            priceOverrides: {} 
          })
          
          // Refresh the estimate to get updated data
          get().fetchEstimate(estimate.id)
          
        } catch (error) {
          set({ saving: false })
          toast.error('Failed to save price changes')
        }
      },

      // Set a single price override
      setPriceOverride: (itemId: string, price: number) => {
        set(state => ({
          priceOverrides: {
            ...state.priceOverrides,
            [itemId]: price
          }
        }))
      },

      // Set dimension overrides
      setDimensionOverride: (itemId: string, height: number, width: number, square_feet: number) => {
        set(state => ({
          dimensionOverrides: {
            ...state.dimensionOverrides,
            [itemId]: { height, width, square_feet }
          }
        }))
      },

      // Toggle editing mode
      setEditingPrices: (editing: boolean) => {
        set({ editingPrices: editing })
        if (!editing) {
          get().clearPriceOverrides()
        }
      },

      // Clear all price overrides
      clearPriceOverrides: () => {
        set({ priceOverrides: {} })
      },

      // Clear all overrides
      clearAllOverrides: () => {
        set({ priceOverrides: {}, dimensionOverrides: {} })
      },

      // Approve estimate
      approveEstimate: async () => {
        const { estimate } = get()
        if (!estimate) return
        
        set({ approving: true })
        
        try {
          // Get auth header with longer timeout
          let headers: Record<string, string> = { 'Content-Type': 'application/json' };
          try {
            const supabase = createClient()
            const session = await Promise.race([
              supabase.auth.getSession(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Session timeout')), 10000))
            ]) as any;
            
            if (session?.data?.session?.access_token) {
              headers['Authorization'] = `Bearer ${session.data.session.access_token}`;
            }
          } catch (sessionError) {
            // Continue without auth header - the API route will handle authentication
            console.warn('Session error in approveEstimate, continuing without auth header:', sessionError)
          }
          
          const response = await fetch(`/api/estimates/${estimate.id}/approve`, {
            method: 'POST',
            headers
          })
          
          if (!response.ok) {
            throw new Error('Failed to approve estimate')
          }
          
          toast.success('Estimate approved successfully')
          set({ approving: false })
          
          // Refresh the estimate to get updated data
          get().fetchEstimate(estimate.id)
          
        } catch (error) {
          set({ approving: false })
          toast.error('Failed to approve estimate')
        }
      },

      // Reset store state
      reset: () => {
        set({
          estimate: null,
          loading: false,
          saving: false,
          approving: false,
          error: undefined,
          priceOverrides: {},
          dimensionOverrides: {},
          editingPrices: false
        })
      },

      // Calculate totals with overrides
      getCalculatedTotals: () => {
        const { estimate, priceOverrides } = get()
        
        if (!estimate) {
          return { subtotal: 0, total: 0 }
        }
        
        const subtotal = estimate.items.reduce((sum, item) => {
          const price = priceOverrides[item.id] ?? item.total_cost
          return sum + price
        }, 0)
        
        const total = subtotal // No markup
        
        return { subtotal, total }
      },

      // Check if there are unsaved changes
      hasUnsavedChanges: () => {
        const { priceOverrides, dimensionOverrides } = get()
        
        // Check if there are any price overrides
        const hasPriceChanges = Object.keys(priceOverrides).length > 0
        
        // Check if there are any dimension overrides
        const hasDimensionChanges = Object.keys(dimensionOverrides).length > 0
        
        return hasPriceChanges || hasDimensionChanges
      }
    }),
    {
      name: 'estimate-details-store',
      enabled: process.env.NODE_ENV === 'development'
    }
  )
)

// Selectors for optimized re-renders
export const useEstimateDetails = () => useEstimateDetailsStore(state => state.estimate)
export const useEstimateLoading = () => useEstimateDetailsStore(state => state.loading)
export const useEstimateSaving = () => useEstimateDetailsStore(state => state.saving)
export const useEstimateApproving = () => useEstimateDetailsStore(state => state.approving)
export const useEstimateError = () => useEstimateDetailsStore(state => state.error)
export const useEstimatePriceOverrides = () => useEstimateDetailsStore(state => state.priceOverrides)
export const useEstimateDimensionOverrides = () => useEstimateDetailsStore(state => state.dimensionOverrides)
export const useEstimateEditingPrices = () => useEstimateDetailsStore(state => state.editingPrices)

// Action selectors - use individual selectors to prevent unnecessary re-renders
export const useFetchEstimate = () => useEstimateDetailsStore(state => state.fetchEstimate)
export const useUpdatePriceOverrides = () => useEstimateDetailsStore(state => state.updatePriceOverrides)
export const useSetPriceOverride = () => useEstimateDetailsStore(state => state.setPriceOverride)
export const useSetDimensionOverride = () => useEstimateDetailsStore(state => state.setDimensionOverride)
export const useSetEditingPrices = () => useEstimateDetailsStore(state => state.setEditingPrices)
export const useClearPriceOverrides = () => useEstimateDetailsStore(state => state.clearPriceOverrides)
export const useClearAllOverrides = () => useEstimateDetailsStore(state => state.clearAllOverrides)
export const useApproveEstimate = () => useEstimateDetailsStore(state => state.approveEstimate)
export const useResetEstimate = () => useEstimateDetailsStore(state => state.reset)
export const useGetCalculatedTotals = () => useEstimateDetailsStore(state => state.getCalculatedTotals)
export const useHasUnsavedChanges = () => useEstimateDetailsStore(state => state.hasUnsavedChanges)