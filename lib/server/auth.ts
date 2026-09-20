/**
 * Auth helpers for API routes — verify JWT and load caller privileges.
 */
import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { getServiceSupabase } from './supabaseAdmin'

export type AuthUser = {
  id: string
  email?: string
  isAdmin: boolean
  isVerified: boolean
}

/**
 * Extracts Bearer token from Authorization header.
 * @param request - Incoming Next request
 * @returns JWT string or null
 */
export function getBearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  return header.slice(7).trim() || null
}

/**
 * Verifies the Supabase JWT and returns the authenticated user + admin flags.
 * Uses the anon key for getUser(jwt) then service role for privilege lookup.
 * @param request - Incoming Next request
 * @returns AuthUser or null if unauthenticated
 */
export async function requireUser(request: NextRequest): Promise<AuthUser | null> {
  const token = getBearerToken(request)
  if (!token) return null

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null

  const authClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser(token)

  if (error || !user) return null

  const admin = getServiceSupabase()
  const { data: profile } = await admin
    .from('users')
    .select('is_admin, is_verified')
    .eq('id', user.id)
    .maybeSingle()

  return {
    id: user.id,
    email: user.email,
    isAdmin: !!profile?.is_admin,
    isVerified: !!profile?.is_verified,
  }
}

/**
 * Requires an authenticated admin user.
 * @param request - Incoming Next request
 * @returns AuthUser or null
 */
export async function requireAdmin(request: NextRequest): Promise<AuthUser | null> {
  const user = await requireUser(request)
  if (!user?.isAdmin) return null
  return user
}
