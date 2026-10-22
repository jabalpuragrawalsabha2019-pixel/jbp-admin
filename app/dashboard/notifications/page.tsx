'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Send, Bell, Megaphone } from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * Notification broadcast + history.
 *
 * Previously broadcasts could only be sent from the mobile app's AdminNotify
 * screen. A row with user_id = null reaches every authenticated member; the
 * "Admins can create notifications" RLS policy prevents an admin from forging a
 * notification addressed to a specific other member.
 */

interface Notification {
  id: string
  user_id: string | null
  type: string
  title: string
  body: string | null
  is_read: boolean
  created_at: string
  users: { full_name: string | null } | null
}

const TYPES = [
  { key: 'announcement', label: 'Announcement' },
  { key: 'event', label: 'Event' },
  { key: 'membership', label: 'Membership' },
  { key: 'admin', label: 'Admin' },
]

export default function NotificationsPage() {
  const [rows, setRows] = useState<Notification[]>([])
  const [type, setType] = useState('announcement')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const supabase = createBrowserClient()

  const load = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*, users (full_name)')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      setRows((data || []) as unknown as Notification[])
    } catch (error) {
      console.error('Error loading notifications:', error)
      toast.error('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const broadcast = async () => {
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    setSending(true)
    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: null, // broadcast to all members
        type,
        title: title.trim(),
        body: body.trim() || null,
        data: {},
      })
      if (error) throw error
      toast.success('Broadcast sent to all members')
      setTitle('')
      setBody('')
      load()
    } catch (error) {
      console.error('Error sending notification:', error)
      toast.error('Failed to send notification')
    } finally {
      setSending(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this notification?')) return
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', id)
      if (error) throw error
      toast.success('Deleted')
      load()
    } catch (error) {
      toast.error('Failed to delete')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
        <p className="text-gray-600 mt-1">
          Broadcast to every member, and review what has already been sent.
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              New broadcast
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Type</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.key} value={t.key}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Annual General Meeting on 12 Oct"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Message</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Details shown in the member notification centre"
              rows={3}
            />
          </div>

          <Button onClick={broadcast} disabled={sending}>
            <Send className="w-4 h-4 mr-2" />
            {sending ? 'Sending...' : 'Send to all members'}
          </Button>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Bell className="w-5 h-5" /> Recent notifications ({rows.length})
        </h2>

        {loading ? (
          <div className="flex items-center justify-center h-32">Loading...</div>
        ) : rows.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-gray-500">
              No notifications sent yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {rows.map((n) => (
              <Card key={n.id}>
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{n.title}</p>
                      <Badge variant="secondary">{n.type}</Badge>
                      <Badge variant="outline">
                        {n.user_id ? `To: ${n.users?.full_name || 'member'}` : 'Broadcast'}
                      </Badge>
                    </div>
                    {n.body && <p className="text-sm text-gray-600 mt-1">{n.body}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(n.created_at).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => remove(n.id)}>
                    Delete
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
