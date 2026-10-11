/**
 * Admin moderation for content (events/announcements, jobs, matrimonial).
 * PATCH { table, id, status?, fields? }
 * DELETE { table, id }
 */
import { NextRequest } from 'next/server'
import { corsOptions, json } from '@/lib/server/http'
import { requireAdmin } from '@/lib/server/auth'
import { getServiceSupabase } from '@/lib/server/supabaseAdmin'

const ALLOWED_TABLES = new Set([
  'events',
  'jobs',
  'matrimonial_profiles',
  'blood_donors',
  'donations',
  'post_holders',
  'approved_members',
  'deletion_requests',
])

export async function OPTIONS() {
  return corsOptions()
}

export async function PATCH(request: NextRequest) {
  const adminUser = await requireAdmin(request)
  if (!adminUser) return json({ error: 'Forbidden' }, 403)

  try {
    const body = await request.json()
    const table = body.table as string
    const id = body.id as string
    const fields = (body.fields || {}) as Record<string, unknown>

    if (!ALLOWED_TABLES.has(table) || !id) {
      return json({ error: 'Invalid table or id' }, 400)
    }

    // Never allow privilege escalation via this endpoint
    delete fields.is_admin
    delete fields.id

    if (typeof body.status === 'string') {
      fields.status = body.status
      if (['approved', 'rejected'].includes(body.status)) {
        fields.approved_by = adminUser.id
      }
    }

    if (table === 'donations' && typeof fields.is_verified === 'boolean') {
      fields.verified_by = adminUser.id
      fields.verified_at = new Date().toISOString()
    }

    const admin = getServiceSupabase()
    const { data, error } = await admin
      .from(table)
      .update(fields)
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) return json({ error: error.message }, 500)

    await admin.from('admin_logs').insert({
      admin_id: adminUser.id,
      action: 'moderate_update',
      target_type: table,
      target_id: id,
      details: fields,
    })

    return json({ data })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}

export async function POST(request: NextRequest) {
  const adminUser = await requireAdmin(request)
  if (!adminUser) return json({ error: 'Forbidden' }, 403)

  try {
    const body = await request.json()
    const table = body.table as string
    const record = (body.record || {}) as Record<string, unknown>

    if (!ALLOWED_TABLES.has(table)) {
      return json({ error: 'Invalid table' }, 400)
    }

    delete record.is_admin

    const admin = getServiceSupabase()
    const { data, error } = await admin.from(table).insert(record).select().maybeSingle()
    if (error) return json({ error: error.message }, 500)

    await admin.from('admin_logs').insert({
      admin_id: adminUser.id,
      action: 'moderate_insert',
      target_type: table,
      target_id: data?.id || null,
      details: record,
    })

    return json({ data })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}

export async function DELETE(request: NextRequest) {
  const adminUser = await requireAdmin(request)
  if (!adminUser) return json({ error: 'Forbidden' }, 403)

  try {
    const body = await request.json()
    const table = body.table as string
    const id = body.id as string

    if (!ALLOWED_TABLES.has(table) || !id) {
      return json({ error: 'Invalid table or id' }, 400)
    }

    const admin = getServiceSupabase()
    const { error } = await admin.from(table).delete().eq('id', id)
    if (error) return json({ error: error.message }, 500)

    await admin.from('admin_logs').insert({
      admin_id: adminUser.id,
      action: 'moderate_delete',
      target_type: table,
      target_id: id,
      details: {},
    })

    return json({ success: true })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}
