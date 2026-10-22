/**
 * app_settings CRUD (admin only).
 *
 * The Settings page previously "saved" with setTimeout + a success toast and
 * persisted nothing, so app_settings could only be edited from the Supabase
 * dashboard. This route makes those settings real.
 *
 * Known keys
 *   advertising.price_per_day  — per-day advertisement rate (number)
 *   membership.fee              — Lifetime Membership fee (number)
 *   membership.fee_spouse       — Lifetime Membership with Spouse fee (number)
 *   payment.upi_id / payment.upi_name / payment.qr_url
 *   app.name / app.contact_email / app.contact_phone
 *
 * GET  ?key=<setting_key>   → { key, value }
 * POST { key, value }       → upsert
 */
import { NextRequest } from 'next/server'
import { corsOptions, json } from '@/lib/server/http'
import { requireAdmin } from '@/lib/server/auth'
import { getServiceSupabase } from '@/lib/server/supabaseAdmin'

/** Keys the admin panel is allowed to write. */
const WRITABLE = new Set([
  'advertising.price_per_day',
  'membership.fee',
  'membership.fee_spouse',
  'payment.upi_id',
  'payment.upi_name',
  'payment.qr_url',
  'app.name',
  'app.contact_email',
  'app.contact_phone',
])

/**
 * Membership fees are validated here so an unusable value can never reach the
 * pricing triggers (membership_plan_fee() treats anything non-numeric as
 * "not configured", which would silently disable a plan). An empty value is
 * allowed on purpose: it means "plan not offered yet".
 */
const NUMERIC = new Set([
  'advertising.price_per_day',
  'membership.fee',
  'membership.fee_spouse',
])

export async function OPTIONS() {
  return corsOptions()
}

export async function GET(request: NextRequest) {
  const adminUser = await requireAdmin(request)
  if (!adminUser) return json({ error: 'Forbidden' }, 403)

  try {
    const key = new URL(request.url).searchParams.get('key')
    const admin = getServiceSupabase()

    if (key) {
      const { data, error } = await admin
        .from('app_settings')
        .select('setting_key, setting_value')
        .eq('setting_key', key)
        .maybeSingle()
      if (error) return json({ error: error.message }, 500)
      return json({ key, value: data?.setting_value ?? null })
    }

    const { data, error } = await admin
      .from('app_settings')
      .select('setting_key, setting_value, updated_at')
      .order('setting_key')
    if (error) return json({ error: error.message }, 500)
    return json({ data: data || [] })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}

export async function POST(request: NextRequest) {
  const adminUser = await requireAdmin(request)
  if (!adminUser) return json({ error: 'Forbidden' }, 403)

  try {
    const body = await request.json()
    const key = String(body.key || '')
    const value = body.value == null ? '' : String(body.value)

    if (!key) return json({ error: 'key is required' }, 400)
    if (!WRITABLE.has(key)) return json({ error: `Unknown setting: ${key}` }, 400)

    // Numeric settings are validated here so a bad value can never reach the
    // advertising price trigger or the membership plan pricing.
    if (NUMERIC.has(key)) {
      const raw = value.trim()
      const isMembershipFee = key.startsWith('membership.')
      const emptyMeansDisabled = isMembershipFee && raw === ''

      if (!emptyMeansDisabled) {
        const n = Number(raw)
        const validFormat = /^\d+(\.\d{1,2})?$/.test(raw)
        if (!validFormat || !Number.isFinite(n) || (isMembershipFee ? n <= 0 : n < 0)) {
          return json(
            {
              error: isMembershipFee
                ? `${key} must be a positive amount with up to 2 decimals, or empty to disable the plan`
                : 'price_per_day must be a non-negative number',
            },
            400,
          )
        }
      }
    }

    const admin = getServiceSupabase()
    const { data, error } = await admin
      .from('app_settings')
      .upsert({ setting_key: key, setting_value: value }, { onConflict: 'setting_key' })
      .select()
      .maybeSingle()

    if (error) return json({ error: error.message }, 500)

    await admin.from('admin_logs').insert({
      admin_id: adminUser.id,
      action: 'update_setting',
      target_type: 'app_settings',
      target_id: key,
      details: { value },
    })

    return json({ data })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}
