'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Search, CheckCircle, XCircle, Eye, Star, EyeOff, Plus, Edit, Trash2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import toast from 'react-hot-toast'

interface Event {
  id: string
  title: string
  description: string | null
  event_date: string | null
  poster_url: string | null
  posted_by: string | null
  status: string
  event_type: string
  is_announcement: boolean
  announcement_text: string | null
  is_visible: boolean
  is_featured: boolean
  display_order: number
  approval_notes: string | null
  created_at: string
  users: {
    full_name: string | null
    phone: string
  } | null
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [approvalNotes, setApprovalNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_date: '',
    event_type: 'event',
    is_announcement: false,
    poster_url: '',
  })
  const [editEvent, setEditEvent] = useState<Event | null>(null)

  useEffect(() => {
    fetchEvents()
  }, [])

  useEffect(() => {
    filterEvents()
  }, [events, searchQuery, statusFilter, typeFilter])

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          posted_user:users!events_posted_by_fkey (
            full_name,
            phone
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      const eventsWithUsers = data?.map(event => ({
        ...event,
        users: event.posted_user
      }))
      
      setEvents(eventsWithUsers || [])
    } catch (error) {
      console.error('Error fetching events:', error)
      toast.error('Failed to fetch events')
    } finally {
      setLoading(false)
    }
  }

  const filterEvents = () => {
    let filtered = [...events]

    if (searchQuery) {
      filtered = filtered.filter(event => 
        event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.users?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(event => event.status === statusFilter)
    }

    if (typeFilter !== 'all') {
      if (typeFilter === 'announcement') {
        filtered = filtered.filter(event => event.is_announcement)
      } else {
        filtered = filtered.filter(event => event.event_type === typeFilter)
      }
    }

    setFilteredEvents(filtered)
  }

  const approveEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ 
          status: 'approved',
          is_visible: true
        })
        .eq('id', eventId)

      if (error) {
        console.error('Approval error:', error)
        throw error
      }

      toast.success('Event approved successfully')
      setApprovalNotes('')
      setSelectedEvent(null)
      fetchEvents()
    } catch (error: any) {
      console.error('Full error:', error)
      toast.error(error.message || 'Failed to approve event')
    }
  }

  const rejectEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ 
          status: 'rejected'
        })
        .eq('id', eventId)

      if (error) {
        console.error('Rejection error:', error)
        throw error
      }

      toast.success('Event rejected')
      setApprovalNotes('')
      setSelectedEvent(null)
      fetchEvents()
    } catch (error: any) {
      console.error('Full error:', error)
      toast.error(error.message || 'Failed to reject event')
    }
  }

  const deleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)

      if (error) throw error

      toast.success('Event deleted successfully')
      setSelectedEvent(null)
      setEditDialogOpen(false)
      fetchEvents()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete event')
    }
  }

  const updateEvent = async () => {
    if (!editEvent) return

    setIsEditing(true)
    try {
      const { error } = await supabase
        .from('events')
        .update({
          title: editEvent.title,
          description: editEvent.description,
          event_date: editEvent.event_date,
          poster_url: editEvent.poster_url,
          event_type: editEvent.event_type,
          is_announcement: editEvent.is_announcement,
        })
        .eq('id', editEvent.id)

      if (error) throw error

      toast.success('Event updated successfully')
      setEditDialogOpen(false)
      setEditEvent(null)
      fetchEvents()
    } catch (error: any) {
      console.error('Update error:', error)
      toast.error(error.message || 'Failed to update event')
    } finally {
      setIsEditing(false)
    }
  }

  const toggleFeatured = async (eventId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ is_featured: !currentStatus })
        .eq('id', eventId)

      if (error) throw error

      toast.success(`Event ${!currentStatus ? 'featured' : 'unfeatured'} successfully`)
      fetchEvents()
    } catch (error) {
      toast.error('Failed to update featured status')
    }
  }

  const toggleVisibility = async (eventId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ is_visible: !currentStatus })
        .eq('id', eventId)

      if (error) throw error

      toast.success(`Event ${!currentStatus ? 'shown' : 'hidden'} successfully`)
      fetchEvents()
    } catch (error) {
      toast.error('Failed to update visibility')
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', 'jbp_events')

      // Use the cloud name directly since env variable might not be set
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'ds0bvuv2p'

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      )

      const data = await response.json()

      // Add error handling for Cloudinary response
      if (!response.ok) {
        console.error('Cloudinary error:', data)
        throw new Error(data.error?.message || 'Upload failed')
      }

      if (data.secure_url) {
        if (isEdit && editEvent) {
          setEditEvent({ ...editEvent, poster_url: data.secure_url })
        } else {
          setNewEvent({ ...newEvent, poster_url: data.secure_url })
        }
        toast.success('Image uploaded successfully')
      } else {
        throw new Error('No secure URL returned')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleCreateEvent = async () => {
    setIsCreating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('events')
        .insert({
          title: newEvent.title,
          description: newEvent.description,
          event_date: newEvent.event_date || null,
          poster_url: newEvent.poster_url || null,
          event_type: newEvent.event_type,
          is_announcement: newEvent.is_announcement,
          status: 'approved',
          is_visible: true,
          posted_by: user?.id,
        })
      if (error) throw error
      toast.success('Event created successfully')
      setDialogOpen(false)
      setNewEvent({ title: '', description: '', event_date: '', event_type: 'event', is_announcement: false, poster_url: '' })
      fetchEvents()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create event')
    } finally {
      setIsCreating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Events & Announcements</h1>
          <p className="text-gray-600 mt-1">Manage community events and announcements</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Event
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="announcement">Announcement</SelectItem>
                <SelectItem value="festival">Festival</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-gray-600 flex items-center">
              Total: {filteredEvents.length} events
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Posted By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Features</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{event.title}</div>
                      <div className="text-sm text-gray-500 line-clamp-1">{event.description}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline">
                        {event.is_announcement ? 'Announcement' : event.event_type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">{event.users?.full_name || 'Admin'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {event.event_date ? new Date(event.event_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(event.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {event.is_featured && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                        {event.is_visible ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedEvent(event)
                            setApprovalNotes(event.approval_notes || '')
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditEvent(event)
                            setEditDialogOpen(true)
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => deleteEvent(event.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Event Review</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-6">
              {selectedEvent.poster_url && (
                <div>
                  <img 
                    src={selectedEvent.poster_url} 
                    alt={selectedEvent.title}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                </div>
              )}

              <div>
                <h3 className="text-2xl font-bold">{selectedEvent.title}</h3>
                <p className="text-gray-600 mt-2">{selectedEvent.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Event Type</label>
                  <p className="text-gray-900">{selectedEvent.is_announcement ? 'Announcement' : selectedEvent.event_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Event Date</label>
                  <p className="text-gray-900">
                    {selectedEvent.event_date ? new Date(selectedEvent.event_date).toLocaleString() : 'Not specified'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Posted By</label>
                  <p className="text-gray-900">{selectedEvent.users?.full_name || 'Admin'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Created On</label>
                  <p className="text-gray-900">{new Date(selectedEvent.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex items-center space-x-6 bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedEvent.is_featured}
                    onCheckedChange={() => toggleFeatured(selectedEvent.id, selectedEvent.is_featured)}
                  />
                  <label className="text-sm font-medium">Featured Event</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedEvent.is_visible}
                    onCheckedChange={() => toggleVisibility(selectedEvent.id, selectedEvent.is_visible)}
                  />
                  <label className="text-sm font-medium">Visible to Users</label>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 block mb-2">Admin Notes</label>
                <Textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Add notes or reason for rejection..."
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-500">Current Status</label>
                  <div className="mt-1">{getStatusBadge(selectedEvent.status)}</div>
                </div>
              </div>

              <div className="flex space-x-2 pt-4">
                {selectedEvent.status === 'pending' && (
                  <>
                    <Button
                      onClick={() => approveEvent(selectedEvent.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve Event
                    </Button>
                    <Button
                      onClick={() => rejectEvent(selectedEvent.id)}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject Event
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                rows={3}
              />
            </div>
            
            <div>
              <Label>Event Poster/Image</Label>
              <div className="mt-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, false)}
                  className="hidden"
                  id="event-poster"
                  disabled={uploading}
                />
                <label htmlFor="event-poster">
                  <Button type="button" variant="outline" className="w-full" disabled={uploading} asChild>
                    <span>
                      {uploading ? 'Uploading...' : newEvent.poster_url ? 'Change Image' : 'Upload Image'}
                    </span>
                  </Button>
                </label>
                {newEvent.poster_url && (
                  <div className="mt-3">
                    <img 
                      src={newEvent.poster_url} 
                      alt="Event poster" 
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setNewEvent({ ...newEvent, poster_url: '' })}
                      className="mt-2 text-red-600"
                    >
                      Remove Image
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label>Event Date</Label>
              <Input
                type="datetime-local"
                value={newEvent.event_date}
                onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={newEvent.event_type} onValueChange={(value) => setNewEvent({ ...newEvent, event_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="festival">Festival</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={newEvent.is_announcement}
                onCheckedChange={(checked) => setNewEvent({ ...newEvent, is_announcement: checked as boolean })}
              />
              <Label>Mark as Announcement</Label>
            </div>
            <Button onClick={handleCreateEvent} disabled={isCreating} className="w-full">
              {isCreating ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          {editEvent && (
            <div className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input
                  value={editEvent.title}
                  onChange={(e) => setEditEvent({ ...editEvent, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editEvent.description || ''}
                  onChange={(e) => setEditEvent({ ...editEvent, description: e.target.value })}
                  rows={3}
                />
              </div>
              
              <div>
                <Label>Event Poster/Image</Label>
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, true)}
                    className="hidden"
                    id="edit-event-poster"
                    disabled={uploading}
                  />
                  <label htmlFor="edit-event-poster">
                    <Button type="button" variant="outline" className="w-full" disabled={uploading} asChild>
                      <span>
                        {uploading ? 'Uploading...' : editEvent.poster_url ? 'Change Image' : 'Upload Image'}
                      </span>
                    </Button>
                  </label>
                  {editEvent.poster_url && (
                    <div className="mt-3">
                      <img 
                        src={editEvent.poster_url} 
                        alt="Event poster" 
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditEvent({ ...editEvent, poster_url: null })}
                        className="mt-2 text-red-600"
                      >
                        Remove Image
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label>Event Date</Label>
                <Input
                  type="datetime-local"
                  value={editEvent.event_date || ''}
                  onChange={(e) => setEditEvent({ ...editEvent, event_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={editEvent.event_type} onValueChange={(value) => setEditEvent({ ...editEvent, event_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="festival">Festival</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={editEvent.is_announcement}
                  onCheckedChange={(checked) => setEditEvent({ ...editEvent, is_announcement: checked as boolean })}
                />
                <Label>Mark as Announcement</Label>
              </div>
              <div className="flex gap-2">
                <Button onClick={updateEvent} disabled={isEditing} className="flex-1">
                  {isEditing ? 'Updating...' : 'Update Event'}
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => deleteEvent(editEvent.id)}
                  className="flex-1"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Event
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}