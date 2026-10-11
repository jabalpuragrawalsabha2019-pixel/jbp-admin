/**
 * GET /api/health — liveness + config readiness check for the mobile/backend API.
 *
 * `service` confirms the process is up. `config.cloudinary.ready === false`
 * means every image upload in BOTH apps (admin panel + Expo mobile app) will
 * fail with HTTP 500, because both POST to /api/cloudinary?action=sign.
 */
import { corsOptions, json } from '@/lib/server/http'
import { getCloudinaryConfigStatus } from '@/lib/server/cloudinary'

export async function OPTIONS() {
  return corsOptions()
}

export async function GET() {
  const cloudinary = getCloudinaryConfigStatus()
  return json({
    ok: true,
    service: 'jbp-api',
    config: { cloudinary },
  })
}
