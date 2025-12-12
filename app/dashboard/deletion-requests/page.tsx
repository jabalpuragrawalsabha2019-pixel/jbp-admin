'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserX, Eye, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface DeletionRequest {
  id: string
  phone: string
  email: string | null
  reason: string | null
  status: string
  requested_at: string
  processed_at: string | null
  admin_notes: string | null
}

export default function DeletionRequestsPage() {
  const [requests, setRequests] = useState<DeletionRequest[]>([])
  const [filteredRequests, setFilteredRequests] = useState<DeletionRequest[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [selectedRequest, setSelectedRequest] = useState<DeletionRequest | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient()

  useEffect(() => {
    fetchRequests()
  }, [])

  useEffect(() => {
    filterRequests()
  }, [requests, statusFilter])

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('deletion_requests')
        .select('*')
        .order('requested_at', { ascending: false })

      if (error) throw error
      setRequests(data || [])
    } catch (error) {
      console.error('Error fetching requests:', error)
      toast.error('Failed to fetch deletion requests')
    } finally {
      setLoading(false)
    }
  }

  const filterRequests = () => {
    let filtered = [...requests]
    if (statusFilter !== 'all') {
      filtered = filtered.filter(req => req.status === statusFilter)
    }
    setFilteredRequests(filtered)
  }

  const processRequest = async (requestId: string, newStatus: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('deletion_requests')
        .update({
          status: newStatus,
          processed_at: new Date().toISOString(),
          processed_by: user?.id,
          admin_notes: adminNotes,
        })
        .eq('id', requestId)

      if (error) throw error

      // If approved, actually delete the user
      if (newStatus === 'approved') {
        await deleteUserAccount(selectedRequest?.phone || '')
      }

      toast.success(`Request ${newStatus} successfully`)
      setSelectedRequest(null)
      setAdminNotes('')
      fetchRequests()
    } catch (error) {
      toast.error('Failed to process request')
    }
  }

  const deleteUserAccount = async (phone: string) => {
    try {
      // Find user by phone
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('phone', phone)
        .single()

      if (!user) {
        toast.error('User not found')
        return
      }

      // Delete all related data
      await supabase.from('matrimonial_profiles').delete().eq('user_id', user.id)
      await supabase.from('events').delete().eq('posted_by', user.id)
      await supabase.from('jobs').delete().eq('posted_by', user.id)
      await supabase.from('blood_donors').delete().eq('user_id', user.id)
      await supabase.from('contact_requests').delete().eq('requester_id', user.id)
      
      // Finally delete user
      await supabase.from('users').delete().eq('id', user.id)

      toast.success('User account and all data deleted')
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('Failed to delete user account')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Completed</Badge>
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>
    }
  }

  const getStats = () => {
    return {
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
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
          <h1 className="text-3xl font-bold text-gray-900">Account Deletion Requests</h1>
          <p className="text-gray-600 mt-1">Review and process user deletion requests</p>
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
              <div className="bg-gray-100 p-3 rounded-lg">
                <UserX className="w-6 h-6 text-gray-600" />
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
                <UserX className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600 mt-2">{stats.approved}</p>
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
                <SelectItem value="approved">Approved</SelectItem>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{request.phone}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{request.email || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {request.reason || 'No reason provided'}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(request.status)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(request.requested_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedRequest(request)
                          setAdminNotes(request.admin_notes || '')
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Deletion Request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6">
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <p className="text-sm text-red-900 font-semibold">⚠️ Warning: This action is permanent!</p>
                <p className="text-sm text-red-800 mt-1">
                  Approving this request will permanently delete all user data.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Phone Number</Label>
                  <p className="text-gray-900 font-medium">{selectedRequest.phone}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Email</Label>
                  <p className="text-gray-900">{selectedRequest.email || 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Requested On</Label>
                  <p className="text-gray-900">{new Date(selectedRequest.requested_at).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Current Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                </div>
              </div>

              {selectedRequest.reason && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Reason for Deletion</Label>
                  <p className="text-gray-900 mt-1 bg-gray-50 p-3 rounded">{selectedRequest.reason}</p>
                </div>
              )}

              <div>
                <Label htmlFor="adminNotes">Admin Notes</Label>
                <Textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this request..."
                  rows={3}
                />
              </div>

              {selectedRequest.status === 'pending' && (
                <div className="flex space-x-2 pt-4">
                  <Button
                    onClick={() => processRequest(selectedRequest.id, 'approved')}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve & Delete Account
                  </Button>
                  <Button
                    onClick={() => processRequest(selectedRequest.id, 'rejected')}
                    variant="outline"
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Request
                  </Button>
                </div>
              )}

              {selectedRequest.admin_notes && selectedRequest.status !== 'pending' && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <Label className="text-sm font-medium text-blue-900">Previous Admin Notes:</Label>
                  <p className="text-sm text-blue-800 mt-1">{selectedRequest.admin_notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}