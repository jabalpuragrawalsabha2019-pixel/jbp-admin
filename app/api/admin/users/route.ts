/**
 * Admin privilege APIs for users (verified / member / admin flags, delete).
 * All actions require an admin JWT; mutations use the service role.
 *
 * PATCH — { userId, is_verified?, is_member?, is_admin? }
 * DELETE — { userId }
 */
import { NextRequest } from 'next/server'
import { corsOptions, json } from '@/lib/server/http'
import { requireAdmin } from '@/lib/server/auth'
import { getServiceSupabase } from '@/lib/server/supabaseAdmin'
import {
  collectUserMediaUrls,
  destroyCloudinaryUrls,
} from '@/lib/server/mediaCleanup'

export async function OPTIONS() {
  return corsOptions()
}

export async function PATCH(request: NextRequest) {
  const adminUser = await requireAdmin(request)
  if (!adminUser) return json({ error: 'Forbidden' }, 403)

  try {
    const body = await request.json()
    const userId = body.userId
    if (!userId) return json({ error: 'userId is required' }, 400)

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (typeof body.is_verified === 'boolean') {
      updates.is_verified = body.is_verified
    }
    if (typeof body.is_member === 'boolean') {
      updates.is_member = body.is_member
      // member_since records when membership was granted, and is cleared when
      // it is withdrawn. Membership is independent of is_verified on purpose.
      updates.member_since = body.is_member ? new Date().toISOString() : null
    }
    if (typeof body.is_admin === 'boolean') {
      // Prevent an admin from removing their own admin flag accidentally locking everyone out
      if (userId === adminUser.id && body.is_admin === false) {
        return json({ error: 'Cannot remove your own admin access' }, 400)
      }
      updates.is_admin = body.is_admin
    }

    if (Object.keys(updates).length === 1) {
      return json({ error: 'No privilege fields to update' }, 400)
    }

    const admin = getServiceSupabase()
    const { data, error } = await admin
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select('id, full_name, is_verified, is_member, member_since, is_admin')
      .maybeSingle()

    if (error) return json({ error: error.message }, 500)

    await admin.from('admin_logs').insert({
      admin_id: adminUser.id,
      action: 'update_user_privileges',
      target_type: 'users',
      target_id: userId,
      details: updates,
    })

    return json({ data })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}

export async function DELETE(request: NextRequest) {
  const adminUser = await requireAdmin(request)
  if (!adminUser) return json({ error: 'Forbidden' }, 403)

  try {
    const body = await request.json()
    const userId = body.userId
    if (!userId) return json({ error: 'userId is required' }, 400)
    if (userId === adminUser.id) {
      return json({ error: 'Cannot delete your own account from admin tools' }, 400)
    }

    const admin = getServiceSupabase()

    // Remove Cloudinary assets before DB cascade deletes orphan them
    const mediaUrls = await collectUserMediaUrls(userId)
    const mediaResult = await destroyCloudinaryUrls(mediaUrls)

    // Delete related content rows that hold media references
    await admin.from('matrimonial_profiles').delete().eq('user_id', userId)
    await admin.from('events').delete().eq('posted_by', userId)
    await admin.from('jobs').delete().eq('posted_by', userId)
    await admin.from('blood_donors').delete().eq('user_id', userId)
    await admin.from('contact_requests').delete().eq('requester_id', userId)

    const { error } = await admin.from('users').delete().eq('id', userId)
    if (error) return json({ error: error.message }, 500)

    await admin.from('admin_logs').insert({
      admin_id: adminUser.id,
      action: 'delete_user',
      target_type: 'users',
      target_id: userId,
      details: { mediaCleanup: mediaResult },
    })

    return json({ success: true, mediaCleanup: mediaResult })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}
