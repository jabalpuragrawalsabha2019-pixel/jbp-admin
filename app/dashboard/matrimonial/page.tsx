'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, CheckCircle, XCircle, Eye, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface MatrimonialProfile {
  id: string
  user_id: string
  gender: string
  age: number | null
  education: string | null
  occupation: string | null
  city: string | null
  gotra: string | null
  family_details: string | null
  photos: string[]
  horoscope_url: string | null
  additional_info: string | null
  status: string
  approved_by: string | null
  approval_notes: string | null
  created_at: string
  users: {
    full_name: string | null
    phone: string
  }
}

export default function MatrimonialPage() {
  const [profiles, setProfiles] = useState<MatrimonialProfile[]>([])
  const [filteredProfiles, setFilteredProfiles] = useState<MatrimonialProfile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [genderFilter, setGenderFilter] = useState<string>('all')
  const [selectedProfile, setSelectedProfile] = useState<MatrimonialProfile | null>(null)
  const [approvalNotes, setApprovalNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient()

  useEffect(() => {
    fetchProfiles()
  }, [])

  useEffect(() => {
    filterProfiles()
  }, [profiles, searchQuery, statusFilter, genderFilter])

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('matrimonial_profiles')
        .select(`
          *,
          users!matrimonial_profiles_user_id_fkey (
            full_name,
            phone
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProfiles(data || [])
    } catch (error) {
      console.error('Error fetching profiles:', error)
      toast.error('Failed to fetch profiles')
    } finally {
      setLoading(false)
    }
  }

  const filterProfiles = () => {
    let filtered = [...profiles]

    if (searchQuery) {
      filtered = filtered.filter(profile => 
        profile.users?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        profile.city?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(profile => profile.status === statusFilter)
    }

    if (genderFilter !== 'all') {
      filtered = filtered.filter(profile => profile.gender.toLowerCase() === genderFilter)
    }

    setFilteredProfiles(filtered)
  }

  const approveProfile = async (profileId: string) => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        const { error } = await supabase
          .from('matrimonial_profiles')
          .update({ 
            status: 'approved',
            approved_by: user?.id
            // approval_notes temporarily removed until column is added to database
          })
          .eq('id', profileId)
        
        if (error) {
          console.error('Approval error:', error)
          throw error
        }
      
        toast.success('Profile approved successfully')
        setApprovalNotes('')
        setSelectedProfile(null)
        fetchProfiles()
      } catch (error: any) {
        console.error('Full error:', error)
        toast.error(error.message || 'Failed to approve profile')
      }
    }
  const rejectProfile = async (profileId: string) => {
    if (!approvalNotes.trim()) {
      toast.error('Please provide a reason for rejection')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase
        .from('matrimonial_profiles')
        .update({ 
          status: 'rejected',
          approved_by: user?.id,
          approval_notes: approvalNotes
        })
        .eq('id', profileId)

      if (error) throw error

      toast.success('Profile rejected')
      setApprovalNotes('')
      setSelectedProfile(null)
      fetchProfiles()
    } catch (error) {
      toast.error('Failed to reject profile')
    }
  }

  const deleteProfile = async (profileId: string) => {
    if (!confirm('Are you sure you want to delete this profile?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('matrimonial_profiles')
        .delete()
        .eq('id', profileId)

      if (error) throw error

      toast.success('Profile deleted successfully')
      setSelectedProfile(null)
      fetchProfiles()
    } catch (error) {
      toast.error('Failed to delete profile')
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
          <h1 className="text-3xl font-bold text-gray-900">Matrimonial Profiles</h1>
          <p className="text-gray-600 mt-1">Review and approve matrimonial profiles</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, city..."
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
            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genders</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-gray-600 flex items-center">
              Total: {filteredProfiles.length} profiles
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profiles Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredProfiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{profile.users?.full_name || 'No name'}</div>
                      <div className="text-sm text-gray-500">{profile.users?.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div>{profile.gender} • {profile.age} years</div>
                        <div className="text-gray-500">{profile.education}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">{profile.city}</div>
                      <div className="text-sm text-gray-500">{profile.gotra}</div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(profile.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(profile.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedProfile(profile)
                          setApprovalNotes(profile.approval_notes || '')
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

      {/* Profile Review Dialog */}
      <Dialog open={!!selectedProfile} onOpenChange={() => setSelectedProfile(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Profile Review</DialogTitle>
          </DialogHeader>
          {selectedProfile && (
            <div className="space-y-6">
              {/* User Info */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg">{selectedProfile.users?.full_name}</h3>
                <p className="text-sm text-gray-600">Phone: {selectedProfile.users?.phone}</p>
              </div>

              {/* Profile Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Gender</label>
                  <p className="text-gray-900">{selectedProfile.gender}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Age</label>
                  <p className="text-gray-900">{selectedProfile.age} years</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Education</label>
                  <p className="text-gray-900">{selectedProfile.education || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Occupation</label>
                  <p className="text-gray-900">{selectedProfile.occupation || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">City</label>
                  <p className="text-gray-900">{selectedProfile.city || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Gotra</label>
                  <p className="text-gray-900">{selectedProfile.gotra || 'Not provided'}</p>
                </div>
              </div>

              {/* Family Details */}
              {selectedProfile.family_details && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Family Details</label>
                  <p className="text-gray-900 mt-1">{selectedProfile.family_details}</p>
                </div>
              )}

              {/* Additional Info */}
              {selectedProfile.additional_info && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Additional Information</label>
                  <p className="text-gray-900 mt-1">{selectedProfile.additional_info}</p>
                </div>
              )}

              {/* Photos */}
              {selectedProfile.photos && selectedProfile.photos.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500 block mb-2">Photos</label>
                  <div className="grid grid-cols-3 gap-4">
                    {selectedProfile.photos.map((photo: string, index: number) => (
                      <img 
                        key={index}
                        src={photo} 
                        alt={`Photo ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-2">Admin Notes</label>
                <Textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Add notes or reason for rejection..."
                  rows={3}
                />
              </div>

              {/* Current Status */}
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-500">Current Status</label>
                  <div className="mt-1">{getStatusBadge(selectedProfile.status)}</div>
                </div>
                {selectedProfile.approval_notes && (
                  <div className="text-sm text-gray-600">
                    Previous notes: {selectedProfile.approval_notes}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex space-x-2 pt-4">
                {selectedProfile.status === 'pending' && (
                  <>
                    <Button
                      onClick={() => approveProfile(selectedProfile.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve Profile
                    </Button>
                    <Button
                      onClick={() => rejectProfile(selectedProfile.id)}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject Profile
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  onClick={() => deleteProfile(selectedProfile.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}