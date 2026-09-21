/**
 * Cloudinary sign / delete APIs (secrets stay on the server).
 * POST ?action=sign   — signed upload params (folder scoped to caller)
 * POST ?action=delete — destroy by public_id or URL (ownership checked)
 */
import { NextRequest } from 'next/server'
import { corsOptions, json } from '@/lib/server/http'
import { requireUser, requireAdmin } from '@/lib/server/auth'
import { createSignedUpload, destroyCloudinaryAsset } from '@/lib/server/cloudinary'
import {
  extractPublicIdFromUrl,
  publicIdBelongsToUser,
} from '@/lib/cloudinaryUrl'
import { getServiceSupabase } from '@/lib/server/supabaseAdmin'

export async function OPTIONS() {
  return corsOptions()
}

/**
 * Verifies a non-admin caller may delete this asset (folder scope or DB ownership).
 * @param userId - Caller id
 * @param publicId - Cloudinary public_id
 * @param url - Optional original URL for legacy assets
 */
async function userCanDeleteAsset(
  userId: string,
  publicId: string,
  url?: string | null,
): Promise<boolean> {
  if (publicIdBelongsToUser(publicId, userId)) return true

  const admin = getServiceSupabase()

  // Profile photo ownership
  const { data: userRow } = await admin
    .from('users')
    .select('id, photo_url')
    .eq('id', userId)
    .maybeSingle()

  if (userRow?.photo_url) {
    if (url && userRow.photo_url === url) return true
    const ownedId = extractPublicIdFromUrl(userRow.photo_url)
    if (ownedId && ownedId === publicId) return true
  }

  // Matrimonial assets owned by this user
  const { data: profiles } = await admin
    .from('matrimonial_profiles')
    .select('photos, parent_signature_url, candidate_signature_url')
    .eq('user_id', userId)

  for (const profile of profiles || []) {
    const urls: string[] = [
      ...(Array.isArray(profile.photos) ? profile.photos : []),
      profile.parent_signature_url,
      profile.candidate_signature_url,
    ].filter(Boolean)

    for (const assetUrl of urls) {
      if (url && assetUrl === url) return true
      const id = extractPublicIdFromUrl(assetUrl)
      if (id && id === publicId) return true
    }
  }

  // Events posted by this user
  const { data: events } = await admin
    .from('events')
    .select('poster_url')
    .eq('posted_by', userId)

  for (const event of events || []) {
    if (!event.poster_url) continue
    if (url && event.poster_url === url) return true
    const id = extractPublicIdFromUrl(event.poster_url)
    if (id && id === publicId) return true
  }

  return false
}

export async function POST(request: NextRequest) {
  const action = new URL(request.url).searchParams.get('action') || 'sign'

  try {
    const body = await request.json().catch(() => ({}))

    if (action === 'sign') {
      const user = await requireUser(request)
      if (!user) return json({ error: 'Unauthorized' }, 401)

      const folder = String(body.folder || 'general')
      const signed = createSignedUpload(folder, user.id)
      return json(signed)
    }

    if (action === 'delete') {
      const admin = await requireAdmin(request)
      const user = admin || (await requireUser(request))
      if (!user) return json({ error: 'Unauthorized' }, 401)

      const url = body.url as string | undefined
      const publicId =
        (body.publicId as string | undefined) ||
        (body.public_id as string | undefined) ||
        extractPublicIdFromUrl(url)

      if (!publicId) {
        return json({ error: 'publicId or Cloudinary url is required' }, 400)
      }

      // Only allow deletes inside our cloud folder tree
      if (!publicId.startsWith('jbp-agrawal/') && !publicId.startsWith('jbp-agrawal-sabha/')) {
        return json({ error: 'Forbidden asset path' }, 403)
      }

      if (!admin) {
        const allowed = await userCanDeleteAsset(user.id, publicId, url)
        if (!allowed) return json({ error: 'Forbidden' }, 403)
      }

      const result = await destroyCloudinaryAsset(publicId)
      return json({ success: true, publicId, result })
    }

    if (action === 'delete-many') {
      const admin = await requireAdmin(request)
      const user = admin || (await requireUser(request))
      if (!user) return json({ error: 'Unauthorized' }, 401)

      const urls: string[] = Array.isArray(body.urls) ? body.urls : []
      const publicIds: string[] = Array.isArray(body.publicIds) ? body.publicIds : []

      const ids = [
        ...publicIds,
        ...urls.map((u) => extractPublicIdFromUrl(u)).filter(Boolean),
      ] as string[]

      const unique = Array.from(new Set(ids))
      const deleted: string[] = []
      const failed: { id: string; error: string }[] = []

      for (const publicId of unique) {
        try {
          if (
            !publicId.startsWith('jbp-agrawal/') &&
            !publicId.startsWith('jbp-agrawal-sabha/')
          ) {
            failed.push({ id: publicId, error: 'Forbidden asset path' })
            continue
          }
          if (!admin) {
            const allowed = await userCanDeleteAsset(user.id, publicId, null)
            if (!allowed) {
              failed.push({ id: publicId, error: 'Forbidden' })
              continue
            }
          }
          await destroyCloudinaryAsset(publicId)
          deleted.push(publicId)
        } catch (err) {
          failed.push({
            id: publicId,
            error: err instanceof Error ? err.message : 'Delete failed',
          })
        }
      }

      return json({ success: true, deleted, failed })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (err) {
    console.error('cloudinary API error:', err)
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}
