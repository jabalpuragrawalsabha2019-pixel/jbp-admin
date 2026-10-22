/**
 * Admin API: Matrimonial Contact Requests
 *
 * GET  — ?status=pending|accepted|rejected|withdrawn|all   list with joined context
 * PATCH  — { id, decision, notes }                           approve/reject
 */
import { NextRequest } from 'next/server'
import { corsOptions, json } from '@/lib/server/http'
import { requireAdmin } from '@/lib/server/auth'
import { getServiceSupabase } from '@/lib/server/supabaseAdmin'

export async function OPTIONS() {
  return corsOptions()
}

export async function GET(request: NextRequest) {
  const adminUser = await requireAdmin(request)
  if (!adminUser) return json({ error: 'Forbidden' }, 403)

  try {
    const url = new URL(request.url)
    const status = url.searchParams.get('status') || 'pending'
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)
    const offset = parseInt(url.searchParams.get('offset') || '0', 10)

    const admin = getServiceSupabase()
    const { data, error } = await admin.rpc('get_contact_requests_for_admin', {
      p_status: status,
      p_limit: limit,
      p_offset: offset,
    })

    if (error) return json({ error: error.message }, 500)
    return json({ data: data || [] })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}

export async function PATCH(request: NextRequest) {
  const adminUser = await requireAdmin(request)
  if (!adminUser) return json({ error: 'Forbidden' }, 403)

  try {
    const body = await request.json()
    const id = body.id as string
    const decision = body.decision as string
    const notes = (body.notes ?? null) as string | null

    if (!id) return json({ error: 'id is required' }, 400)
    if (!['accepted', 'rejected'].includes(decision)) {
      return json({ error: 'decision must be accepted or rejected' }, 400)
    }

    const admin = getServiceSupabase()
    const { error } = await admin.rpc('review_contact_request', {
      p_request_id: id,
      p_decision: decision,
      p_admin_notes: notes,
    })

    if (error) return json({ error: error.message }, 400)

    await admin.from('admin_logs').insert({
      admin_id: adminUser.id,
      action: `contact_request_${decision}`,
      target_type: 'contact_requests',
      target_id: id,
      details: { notes },
    })

    return json({ success: true })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}