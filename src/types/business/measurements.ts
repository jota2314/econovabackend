import { Tables, TablesInsert } from '@/lib/types/database'

export type Measurement = Tables<'measurements'>
export type HvacMeasurement = Tables<'hvac_measurements'>
export type PlasterMeasurement = Tables<'plaster_measurements'>

export type MeasurementInsert = TablesInsert<'measurements'>
export type HvacMeasurementInsert = TablesInsert<'hvac_measurements'>
export type PlasterMeasurementInsert = TablesInsert<'plaster_measurements'>

export type MeasurementInsertData = MeasurementInsert | HvacMeasurementInsert | PlasterMeasurementInsert

export type SurfaceType = Measurement['surface_type']
export type AreaType = Measurement['area_type']
export type InsulationType = Measurement['insulation_type']

export interface MeasurementWithJob extends Measurement {
  job: {
    id: string
    job_name: string
    service_type: string
  }
}

export interface MeasurementCalculation {
  room_name: string
  surface_type: SurfaceType
  height: number
  width: number
  square_feet: number
  insulation_type?: InsulationType
  r_value?: string
  unit_price?: number
  total_cost?: number
}

export interface RoomMeasurements {
  room_name: string
  measurements: MeasurementCalculation[]
  total_square_feet: number
  total_cost: number
}

export interface HybridSystemCalculation {
  closed_cell_inches: number
  open_cell_inches: number
  total_r_value: string
  cost_per_sqft: number
}