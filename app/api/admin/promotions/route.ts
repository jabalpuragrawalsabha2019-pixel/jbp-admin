/**
 * Advertising + New Offers moderation.
 *
 * Both are per-day / promotional content attached to an APPROVED business and
 * owned by the business owner. Admin approves or rejects; the app only ever
 * shows rows that are approved AND inside their date window (see public.is_live),
 * so a row stops being active automatically after its end date.
 *
 * GET  — ?table=advertisements|offers[&status=pending|approved|rejected|all]
 * POST — { table, id, decision: approved|rejected, notes }
 * PATCH— { table, id, fields }   admin-only edits (dates, is_featured, etc.)
 */
import { NextRequest } from 'next/server'
import { corsOptions, json } from '@/lib/server/http'
import { requireAdmin } from '@/lib/server/auth'
import { getServiceSupabase } from '@/lib/server/supabaseAdmin'

const TABLES = new Set(['advertisements', 'offers'])

function resolveTable(value: unknown): string | null {
  const t = String(value || '')
  return TABLES.has(t) ? t : null
}

/** Columns a client must never set directly. */
const PROTECTED = new Set([
  'id',
  'user_id',
  'days',
  'total_price',
  'status',
  'admin_notes',
  'reviewed_by',
  'reviewed_at',
  'created_at',
  'updated_at',
])

export async function OPTIONS() {
  return corsOptions()
}

export async function GET(request: NextRequest) {
  const adminUser = await requireAdmin(request)
  if (!adminUser) return json({ error: 'Forbidden' }, 403)

  try {
    const params = new URL(request.url).searchParams
    const table = resolveTable(params.get('table'))
    if (!table) return json({ error: 'table must be advertisements or offers' }, 400)

    const status = params.get('status') || 'all'
    const admin = getServiceSupabase()

    let query = admin
      .from(table)
      .select(
        `*,
         businesses!${table === 'offers' ? 'offers' : 'advertisements'}_business_id_fkey (
           id, business_name, city, poster_url, status
         ),
         users!${table === 'offers' ? 'offers' : 'advertisements'}_user_id_fkey (
           id, full_name, phone, email
         )`,
      )
      .order('created_at', { ascending: false })

    if (status !== 'all') query = query.eq('status', status)

    const { data, error } = await query
    if (error) return json({ error: error.message }, 500)

    // Return rows with a computed `is_live` so the UI can show "expired".
    const today = new Date().toISOString().slice(0, 10)
    const rows = (data || []).map((r: Record<string, unknown>) => ({
      ...r,
      is_live:
        r.status === 'approved' &&
        typeof r.start_date === 'string' &&
        typeof r.end_date === 'string' &&
        today >= r.start_date &&
        today <= r.end_date,
    }))

    return json({ data: rows })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}

export async function POST(request: NextRequest) {
  const adminUser = await requireAdmin(request)
  if (!adminUser) return json({ error: 'Forbidden' }, 403)

  try {
    const body = await request.json()
    const table = resolveTable(body.table)
    if (!table) return json({ error: 'table must be advertisements or offers' }, 400)

    const id = body.id as string
    const decision = body.decision as string
    const notes = (body.notes ?? null) as string | null

    if (!id) return json({ error: 'id is required' }, 400)
    if (decision !== 'approved' && decision !== 'rejected') {
      return json({ error: 'decision must be approved or rejected' }, 400)
    }

    const admin = getServiceSupabase()
    const patch: Record<string, unknown> = {
      status: decision,
      admin_notes: notes,
      reviewed_by: adminUser.id,
      reviewed_at: new Date().toISOString(),
    }

    const { data, error } = await admin
      .from(table)
      .update(patch)
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) return json({ error: error.message }, 500)
    if (!data) return json({ error: 'Record not found' }, 404)

    await admin.from('admin_logs').insert({
      admin_id: adminUser.id,
      action: `${table.slice(0, -1)}_${decision}`,
      target_type: table,
      target_id: id,
      details: { notes },
    })

    return json({ data })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}

export async function PATCH(request: NextRequest) {
  const adminUser = await requireAdmin(request)
  if (!adminUser) return json({ error: 'Forbidden' }, 403)

  try {
    const body = await request.json()
    const table = resolveTable(body.table)
    if (!table) return json({ error: 'table must be advertisements or offers' }, 400)

    const id = body.id as string
    if (!id) return json({ error: 'id is required' }, 400)

    const fields: Record<string, unknown> = { ...(body.fields || {}) }
    for (const key of Object.keys(fields)) {
      if (PROTECTED.has(key)) delete fields[key]
    }
    if (!Object.keys(fields).length) {
      return json({ error: 'No editable fields supplied' }, 400)
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
      action: 'promotion_update',
      target_type: table,
      target_id: id,
      details: fields,
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
    const table = resolveTable(body.table)
    if (!table) return json({ error: 'table must be advertisements or offers' }, 400)
    const id = body.id as string
    if (!id) return json({ error: 'id is required' }, 400)

    const admin = getServiceSupabase()
    const { error } = await admin.from(table).delete().eq('id', id)
    if (error) return json({ error: error.message }, 500)

    await admin.from('admin_logs').insert({
      admin_id: adminUser.id,
      action: 'promotion_delete',
      target_type: table,
      target_id: id,
      details: {},
    })

    return json({ success: true })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}
