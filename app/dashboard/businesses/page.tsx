'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, CheckCircle, XCircle, Star, Eye, Trash2, Store, MapPin, Phone, Mail, MessageCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * Business listings / Advertisements.
 *
 * In this schema a listing IS an advertisement (see migration
 * new_features_foundation: "Business Directory + Advertisements (unified)").
 * Visibility is gated purely on status='approved'. The paid
 * business_ad_packages row adds a gold package tag, a manual UPI-proof step
 * and a listing expiry (via the link_business_payment trigger) — but it does
 * not make a listing an "ad" on its own, which is why both live here.
 */

interface Category {
  id: string
  name: string
  icon: string | null
}

interface Package {
  id: string
  code: string
  name: string
  price: number | string | null
  duration_days: number | null
}

interface Business {
  id: string
  category_id: string | null
  package_id: string | null
  business_name: string
  tagline: string | null
  description: string | null
  established_year: number | null
  owner_name: string | null
  owner_phone: string | null
  owner_email: string | null
  whatsapp_number: string | null
  address: string | null
  city: string | null
  pincode: string | null
  map_link: string | null
  poster_url: string | null
  photo_urls: string[] | null
  status: 'pending' | 'approved' | 'rejected'
  admin_notes: string | null
  is_featured: boolean
  listing_expires_at: string | null
  display_order: number
  created_at: string
  payment_request_id: string | null
  business_categories: Category | null
  business_ad_packages: Package | null
  users: { id: string; full_name: string | null; phone: string | null; email: string | null } | null
}

const STATUS_TONE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
]

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [filtered, setFiltered] = useState<Business[]>([])
  const [statusFilter, setStatusFilter] = useState('pending')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Business | null>(null)
  const [notes, setNotes] = useState('')
  const supabase = createBrowserClient()

  const load = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('businesses')
        .select(
          `*,
           business_categories (id, name, icon),
           business_ad_packages (id, code, name, price, duration_days),
           users!businesses_user_id_fkey (id, full_name, phone, email)`,
        )
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') query = query.eq('status', statusFilter)

      const { data, error } = await query
      if (error) throw error
      setBusinesses((data || []) as unknown as Business[])
    } catch (error) {
      console.error('Error loading businesses:', error)
      toast.error('Failed to load businesses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [statusFilter])

  useEffect(() => {
    const loadCats = async () => {
      const { data } = await supabase
        .from('business_categories')
        .select('id, name, icon')
        .order('display_order')
      setCategories((data || []) as Category[])
    }
    loadCats()
  }, [])

  useEffect(() => {
    const q = search.trim().toLowerCase()
    setFiltered(
      businesses.filter((b) => {
        if (categoryFilter !== 'all' && b.category_id !== categoryFilter) return false
        if (!q) return true
        return [b.business_name, b.owner_name, b.owner_phone, b.city, b.tagline]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      }),
    )
  }, [businesses, search, categoryFilter])

  const setStatus = async (b: Business, status: 'approved' | 'rejected' | 'pending') => {
    if (status === 'rejected' && !notes.trim()) {
      toast.error('Please provide a reason for rejection')
      return
    }
    setBusyId(b.id)
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          status,
          admin_notes: notes.trim() || null,
        })
        .eq('id', b.id)
      if (error) throw error
      toast.success(`Listing ${status}`)
      setSelected(null)
      setNotes('')
      load()
    } catch (error) {
      console.error('Error updating business:', error)
      toast.error('Failed to update listing')
    } finally {
      setBusyId(null)
    }
  }

  const toggleFeatured = async (b: Business) => {
    setBusyId(b.id)
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ is_featured: !b.is_featured })
        .eq('id', b.id)
      if (error) throw error
      load()
    } catch (error) {
      toast.error('Failed to update featured flag')
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (b: Business) => {
    if (!confirm(`Permanently delete "${b.business_name}"? This cannot be undone.`)) return
    setBusyId(b.id)
    try {
      const { error } = await supabase.from('businesses').delete().eq('id', b.id)
      if (error) throw error
      toast.success('Listing deleted')
      setSelected(null)
      load()
    } catch (error) {
      toast.error('Failed to delete listing')
    } finally {
      setBusyId(null)
    }
  }

  const isPaid = (b: Business) =>
    !!b.business_ad_packages && Number(b.business_ad_packages.price || 0) > 0

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Businesses & Advertisements</h1>
        <p className="text-gray-600 mt-1">
          Review submitted listings. Only approved listings appear in the app. Paid
          packages are tagged in gold and carry a listing expiry.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Pending" value={businesses.filter((b) => b.status === 'pending').length} />
        <Stat label="Approved" value={businesses.filter((b) => b.status === 'approved').length} />
        <Stat label="Paid listings" value={businesses.filter(isPaid).length} />
        <Stat label="Featured" value={businesses.filter((b) => b.is_featured).length} />
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {TABS.map((t) => (
                  <SelectItem key={t.key} value={t.key}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by business, owner, city..."
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            No {statusFilter === 'all' ? '' : statusFilter} listings.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((b) => (
            <Card key={b.id}>
              <CardContent className="p-0">
                {b.poster_url && (
                  <img
                    src={b.poster_url}
                    alt=""
                    className="w-full h-40 object-cover rounded-t-lg"
                  />
                )}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {b.business_name}
                      </h3>
                      {b.tagline && (
                        <p className="text-sm text-gray-500 truncate">{b.tagline}</p>
                      )}
                    </div>
                    <Badge className={STATUS_TONE[b.status]}>{b.status}</Badge>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {!!b.business_categories && (
                      <Badge variant="secondary">{b.business_categories.name}</Badge>
                    )}
                    {b.business_ad_packages && (
                      <Badge
                        className={
                          isPaid(b)
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
                            : 'bg-gray-100 text-gray-700'
                        }
                      >
                        {b.business_ad_packages.name}
                        {isPaid(b) ? ` · ₹${b.business_ad_packages.price}` : ''}
                      </Badge>
                    )}
                    {b.is_featured && (
                      <Badge className="bg-purple-100 text-purple-800">
                        <Star className="w-3 h-3 mr-1" /> Featured
                      </Badge>
                    )}
                    {b.listing_expires_at && (
                      <Badge variant="outline">
                        <Clock className="w-3 h-3 mr-1" />
                        until {new Date(b.listing_expires_at).toLocaleDateString('en-IN')}
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-gray-500">
                    {b.owner_name || b.users?.full_name || 'Owner unknown'}
                    {b.city ? ` · ${b.city}` : ''} ·{' '}
                    {new Date(b.created_at).toLocaleDateString('en-IN')}
                  </p>

                  {b.admin_notes && (
                    <p className="text-xs text-gray-500 italic">Note: {b.admin_notes}</p>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => setSelected(b)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    {b.status !== 'approved' && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        disabled={busyId === b.id}
                        onClick={() => setStatus(b, 'approved')}
                      >
                        <CheckCircle className="w-4 h-4" /> Approve
                      </Button>
                    )}
                    {b.status !== 'rejected' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        disabled={busyId === b.id}
                        onClick={() => {
                          setSelected(b)
                          setNotes('')
                        }}
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === b.id}
                      onClick={() => toggleFeatured(b)}
                      title="Toggle featured"
                    >
                      <Star className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === b.id}
                      onClick={() => remove(b)}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.business_name}</DialogTitle>
            <DialogDescription>
              Review the listing before approving. Approved listings appear publicly.
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              {selected.poster_url && (
                <img
                  src={selected.poster_url}
                  alt=""
                  className="w-full h-56 object-cover rounded-lg border"
                />
              )}

              {!!selected.photo_urls?.length && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Gallery</p>
                  <div className="flex gap-2 flex-wrap">
                    {selected.photo_urls.map((p, i) => (
                      <img
                        key={i}
                        src={p}
                        alt=""
                        className="w-20 h-20 rounded-lg object-cover border"
                      />
                    ))}
                  </div>
                </div>
              )}

              {selected.tagline && <p className="text-gray-700 italic">{selected.tagline}</p>}
              {selected.description && (
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {selected.description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <Row icon={<Store className="w-4 h-4" />} label="Category" value={selected.business_categories?.name} />
                <Row
                  icon={<Star className="w-4 h-4" />}
                  label="Package"
                  value={
                    selected.business_ad_packages
                      ? `${selected.business_ad_packages.name}${
                          isPaid(selected) ? ` (₹${selected.business_ad_packages.price})` : ''
                        }`
                      : null
                  }
                />
                <Row icon={<MapPin className="w-4 h-4" />} label="City" value={selected.city} />
                <Row
                  icon={<MapPin className="w-4 h-4" />}
                  label="Address"
                  value={selected.address}
                />
                <Row icon={<Phone className="w-4 h-4" />} label="Owner" value={selected.owner_name} />
                <Row icon={<Phone className="w-4 h-4" />} label="Phone" value={selected.owner_phone} />
                <Row icon={<Mail className="w-4 h-4" />} label="Email" value={selected.owner_email} />
                <Row
                  icon={<MessageCircle className="w-4 h-4" />}
                  label="WhatsApp"
                  value={selected.whatsapp_number}
                />
                <Row
                  icon={<Store className="w-4 h-4" />}
                  label="Established"
                  value={selected.established_year ? String(selected.established_year) : null}
                />
                <Row
                  icon={<Clock className="w-4 h-4" />}
                  label="Expires"
                  value={
                    selected.listing_expires_at
                      ? new Date(selected.listing_expires_at).toLocaleDateString('en-IN')
                      : null
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Notes (required to reject)
                </label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason shown to the owner"
                />
              </div>

              <div className="flex flex-wrap gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Close
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  disabled={busyId === selected.id}
                  onClick={() => setStatus(selected, 'rejected')}
                >
                  <XCircle className="w-4 h-4 mr-1" /> Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  disabled={busyId === selected.id}
                  onClick={() => setStatus(selected, 'approved')}
                >
                  <CheckCircle className="w-4 h-4 mr-1" /> Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </CardContent>
    </Card>
  )
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value?: string | null
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-gray-400 mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-medium text-gray-900 break-words">{value || '—'}</p>
      </div>
    </div>
  )
}
