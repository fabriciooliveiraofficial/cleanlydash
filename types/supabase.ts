// ARQUIVO: types/supabase.ts

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
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          stripe_customer_id: string | null
          telnyx_api_key: string | null
          telnyx_connection_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          stripe_customer_id?: string | null
          telnyx_api_key?: string | null
          telnyx_connection_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          stripe_customer_id?: string | null
          telnyx_api_key?: string | null
          telnyx_connection_id?: string | null
          created_at?: string
        }
      }
      phone_numbers: {
        Row: {
          id: string
          tenant_id: string
          phone_number: string
          telnyx_id: string
          friendly_name: string | null
          status: 'active' | 'released'
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          phone_number: string
          telnyx_id: string
          friendly_name?: string | null
          status?: 'active' | 'released'
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          phone_number?: string
          telnyx_id?: string
          friendly_name?: string | null
          status?: 'active' | 'released'
          created_at?: string
        }
      }
      comms_logs: {
        Row: {
          id: string
          tenant_id: string
          direction: 'inbound' | 'outbound'
          from_number: string
          to_number: string
          status: string
          duration_secs: number
          recording_url: string | null
          cost: number
          ai_summary: Json | null
          sentiment_score: number | null
          telnyx_call_control_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          direction: 'inbound' | 'outbound'
          from_number: string
          to_number: string
          status: string
          duration_secs?: number
          recording_url?: string | null
          cost?: number
          ai_summary?: Json | null
          sentiment_score?: number | null
          telnyx_call_control_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          direction?: 'inbound' | 'outbound'
          from_number?: string
          to_number?: string
          status?: string
          duration_secs?: number
          recording_url?: string | null
          cost?: number
          ai_summary?: Json | null
          sentiment_score?: number | null
          telnyx_call_control_id?: string | null
          created_at?: string
        }
      }
      // ... outras tabelas permanecem iguais (profiles, bookings, invoices, payrolls, wallet_ledger)
      calendars: {
        Row: {
          id: string
          tenant_id: string
          customer_id: string | null
          name: string
          url: string
          last_synced_at: string | null
          color: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id?: string
          customer_id?: string | null
          name: string
          url: string
          last_synced_at?: string | null
          color?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          customer_id?: string | null
          name?: string
          url?: string
          last_synced_at?: string | null
          color?: string | null
          created_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          tenant_id: string
          customer_id: string | null
          calendar_id: string | null
          uid: string | null
          summary: string | null
          description: string | null
          start_date: string
          end_date: string
          status: string | null
          platform: string | null
          price: number | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          tenant_id?: string
          customer_id?: string | null
          calendar_id?: string | null
          uid?: string | null
          summary?: string | null
          description?: string | null
          start_date: string
          end_date: string
          status?: string | null
          platform?: string | null
          price?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          customer_id?: string | null
          calendar_id?: string | null
          uid?: string | null
          summary?: string | null
          description?: string | null
          start_date?: string
          end_date?: string
          status?: string | null
          platform?: string | null
          price?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      inventory_items: {
        Row: {
          id: string
          tenant_id: string
          customer_id: string | null
          name: string
          category: string | null
          ideal_quantity: number
          min_quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id?: string
          customer_id?: string | null
          name: string
          category?: string | null
          ideal_quantity?: number
          min_quantity?: number
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          customer_id?: string | null
          name?: string
          category?: string | null
          ideal_quantity?: number
          min_quantity?: number
          created_at?: string
        }
      }
      job_evidence: {
        Row: {
          id: string
          tenant_id: string
          booking_id: string | null
          type: string
          url: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id?: string
          booking_id?: string | null
          type: string
          url?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          booking_id?: string | null
          type?: string
          url?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          tenant_id: string
          name: string | null
          email: string | null
          phone: string | null
          address: string | null
          status: string
          latitude: number | null
          longitude: number | null
          geofence_radius: number | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id?: string
          name?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          status?: string
          latitude?: number | null
          longitude?: number | null
          geofence_radius?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          status?: string
          latitude?: number | null
          longitude?: number | null
          geofence_radius?: number | null
          created_at?: string
        }
      }
      profiles: { Row: any; Insert: any; Update: any }
      invoices: { Row: any; Insert: any; Update: any }
      payrolls: { Row: any; Insert: any; Update: any }
      payroll_items: { Row: any; Insert: any; Update: any }
      wallet_ledger: { Row: any; Insert: any; Update: any }
    }
  }
}