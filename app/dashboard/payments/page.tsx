'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, CheckCircle, XCircle, Eye, Trash2, IndianRupee } from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * Payment verification (manual UPI proof flow).
 *
 * Previously this queue only existed inside the mobile app's Admin screens, so
 * an admin had to use their phone to verify payments. Approving a payment whose
 * entity_type is 'business' also approves the linked listing and stamps
 * listing_expires_at via the link_business_payment() trigger.
 */

interface Package {
  id: string
  code: string
  name: string
  price: number | string | null
}

interface PaymentRequest {
  id: string
  user_id: string
  entity_type: string
  entity_id: string | null
  amount: number | string
  reference: string | null
  proof_url: string | null
  upi_id: string | null
  status: 'pending' | 'approved' | 'rejected'
  admin_notes: string | null
  created_at: string
  users: { id: string; full_name: string | null; phone: string | null } | null
  business_ad_packages: Package | null
  businesses: { id: string; business_name: string; status: string } | null
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

export default function PaymentsPage() {
  const [rows, setRows] = useState<PaymentRequest[]>([])
  const [filtered, setFiltered] = useState<PaymentRequest[]>([])
  const [statusFilter, setStatusFilter] = useState('pending')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [selected, setSelected] = useState<PaymentRequest | null>(null)
  const [notes, setNotes] = useState('')
  const supabase = createBrowserClient()

  const load = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('payment_requests')
        .select(
          `*,
           users!payment_requests_user_id_fkey (id, full_name, phone),
           business_ad_packages (id, code, name, price),
           businesses (id, business_name, status)`,
        )
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') query = query.eq('status', statusFilter)

      const { data, error } = await query
      if (error) throw error
      setRows((data || []) as unknown as PaymentRequest[])
    } catch (error) {
      console.error('Error loading payments:', error)
      toast.error('Failed to load payment requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [statusFilter])

  useEffect(() => {
    const q = search.trim().toLowerCase()
    setFiltered(
      !q
        ? rows
        : rows.filter((r) =>
            [r.users?.full_name, r.reference, r.upi_id, r.businesses?.business_name]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(q)),
          ),
    )
  }, [rows, search])

  const review = async (row: PaymentRequest, decision: 'approved' | 'rejected') => {
    if (decision === 'rejected' && !notes.trim()) {
      toast.error('Please provide a reason for rejection')
      return
    }
    setBusyId(row.id)
    try {
      const { error } = await supabase
        .from('payment_requests')
        .update({ status: decision, admin_notes: notes.trim() || null })
        .eq('id', row.id)
      if (error) throw error

      // Approving a business payment also activates the listing, mirroring the
      // mobile admin flow so the two surfaces behave identically. Membership,
      // matrimonial and other entity types have NO side effect here: membership
      // is activated only by review_membership_request(), and a matrimonial
      // profile keeps its own separate approval.
      if (decision === 'approved' && row.entity_type === 'business' && row.entity_id) {
        const { error: linkErr } = await supabase
          .from('businesses')
          .update({ status: 'approved', admin_notes: null, payment_request_id: row.id })
          .eq('id', row.entity_id)
        if (linkErr) console.error('Failed to link business to payment:', linkErr)
      }

      // Audit trail. Payment decisions previously wrote nothing to admin_logs,
      // so there was no record of who verified a membership (or business) fee.
      // Best-effort only: a logging failure must not fail the decision, which
      // has already been applied above.
      try {
        const { data: auth } = await supabase.auth.getUser()
        await supabase.from('admin_logs').insert({
          admin_id: auth?.user?.id ?? null,
          action: `payment_${decision}`,
          target_type: 'payment_requests',
          target_id: row.id,
          details: {
            entity_type: row.entity_type,
            amount: Number(row.amount),
            reference: row.reference,
            user_id: row.user_id,
            notes: notes.trim() || null,
          },
        })
      } catch (logErr) {
        console.error('Failed to write payment audit log:', logErr)
      }

      toast.success(decision === 'approved' ? 'Payment verified' : 'Payment rejected')
      setSelected(null)
      setNotes('')
      load()
    } catch (error) {
      console.error('Error reviewing payment:', error)
      toast.error('Failed to save decision')
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (row: PaymentRequest) => {
    if (!confirm('Permanently delete this payment request?')) return
    setBusyId(row.id)
    try {
      const { error } = await supabase.from('payment_requests').delete().eq('id', row.id)
      if (error) throw error
      toast.success('Deleted')
      setSelected(null)
      load()
    } catch (error) {
      toast.error('Failed to delete')
    } finally {
      setBusyId(null)
    }
  }

  const total = filtered.reduce((sum, r) => sum + Number(r.amount || 0), 0)

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Payment Requests</h1>
        <p className="text-gray-600 mt-1">
          Verify manual UPI payment proofs. Approving a business payment activates the
          linked listing and starts its expiry.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Requests" value={String(filtered.length)} />
        <Stat label="Total amount" value={`₹${total.toLocaleString('en-IN')}`} />
        <Stat
          label="Pending value"
          value={`₹${filtered
            .filter((r) => r.status === 'pending')
            .reduce((s, r) => s + Number(r.amount || 0), 0)
            .toLocaleString('en-IN')}`}
        />
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
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, UPI ref..."
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            No {statusFilter === 'all' ? '' : statusFilter} payment requests.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row gap-4">
                  {r.proof_url && (
                    <img
                      src={r.proof_url}
                      alt="Payment proof"
                      className="w-full md:w-40 h-32 object-cover rounded-lg border cursor-zoom-in"
                      onClick={() => setSelected(r)}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-lg font-bold text-gray-900 flex items-center">
                        <IndianRupee className="w-4 h-4" />
                        {Number(r.amount).toLocaleString('en-IN')}
                      </p>
                      <Badge className={STATUS_TONE[r.status]}>{r.status}</Badge>
                      {!!r.business_ad_packages && (
                        <Badge className="bg-yellow-100 text-yellow-800">
                          {r.business_ad_packages.name}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {r.users?.full_name || 'Member'}
                      {r.users?.phone ? ` · +91 ${r.users.phone}` : ''}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {r.entity_type}
                      {r.businesses?.business_name ? ` · ${r.businesses.business_name}` : ''}
                      {r.reference ? ` · ref ${r.reference}` : ''}
                      {r.upi_id ? ` · ${r.upi_id}` : ''}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(r.created_at).toLocaleString('en-IN')}
                    </p>
                    {r.admin_notes && (
                      <p className="text-xs text-gray-500 italic mt-1">{r.admin_notes}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 items-start">
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
                        <CheckCircle className="w-4 h-4" /> Verify
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Payment proof</DialogTitle>
            <DialogDescription>Confirm the amount actually arrived.</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {selected.proof_url && (
                <img
                  src={selected.proof_url}
                  alt="Payment proof"
                  className="w-full rounded-lg border"
                />
              )}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Notes (required to reject)
                </label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason shown to the member"
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
                  <CheckCircle className="w-4 h-4 mr-1" /> Verify
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
