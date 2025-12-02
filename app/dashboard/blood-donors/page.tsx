'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Eye, Trash2, Download, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface BloodDonor {
  id: string
  user_id: string
  blood_group: string
  city: string
  is_available: boolean
  last_donation_date: string | null
  created_at: string
  users: {
    full_name: string | null
    phone: string
    email: string | null
  }
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export default function BloodDonorsPage() {
  const [donors, setDonors] = useState<BloodDonor[]>([])
  const [filteredDonors, setFilteredDonors] = useState<BloodDonor[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [bloodGroupFilter, setBloodGroupFilter] = useState<string>('all')
  const [cityFilter, setCityFilter] = useState<string>('all')
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all')
  const [selectedDonor, setSelectedDonor] = useState<BloodDonor | null>(null)
  const [loading, setLoading] = useState(true)
  const [cities, setCities] = useState<string[]>([])
  const supabase = createBrowserClient()

  useEffect(() => {
    fetchDonors()
  }, [])

  useEffect(() => {
    filterDonors()
  }, [donors, searchQuery, bloodGroupFilter, cityFilter, availabilityFilter])

  const fetchDonors = async () => {
    try {
      const { data, error } = await supabase
        .from('blood_donors')
        .select(`
          *,
          users (
            full_name,
            phone,
            email
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDonors(data || [])
      
      // Extract unique cities
      const uniqueCities = [...new Set(data?.map(d => d.city).filter(Boolean))] as string[]
      setCities(uniqueCities)
    } catch (error) {
      console.error('Error fetching donors:', error)
      toast.error('Failed to fetch blood donors')
    } finally {
      setLoading(false)
    }
  }

  const filterDonors = () => {
    let filtered = [...donors]

    if (searchQuery) {
      filtered = filtered.filter(donor => 
        donor.users?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        donor.users?.phone?.includes(searchQuery) ||
        donor.city?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (bloodGroupFilter !== 'all') {
      filtered = filtered.filter(donor => donor.blood_group === bloodGroupFilter)
    }

    if (cityFilter !== 'all') {
      filtered = filtered.filter(donor => donor.city === cityFilter)
    }

    if (availabilityFilter !== 'all') {
      const isAvailable = availabilityFilter === 'available'
      filtered = filtered.filter(donor => donor.is_available === isAvailable)
    }

    setFilteredDonors(filtered)
  }

  const toggleAvailability = async (donorId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('blood_donors')
        .update({ is_available: !currentStatus })
        .eq('id', donorId)

      if (error) throw error

      toast.success(`Donor marked as ${!currentStatus ? 'available' : 'unavailable'}`)
      fetchDonors()
    } catch (error) {
      toast.error('Failed to update availability')
    }
  }

  const updateLastDonation = async (donorId: string, date: string) => {
    try {
      const { error } = await supabase
        .from('blood_donors')
        .update({ last_donation_date: date })
        .eq('id', donorId)

      if (error) throw error

      toast.success('Last donation date updated')
      fetchDonors()
    } catch (error) {
      toast.error('Failed to update date')
    }
  }

  const deleteDonor = async (donorId: string) => {
    if (!confirm('Are you sure you want to delete this donor record?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('blood_donors')
        .delete()
        .eq('id', donorId)

      if (error) throw error

      toast.success('Donor deleted successfully')
      setSelectedDonor(null)
      fetchDonors()
    } catch (error) {
      toast.error('Failed to delete donor')
    }
  }

  const exportToCSV = () => {
    const headers = ['Name', 'Phone', 'Email', 'Blood Group', 'City', 'Available', 'Last Donation']
    const rows = filteredDonors.map(donor => [
      donor.users?.full_name || 'N/A',
      donor.users?.phone || 'N/A',
      donor.users?.email || 'N/A',
      donor.blood_group,
      donor.city,
      donor.is_available ? 'Yes' : 'No',
      donor.last_donation_date || 'Never'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `blood-donors-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('CSV exported successfully')
  }

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Blood Donors</h1>
          <p className="text-gray-600 mt-1">Manage blood donor database</p>
        </div>
        <Button onClick={exportToCSV}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{donors.length}</div>
            <div className="text-sm text-gray-600">Total Donors</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-green-600">
              {donors.filter(d => d.is_available).length}
            </div>
            <div className="text-sm text-gray-600">Available</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{cities.length}</div>
            <div className="text-sm text-gray-600">Cities</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{BLOOD_GROUPS.length}</div>
            <div className="text-sm text-gray-600">Blood Groups</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, phone, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={bloodGroupFilter} onValueChange={setBloodGroupFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Blood Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Blood Groups</SelectItem>
                {BLOOD_GROUPS.map(group => (
                  <SelectItem key={group} value={group}>{group}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Availability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="unavailable">Unavailable</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-gray-600 mt-4">
            Showing {filteredDonors.length} of {donors.length} donors
          </div>
        </CardContent>
      </Card>

      {/* Donors Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Donor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Blood Group</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">City</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Donation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredDonors.map((donor) => (
                  <tr key={donor.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-red-500 flex items-center justify-center text-white font-semibold">
                          {donor.users?.full_name?.charAt(0) || 'D'}
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-gray-900">{donor.users?.full_name || 'No name'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{donor.users?.phone}</div>
                      <div className="text-sm text-gray-500">{donor.users?.email || 'No email'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="font-bold">{donor.blood_group}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{donor.city}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {donor.last_donation_date 
                        ? new Date(donor.last_donation_date).toLocaleDateString()
                        : 'Never'
                      }
                    </td>
                    <td className="px-6 py-4">
                      {donor.is_available ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Available
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="w-3 h-3 mr-1" />
                          Unavailable
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedDonor(donor)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={donor.is_available ? "outline" : "default"}
                          onClick={() => toggleAvailability(donor.id, donor.is_available)}
                        >
                          {donor.is_available ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
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

      {/* Donor Details Dialog */}
      <Dialog open={!!selectedDonor} onOpenChange={() => setSelectedDonor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Donor Details</DialogTitle>
          </DialogHeader>
          {selectedDonor && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="h-20 w-20 rounded-full bg-red-500 flex items-center justify-center text-white text-2xl font-semibold">
                  {selectedDonor.users?.full_name?.charAt(0) || 'D'}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{selectedDonor.users?.full_name || 'No name'}</h3>
                  <p className="text-gray-600">Blood Group: {selectedDonor.blood_group}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="text-gray-900">{selectedDonor.users?.phone}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900">{selectedDonor.users?.email || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">City</label>
                  <p className="text-gray-900">{selectedDonor.city}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Availability</label>
                  <p className="text-gray-900">{selectedDonor.is_available ? 'Available' : 'Unavailable'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Last Donation</label>
                  <p className="text-gray-900">
                    {selectedDonor.last_donation_date 
                      ? new Date(selectedDonor.last_donation_date).toLocaleDateString()
                      : 'Never'
                    }
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Registered</label>
                  <p className="text-gray-900">{new Date(selectedDonor.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-2">Update Last Donation Date</label>
                <Input
                  type="date"
                  defaultValue={selectedDonor.last_donation_date || ''}
                  onChange={(e) => updateLastDonation(selectedDonor.id, e.target.value)}
                />
              </div>

              <div className="flex space-x-2 pt-4">
                <Button
                  variant={selectedDonor.is_available ? "outline" : "default"}
                  onClick={() => {
                    toggleAvailability(selectedDonor.id, selectedDonor.is_available)
                    setSelectedDonor({ ...selectedDonor, is_available: !selectedDonor.is_available })
                  }}
                  className="flex-1"
                >
                  Mark as {selectedDonor.is_available ? 'Unavailable' : 'Available'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteDonor(selectedDonor.id)}
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