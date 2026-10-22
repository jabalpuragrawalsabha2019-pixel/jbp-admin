'use client'

import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/adminApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, CheckCircle, XCircle, Award, Eye } from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * Membership applications.
 *
 * Membership is a STANDALONE application, independent of the Pratyashi
 * Parichay (matrimonial) flow. The applicant's own details are stored as a
 * submission snapshot on the request, and their fee payment lives in
 * payment_requests (entity_type = 'membership'). Reviewing one never modifies
 * a matrimonial profile.
 *
 * Approve/reject goes through /api/admin/membership, which calls
 * public.review_membership_request() — it refuses to approve unless the linked
 * payment is approved, and keeps users.is_member consistent.
 */

interface Applicant {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  photo_url: string | null
  city: string | null
  is_member: boolean
  is_verified: boolean
  is_banned: boolean
  member_since: string | null
}

interface MembershipPayment {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  amount: number
  amount_paid: number | null
  plan_id: string | null
  proof_url: string | null
  reference: string | null
  upi_id: string | null
  reviewed_by: string | null
  reviewed_at: string | null
}

interface MembershipRequest {
  id: string
  user_id: string
  status: 'pending' | 'approved' | 'rejected'
  admin_notes: string | null
  reviewed_at: string | null
  created_at: string
  // submission snapshot
  full_name: string | null
  phone: string | null
  email: string | null
  date_of_birth: string | null
  gender: string | null
  gotra: string | null
  occupation: string | null
  business_name: string | null
  father_guardian_name: string | null
  father_mobile: string | null
  address: string | null
  city: string | null
  pincode: string | null
  photo_url: string | null
  // plan + the fee that was due when it was submitted (immutable snapshot)
  membership_plan: string | null
  membership_type: string | null
  applicant_notes: string | null
  fee_amount: number | null
  // spouse snapshot, only filled for the lifetime_spouse plan
  spouse_full_name: string | null
  spouse_phone: string | null
  spouse_email: string | null
  spouse_date_of_birth: string | null
  spouse_gender: string | null
  spouse_gotra: string | null
  spouse_occupation: string | null
  spouse_business_name: string | null
  spouse_father_guardian_name: string | null
  spouse_father_mobile: string | null
  spouse_address: string | null
  spouse_city: string | null
  spouse_pincode: string | null
  spouse_photo_url: string | null
  payment_request_id: string | null
  matrimonial_profile_id: string | null
  users: Applicant | null
  payment_requests: MembershipPayment | null
}

/** Label for a stored plan value. Legacy rows still carry membership_type. */
function planLabel(r: MembershipRequest): string | null {
  const value = r.membership_plan || r.membership_type
  if (!value) return null
  if (value === 'lifetime_spouse') return 'Lifetime with Spouse'
  if (value === 'lifetime' || ['family', 'individual', 'patron'].includes(value)) {
    return 'Lifetime'
  }
  return value
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

export default function MembershipRequestsPage() {
  const [requests, setRequests] = useState<MembershipRequest[]>([])
  const [filtered, setFiltered] = useState<MembershipRequest[]>([])
  const [statusFilter, setStatusFilter] = useState('pending')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [selected, setSelected] = useState<MembershipRequest | null>(null)
  const [notes, setNotes] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const { data, error } = await adminApi<MembershipRequest[]>(
        `/api/admin/membership?status=${statusFilter}`,
        'GET',
      )
      if (error) throw new Error(error)
      setRequests(data || [])
    } catch (error) {
      console.error('Error loading membership requests:', error)
      toast.error('Failed to load membership requests')
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
        ? requests
        : requests.filter((r) =>
            [
              r.users?.full_name,
              r.users?.phone,
              r.users?.email,
              r.full_name,
              r.phone,
              r.gotra,
              r.users?.city,
            ]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(q)),
          ),
    )
  }, [requests, search])

  const review = async (id: string, decision: 'approved' | 'rejected') => {
    if (decision === 'rejected' && !notes.trim()) {
      toast.error('Please provide a reason for rejection')
      return
    }
    setBusyId(id)
    try {
      const { error } = await adminApi('/api/admin/membership', 'POST', {
        id,
        decision,
        notes: notes.trim() || null,
      })
      if (error) throw new Error(error)

      toast.success(
        decision === 'approved'
          ? 'Membership approved — the member badge is now active'
          : 'Membership rejected',
      )
      setSelected(null)
      setNotes('')
      load()
    } catch (error) {
      console.error('Error reviewing membership request:', error)
      toast.error('Failed to save decision')
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
        <h1 className="text-3xl font-bold text-gray-900">Membership Requests</h1>
        <p className="text-gray-600 mt-1">
          Approving grants society membership (the gold badge). It is independent of
          verification, which only gates feature access.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {(['pending', 'approved', 'rejected'] as const).map((s) => (
          <Card key={s}>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500 capitalize">{s}</p>
              <p className="text-2xl font-bold text-gray-900">
                {requests.filter((r) => r.status === s).length}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  {TABS.map((t) => (
                    <SelectItem key={t.key} value={t.key}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, phone, gotra..."
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            No {statusFilter === 'all' ? '' : statusFilter} membership requests.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {r.users?.photo_url ? (
                    <img
                      src={r.users.photo_url}
                      alt=""
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500">
                      {(r.users?.full_name || '?').charAt(0)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {r.full_name || r.users?.full_name || 'Unknown'}
                      </h3>
                      <Badge className={STATUS_TONE[r.status]}>
                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </Badge>
                      {planLabel(r) && (
                        <Badge className="bg-blue-100 text-blue-800">{planLabel(r)}</Badge>
                      )}
                      {r.payment_requests && (
                        <Badge
                          className={
                            r.payment_requests.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : r.payment_requests.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                          }
                        >
                          Payment {r.payment_requests.status}
                        </Badge>
                      )}
                      {r.users?.is_member && (
                        <Badge className="bg-yellow-100 text-yellow-800">
                          <Award className="w-3 h-3 mr-1" /> Member
                        </Badge>
                      )}
                      {!r.users?.is_verified && (
                        <Badge className="bg-amber-100 text-amber-800">Unverified</Badge>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mt-1">
                      {r.phone ? `+91 ${r.phone}` : 'No phone'}
                      {r.email ? ` · ${r.email}` : ''}
                      {r.gotra ? ` · Gotra: ${r.gotra}` : ''}
                    </p>

                    <p className="text-xs text-gray-500 mt-1">
                      Fee ₹{r.fee_amount ?? '—'} · applied{' '}
                      {new Date(r.created_at).toLocaleDateString('en-IN')}
                    </p>

                    {r.admin_notes && (
                      <p className="text-xs text-gray-500 mt-2 italic">
                        Note: {r.admin_notes}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelected(r)}>
                      <Eye className="w-4 h-4 mr-1" /> Review
                    </Button>
                    {r.status !== 'approved' && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        disabled={busyId === r.id || r.payment_requests?.status !== 'approved'}
                        title={
                          r.payment_requests?.status !== 'approved'
                            ? 'Payment must be approved in Payment Verification first'
                            : undefined
                        }
                        onClick={() => review(r.id, 'approved')}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" /> Approve
                      </Button>
                    )}
                    {r.status !== 'rejected' && (
                      <Button
                        size="sm"
                        className="bg-red-600 hover:bg-red-700"
                        disabled={busyId === r.id}
                        onClick={() => {
                          setSelected(r)
                          setNotes('')
                        }}
                      >
                        <XCircle className="w-4 h-4 mr-1" /> Reject
                      </Button>
                    )}
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
            <DialogTitle>Membership Application</DialogTitle>
            <DialogDescription>
              Submitted details and payment proof for this application.
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              {selected.payment_requests && selected.payment_requests.status !== 'approved' && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  Payment is{' '}
                  <strong>{selected.payment_requests.status}</strong>. Approve the payment in
                  Payment Verification first — membership approval requires it.
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <Detail label="Applicant" value={selected.full_name} />
                <Detail
                  label="Phone"
                  value={selected.phone ? `+91 ${selected.phone}` : null}
                />
                <Detail label="Email" value={selected.email} />
                <Detail label="Date of birth" value={selected.date_of_birth} />
                <Detail label="Gender" value={selected.gender} />
                <Detail label="Gotra" value={selected.gotra} />
                <Detail label="Occupation" value={selected.occupation} />
                <Detail label="Business / firm" value={selected.business_name} />
                <Detail label="Father / guardian" value={selected.father_guardian_name} />
                <Detail
                  label="Guardian mobile"
                  value={selected.father_mobile ? `+91 ${selected.father_mobile}` : null}
                />
                <Detail label="Address" value={selected.address} />
                <Detail label="City" value={selected.city} />
                <Detail label="Pincode" value={selected.pincode} />
                <Detail
                  label="Membership plan"
                  value={planLabel(selected) || '—'}
                />
                <Detail
                  label="Fee due at submission"
                  value={selected.fee_amount ? `₹${selected.fee_amount}` : null}
                />
                <Detail
                  label="Payment status"
                  value={selected.payment_requests?.status || 'none'}
                />
                <Detail
                  label="Amount paid"
                  value={
                    selected.payment_requests?.amount_paid != null
                      ? `₹${selected.payment_requests.amount_paid}`
                      : null
                  }
                />
                <Detail label="UPI ID used" value={selected.payment_requests?.upi_id} />
                <Detail label="UPI reference" value={selected.payment_requests?.reference} />
              </div>

              {selected.spouse_full_name && (
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    Spouse (Lifetime Membership with Spouse)
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Detail label="Spouse name" value={selected.spouse_full_name} />
                    <Detail
                      label="Phone"
                      value={selected.spouse_phone ? `+91 ${selected.spouse_phone}` : null}
                    />
                    <Detail label="Email" value={selected.spouse_email} />
                    <Detail label="Date of birth" value={selected.spouse_date_of_birth} />
                    <Detail label="Gender" value={selected.spouse_gender} />
                    <Detail label="Gotra" value={selected.spouse_gotra} />
                    <Detail label="Occupation" value={selected.spouse_occupation} />
                    <Detail label="Business / firm" value={selected.spouse_business_name} />
                    <Detail
                      label="Father / guardian"
                      value={selected.spouse_father_guardian_name}
                    />
                    <Detail
                      label="Guardian mobile"
                      value={
                        selected.spouse_father_mobile
                          ? `+91 ${selected.spouse_father_mobile}`
                          : null
                      }
                    />
                    <Detail label="Address" value={selected.spouse_address} />
                    <Detail label="City" value={selected.spouse_city} />
                    <Detail label="Pincode" value={selected.spouse_pincode} />
                  </div>
                </div>
              )}

              {selected.photo_url && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Photograph</p>
                  <img
                    src={selected.photo_url}
                    alt=""
                    className="w-20 h-20 rounded-lg object-cover border"
                  />
                </div>
              )}

              {selected.payment_requests?.proof_url && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Payment proof screenshot
                  </p>
                  <a href={selected.payment_requests.proof_url} target="_blank" rel="noreferrer">
                    <img
                      src={selected.payment_requests.proof_url}
                      alt=""
                      className="max-w-sm rounded-lg object-cover border"
                    />
                  </a>
                </div>
              )}

              {selected.applicant_notes && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Applicant note</p>
                  <p className="text-sm">{selected.applicant_notes}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Notes (required to reject)
                </label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason or a note for the applicant"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Close
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  disabled={busyId === selected.id}
                  onClick={() => review(selected.id, 'rejected')}
                >
                  <XCircle className="w-4 h-4 mr-1" /> Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  disabled={busyId === selected.id || selected.payment_requests?.status !== 'approved'}
                  onClick={() => review(selected.id, 'approved')}
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

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-gray-900">{value || '—'}</p>
    </div>
  )
}
