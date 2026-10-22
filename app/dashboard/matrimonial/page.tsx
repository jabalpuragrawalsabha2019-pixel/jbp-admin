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
import { deleteCloudinaryUrls } from '@/lib/cloudinaryClient'

interface MatrimonialProfile {
  id: string
  user_id: string
  candidate_name: string | null
  gender: string
  age: number | null
  date_of_birth: string | null
  birth_time: string | null
  birth_place: string | null
  district: string | null
  height: string | null
  complexion: string | null
  blood_group: string | null
  rashi: string | null
  education: string | null
  occupation: string | null
  business_service_name: string | null
  annual_income: string | null
  city: string | null
  gotra: string | null
  brothers_married: number | null
  brothers_unmarried: number | null
  sisters_married: number | null
  sisters_unmarried: number | null
  father_guardian_name: string | null
  father_mobile: string | null
  father_business_details: string | null
  father_annual_income: string | null
  business_office_address: string | null
  mother_name: string | null
  mother_homemaker_or_service: string | null
  residential_address: string | null
  email: string | null
  whatsapp_number: string | null
  special_statuses: string[] | null
  previous_spouse_name: string | null
  previous_spouse_mobile: string | null
  previous_father_in_law_name_address: string | null
  previous_father_in_law_mobile: string | null
  sons_count: number | null
  sons_ages: string | null
  daughters_count: number | null
  daughters_ages: string | null
  disability_details: string | null
  declaration_accepted: boolean | null
  declaration_date: string | null
  parent_signature_url: string | null
  candidate_signature_url: string | null
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
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(profile =>
        profile.candidate_name?.toLowerCase().includes(q) ||
        profile.users?.full_name?.toLowerCase().includes(q) ||
        profile.city?.toLowerCase().includes(q) ||
        profile.district?.toLowerCase().includes(q) ||
        profile.gotra?.toLowerCase().includes(q)
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
            approved_by: user?.id,
            approval_notes: approvalNotes || null,
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
      const profile =
        profiles.find((p) => p.id === profileId) || selectedProfile

      if (profile) {
        await deleteCloudinaryUrls([
          ...(Array.isArray(profile.photos) ? profile.photos : []),
          profile.parent_signature_url,
          profile.candidate_signature_url,
        ])
      }

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
                      <div className="font-medium text-gray-900">
                        {profile.candidate_name || profile.users?.full_name || 'No name'}
                      </div>
                      <div className="text-sm text-gray-500">
                        Account: {profile.users?.full_name || '—'} · {profile.users?.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div>{profile.gender} • {profile.age} years</div>
                        <div className="text-gray-500">{profile.education}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">{profile.district || profile.city}</div>
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
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg">
                  {selectedProfile.candidate_name || selectedProfile.users?.full_name}
                </h3>
                <p className="text-sm text-gray-600">
                  Submitted by account: {selectedProfile.users?.full_name} · {selectedProfile.users?.phone}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ['Gender', selectedProfile.gender],
                  ['Age', selectedProfile.age ? `${selectedProfile.age} years` : null],
                  ['DOB', selectedProfile.date_of_birth],
                  ['Birth time', selectedProfile.birth_time],
                  ['Birth place', selectedProfile.birth_place],
                  ['District', selectedProfile.district || selectedProfile.city],
                  ['Height', selectedProfile.height],
                  ['Complexion', selectedProfile.complexion],
                  ['Blood group', selectedProfile.blood_group],
                  ['Rashi', selectedProfile.rashi],
                  ['Gotra', selectedProfile.gotra],
                  ['Education', selectedProfile.education],
                  ['Business/service', selectedProfile.business_service_name || selectedProfile.occupation],
                  ['Annual income', selectedProfile.annual_income],
                  ['Brothers M/U', `${selectedProfile.brothers_married ?? 0}/${selectedProfile.brothers_unmarried ?? 0}`],
                  ['Sisters M/U', `${selectedProfile.sisters_married ?? 0}/${selectedProfile.sisters_unmarried ?? 0}`],
                  ['Father/guardian', selectedProfile.father_guardian_name],
                  ['Father mobile', selectedProfile.father_mobile],
                  ["Father's work", selectedProfile.father_business_details],
                  ["Father's income", selectedProfile.father_annual_income],
                  ['Office address', selectedProfile.business_office_address],
                  ['Mother', selectedProfile.mother_name],
                  ['Mother status', selectedProfile.mother_homemaker_or_service],
                  ['Residential address', selectedProfile.residential_address],
                  ['Email', selectedProfile.email],
                  ['WhatsApp', selectedProfile.whatsapp_number],
                  ['Special statuses', (selectedProfile.special_statuses || []).join(', ')],
                  ['Previous spouse', selectedProfile.previous_spouse_name],
                  ['Previous spouse mobile', selectedProfile.previous_spouse_mobile],
                  ['Previous FIL', selectedProfile.previous_father_in_law_name_address],
                  ['FIL mobile', selectedProfile.previous_father_in_law_mobile],
                  ['Sons', selectedProfile.sons_count != null ? `${selectedProfile.sons_count} (${selectedProfile.sons_ages || ''})` : null],
                  ['Daughters', selectedProfile.daughters_count != null ? `${selectedProfile.daughters_count} (${selectedProfile.daughters_ages || ''})` : null],
                  ['Disability', selectedProfile.disability_details],
                  ['Declaration date', selectedProfile.declaration_date],
                  ['Declaration accepted', selectedProfile.declaration_accepted ? 'Yes' : 'No'],
                ].map(([label, value]) => (
                  value ? (
                    <div key={String(label)}>
                      <label className="text-sm font-medium text-gray-500">{label}</label>
                      <p className="text-gray-900 whitespace-pre-wrap">{value}</p>
                    </div>
                  ) : null
                ))}
              </div>

              {(selectedProfile.parent_signature_url || selectedProfile.candidate_signature_url) && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedProfile.parent_signature_url && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Parent signature</label>
                      <img src={selectedProfile.parent_signature_url} alt="Parent signature" className="mt-2 max-h-28 border rounded" />
                    </div>
                  )}
                  {selectedProfile.candidate_signature_url && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Candidate signature</label>
                      <img src={selectedProfile.candidate_signature_url} alt="Candidate signature" className="mt-2 max-h-28 border rounded" />
                    </div>
                  )}
                </div>
              )}

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