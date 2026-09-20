/**
 * GET /api/health — liveness check for the mobile/backend API.
 */
import { corsOptions, json } from '@/lib/server/http'

export async function OPTIONS() {
  return corsOptions()
}

export async function GET() {
  return json({ ok: true, service: 'jbp-api' })
}
