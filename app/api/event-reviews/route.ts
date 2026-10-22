/**
 * Event Reviews API for mobile app
 *
 * GET  — ?eventId=...   list reviews for an event
 * POST — create review (verified members only, one per event)
 * PATCH  — update own review
 * DELETE — delete own review
 */
import { NextRequest } from 'next/server'
import { corsOptions, json } from '@/lib/server/http'
import { requireUser } from '@/lib/server/auth'
import { getServiceSupabase } from '@/lib/server/supabaseAdmin'

export async function OPTIONS() {
  return corsOptions()
}

export async function GET(request: NextRequest) {
  const user = await requireUser(request)
  if (!user) return json({ error: 'Unauthorized' }, 401)

  try {
    const url = new URL(request.url)
    const eventId = url.searchParams.get('eventId')

    if (!eventId) return json({ error: 'eventId is required' }, 400)

    const admin = getServiceSupabase()

    const { data, error } = await admin
      .from('event_reviews')
      .select(`
        *,
        user:users!event_reviews_user_id_fkey (id, full_name)
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    if (error) return json({ error: error.message }, 500)

    // Also get current user's review if they have one
    let userReview = null
    if (user) {
      const { data: myReview } = await admin
        .from('event_reviews')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle()
      userReview = myReview
    }

    return json({ data: data || [], userReview })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request)
  if (!user) return json({ error: 'Unauthorized' }, 401)

  try {
    // Only verified members can review events
    const admin = getServiceSupabase()
    const { data: userProfile } = await admin
      .from('users')
      .select('is_verified')
      .eq('id', user.id)
      .single()

    if (!userProfile?.is_verified) {
      return json({ error: 'Only verified members can review events' }, 403)
    }

    const body = await request.json()
    const { eventId, rating, comment } = body

    if (!eventId) return json({ error: 'eventId is required' }, 400)
    if (!rating || !['good', 'normal', 'bad'].includes(rating)) {
      return json({ error: 'rating is required and must be good, normal, or bad' }, 400)
    }

    if (comment !== undefined && comment !== null) {
      if (typeof comment !== 'string') {
        return json({ error: 'Comment must be a string' }, 400)
      }
      if (comment.length > 500) {
        return json({ error: 'Comment must be 500 characters or less' }, 400)
      }
    }

    // Verify event exists and is approved/visible
    const { data: event, error: eventError } = await admin
      .from('events')
      .select('id, status, is_visible')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return json({ error: 'Event not found' }, 404)
    }

    if (event.status !== 'approved' || event.is_visible === false) {
      return json({ error: 'Can only review published events' }, 400)
    }

    // Create review (UNIQUE constraint on event_id, user_id will prevent duplicates)
    const { data, error } = await admin
      .from('event_reviews')
      .insert({
        event_id: eventId,
        user_id: user.id,
        rating,
        comment: comment?.trim() || null,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return json({ error: 'You have already reviewed this event' }, 409)
      }
      return json({ error: error.message }, 500)
    }

    return json({ data })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}

export async function PATCH(request: NextRequest) {
  const user = await requireUser(request)
  if (!user) return json({ error: 'Unauthorized' }, 401)

  try {
    const body = await request.json()
    const id = body.id as string
    const rating = body.rating as string | null
    const comment = body.comment as string | null

    if (!id) return json({ error: 'id is required' }, 400)
    if (rating && !['good', 'normal', 'bad'].includes(rating)) {
      return json({ error: 'rating must be good, normal, or bad' }, 400)
    }
    if (comment && comment.length > 500) {
      return json({ error: 'Comment must be 500 characters or less' }, 400)
    }

    const admin = getServiceSupabase()

    // Verify ownership
    const { data: existing, error: reqError } = await admin
      .from('event_reviews')
      .select('user_id')
      .eq('id', id)
      .single()

    if (reqError || !existing) {
      return json({ error: 'Review not found' }, 404)
    }

    if (existing.user_id !== user.id) {
      return json({ error: 'Not authorized to update this review' }, 403)
    }

    const updates: Record<string, string | null> = {}
    if (rating !== undefined && rating !== null) updates.rating = rating
    if (comment !== undefined && comment !== null) {
      if (typeof comment !== 'string') {
        return json({ error: 'comment must be a string' }, 400)
      }
      updates.comment = comment.trim() || null
    }

    if (Object.keys(updates).length === 0) {
      return json({ error: 'No valid fields to update' }, 400)
    }

    const { error } = await admin
      .from('event_reviews')
      .update(updates)
      .eq('id', id)

    if (error) return json({ error: error.message }, 500)

    return json({ success: true })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}

export async function DELETE(request: NextRequest) {
  const user = await requireUser(request)
  if (!user) return json({ error: 'Unauthorized' }, 401)

  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) return json({ error: 'id is required' }, 400)

    const admin = getServiceSupabase()

    // Verify ownership
    const { data: existing, error: reqError } = await admin
      .from('event_reviews')
      .select('user_id')
      .eq('id', id)
      .single()

    if (reqError || !existing) {
      return json({ error: 'Review not found' }, 404)
    }

    if (existing.user_id !== user.id) {
      return json({ error: 'Not authorized to delete this review' }, 403)
    }

    const { error } = await admin
      .from('event_reviews')
      .delete()
      .eq('id', id)

    if (error) return json({ error: error.message }, 500)

    return json({ success: true })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}