'use client'

import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/adminApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle, XCircle, Eye, Trash2, Megaphone, Calendar, IndianRupee } from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * Advertisement approval.
 *
 * An advertisement is optional, per-day paid promotion attached to an APPROVED
 * business. The owner picks start/end dates; `days` and `total_price` are
 * derived by a database trigger from the configurable
 * app_settings['advertising.price_per_day'] rate, so the figure shown here is
 * always the server's, never the client's.
 *
 * Only approved advertisements inside their date window appear in the app
 * (public.is_live), so they expire automatically.
 */

interface Row {
  id: string
  title: string
  description: string | null
  poster_url: string | null
  offer_details: string | null
  promo_content: string | null
  start_date: string
  end_date: string
  days: number | null
  total_price: number | string | null
  amount_paid: number | string | null
  payment_proof_url: string | null
  payment_reference: string | null
  status: 'pending' | 'approved' | 'rejected'
  admin_notes: string | null
  created_at: string
  is_live?: boolean
  businesses: { id: string; business_name: string; city: string | null; status: string } | null
  users: { id: string; full_name: string | null; phone: string | null } | null
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

export default function AdvertisementsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [statusFilter, setStatusFilter] = useState('pending')
  const [rate, setRate] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Row | null>(null)
  const [notes, setNotes] = useState('')
  const [rateDraft, setRateDraft] = useState<string>('')
  const [savingRate, setSavingRate] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { data, error } = await adminApi<Row[]>(
        `/api/admin/promotions?table=advertisements&status=${statusFilter}`,
        'GET',
      )
      if (error) throw new Error(error)
      setRows(data || [])
    } catch (error) {
      console.error('Error loading advertisements:', error)
      toast.error('Failed to load advertisements')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [statusFilter])

  useEffect(() => {
    adminApi<{ price_per_day: number }>('/api/admin/promotions?table=advertisements', 'GET')
      .then(() => undefined)
      .catch(() => undefined)
    fetch('/api/admin/settings?key=advertising.price_per_day')
      .then((r) => r.json())
      .then((b) => {
        if (b?.value) {
          setRate(String(b.value))
          setRateDraft(String(b.value))
        }
      })
      .catch(() => undefined)
  }, [])

  const saveRate = async () => {
    const n = Number(rateDraft)
    if (!Number.isFinite(n) || n < 0) {
      toast.error('Enter a valid per-day amount')
      return
    }
    setSavingRate(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'advertising.price_per_day', value: String(n) }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Failed to save')
      setRate(String(n))
      toast.success('Advertising rate updated')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save rate',
      )
    } finally {
      setSavingRate(false)
    }
  }

  const review = async (row: Row, decision: 'approved' | 'rejected') => {
    if (decision === 'rejected' && !notes.trim()) {
      toast.error('Please provide a reason for rejection')
      return
    }
    setBusyId(row.id)
    try {
      const { error } = await adminApi('/api/admin/promotions', 'POST', {
        table: 'advertisements',
        id: row.id,
        decision,
        notes: notes.trim() || null,
      })
      if (error) throw new Error(error)
      toast.success(decision === 'approved' ? 'Advertisement approved' : 'Advertisement rejected')
      setSelected(null)
      setNotes('')
      load()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save decision',
      )
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (row: Row) => {
    if (!confirm(`Delete advertisement "${row.title}"?`)) return
    setBusyId(row.id)
    try {
      const { error } = await adminApi('/api/admin/promotions', 'DELETE', {
        table: 'advertisements',
        id: row.id,
      })
      if (error) throw new Error(error)
      toast.success('Deleted')
      setSelected(null)
      load()
    } catch (error) {
      toast.error('Failed to delete')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-96">Loading...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Advertisements</h1>
        <p className="text-gray-600 mt-1">
          Optional per-day promotion for approved businesses. Only approved ads inside
          their date range appear in the app, so they expire on their own.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Advertising price per day (₹)
              </label>
              <Input
                value={rateDraft}
                onChange={(e) => setRateDraft(e.target.value)}
                inputMode="numeric"
                placeholder="100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Applied to all new advertisements. Existing rows keep the price they
                were created with until their dates change.
              </p>
            </div>
            <Button onClick={saveRate} disabled={savingRate || rateDraft === rate}>
              {savingRate ? 'Saving...' : 'Save rate'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Showing" value={String(rows.length)} />
        <Stat label="Pending" value={String(rows.filter((r) => r.status === 'pending').length)} />
        <Stat label="Live now" value={String(rows.filter((r) => r.is_live).length)} />
        <Stat
          label="Value"
          value={`₹${rows
            .filter((r) => r.status === 'approved')
            .reduce((s, r) => s + Number(r.total_price || 0), 0)
            .toLocaleString('en-IN')}`}
        />
      </div>

      <Card>
        <CardContent className="p-6">
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
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            No {statusFilter === 'all' ? '' : statusFilter} advertisements.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-0">
                {r.poster_url && (
                  <img src={r.poster_url} alt="" className="w-full h-40 object-cover rounded-t-lg" />
                )}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900">{r.title}</h3>
                    <Badge className={STATUS_TONE[r.status]}>{r.status}</Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    {r.businesses?.business_name || 'Unknown business'}
                    {r.businesses?.city ? ` · ${r.businesses.city}` : ''}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline">
                      <Calendar className="w-3 h-3 mr-1" />
                      {String(r.start_date).slice(0, 10)} → {String(r.end_date).slice(0, 10)}
                    </Badge>
                    <Badge variant="secondary">{r.days ?? 0} day(s)</Badge>
                    <Badge className="bg-yellow-100 text-yellow-800">
                      <IndianRupee className="w-3 h-3 mr-1" />
                      {Number(r.total_price || 0).toLocaleString('en-IN')} due
                    </Badge>
                    {r.amount_paid != null && (
                      <Badge
                        className={
                          Number(r.amount_paid) === Number(r.total_price)
                            ? 'bg-green-100 text-green-800'
                            : 'bg-amber-100 text-amber-800'
                        }
                      >
                        paid {Number(r.amount_paid).toLocaleString('en-IN')}
                      </Badge>
                    )}
                    {/* payment proof thumbnail so it is reviewable from the list */}
                    {r.payment_proof_url && r.payment_proof_url.startsWith('http') && (
                      <img
                        src={r.payment_proof_url}
                        alt="payment proof"
                        onClick={() => setSelected(r)}
                        className="w-16 h-16 rounded-lg object-cover border cursor-zoom-in"
                      />
                    )}
                    {r.payment_proof_url === 'not-on-file' && (
                      <Badge variant="outline" className="text-gray-500">
                        no proof on file
                      </Badge>
                    )}
                    {!!r.payment_reference && (
                      <Badge variant="secondary">ref {r.payment_reference}</Badge>
                    )}
                    {r.status === 'approved' && !r.is_live && (
                      <Badge variant="outline" className="text-gray-500">
                        not live
                      </Badge>
                    )}
                    {r.is_live && (
                      <Badge className="bg-green-100 text-green-800">live</Badge>
                    )}
                  </div>
                  {r.admin_notes && (
                    <p className="text-xs text-gray-500 italic">Note: {r.admin_notes}</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => setSelected(r)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    {r.status !== 'approved' && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        disabled={busyId === r.id}
                        onClick={() => review(r, 'approved')}
                      >
                        <CheckCircle className="w-4 h-4" /> Approve
                      </Button>
                    )}
                    {r.status !== 'rejected' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        disabled={busyId === r.id}
                        onClick={() => {
                          setSelected(r)
                          setNotes('')
                        }}
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === r.id}
                      onClick={() => remove(r)}
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
            <DialogTitle>{selected?.title}</DialogTitle>
            <DialogDescription>
              {selected?.businesses?.business_name} · {selected?.days ?? 0} day(s) · due ₹
              {Number(selected?.total_price || 0).toLocaleString('en-IN')}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-gray-500">Amount due</p>
                  <p className="text-lg font-bold text-gray-900">
                    {'₹'}
                    {Number(selected.total_price || 0).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-gray-500">Amount paid (claimed)</p>
                  <p
                    className={`text-lg font-bold ${
                      Number(selected.amount_paid) === Number(selected.total_price)
                        ? 'text-green-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {'₹'}
                    {Number(selected.amount_paid || 0).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-gray-500">UPI reference</p>
                  <p className="font-medium text-gray-900">
                    {selected.payment_reference || '—'}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-gray-500">Runs</p>
                  <p className="font-medium text-gray-900 text-xs">
                    {String(selected.start_date).slice(0, 10)} →{' '}
                    {String(selected.end_date).slice(0, 10)}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Payment screenshot
                </p>
                {selected.payment_proof_url?.startsWith('http') ? (
                  <img
                    src={selected.payment_proof_url}
                    alt="Payment proof"
                    className="w-full rounded-lg border"
                  />
                ) : (
                  <p className="text-sm text-gray-500">
                    No payment screenshot on file — created before proof capture was
                    required.
                  </p>
                )}
              </div>
              {selected.poster_url && (
                <img src={selected.poster_url} alt="" className="w-full rounded-lg border" />
              )}
              {selected.description && <p className="text-sm text-gray-700">{selected.description}</p>}
              {selected.offer_details && (
                <Detail label="Offer details" value={selected.offer_details} />
              )}
              {selected.promo_content && (
                <Detail label="Promotional content" value={selected.promo_content} />
              )}
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
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Close
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  disabled={busyId === selected.id}
                  onClick={() => review(selected, 'rejected')}
                >
                  <XCircle className="w-4 h-4 mr-1" /> Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  disabled={busyId === selected.id}
                  onClick={() => review(selected, 'approved')}
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </CardContent>
    </Card>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm text-gray-800 whitespace-pre-wrap">{value}</p>
    </div>
  )
}
