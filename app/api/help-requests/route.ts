/**
 * Help Request / Harassment Report API for mobile app (same as admin but client-side)
 *
 * GET  — list user's own reports
 * POST — create new help request
 * PATCH  — user can update their own report (add details before review)
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
    const admin = getServiceSupabase()

    const { data, error } = await admin
      .from('help_requests')
      .select('*')
      .eq('reporter_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return json({ error: error.message }, 500)
    return json({ data: data || [] })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request)
  if (!user) return json({ error: 'Unauthorized' }, 401)

  try {
    // Only verified members can submit help requests
    const admin = getServiceSupabase()
    const { data: userProfile } = await admin
      .from('users')
      .select('is_verified')
      .eq('id', user.id)
      .single()

    if (!userProfile?.is_verified) {
      return json({ error: 'Only verified members can submit help requests' }, 403)
    }

    const body = await request.json()
    const {
      reportType,
      reportedUserId,
      description,
      supportingDetails,
    } = body

    if (!reportType || !['harassment', 'threat', 'safety_concern', 'other'].includes(reportType)) {
      return json({ error: 'Valid reportType is required (harassment|threat|safety_concern|other)' }, 400)
    }

    if (!description || !description.trim()) {
      return json({ error: 'Description is required' }, 400)
    }

    // If reporting a user, verify they exist
    if (reportedUserId) {
      const { data: reportedUser, error: userError } = await admin
        .from('users')
        .select('id')
        .eq('id', reportedUserId)
        .maybeSingle()

      if (userError || !reportedUser) {
        return json({ error: 'Reported user not found' }, 400)
      }

      if (reportedUserId === user.id) {
        return json({ error: 'Cannot report yourself' }, 400)
      }
    }

    const { data, error } = await admin
      .from('help_requests')
      .insert({
        reporter_id: user.id,
        report_type: reportType,
        reported_user_id: reportedUserId || null,
        description: description.trim(),
        supporting_details: supportingDetails?.trim() || null,
        status: 'submitted',
      })
      .select()
      .single()

    if (error) return json({ error: error.message }, 500)

    // Notify admins (broadcast notification)
    await admin.from('notifications').insert({
      user_id: null, // broadcast to all admins
      type: 'help_request',
      title: 'New Help Request',
      body: `New ${reportType} report submitted`,
      data: { helpRequestId: data.id, reportType },
    })

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

    if (!id) return json({ error: 'id is required' }, 400)

    const admin = getServiceSupabase()

    // Get the request to verify ownership
    const { data: request_data, error: reqError } = await admin
      .from('help_requests')
      .select('reporter_id, status')
      .eq('id', id)
      .single()

    if (reqError || !request_data) {
      return json({ error: 'Help request not found' }, 404)
    }

    if (request_data.reporter_id !== user.id) {
      return json({ error: 'Not authorized to update this request' }, 403)
    }

    // Only allow updates before admin reviews
    if (!['submitted', 'under_review'].includes(request_data.status)) {
      return json({ error: 'Cannot update request after admin review' }, 400)
    }

    // Only allow certain fields to be updated by the reporter.
    // The mobile client sends camelCase (`supportingDetails`), so accept both
    // spellings and store the database column name.
    const rawUpdates = (body.updates ?? {}) as Record<string, unknown>
    const filteredUpdates: Record<string, string | null> = {}

    if (rawUpdates.description !== undefined) {
      if (typeof rawUpdates.description !== 'string' || !rawUpdates.description.trim()) {
        return json({ error: 'description must be a non-empty string' }, 400)
      }
      if (rawUpdates.description.length > 2000) {
        return json({ error: 'description must be 2000 characters or less' }, 400)
      }
      filteredUpdates.description = rawUpdates.description.trim()
    }

    const supporting =
      rawUpdates.supportingDetails !== undefined
        ? rawUpdates.supportingDetails
        : rawUpdates.supporting_details

    if (supporting !== undefined) {
      if (typeof supporting !== 'string') {
        return json({ error: 'supportingDetails must be a string' }, 400)
      }
      if (supporting.length > 1000) {
        return json({ error: 'supportingDetails must be 1000 characters or less' }, 400)
      }
      filteredUpdates.supporting_details = supporting.trim() || null
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return json({ error: 'No valid fields to update' }, 400)
    }

    const { error } = await admin
      .from('help_requests')
      .update(filteredUpdates)
      .eq('id', id)

    if (error) return json({ error: error.message }, 500)

    return json({ success: true })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}