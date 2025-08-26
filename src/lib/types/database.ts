export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'manager' | 'salesperson'
          phone: string | null
          commission_rate: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'manager' | 'salesperson'
          phone?: string | null
          commission_rate?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'manager' | 'salesperson'
          phone?: string | null
          commission_rate?: number | null
          created_at?: string
          updated_at?: string
        }
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
      }
      jobs: {
        Row: {
          id: string
          lead_id: string
          job_name: string
          measurement_type: 'field' | 'drawings'
          total_square_feet: number | null
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
          total_square_feet?: number | null
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
          total_square_feet?: number | null
          structural_framing?: '2x4' | '2x6' | '2x8' | '2x10' | '2x12' | null
          roof_rafters?: '2x4' | '2x6' | '2x8' | '2x10' | '2x12' | null
          scope_of_work?: string | null
          quote_amount?: number | null
          quote_sent_at?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      measurements: {
        Row: {
          id: string
          job_id: string
          room_name: string
          surface_type: 'wall' | 'ceiling'
          height: number
          width: number
          square_feet: number
          photo_url: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          room_name: string
          surface_type: 'wall' | 'ceiling'
          height: number
          width: number
          photo_url?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          room_name?: string
          surface_type?: 'wall' | 'ceiling'
          height?: number
          width?: number
          photo_url?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      communications: {
        Row: {
          id: string
          lead_id: string
          user_id: string
          type: 'call' | 'sms' | 'email'
          direction: 'inbound' | 'outbound'
          content: string | null
          status: string | null
          twilio_sid: string | null
          recording_url: string | null
          duration_seconds: number | null
          created_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          user_id: string
          type: 'call' | 'sms' | 'email'
          direction: 'inbound' | 'outbound'
          content?: string | null
          status?: string | null
          twilio_sid?: string | null
          recording_url?: string | null
          duration_seconds?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          user_id?: string
          type?: 'call' | 'sms' | 'email'
          direction?: 'inbound' | 'outbound'
          content?: string | null
          status?: string | null
          twilio_sid?: string | null
          recording_url?: string | null
          duration_seconds?: number | null
          created_at?: string
        }
      }
      commissions: {
        Row: {
          id: string
          user_id: string
          job_id: string
          commission_type: 'frontend' | 'backend'
          amount: number
          paid: boolean
          paid_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          job_id: string
          commission_type: 'frontend' | 'backend'
          amount: number
          paid?: boolean
          paid_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          job_id?: string
          commission_type?: 'frontend' | 'backend'
          amount?: number
          paid?: boolean
          paid_at?: string | null
          created_at?: string
        }
      }
      activities: {
        Row: {
          id: string
          user_id: string
          lead_id: string | null
          activity_type: 'call_made' | 'sms_sent' | 'email_sent' | 'measurement_taken' | 'quote_sent' | 'note_added'
          description: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          lead_id?: string | null
          activity_type: 'call_made' | 'sms_sent' | 'email_sent' | 'measurement_taken' | 'quote_sent' | 'note_added'
          description?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          lead_id?: string | null
          activity_type?: 'call_made' | 'sms_sent' | 'email_sent' | 'measurement_taken' | 'quote_sent' | 'note_added'
          description?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'manager' | 'salesperson'
      lead_status: 'new' | 'contacted' | 'measurement_scheduled' | 'measured' | 'quoted' | 'proposal_sent' | 'closed_won' | 'closed_lost'
      lead_source: 'drive_by' | 'permit' | 'referral' | 'website' | 'csv_import' | 'other'
      measurement_type: 'field' | 'drawings'
      surface_type: 'wall' | 'ceiling'
      framing_size: '2x4' | '2x6' | '2x8' | '2x10' | '2x12'
      communication_type: 'call' | 'sms' | 'email'
      communication_direction: 'inbound' | 'outbound'
      commission_type: 'frontend' | 'backend'
      activity_type: 'call_made' | 'sms_sent' | 'email_sent' | 'measurement_taken' | 'quote_sent' | 'note_added'
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"])
  ? (Database["public"]["Tables"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"])[TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"])
  ? (Database["public"]["Tables"])[PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"])[TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"])
  ? (Database["public"]["Tables"])[PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof (Database["public"]["Enums"])
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicEnumNameOrOptions["schema"]]["Enums"])
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicEnumNameOrOptions["schema"]]["Enums"])[EnumName]
  : PublicEnumNameOrOptions extends keyof (Database["public"]["Enums"])
  ? (Database["public"]["Enums"])[PublicEnumNameOrOptions]
  : never

export type User = Tables<'users'>
export type Lead = Tables<'leads'>
export type Job = Tables<'jobs'>
export type Measurement = Tables<'measurements'>
export type Communication = Tables<'communications'>
export type Commission = Tables<'commissions'>
export type Activity = Tables<'activities'>