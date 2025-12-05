'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Plus, Edit, Trash2, Award } from 'lucide-react'
import toast from 'react-hot-toast'

interface PostHolder {
  id: string
  user_id: string | null
  designation: string
  term_start: string | null
  term_end: string | null
  bio: string | null
  display_order: number | null
  created_at: string
  users: {
    full_name: string | null
    phone: string
    photo_url: string | null
  } | null
}

const DESIGNATIONS = [
  'President',
  'Senior Vice President',
  'Vice President',
  'Women Vice President',
  'Secretary',
  'Treasurer',
  'Joint Secretary',
  'Secretary (Publicity)',
  'Deputy Secretary',
]

export default function PostHoldersPage() {
  const [postHolders, setPostHolders] = useState<PostHolder[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingHolder, setEditingHolder] = useState<PostHolder | null>(null)
  const [formData, setFormData] = useState({
    user_id: '',
    designation: '',
    term_start: '',
    term_end: '',
    bio: '',
    display_order: 0,
  })
  const supabase = createBrowserClient()

  useEffect(() => {
    fetchPostHolders()
    fetchUsers()
  }, [])

  const fetchPostHolders = async () => {
    try {
      const { data, error } = await supabase
        .from('post_holders')
        .select(`
          *,
          users (
            full_name,
            phone,
            photo_url
          )
        `)
        .order('display_order', { ascending: true })

      if (error) throw error
      setPostHolders(data || [])
    } catch (error) {
      console.error('Error fetching post holders:', error)
      toast.error('Failed to fetch post holders')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, phone')
        .eq('is_verified', true)
        .order('full_name')

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingHolder) {
        const { error } = await supabase
          .from('post_holders')
          .update({
            user_id: formData.user_id || null,
            designation: formData.designation,
            term_start: formData.term_start || null,
            term_end: formData.term_end || null,
            bio: formData.bio || null,
            display_order: formData.display_order,
          })
          .eq('id', editingHolder.id)

        if (error) throw error
        toast.success('Post holder updated successfully')
      } else {
        const { error } = await supabase
          .from('post_holders')
          .insert({
            user_id: formData.user_id || null,
            designation: formData.designation,
            term_start: formData.term_start || null,
            term_end: formData.term_end || null,
            bio: formData.bio || null,
            display_order: formData.display_order,
          })

        if (error) throw error
        toast.success('Post holder created successfully')
      }

      setDialogOpen(false)
      resetForm()
      fetchPostHolders()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save post holder')
    }
  }

  const handleEdit = (holder: PostHolder) => {
    setEditingHolder(holder)
    setFormData({
      user_id: holder.user_id || '',
      designation: holder.designation,
      term_start: holder.term_start || '',
      term_end: holder.term_end || '',
      bio: holder.bio || '',
      display_order: holder.display_order || 0,
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post holder?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('post_holders')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Post holder deleted successfully')
      fetchPostHolders()
    } catch (error) {
      toast.error('Failed to delete post holder')
    }
  }

  const resetForm = () => {
    setFormData({
      user_id: '',
      designation: '',
      term_start: '',
      term_end: '',
      bio: '',
      display_order: 0,
    })
    setEditingHolder(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setDialogOpen(true)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Post Holders</h1>
          <p className="text-gray-600 mt-1">Manage office bearers and committee members</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add Post Holder
        </Button>
      </div>

      {/* Post Holders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {postHolders.map((holder) => (
          <Card key={holder.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center text-white text-lg font-semibold">
                    {holder.users?.full_name?.charAt(0) || <Award className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {holder.users?.full_name || 'Not Assigned'}
                    </h3>
                    <p className="text-sm text-gray-500">{holder.users?.phone || 'No phone'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="bg-blue-50 px-3 py-2 rounded">
                  <p className="text-sm font-semibold text-blue-900">{holder.designation}</p>
                </div>
                {holder.term_start && (
                  <p className="text-sm text-gray-600">
                    Term: {new Date(holder.term_start).getFullYear()}
                    {holder.term_end && ` - ${new Date(holder.term_end).getFullYear()}`}
                  </p>
                )}
                {holder.bio && (
                  <p className="text-sm text-gray-600 line-clamp-2">{holder.bio}</p>
                )}
              </div>

              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(holder)}
                  className="flex-1"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(holder.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {postHolders.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No post holders added yet</p>
            <Button onClick={openCreateDialog} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Add First Post Holder
            </Button>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open)
        if (!open) resetForm()
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingHolder ? 'Edit Post Holder' : 'Add Post Holder'}</DialogTitle>
            <DialogDescription>
              {editingHolder ? 'Update the post holder information below.' : 'Fill in the details to add a new post holder.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="user_id">Select User (Optional)</Label>
              <Select value={formData.user_id || 'none'} onValueChange={(value) => setFormData({ ...formData, user_id: value === 'none' ? '' : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a verified user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No User (Manual Entry)</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="designation">Designation *</Label>
              <Select 
                value={formData.designation} 
                onValueChange={(value) => setFormData({ ...formData, designation: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select designation" />
                </SelectTrigger>
                <SelectContent>
                  {DESIGNATIONS.map(designation => (
                    <SelectItem key={designation} value={designation}>
                      {designation}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="term_start">Term Start Date</Label>
                <Input
                  id="term_start"
                  type="date"
                  value={formData.term_start}
                  onChange={(e) => setFormData({ ...formData, term_start: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="term_end">Term End Date</Label>
                <Input
                  id="term_end"
                  type="date"
                  value={formData.term_end}
                  onChange={(e) => setFormData({ ...formData, term_end: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="bio">Bio / Description</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Brief description or achievements..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
            </div>

            <div className="flex space-x-2 pt-4">
              <Button type="submit" className="flex-1">
                {editingHolder ? 'Update' : 'Create'} Post Holder
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setDialogOpen(false)
                  resetForm()
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}