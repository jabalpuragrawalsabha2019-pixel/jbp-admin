'use client'

import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/adminApi'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Eye, Heart, Clock, CheckCircle, XCircle, User, IdCard } from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * One row from public.get_contact_requests_for_admin().
 *
 * The requester may have sent one of their own matrimonial profiles OR their
 * personal details ("Other / Personal Profile"), so both shapes are carried.
 */
interface ContactRequest {
  id: string
  profile_id: uuidOrNull
  requester_id: uuidOrNull
  requester_profile_id: uuidOrNull
  use_personal_profile: boolean
  personal_name: string | null
  personal_phone: string | null
  personal_email: string | null
  personal_gotra: string | null
  personal_city: string | null
  status: string
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  admin_notes: string | null
  profile_candidate_name: string | null
  profile_user_id: uuidOrNull
  requester_full_name: string | null
  requester_phone: string | null
  requester_email: string | null
}

type uuidOrNull = string | null

export default function ContactRequestsPage() {
  const [requests, setRequests] = useState<ContactRequest[]>([])
  const [filteredRequests, setFilteredRequests] = useState<ContactRequest[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedRequest, setSelectedRequest] = useState<ContactRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notes, setNotes] = useState('')

  const fetchRequests = async (status: string) => {
    setLoading(true)
    try {
      const { data, error } = await adminApi<ContactRequest[]>(
        `/api/admin/contact-requests?status=${status === 'all' ? 'all' : status}`,
        'GET',
      )
      if (error) throw new Error(error)
      setRequests(data || [])
    } catch (error) {
      console.error('Error fetching contact requests:', error)
      toast.error('Failed to fetch contact requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests(statusFilter)
  }, [statusFilter])

  useEffect(() => {
    setFilteredRequests(requests)
  }, [requests])

  /**
   * Accept or reject a request. The decision is made by
   * public.review_contact_request(), which is admin-only.
   */
  const review = async (id: string, decision: 'accepted' | 'rejected') => {
    setBusyId(id)
    try {
      const { error } = await adminApi('/api/admin/contact-requests', 'PATCH', {
        id,
        decision,
        notes: notes.trim() || null,
      })
      if (error) throw new Error(error)
      toast.success(`Request ${decision}`)
      setSelectedRequest(null)
      setNotes('')
      fetchRequests(statusFilter)
    } catch (error) {
      console.error('Error reviewing contact request:', error)
      toast.error('Failed to review contact request')
    } finally {
      setBusyId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Accepted
          </Badge>
        )
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        )
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )
    }
  }

  const getStats = () => {
    return {
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      accepted: requests.filter(r => r.status === 'accepted').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
    }
  }

  const stats = getStats()

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contact Requests</h1>
          <p className="text-gray-600 mt-1">Matrimonial profile contact requests</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold mt-2">{stats.total}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Heart className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600 mt-2">{stats.pending}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Accepted</p>
                <p className="text-2xl font-bold text-green-600 mt-2">{stats.accepted}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600 mt-2">{stats.rejected}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Requests</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-gray-600">
              Showing {filteredRequests.length} of {requests.length} requests
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profile</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requester</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{request.id.slice(0, 8)}...</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {request.profile_candidate_name ||
                        (request.profile_id ? request.profile_id.slice(0, 8) + '...' : '—')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {request.requester_full_name ||
                        (request.requester_id
                          ? request.requester_id.slice(0, 8) + '...'
                          : '—')}
                      <span className="block text-xs text-gray-500">
                        {request.use_personal_profile
                          ? 'Personal profile'
                          : 'Matrimonial profile'}
                      </span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(request.status)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(request.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedRequest(request)
                            setNotes('')
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        {request.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              disabled={busyId === request.id}
                              onClick={() => review(request.id, 'accepted')}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              className="bg-red-600 hover:bg-red-700"
                              disabled={busyId === request.id}
                              onClick={() => review(request.id, 'rejected')}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Request Details Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Contact Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Request Status</p>
                  <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Requested On</p>
                  <p className="font-medium">{new Date(selectedRequest.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Request ID</label>
                  <p className="text-gray-900">{selectedRequest.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Target profile</label>
                  <p className="text-gray-900">
                    {selectedRequest.profile_candidate_name || 'Unknown profile'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Requester</label>
                  <p className="text-gray-900">
                    {selectedRequest.requester_full_name || 'Unknown member'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Requester phone</label>
                  <p className="text-gray-900">
                    {selectedRequest.requester_phone
                      ? `+91 ${selectedRequest.requester_phone}`
                      : '—'}
                  </p>
                </div>
              </div>

              {/* ---- What the requester sent ---- */}
              <div className="border rounded-lg p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  {selectedRequest.use_personal_profile ? (
                    <>
                      <User className="w-4 h-4" /> Other / Personal Profile
                    </>
                  ) : (
                    <>
                      <IdCard className="w-4 h-4" /> Matrimonial profile sent
                    </>
                  )}
                </p>

                {selectedRequest.use_personal_profile ? (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Name</p>
                      <p className="font-medium">
                        {selectedRequest.personal_name || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="font-medium">
                        {selectedRequest.personal_phone
                          ? `+91 ${selectedRequest.personal_phone}`
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="font-medium">
                        {selectedRequest.personal_email || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Gotra / City</p>
                      <p className="font-medium">
                        {[selectedRequest.personal_gotra, selectedRequest.personal_city]
                          .filter(Boolean)
                          .join(' • ') || '—'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-700">
                    The requester sent one of their own matrimonial profiles
                    (profile id {selectedRequest.requester_profile_id || '—'}). Their
                    details are visible on that profile.
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Notes</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional note to the requester"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedRequest && selectedRequest.status === 'pending' && (
              <>
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  disabled={busyId === selectedRequest.id}
                  onClick={() => review(selectedRequest.id, 'rejected')}
                >
                  <XCircle className="w-4 h-4 mr-1" /> Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  disabled={busyId === selectedRequest.id}
                  onClick={() => review(selectedRequest.id, 'accepted')}
                >
                  <CheckCircle className="w-4 h-4 mr-1" /> Accept
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}