/**
 * Browser helper for calling secured admin API routes with the user's JWT.
 */
import { createBrowserClient } from '@/lib/supabase'

/**
 * Gets the current session access token for Authorization headers.
 * @returns JWT string or null
 */
async function getAccessToken(): Promise<string | null> {
  const supabase = createBrowserClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

/**
 * Calls an admin API route with Bearer auth.
 * @param path - Absolute API path e.g. /api/admin/users
 * @param method - HTTP method
 * @param body - JSON body
 */
export async function adminApi<T = unknown>(
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  body?: Record<string, unknown>,
): Promise<{ data?: T; error?: string }> {
  const token = await getAccessToken()
  if (!token) return { error: 'Not authenticated' }

  const response = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    return { error: json.error || `Request failed (${response.status})` }
  }

  return { data: json.data ?? json }
}
