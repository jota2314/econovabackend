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


      // Fetch estimate details with photos from job using combined endpoint
      fetchEstimate: async (id: string) => {
        set({ loading: true, error: undefined })
        
        try {
          // Use new combined endpoint that fetches estimate + measurements in single call
          const response = await fetch(`/api/estimates/${id}/full`)
          
          if (!response.ok) {
            throw new Error('Failed to fetch estimate')
          }
          
          const responseData = await response.json()
          const estimateData = responseData.data
          
          // Data is already processed by the combined endpoint
          const estimate: EstimateDetails = {
            ...estimateData,
            // Items and photos are already processed by the API
            items: estimateData.items || [],
            photos: estimateData.photos || [],
            // Keep database values, don't override with calculations
            subtotal: estimateData.subtotal || 0,
            total_amount: estimateData.total_amount || 0
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
          const response = await fetch(`/api/estimates/${estimate.id}/items`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
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
          
          // Update local state instead of full re-fetch to prevent duplicate API calls
          // The server response could include updated totals if needed
          // get().fetchEstimate(estimate.id) // Removed to prevent duplicate calls
          
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
          const response = await fetch(`/api/estimates/${estimate.id}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
          
          if (!response.ok) {
            throw new Error('Failed to approve estimate')
          }
          
          toast.success('Estimate approved successfully')
          set({ 
            approving: false,
            estimate: estimate ? { ...estimate, status: 'approved' } : null
          })
          
          // Update local state instead of full re-fetch to prevent duplicate API calls
          // get().fetchEstimate(estimate.id) // Removed to prevent duplicate calls
          
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