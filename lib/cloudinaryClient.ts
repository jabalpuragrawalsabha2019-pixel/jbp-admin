/**
 * Browser Cloudinary helpers for the admin app (JWT + secure API).
 * Never uses Cloudinary API secrets in the browser.
 */
import { createBrowserClient } from '@/lib/supabase'
import { extractPublicIdFromUrl } from '@/lib/cloudinaryUrl'

/**
 * Gets the current session access token.
 */
async function getAccessToken(): Promise<string | null> {
  const supabase = createBrowserClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

/**
 * Authenticated fetch to /api/cloudinary.
 */
async function cloudinaryApi(action: string, body: Record<string, unknown>) {
  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')

  const response = await fetch(`/api/cloudinary?action=${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(json.error || `Cloudinary API error (${response.status})`)
  }
  return json
}

/**
 * Uploads a File via signed Cloudinary request (user-scoped folder).
 * @param file - Browser File
 * @param folder - Logical folder e.g. events, settings/qr
 */
export async function uploadAdminImage(file: File, folder: string) {
  const signed = await cloudinaryApi('sign', { folder })

  const form = new FormData()
  form.append('file', file)
  form.append('api_key', signed.apiKey)
  form.append('timestamp', String(signed.timestamp))
  form.append('signature', signed.signature)
  form.append('folder', signed.folder)

  const response = await fetch(signed.uploadUrl, { method: 'POST', body: form })
  const data = await response.json()
  if (!response.ok || data.error) {
    throw new Error(data.error?.message || 'Upload failed')
  }

  return {
    url: data.secure_url as string,
    publicId: data.public_id as string,
  }
}

/**
 * Deletes a Cloudinary asset by delivery URL (no-op for non-Cloudinary URLs).
 * @param url - Existing asset URL
 */
export async function deleteCloudinaryUrl(url?: string | null) {
  if (!url || !extractPublicIdFromUrl(url)) return { success: true, skipped: true }
  return cloudinaryApi('delete', { url })
}

/**
 * Uploads a new image and deletes the previous Cloudinary asset when present.
 * @param file - New file
 * @param folder - Upload folder
 * @param previousUrl - URL to delete after successful upload
 */
export async function replaceAdminImage(
  file: File,
  folder: string,
  previousUrl?: string | null,
) {
  const uploaded = await uploadAdminImage(file, folder)
  if (previousUrl && previousUrl !== uploaded.url) {
    try {
      await deleteCloudinaryUrl(previousUrl)
    } catch (err) {
      console.error('Failed to delete previous Cloudinary asset:', err)
    }
  }
  return uploaded
}

/**
 * Deletes many Cloudinary URLs (best-effort).
 * @param urls - Asset URLs
 */
export async function deleteCloudinaryUrls(urls: Array<string | null | undefined>) {
  const cleaned = urls.filter((u): u is string => !!u && !!extractPublicIdFromUrl(u))
  if (!cleaned.length) return { success: true, deleted: [], failed: [] }
  return cloudinaryApi('delete-many', { urls: cleaned })
}

export { extractPublicIdFromUrl }
