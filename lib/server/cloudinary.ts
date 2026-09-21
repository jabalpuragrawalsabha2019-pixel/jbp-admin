/**
 * Cloudinary signed upload / destroy helpers (server-only).
 */
import { createHash } from 'crypto'

/**
 * Builds a Cloudinary upload signature for the given params.
 * @param params - Params to sign (timestamp, folder, etc.)
 * @returns Hex SHA-1 signature
 */
export function signCloudinaryParams(params: Record<string, string | number>): string {
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!apiSecret) {
    throw new Error('CLOUDINARY_API_SECRET is not configured')
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
    throw new Error('Cloudinary API key / cloud name missing')
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
    throw new Error('Cloudinary credentials missing')
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
