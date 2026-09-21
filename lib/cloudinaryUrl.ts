/**
 * Shared Cloudinary URL helpers (safe for browser + server).
 */

/**
 * Extracts a Cloudinary public_id from a secure_url / delivery URL.
 * Returns null for non-Cloudinary URLs.
 * @param url - Full Cloudinary delivery URL
 */
export function extractPublicIdFromUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null
  if (!url.includes('res.cloudinary.com') && !url.includes('cloudinary.com')) {
    return null
  }

  const uploadMarker = '/upload/'
  const idx = url.indexOf(uploadMarker)
  if (idx === -1) return null

  let path = url.slice(idx + uploadMarker.length)
  // Drop query params
  path = path.split('?')[0]

  const parts = path.split('/').filter(Boolean)
  // Skip transformation segments (e.g. c_fill,w_200) and version (v123)
  while (parts.length) {
    const part = parts[0]
    if (part.startsWith('v') && /^v\d+$/.test(part)) {
      parts.shift()
      continue
    }
    if (part.includes(',') || /^[a-z]+_/.test(part)) {
      parts.shift()
      continue
    }
    break
  }

  if (!parts.length) return null

  const last = parts[parts.length - 1]
  parts[parts.length - 1] = last.replace(/\.[a-zA-Z0-9]+$/, '')
  return decodeURIComponent(parts.join('/'))
}

/**
 * True when public_id is scoped under this user's folder.
 * Expected path: jbp-agrawal/.../<userId>/...
 * @param publicId
 * @param userId
 */
export function publicIdBelongsToUser(publicId: string, userId: string): boolean {
  if (!publicId || !userId) return false
  return publicId.includes(`/${userId}/`) || publicId.endsWith(`/${userId}`)
}
