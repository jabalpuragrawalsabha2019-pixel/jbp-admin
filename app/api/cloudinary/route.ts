/**
 * Cloudinary sign / delete APIs (secrets stay on the server).
 * POST ?action=sign  — return signed upload params
 * POST ?action=delete — destroy asset by public_id
 */
import { NextRequest } from 'next/server'
import { corsOptions, json } from '@/lib/server/http'
import { requireUser, requireAdmin } from '@/lib/server/auth'
import { createSignedUpload, destroyCloudinaryAsset } from '@/lib/server/cloudinary'

export async function OPTIONS() {
  return corsOptions()
}

export async function POST(request: NextRequest) {
  const action = new URL(request.url).searchParams.get('action') || 'sign'

  try {
    const body = await request.json().catch(() => ({}))

    if (action === 'sign') {
      const user = await requireUser(request)
      if (!user) return json({ error: 'Unauthorized' }, 401)

      const folder = String(body.folder || 'general').replace(/[^a-zA-Z0-9/_-]/g, '')
      const signed = createSignedUpload(folder || 'general')
      return json(signed)
    }

    if (action === 'delete') {
      // Deletes require auth; prefer admin for cleanup, allow verified users for own assets later
      const admin = await requireAdmin(request)
      const user = admin || (await requireUser(request))
      if (!user) return json({ error: 'Unauthorized' }, 401)

      const publicId = body.publicId || body.public_id
      if (!publicId) return json({ error: 'publicId is required' }, 400)

      // Non-admins may only delete under their user folder prefix
      if (!admin && !String(publicId).includes(user.id)) {
        return json({ error: 'Forbidden' }, 403)
      }

      const result = await destroyCloudinaryAsset(String(publicId))
      return json({ success: true, result })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (err) {
    console.error('cloudinary API error:', err)
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}
