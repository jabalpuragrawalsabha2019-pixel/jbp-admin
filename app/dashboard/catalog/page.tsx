'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Plus, Trash2, Pencil, Tags, BadgeIndianRupee } from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * Business categories + advertisement packages.
 *
 * Both tables drive the app's Business Directory (filter chips, category picker)
 * and the paid-plan picker, and both had RLS admin policies but no admin UI at
 * all, so they could only be changed by hand in the Supabase dashboard.
 */

interface Category {
  id: string
  name: string
  icon: string | null
  display_order: number
  is_active: boolean
}

interface Package {
  id: string
  code: string
  name: string
  description: string | null
  price: number | string
  duration_days: number
  max_photos: number
  is_featured: boolean
  display_order: number
  is_active: boolean
}

export default function CatalogPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient()

  const load = async () => {
    setLoading(true)
    try {
      const [cats, pkgs] = await Promise.all([
        supabase
          .from('business_categories')
          .select('*')
          .order('display_order'),
        supabase
          .from('business_ad_packages')
          .select('*')
          .order('display_order'),
      ])
      if (cats.error) throw cats.error
      if (pkgs.error) throw pkgs.error
      setCategories(cats.data || [])
      setPackages(pkgs.data || [])
    } catch (error) {
      console.error('Error loading catalog:', error)
      toast.error('Failed to load categories and packages')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  // ---- categories ----
  const addCategory = async () => {
    const name = window.prompt('Category name')
    if (!name?.trim()) return
    const { error } = await supabase.from('business_categories').insert({
      name: name.trim(),
      display_order: categories.length + 1,
    })
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Category added')
    load()
  }

  const updateCategory = async (c: Category, patch: Partial<Category>) => {
    const { error } = await supabase.from('business_categories').update(patch).eq('id', c.id)
    if (error) {
      toast.error(error.message)
      return
    }
    load()
  }

  const deleteCategory = async (c: Category) => {
    if (!confirm(`Delete category "${c.name}"? Listings using it will lose their category.`)) return
    const { error } = await supabase.from('business_categories').delete().eq('id', c.id)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Category deleted')
    load()
  }

  // ---- packages ----
  const addPackage = async () => {
    const name = window.prompt('Package name')
    if (!name?.trim()) return
    const code = window.prompt('Unique code (lowercase, e.g. premium)') || name.trim().toLowerCase()
    const { error } = await supabase.from('business_ad_packages').insert({
      code: code.trim().toLowerCase().replace(/\s+/g, '-'),
      name: name.trim(),
      price: 0,
      duration_days: 365,
      max_photos: 1,
      is_featured: false,
      display_order: packages.length + 1,
    })
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Package added')
    load()
  }

  const updatePackage = async (p: Package, patch: Partial<Package>) => {
    const { error } = await supabase.from('business_ad_packages').update(patch).eq('id', p.id)
    if (error) {
      toast.error(error.message)
      return
    }
    load()
  }

  const deletePackage = async (p: Package) => {
    if (!confirm(`Delete package "${p.name}"?`)) return
    const { error } = await supabase.from('business_ad_packages').delete().eq('id', p.id)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Package deleted')
    load()
  }

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Categories & Packages</h1>
        <p className="text-gray-600 mt-1">
          These drive the Business Directory in the app. Disable rather than delete when
          you want to hide something without breaking existing listings.
        </p>
      </div>

      {/* Categories */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Tags className="w-5 h-5" /> Categories ({categories.length})
          </h2>
          <Button onClick={addCategory}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    defaultValue={c.name}
                    className="font-medium"
                    onBlur={(e) => {
                      if (e.target.value.trim() && e.target.value !== c.name) {
                        updateCategory(c, { name: e.target.value.trim() })
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateCategory(c, { is_active: !c.is_active })}
                  >
                    {c.is_active ? 'Active' : 'Hidden'}
                  </Button>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <label className="flex items-center gap-1.5">
                    <span className="text-gray-500">Icon</span>
                    <Input
                      defaultValue={c.icon || ''}
                      className="w-24 h-8"
                      placeholder="storefront"
                      onBlur={(e) => updateCategory(c, { icon: e.target.value || null })}
                    />
                  </label>
                  <label className="flex items-center gap-1.5">
                    <span className="text-gray-500">Order</span>
                    <Input
                      type="number"
                      defaultValue={c.display_order}
                      className="w-16 h-8"
                      onBlur={(e) =>
                        updateCategory(c, { display_order: Number(e.target.value) || 0 })
                      }
                    />
                  </label>
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => deleteCategory(c)}>
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Packages */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BadgeIndianRupee className="w-5 h-5" /> Advertisement Packages (
            {packages.length})
          </h2>
          <Button onClick={addPackage}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>

        <div className="space-y-3">
          {packages.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4 items-start">
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Field
                      label="Name"
                      defaultValue={p.name}
                      onBlur={(v) => updatePackage(p, { name: v })}
                    />
                    <Field
                      label="Code"
                      defaultValue={p.code}
                      onBlur={(v) => updatePackage(p, { code: v })}
                    />
                    <Field
                      label="Price ₹"
                      type="number"
                      defaultValue={String(p.price)}
                      onBlur={(v) => updatePackage(p, { price: Number(v) || 0 })}
                    />
                    <Field
                      label="Duration (days)"
                      type="number"
                      defaultValue={String(p.duration_days)}
                      onBlur={(v) => updatePackage(p, { duration_days: Number(v) || 0 })}
                    />
                    <Field
                      label="Max photos"
                      type="number"
                      defaultValue={String(p.max_photos)}
                      onBlur={(v) => updatePackage(p, { max_photos: Number(v) || 0 })}
                    />
                    <Field
                      label="Display order"
                      type="number"
                      defaultValue={String(p.display_order)}
                      onBlur={(v) => updatePackage(p, { display_order: Number(v) || 0 })}
                    />
                    <div className="col-span-2">
                      <label className="text-xs text-gray-500 block mb-1">Description</label>
                      <Input
                        defaultValue={p.description || ''}
                        onBlur={(e) => {
                          if (e.target.value !== (p.description || ''))
                            updatePackage(p, { description: e.target.value || null })
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{p.code === 'free' ? 'Free tier' : 'Paid'}</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updatePackage(p, { is_active: !p.is_active })}
                    >
                      {p.is_active ? 'Active' : 'Hidden'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => deletePackage(p)}>
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  defaultValue,
  onBlur,
  type = 'text',
}: {
  label: string
  defaultValue: string
  onBlur: (value: string) => void
  type?: string
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <Input
        type={type}
        defaultValue={defaultValue}
        onBlur={(e) => {
          if (e.target.value !== defaultValue) onBlur(e.target.value)
        }}
      />
    </div>
  )
}
