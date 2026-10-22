'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MessageSquare, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

interface HelpRequest {
  id: string
  reporter_id: string
  report_type: string
  reported_user_id: string | null
  description: string
  supporting_details: string | null
  status: string
  assigned_admin_id: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  admin_notes: string | null
  resolution_summary: string | null
  created_at: string
  updated_at: string
  reporter_full_name: string
  reporter_phone: string
  reporter_email: string
  reported_full_name: string
  reported_phone: string
}

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  action_taken: 'Action Taken',
  closed: 'Closed',
  dismissed: 'Dismissed',
}

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-amber-100 text-amber-800',
  under_review: 'bg-blue-100 text-blue-800',
  action_taken: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
  dismissed: 'bg-red-100 text-red-800',
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  harassment: 'Harassment',
  threat: 'Threat',
  safety_concern: 'Safety Concern',
  other: 'Other',
}

const REPORT_TYPE_COLORS: Record<string, string> = {
  harassment: 'bg-red-100 text-red-800',
  threat: 'bg-orange-100 text-orange-800',
  safety_concern: 'bg-yellow-100 text-yellow-800',
  other: 'bg-gray-100 text-gray-800',
}

export default function HelpRequestsPage() {
  const [requests, setRequests] = useState<HelpRequest[]>([])
  const [filteredRequests, setFilteredRequests] = useState<HelpRequest[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<HelpRequest | null>(null)
  const [notes, setNotes] = useState('')
  const [resolutionSummary, setResolutionSummary] = useState('')
  const [assignedAdminId, setAssignedAdminId] = useState('')
  const [decision, setDecision] = useState<string>('')

  const supabase = createBrowserClient()

  const load = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('get_help_requests_for_admin', {
        p_status: statusFilter === 'all' ? 'all' : statusFilter,
        p_limit: 100,
        p_offset: 0,
      })
      if (error) throw error
      setRequests(data || [])
    } catch (error) {
      console.error('Error loading help requests:', error)
      toast.error('Failed to load help requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    let filtered = [...requests]
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter)
    }
    if (typeFilter !== 'all') {
      filtered = filtered.filter(r => r.report_type === typeFilter)
    }
    setFilteredRequests(filtered)
  }, [requests, statusFilter, typeFilter])

  const handleReview = (request: HelpRequest) => {
    setSelectedRequest(request)
    setNotes(request.admin_notes || '')
    setResolutionSummary(request.resolution_summary || '')
    setDecision('')
  }

  const handleUpdate = async () => {
    if (!selectedRequest) return
    if (!decision) {
      toast.error('Please select a decision')
      return
    }

    try {
      const { error } = await supabase.rpc('review_help_request', {
        p_request_id: selectedRequest.id,
        p_decision: decision,
        p_admin_notes: notes,
        p_resolution_summary: resolutionSummary,
        p_assigned_admin_id: assignedAdminId || null,
      })
      if (error) throw error
      toast.success('Help request updated')
      setSelectedRequest(null)
      load()
    } catch (error) {
      toast.error('Failed to update help request')
    }
  }

  const getStatusBadge = (status: string) => (
    <Badge className={STATUS_COLORS[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  )

  const getTypeBadge = (type: string) => (
    <Badge className={REPORT_TYPE_COLORS[type]}>
      {REPORT_TYPE_LABELS[type]}
    </Badge>
  )

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Help Requests / Reports</h1>
        <p className="text-gray-600 mt-1">Review and manage harassment/safety reports</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Help Requests</CardTitle>
          <CardDescription>Total: {requests.length} requests</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="action_taken">Action Taken</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="harassment">Harassment</SelectItem>
                <SelectItem value="threat">Threat</SelectItem>
                <SelectItem value="safety_concern">Safety Concern</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {requests.length === 0 ? 'No help requests yet.' : 'No requests match the selected filters.'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((request) => (
                <Card key={request.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {getTypeBadge(request.report_type)}
                        {getStatusBadge(request.status)}
                      </div>
                      <p className="text-sm text-gray-500 mb-1">
                        Reported by {request.reporter_full_name} &middot; {request.reporter_phone}
                        {request.reported_full_name && (
                          <> &middot; Reported: {request.reported_full_name} &middot; {request.reported_phone}</>
                        )}
                      </p>
                      <p className="text-sm text-gray-500 mb-2">
                        {new Date(request.created_at).toLocaleDateString('en-IN')}
                      </p>
                      <p className="text-sm text-gray-700 mb-2">
                        {request.description}
                      </p>
                      {request.supporting_details && (
                        <p className="text-sm text-gray-500 italic bg-gray-50 p-2 rounded">
                          Details: {request.supporting_details}
                        </p>
                      )}
                      {request.resolution_summary && (
                        <div className="mt-2 p-2 bg-green-50 rounded text-sm text-green-900">
                          <strong>Resolution:</strong> {request.resolution_summary}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button variant="outline" size="sm" onClick={() => handleReview(request)}>
                        <MessageSquare className="w-4 h-4 mr-1" /> Review
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedRequest && (
        <Dialog open={!!selectedRequest} onOpenChange={open => !open && setSelectedRequest(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review Help Request</DialogTitle>
              <DialogDescription>
                Report ID: {selectedRequest.id}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Reporter</Label>
                  <p className="font-medium">{selectedRequest.reporter_full_name}</p>
                  <p className="text-sm text-gray-500">{selectedRequest.reporter_phone}</p>
                  <p className="text-sm text-gray-500">{selectedRequest.reporter_email}</p>
                </div>
                <div>
                  <Label>Reported User</Label>
                  {selectedRequest.reported_full_name ? (
                    <>
                      <p className="font-medium">{selectedRequest.reported_full_name}</p>
                      <p className="text-sm text-gray-500">{selectedRequest.reported_phone}</p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">Not specified</p>
                  )}
                </div>
              </div>

              <div>
                <Label>Report Type</Label>
                {getTypeBadge(selectedRequest.report_type)}
              </div>

              <div>
                <Label>Current Status</Label>
                {getStatusBadge(selectedRequest.status)}
              </div>

              <div>
                <Label className="block mb-1">Description</Label>
                <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{selectedRequest.description}</p>
              </div>

              {selectedRequest.supporting_details && (
                <div>
                  <Label className="block mb-1">Supporting Details</Label>
                  <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{selectedRequest.supporting_details}</p>
                </div>
              )}

              <div>
                <Label htmlFor="decision">Decision <span className="text-red-500">*</span></Label>
                <Select value={decision} onValueChange={setDecision}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select decision" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="action_taken">Action Taken</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="assignedAdminId">Assigned Admin</Label>
                <Input
                  id="assignedAdminId"
                  value={assignedAdminId}
                  onChange={e => setAssignedAdminId(e.target.value)}
                  placeholder="Admin user ID (optional)"
                />
              </div>

              <div>
                <Label htmlFor="notes">Admin Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Internal notes for admin team"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="resolutionSummary">Resolution Summary</Label>
                <Textarea
                  id="resolutionSummary"
                  value={resolutionSummary}
                  onChange={e => setResolutionSummary(e.target.value)}
                  placeholder="Summary of actions taken / resolution"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                Cancel
              </Button>
              <Button
                className={decision === 'dismissed' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
                onClick={handleUpdate}
                disabled={!decision}
              >
                <ShieldCheck className="w-4 h-4 mr-1" />
                Update Status
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
