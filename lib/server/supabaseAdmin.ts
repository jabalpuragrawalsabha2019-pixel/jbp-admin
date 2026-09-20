/**
 * Server-only Supabase client using the service role key.
 * Never import this into client components.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js'

let adminClient: SupabaseClient | null = null

/**
 * Returns a singleton Supabase service-role client (bypasses RLS).
 * @returns {SupabaseClient}
 */
export function getServiceSupabase(): SupabaseClient {
  if (adminClient) return adminClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  adminClient = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return adminClient
}
