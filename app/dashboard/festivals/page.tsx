'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * Festival themes.
 *
 * These drive the animated Diwali/festival effects on the app Home screen
 * (FestivalEffects / FestivalBanner). They were editable only from the mobile
 * app's AdminFestivals screen; this brings the same controls to the web admin.
 */

interface Theme {
  id: string
  code: string
  name: string
  emoji: string | null
  is_enabled: boolean
  starts_at: string | null
  ends_at: string | null
  wish_title: string | null
  wish_body: string | null
  show_banner: boolean
  show_diya: boolean
  show_firecracker: boolean
  show_snow: boolean
  show_color_splash: boolean
  accent_color: string | null
  banner_emoji: string | null
  display_order: number
}

const EFFECTS = [
  { key: 'show_banner', label: 'Banner' },
  { key: 'show_diya', label: 'Diya' },
  { key: 'show_firecracker', label: 'Firecracker' },
  { key: 'show_snow', label: 'Snow' },
  { key: 'show_color_splash', label: 'Colour splash' },
] as const

export default function FestivalsPage() {
  const [rows, setRows] = useState<Theme[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const supabase = createBrowserClient()

  const load = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('festival_themes')
        .select('*')
        .order('display_order')
      if (error) throw error
      setRows(data || [])
    } catch (error) {
      console.error('Error loading festival themes:', error)
      toast.error('Failed to load festival themes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const patch = async (t: Theme, fields: Partial<Theme>) => {
    setBusyId(t.id)
    try {
      const { error } = await supabase.from('festival_themes').update(fields).eq('id', t.id)
      if (error) throw error
      load()
    } catch (error) {
      console.error('Error updating theme:', error)
      toast.error('Failed to save')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Festival Themes</h1>
        <p className="text-gray-600 mt-1">
          Control the seasonal animations and greetings shown on the app Home screen.
        </p>
      </div>

      <div className="space-y-4">
        {rows.map((t) => (
          <Card key={t.id}>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{t.emoji || '🎉'}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={t.is_enabled ? 'default' : 'secondary'}>
                    {t.is_enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                  <Button
                    size="sm"
                    variant={t.is_enabled ? 'outline' : 'default'}
                    disabled={busyId === t.id}
                    onClick={() => patch(t, { is_enabled: !t.is_enabled })}
                  >
                    {t.is_enabled ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Starts</label>
                  <Input
                    type="date"
                    defaultValue={t.starts_at ? String(t.starts_at).slice(0, 10) : ''}
                    onBlur={(e) =>
                      patch(t, { starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Ends</label>
                  <Input
                    type="date"
                    defaultValue={t.ends_at ? String(t.ends_at).slice(0, 10) : ''}
                    onBlur={(e) =>
                      patch(t, { ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Accent colour</label>
                  <Input
                    type="color"
                    defaultValue={t.accent_color || '#F97316'}
                    onBlur={(e) => patch(t, { accent_color: e.target.value as string })}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Display order</label>
                  <Input
                    type="number"
                    defaultValue={String(t.display_order)}
                    onBlur={(e) => patch(t, { display_order: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Wish title</label>
                  <Input
                    defaultValue={t.wish_title || ''}
                    onBlur={(e) => patch(t, { wish_title: e.target.value || null })}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Banner emoji</label>
                  <Input
                    defaultValue={t.banner_emoji || ''}
                    onBlur={(e) => patch(t, { banner_emoji: e.target.value || null })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Wish message</label>
                <Input
                  defaultValue={t.wish_body || ''}
                  onBlur={(e) => patch(t, { wish_body: e.target.value || null })}
                />
              </div>

              <div className="flex flex-wrap gap-4 pt-1">
                {EFFECTS.map((fx) => (
                  <label key={fx.key} className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={!!t[fx.key]}
                      disabled={busyId === t.id}
                      onCheckedChange={(v) => patch(t, { [fx.key]: v } as Partial<Theme>)}
                    />
                    {fx.label}
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
