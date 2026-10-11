'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollText } from 'lucide-react'

/**
 * Admin activity log.
 *
 * admin_logs has been written by /api/admin/users and /api/admin/moderate for
 * every privileged mutation since it was added, but no page ever displayed it —
 * so the audit trail existed only in the database.
 */

interface LogRow {
  id: string
  admin_id: string | null
  action: string
  target_type: string | null
  target_id: string | null
  details: unknown
  created_at: string
  users: { full_name: string | null; email: string | null } | null
}

const ACTION_TONE = (action: string) => {
  if (action.includes('delete')) return 'bg-red-100 text-red-800'
  if (action.includes('approved')) return 'bg-green-100 text-green-800'
  if (action.includes('rejected')) return 'bg-amber-100 text-amber-800'
  if (action.includes('update') || action.includes('toggle')) return 'bg-blue-100 text-blue-800'
  return 'bg-gray-100 text-gray-700'
}

export default function ActivityLogPage() {
  const [rows, setRows] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const supabase = createBrowserClient()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        let query = supabase
          .from('admin_logs')
          .select('*, users (full_name, email)')
          .order('created_at', { ascending: false })
          .limit(200)
        if (filter !== 'all') query = query.eq('target_type', filter)
        const { data, error } = await query
        if (error) throw error
        setRows((data || []) as unknown as LogRow[])
      } catch (error) {
        console.error('Error loading admin log:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [filter])

  const targets = [...new Set(rows.map((r) => r.target_type).filter(Boolean))] as string[]

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <ScrollText className="w-7 h-7" /> Admin Activity Log
        </h1>
        <p className="text-gray-600 mt-1">
          The 200 most recent privileged actions taken in the admin panel and API.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          All
        </button>
        {targets.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              filter === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            No admin actions recorded yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Badge className={ACTION_TONE(r.action)}>{r.action}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">
                        {r.users?.full_name || r.users?.email || 'Unknown admin'}
                      </span>{' '}
                      on{' '}
                      <span className="font-mono text-xs">{r.target_type || '—'}</span>
                      {r.target_id ? (
                        <span className="font-mono text-xs text-gray-400">
                          {' '}
                          {String(r.target_id).slice(0, 8)}
                        </span>
                      ) : null}
                    </p>
                    {r.details != null && (
                      <pre className="text-xs text-gray-500 mt-1 whitespace-pre-wrap break-all">
                        {typeof r.details === 'string'
                          ? r.details
                          : JSON.stringify(r.details)}
                      </pre>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(r.created_at).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
