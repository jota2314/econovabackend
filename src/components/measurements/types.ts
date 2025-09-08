/**
 * Shared types for measurement interfaces
 */

export type ServiceType = 'insulation' | 'hvac' | 'plaster'

export interface BaseMeasurement {
  id?: string
  job_id: string
  room_name: string
  created_at?: string
  updated_at?: string
}

export interface MeasurementPhoto {
  id: string
  url: string
  name: string
  uploadedAt: string
}

export interface PricingOverride {
  sqft?: number
  unitPrice?: number
  totalOverride?: number
}

export interface MeasurementGroup {
  id: string
  measurements: BaseMeasurement[]
  totalSquareFeet: number
  roomName: string
  areaType?: string
  overrides?: PricingOverride
}

export interface PricingResult {
  pricePerSqft: number
  totalPrice: number
  breakdown?: {
    materialCost: number
    laborCost: number
    overheadCost: number
  }
}

export interface MeasurementFormProps<T extends BaseMeasurement> {
  jobId: string
  serviceType: ServiceType
  measurements: T[]
  onMeasurementsChange: (measurements: T[]) => void
  onSave: (measurements: T[]) => Promise<void>
  isManager?: boolean
  loading?: boolean
}

export interface MeasurementServiceConfig<T extends BaseMeasurement> {
  serviceName: string
  tableName: string
  defaultMeasurement: Omit<T, 'id' | 'job_id' | 'created_at' | 'updated_at'>
  validationSchema: any
  pricingCalculator: (measurements: T[]) => PricingResult
}