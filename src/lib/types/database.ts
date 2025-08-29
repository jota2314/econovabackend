export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'manager' | 'salesperson'
          phone: string | null
          commission_rate: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'manager' | 'salesperson'
          phone?: string | null
          commission_rate?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'manager' | 'salesperson'
          phone?: string | null
          commission_rate?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string
          company: string | null
          address: string | null
          city: string | null
          state: 'MA' | 'NH' | null
          status: 'new' | 'contacted' | 'measurement_scheduled' | 'measured' | 'quoted' | 'proposal_sent' | 'closed_won' | 'closed_lost'
          lead_source: 'drive_by' | 'permit' | 'referral' | 'website' | 'csv_import' | 'other' | null
          assigned_to: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone: string
          company?: string | null
          address?: string | null
          city?: string | null
          state?: 'MA' | 'NH' | null
          status?: 'new' | 'contacted' | 'measurement_scheduled' | 'measured' | 'quoted' | 'proposal_sent' | 'closed_won' | 'closed_lost'
          lead_source?: 'drive_by' | 'permit' | 'referral' | 'website' | 'csv_import' | 'other' | null
          assigned_to?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string
          company?: string | null
          address?: string | null
          city?: string | null
          state?: 'MA' | 'NH' | null
          status?: 'new' | 'contacted' | 'measurement_scheduled' | 'measured' | 'quoted' | 'proposal_sent' | 'closed_won' | 'closed_lost'
          lead_source?: 'drive_by' | 'permit' | 'referral' | 'website' | 'csv_import' | 'other' | null
          assigned_to?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      jobs: {
        Row: {
          id: string
          lead_id: string
          job_name: string
          measurement_type: 'field' | 'drawings'
          service_type: 'insulation' | 'hvac' | 'plaster'
          building_type: 'residential' | 'commercial' | 'industrial'
          project_type: 'new_construction' | 'remodel' | null
          total_square_feet: number
          structural_framing: '2x4' | '2x6' | '2x8' | '2x10' | '2x12' | null
          roof_rafters: '2x4' | '2x6' | '2x8' | '2x10' | '2x12' | null
          scope_of_work: string | null
          quote_amount: number | null
          quote_sent_at: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          job_name: string
          measurement_type: 'field' | 'drawings'
          service_type: 'insulation' | 'hvac' | 'plaster'
          building_type: 'residential' | 'commercial' | 'industrial'
          project_type?: 'new_construction' | 'remodel' | null
          total_square_feet?: number
          structural_framing?: '2x4' | '2x6' | '2x8' | '2x10' | '2x12' | null
          roof_rafters?: '2x4' | '2x6' | '2x8' | '2x10' | '2x12' | null
          scope_of_work?: string | null
          quote_amount?: number | null
          quote_sent_at?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          job_name?: string
          measurement_type?: 'field' | 'drawings'
          service_type?: 'insulation' | 'hvac' | 'plaster'
          building_type?: 'residential' | 'commercial' | 'industrial'
          project_type?: 'new_construction' | 'remodel' | null
          total_square_feet?: number
          structural_framing?: '2x4' | '2x6' | '2x8' | '2x10' | '2x12' | null
          roof_rafters?: '2x4' | '2x6' | '2x8' | '2x10' | '2x12' | null
          scope_of_work?: string | null
          quote_amount?: number | null
          quote_sent_at?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      insulation_measurements: {
        Row: {
          id: string
          job_id: string
          room_name: string
          floor_level: string | null
          area_type: 'exterior_walls' | 'interior_walls' | 'ceiling' | 'gable' | 'roof' | null
          surface_type: 'wall' | 'ceiling'
          framing_size: '2x4' | '2x6' | '2x8' | '2x10' | '2x12'
          height: number
          width: number
          square_feet: number
          insulation_type: 'closed_cell' | 'open_cell' | 'batt' | 'blown_in' | null
          r_value: string | null
          photo_url: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_id: string
          room_name: string
          floor_level?: string | null
          area_type?: 'exterior_walls' | 'interior_walls' | 'ceiling' | 'gable' | 'roof' | null
          surface_type: 'wall' | 'ceiling'
          framing_size: '2x4' | '2x6' | '2x8' | '2x10' | '2x12'
          height: number
          width: number
          square_feet: number
          insulation_type?: 'closed_cell' | 'open_cell' | 'batt' | 'blown_in' | null
          r_value?: string | null
          photo_url?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          room_name?: string
          floor_level?: string | null
          area_type?: 'exterior_walls' | 'interior_walls' | 'ceiling' | 'gable' | 'roof' | null
          surface_type?: 'wall' | 'ceiling'
          framing_size?: '2x4' | '2x6' | '2x8' | '2x10' | '2x12'
          height?: number
          width?: number
          square_feet?: number
          insulation_type?: 'closed_cell' | 'open_cell' | 'batt' | 'blown_in' | null
          r_value?: string | null
          photo_url?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insulation_measurements_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          }
        ]
      }
      measurements: {
        Row: {
          id: string
          job_id: string
          room_name: string
          floor_level: string | null
          area_type: 'exterior_walls' | 'interior_walls' | 'ceiling' | 'gable' | 'roof' | null
          surface_type: 'wall' | 'ceiling'
          height: number
          width: number
          square_feet: number
          insulation_type: 'closed_cell' | 'open_cell' | 'batt' | 'blown_in' | null
          r_value: string | null
          photo_url: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_id: string
          room_name: string
          floor_level?: string | null
          area_type?: 'exterior_walls' | 'interior_walls' | 'ceiling' | 'gable' | 'roof' | null
          surface_type: 'wall' | 'ceiling'
          height: number
          width: number
          square_feet: number
          insulation_type?: 'closed_cell' | 'open_cell' | 'batt' | 'blown_in' | null
          r_value?: string | null
          photo_url?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          room_name?: string
          floor_level?: string | null
          area_type?: 'exterior_walls' | 'interior_walls' | 'ceiling' | 'gable' | 'roof' | null
          surface_type?: 'wall' | 'ceiling'
          height?: number
          width?: number
          square_feet?: number
          insulation_type?: 'closed_cell' | 'open_cell' | 'batt' | 'blown_in' | null
          r_value?: string | null
          photo_url?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurements_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          }
        ]
      }
      hvac_measurements: {
        Row: {
          id: string
          job_id: string
          room_name: string
          system_type: 'central_air' | 'heat_pump' | 'furnace'
          tonnage: number
          seer_rating: number | null
          ductwork_linear_feet: number
          return_vents_count: number
          supply_vents_count: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_id: string
          room_name: string
          system_type: 'central_air' | 'heat_pump' | 'furnace'
          tonnage: number
          seer_rating?: number | null
          ductwork_linear_feet: number
          return_vents_count: number
          supply_vents_count: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          room_name?: string
          system_type?: 'central_air' | 'heat_pump' | 'furnace'
          tonnage?: number
          seer_rating?: number | null
          ductwork_linear_feet?: number
          return_vents_count?: number
          supply_vents_count?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hvac_measurements_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          }
        ]
      }
      plaster_measurements: {
        Row: {
          id: string
          job_id: string
          room_name: string
          wall_condition: 'good' | 'fair' | 'poor'
          ceiling_condition: 'good' | 'fair' | 'poor'
          wall_square_feet: number
          ceiling_square_feet: number
          prep_work_hours: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_id: string
          room_name: string
          wall_condition: 'good' | 'fair' | 'poor'
          ceiling_condition: 'good' | 'fair' | 'poor'
          wall_square_feet: number
          ceiling_square_feet: number
          prep_work_hours: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          room_name?: string
          wall_condition?: 'good' | 'fair' | 'poor'
          ceiling_condition?: 'good' | 'fair' | 'poor'
          wall_square_feet?: number
          ceiling_square_feet?: number
          prep_work_hours?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plaster_measurements_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          }
        ]
      }
      pricing_catalog: {
        Row: {
          id: string
          service_type: 'insulation' | 'hvac' | 'plaster'
          item_name: string
          unit: 'sq_ft' | 'linear_ft' | 'each' | 'hour'
          base_price: number
          material_cost: number | null
          labor_cost: number | null
          markup_percentage: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          service_type: 'insulation' | 'hvac' | 'plaster'
          item_name: string
          unit: 'sq_ft' | 'linear_ft' | 'each' | 'hour'
          base_price: number
          material_cost?: number | null
          labor_cost?: number | null
          markup_percentage?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          service_type?: 'insulation' | 'hvac' | 'plaster'
          item_name?: string
          unit?: 'sq_ft' | 'linear_ft' | 'each' | 'hour'
          base_price?: number
          material_cost?: number | null
          labor_cost?: number | null
          markup_percentage?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      estimates: {
        Row: {
          id: string
          job_id: string
          estimate_number: string
          total_amount: number
          status: 'draft' | 'sent' | 'approved' | 'rejected'
          valid_until: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_id: string
          estimate_number: string
          total_amount: number
          status?: 'draft' | 'sent' | 'approved' | 'rejected'
          valid_until?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          estimate_number?: string
          total_amount?: number
          status?: 'draft' | 'sent' | 'approved' | 'rejected'
          valid_until?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      estimate_line_items: {
        Row: {
          id: string
          estimate_id: string
          description: string
          quantity: number
          unit_price: number
          total_price: number
          created_at: string
        }
        Insert: {
          id?: string
          estimate_id: string
          description: string
          quantity: number
          unit_price: number
          total_price: number
          created_at?: string
        }
        Update: {
          id?: string
          estimate_id?: string
          description?: string
          quantity?: number
          unit_price?: number
          total_price?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_line_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type Lead = Tables<'leads'>
export type Job = Tables<'jobs'>
export type InsulationMeasurement = Tables<'insulation_measurements'>
export type HvacMeasurement = Tables<'hvac_measurements'>
export type PlasterMeasurement = Tables<'plaster_measurements'>
export type PricingCatalog = Tables<'pricing_catalog'>
export type Estimate = Tables<'estimates'>
export type EstimateLineItem = Tables<'estimate_line_items'>