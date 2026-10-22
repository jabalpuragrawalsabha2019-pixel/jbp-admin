'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Trash2, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * "Ongoing at the Sabha" tiles.
 *
 * ongoing_activities is rendered on the app Home screen but had no admin
 * interface anywhere in either app — the only way to change it was the
 * Supabase dashboard.
 */

interface Activity {
  id: string
  title: string
  description: string | null
  icon: string | null
  color: string | null
  frequency: string | null
  is_active: boolean
  display_order: number
}

export default function ActivitiesPage() {
  const [rows, setRows] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ title: '', description: '', icon: '', frequency: '' })
  const supabase = createBrowserClient()

  const load = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('ongoing_activities')
        .select('*')
        .order('display_order')
      if (error) throw error
      setRows(data || [])
    } catch (error) {
      console.error('Error loading activities:', error)
      toast.error('Failed to load activities')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const add = async () => {
    if (!draft.title.trim()) {
      toast.error('Title is required')
      return
    }
    const { error } = await supabase.from('ongoing_activities').insert({
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      icon: draft.icon.trim() || null,
      frequency: draft.frequency.trim() || null,
      display_order: rows.length + 1,
    })
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Activity added')
    setDraft({ title: '', description: '', icon: '', frequency: '' })
    setAdding(false)
    load()
  }

  const update = async (a: Activity, patch: Partial<Activity>) => {
    const { error } = await supabase.from('ongoing_activities').update(patch).eq('id', a.id)
    if (error) {
      toast.error(error.message)
      return
    }
    load()
  }

  const remove = async (a: Activity) => {
    if (!confirm(`Delete "${a.title}"?`)) return
    const { error } = await supabase.from('ongoing_activities').delete().eq('id', a.id)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Deleted')
    load()
  }

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ongoing Activities</h1>
          <p className="text-gray-600 mt-1">
            Shown as &quot;Ongoing at the Sabha&quot; tiles on the app Home screen.
          </p>
        </div>
        <Button onClick={() => setAdding((v) => !v)}>
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </div>

      {adding && (
        <Card>
          <CardContent className="p-6 space-y-3">
            <Input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Title (e.g. Morning Bhajan)"
            />
            <Textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Description"
              rows={2}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                value={draft.icon}
                onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
                placeholder="Icon (e.g. music-note)"
              />
              <Input
                value={draft.frequency}
                onChange={(e) => setDraft({ ...draft, frequency: e.target.value })}
                placeholder="Frequency (e.g. Every morning)"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button onClick={add}>Save</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {rows.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center text-gray-500">
              No activities yet.
            </CardContent>
          </Card>
        )}
        {rows.map((a) => (
          <Card key={a.id}>
            <CardContent className="p-4 flex flex-col md:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <Input
                  defaultValue={a.title}
                  className="font-medium"
                  onBlur={(e) => {
                    if (e.target.value !== a.title) update(a, { title: e.target.value })
                  }}
                />
                <Textarea
                  defaultValue={a.description || ''}
                  rows={2}
                  placeholder="Description"
                  onBlur={(e) => {
                    if (e.target.value !== (a.description || ''))
                      update(a, { description: e.target.value || null })
                  }}
                />
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    defaultValue={a.icon || ''}
                    placeholder="Icon"
                    onBlur={(e) => update(a, { icon: e.target.value || null })}
                  />
                  <Input
                    defaultValue={a.frequency || ''}
                    placeholder="Frequency"
                    onBlur={(e) => update(a, { frequency: e.target.value || null })}
                  />
                  <Input
                    type="number"
                    defaultValue={String(a.display_order)}
                    placeholder="Order"
                    onBlur={(e) => update(a, { display_order: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="flex gap-2 items-start">
                <Button variant="outline" size="sm" onClick={() => update(a, { is_active: !a.is_active })}>
                  {a.is_active ? 'Active' : 'Hidden'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => remove(a)}>
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
