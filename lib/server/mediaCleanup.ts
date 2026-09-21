/**
 * Collects and destroys Cloudinary assets for a user (server-side, service role).
 */
import { getServiceSupabase } from './supabaseAdmin'
import { destroyCloudinaryAsset } from './cloudinary'
import { extractPublicIdFromUrl } from '@/lib/cloudinaryUrl'

/**
 * Gathers all known Cloudinary delivery URLs owned by a user.
 * @param userId
 */
export async function collectUserMediaUrls(userId: string): Promise<string[]> {
  const admin = getServiceSupabase()
  const urls: string[] = []

  const { data: user } = await admin
    .from('users')
    .select('photo_url')
    .eq('id', userId)
    .maybeSingle()
  if (user?.photo_url) urls.push(user.photo_url)

  const { data: profiles } = await admin
    .from('matrimonial_profiles')
    .select('photos, parent_signature_url, candidate_signature_url')
    .eq('user_id', userId)

  for (const profile of profiles || []) {
    if (Array.isArray(profile.photos)) urls.push(...profile.photos)
    if (profile.parent_signature_url) urls.push(profile.parent_signature_url)
    if (profile.candidate_signature_url) urls.push(profile.candidate_signature_url)
  }

  const { data: events } = await admin
    .from('events')
    .select('poster_url')
    .eq('posted_by', userId)

  for (const event of events || []) {
    if (event.poster_url) urls.push(event.poster_url)
  }

  return Array.from(new Set(urls.filter(Boolean)))
}

/**
 * Best-effort destroy of many Cloudinary URLs.
 * @param urls
 */
export async function destroyCloudinaryUrls(urls: string[]) {
  const deleted: string[] = []
  const failed: { url: string; error: string }[] = []

  for (const url of urls) {
    const publicId = extractPublicIdFromUrl(url)
    if (!publicId) continue
    try {
      await destroyCloudinaryAsset(publicId)
      deleted.push(publicId)
    } catch (err) {
      failed.push({
        url,
        error: err instanceof Error ? err.message : 'Delete failed',
      })
    }
  }

  return { deleted, failed }
}
