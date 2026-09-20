/**
 * Membership + profile APIs.
 * POST /api/profile/complete — create/update profile; server sets is_verified from approved_members.
 * POST /api/profile/check-membership — check phone against approved_members (no full list exposure).
 */
import { NextRequest } from 'next/server'
import { corsOptions, json } from '@/lib/server/http'
import { requireUser } from '@/lib/server/auth'
import { getServiceSupabase } from '@/lib/server/supabaseAdmin'

export async function OPTIONS() {
  return corsOptions()
}

/**
 * Normalizes a phone string to digits only.
 * @param phone - Raw phone input
 */
function cleanPhone(phone: unknown): string {
  return String(phone || '').replace(/\D/g, '')
}

/**
 * Looks up an approved member by phone (service role).
 * @param phone - Digits-only phone
 */
async function findApprovedMember(phone: string) {
  const admin = getServiceSupabase()
  const { data, error } = await admin
    .from('approved_members')
    .select('phone, full_name, city, gotra')
    .eq('phone', phone)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url)
  const action = url.searchParams.get('action') || 'complete'

  const user = await requireUser(request)
  if (!user) {
    return json({ error: 'Unauthorized' }, 401)
  }

  try {
    const body = await request.json()

    if (action === 'check-membership') {
      const phone = cleanPhone(body.phone)
      if (phone.length !== 10) {
        return json({ error: 'Invalid phone number' }, 400)
      }

      const member = await findApprovedMember(phone)
      return json({
        verified: !!member,
        member: member
          ? {
              full_name: member.full_name,
              city: member.city,
              gotra: member.gotra,
            }
          : null,
      })
    }

    // Default: complete profile
    const phone = cleanPhone(body.phone)
    if (phone.length !== 10) {
      return json({ error: 'Valid 10-digit phone is required' }, 400)
    }

    if (!body.full_name || !body.city) {
      return json({ error: 'full_name and city are required' }, 400)
    }

    const member = await findApprovedMember(phone)
    const admin = getServiceSupabase()

    const payload = {
      id: user.id,
      phone,
      full_name: String(body.full_name).trim(),
      gender: body.gender || null,
      guardian_type: body.guardian_type || 'father',
      guardian_name: body.guardian_name?.trim() || null,
      city: String(body.city).trim(),
      address: body.address?.trim() || null,
      pincode: body.pincode?.trim() || null,
      occupation: body.occupation?.trim() || null,
      photo_url: body.photo_url || null,
      email: body.email || user.email || null,
      google_id: body.google_id || null,
      // Privilege flags are set only on the server
      is_verified: !!member,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await admin
      .from('users')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .maybeSingle()

    if (error) {
      console.error('profile complete error:', error)
      return json({ error: error.message }, 500)
    }

    return json({ data, verified: !!member })
  } catch (err) {
    console.error('profile API error:', err)
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}
