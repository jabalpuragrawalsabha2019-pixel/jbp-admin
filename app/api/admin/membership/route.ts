/**
 * Membership application moderation.
 *
 * Membership is a STANDALONE application: it does not require a Pratyashi
 * Parichay. The applicant submits their own details (stored as a snapshot on
 * membership_requests) plus a payment (payment_requests with
 * entity_type = 'membership'), so the reviewer always sees exactly what was
 * submitted.
 *
 * Approving goes through public.review_membership_request(), which refuses to
 * approve an application whose payment is missing or not yet approved, and
 * stamps users.is_member in the same transaction. It never touches a
 * matrimonial profile.
 *
 * GET  — ?status=pending|approved|rejected|all   list with joined context
 * POST — { id, decision, notes }                 approve | reject
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
    const status = new URL(request.url).searchParams.get('status') || 'all'
    const admin = getServiceSupabase()

    let query = admin
      .from('membership_requests')
      .select(
        `*,
         users!membership_requests_user_id_fkey (
           id, full_name, phone, email, photo_url, city,
           is_member, is_verified, is_banned, member_since
         ),
         payment_requests!membership_requests_payment_request_id_fkey (
           id, status, amount, amount_paid, proof_url, reference, upi_id,
           reviewed_by, reviewed_at
         )`,
      )
      .order('created_at', { ascending: false })

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) return json({ error: error.message }, 500)

    return json({ data: data || [] })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}

export async function POST(request: NextRequest) {
  const adminUser = await requireAdmin(request)
  if (!adminUser) return json({ error: 'Forbidden' }, 403)

  try {
    const body = await request.json()
    const id = body.id as string
    const decision = body.decision as string
    const notes = (body.notes ?? null) as string | null

    if (!id) return json({ error: 'id is required' }, 400)
    if (decision !== 'approved' && decision !== 'rejected') {
      return json({ error: 'decision must be approved or rejected' }, 400)
    }

    const admin = getServiceSupabase()

    // The RPC validates authorisation, refuses approval unless the linked
    // membership payment is approved, records reviewed_by/at, and recomputes
    // users.is_member.
    const { error } = await admin.rpc('review_membership_request', {
      request_id: id,
      decision,
      notes,
    })
    if (error) return json({ error: error.message }, 400)

    const { data: updated } = await admin
      .from('membership_requests')
      .select('*, users!membership_requests_user_id_fkey (id, full_name, is_member)')
      .eq('id', id)
      .maybeSingle()

    await admin.from('admin_logs').insert({
      admin_id: adminUser.id,
      action: `membership_${decision}`,
      target_type: 'membership_requests',
      target_id: id,
      details: { notes, user_id: updated?.users?.id ?? null },
    })

    return json({ data: updated })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}
