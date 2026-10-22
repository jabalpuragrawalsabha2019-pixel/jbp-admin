/**
 * Admin API: Event Reviews
 *
 * GET  — ?eventId=...   list reviews (optionally filtered by event)
 * PATCH  — { id, rating, comment }   moderate review
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
    const eventId = url.searchParams.get('eventId') || null
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)
    const offset = parseInt(url.searchParams.get('offset') || '0', 10)

    const admin = getServiceSupabase()
    const { data, error } = await admin.rpc('get_event_reviews_for_admin', {
      p_event_id: eventId,
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
    const rating = body.rating as string | null
    const comment = body.comment as string | null

    if (!id) return json({ error: 'id is required' }, 400)
    if (rating && !['good', 'normal', 'bad'].includes(rating)) {
      return json({ error: 'rating must be good, normal, or bad' }, 400)
    }

    const admin = getServiceSupabase()
    const { error } = await admin.rpc('admin_update_event_review', {
      p_review_id: id,
      p_rating: rating,
      p_comment: comment,
    })

    if (error) return json({ error: error.message }, 400)

    await admin.from('admin_logs').insert({
      admin_id: adminUser.id,
      action: 'event_review_moderated',
      target_type: 'event_reviews',
      target_id: id,
      details: { rating, comment },
    })

    return json({ success: true })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}