/**
 * Cloudinary signed upload / destroy helpers (server-only).
 */
import { createHash } from 'crypto'

/**
 * Reports whether the server-side Cloudinary credentials are present.
 * BOTH apps (admin panel + Expo mobile app) route every image upload through
 * POST /api/cloudinary?action=sign, so a missing key here breaks uploads in
 * both. Surfaced by GET /api/health for pre-test verification.
 */
export function getCloudinaryConfigStatus() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  const missing = [
    !cloudName && 'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME',
    !apiKey && 'CLOUDINARY_API_KEY',
    !apiSecret && 'CLOUDINARY_API_SECRET',
  ].filter(Boolean) as string[]

  return {
    ready: missing.length === 0,
    cloudName: cloudName || null,
    missing,
  }
}

/**
 * Builds a Cloudinary upload signature for the given params.
 * @param params - Params to sign (timestamp, folder, etc.)
 * @returns Hex SHA-1 signature
 */
export function signCloudinaryParams(params: Record<string, string | number>): string {
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!apiSecret) {
    throw new Error(
      'CLOUDINARY_API_SECRET is not configured — add it to jbp-admin/.env (see .env.example). Image uploads in both apps will fail until then.',
    )
  }

  const toSign = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')

  return createHash('sha1').update(toSign + apiSecret).digest('hex')
}

/**
 * Returns signed upload fields for a client multipart upload.
 * Folder is always scoped: jbp-agrawal/{folder}/{ownerId}
 * @param folder - Logical folder (profiles, matrimonial, events, ...)
 * @param ownerId - Authenticated user id (ownership scope for later deletes)
 */
export function createSignedUpload(folder: string, ownerId: string) {
  const apiKey = process.env.CLOUDINARY_API_KEY
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  if (!apiKey || !cloudName) {
    const { missing } = getCloudinaryConfigStatus()
    throw new Error(
      `Cloudinary is not configured (missing: ${missing.join(', ')}) — add these to jbp-admin/.env (see .env.example).`,
    )
  }
  if (!ownerId) {
    throw new Error('ownerId is required for signed uploads')
  }

  const safeFolder = String(folder || 'general').replace(/[^a-zA-Z0-9/_-]/g, '')
  const timestamp = Math.round(Date.now() / 1000)
  const folderPath = `jbp-agrawal/${safeFolder}/${ownerId}`
  const params = { folder: folderPath, timestamp }
  const signature = signCloudinaryParams(params)

  return {
    cloudName,
    apiKey,
    timestamp,
    folder: folderPath,
    signature,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
  }
}

/**
 * Deletes a Cloudinary asset by public_id using the Admin API.
 * @param publicId - Cloudinary public_id
 */
export async function destroyCloudinaryAsset(publicId: string) {
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  if (!apiKey || !apiSecret || !cloudName) {
    const { missing } = getCloudinaryConfigStatus()
    throw new Error(
      `Cloudinary credentials are incomplete (missing: ${missing.join(', ')}) — image deletes will fail until these are set in jbp-admin/.env.`,
    )
  }

  const timestamp = Math.round(Date.now() / 1000)
  const signature = signCloudinaryParams({ public_id: publicId, timestamp })

  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: apiKey,
    signature,
  })

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    },
  )

  const result = await response.json()
  // "not found" is treated as success so retries / already-deleted assets don't fail flows
  if (result.result === 'not found') {
    return result
  }
  if (!response.ok || result.result === 'error') {
    throw new Error(result.error?.message || 'Cloudinary delete failed')
  }

  return result
}
