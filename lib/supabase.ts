import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

// Client-side Supabase client (singleton to avoid multiple instances)
export const createBrowserClient = () => {
  if (supabaseInstance) {
    return supabaseInstance
  }

  supabaseInstance = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return supabaseInstance
}

// Database types
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          google_id: string | null
          email: string | null
          phone: string
          full_name: string | null
          photo_url: string | null
          city: string | null
          occupation: string | null
          is_verified: boolean
          is_admin: boolean
          privacy_settings: any
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      matrimonial_profiles: {
        Row: {
          id: string
          user_id: string
          gender: string
          age: number | null
          education: string | null
          occupation: string | null
          city: string | null
          gotra: string | null
          family_details: string | null
          photos: any
          horoscope_url: string | null
          additional_info: string | null
          status: string
          approved_by: string | null
          approval_notes: string | null
          created_at: string
          updated_at: string
        }
      }
      events: {
        Row: {
          id: string
          title: string
          description: string | null
          event_date: string | null
          poster_url: string | null
          posted_by: string | null
          status: string
          event_type: string
          is_announcement: boolean
          announcement_text: string | null
          is_visible: boolean
          is_featured: boolean
          display_order: number
          approved_by: string | null
          approval_notes: string | null
          created_at: string
          updated_at: string
        }
      }
      jobs: {
        Row: {
          id: string
          title: string
          description: string | null
          location: string | null
          contact_info: string | null
          posted_by: string | null
          status: string
          approved_by: string | null
          approval_notes: string | null
          created_at: string
          updated_at: string
        }
      }
      blood_donors: {
        Row: {
          id: string
          user_id: string
          blood_group: string
          city: string
          is_available: boolean
          last_donation_date: string | null
          created_at: string
          updated_at: string
        }
      }
      donations: {
        Row: {
          id: string
          donor_name: string
          amount: number
          transaction_id: string | null
          upi_ref: string | null
          receipt_url: string | null
          donated_at: string
        }
      }
      post_holders: {
        Row: {
          id: string
          user_id: string | null
          designation: string
          term_start: string | null
          term_end: string | null
          bio: string | null
          display_order: number | null
          created_at: string
          updated_at: string
        }
      }
      approved_members: {
        Row: {
          id: string
          phone: string
          full_name: string | null
          city: string | null
          gotra: string | null
          imported_at: string
        }
      }
      contact_requests: {
        Row: {
          id: string
          profile_id: string
          requester_id: string
          status: string
          created_at: string
        }
      }
      admin_logs: {
        Row: {
          id: string
          admin_id: string | null
          action: string
          target_type: string | null
          target_id: string | null
          details: any
          created_at: string
        }
      }
    }
  }
}