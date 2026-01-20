'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Search, Download, Eye, TrendingUp, DollarSign, Users, Calendar, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import toast from 'react-hot-toast'

interface Donation {
  id: string
  donor_name: string
  amount: number
  transaction_id: string | null
  upi_ref: string | null
  receipt_url: string | null
  donated_at: string
  is_verified: boolean | null
  verified_by: string | null
  verified_at: string | null
  admin_notes: string | null
}

export default function DonationsPage() {
  const [donations, setDonations] = useState<Donation[]>([])
  const [filteredDonations, setFilteredDonations] = useState<Donation[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [verificationFilter, setVerificationFilter] = useState<string>('all')
  const [adminNotes, setAdminNotes] = useState('')
  const [stats, setStats] = useState({
    total: 0,
    count: 0,
    average: 0,
    thisMonth: 0
  })
  const supabase = createBrowserClient()

  useEffect(() => {
    fetchDonations()
  }, [])

  useEffect(() => {
    filterDonations()
    calculateStats()
  }, [donations, searchQuery, dateFrom, dateTo, verificationFilter])

  const fetchDonations = async () => {
    try {
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .order('donated_at', { ascending: false })

      if (error) throw error
      setDonations(data || [])
    } catch (error) {
      console.error('Error fetching donations:', error)
      toast.error('Failed to fetch donations')
    } finally {
      setLoading(false)
    }
  }

  const filterDonations = () => {
    let filtered = [...donations]

    if (searchQuery) {
      filtered = filtered.filter(donation => 
        donation.donor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        donation.transaction_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        donation.upi_ref?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (dateFrom) {
      filtered = filtered.filter(donation => 
        new Date(donation.donated_at) >= new Date(dateFrom)
      )
    }

    if (dateTo) {
      filtered = filtered.filter(donation => 
        new Date(donation.donated_at) <= new Date(dateTo)
      )
    }

    if (verificationFilter === 'verified') {
      filtered = filtered.filter(donation => donation.is_verified === true)
    } else if (verificationFilter === 'unverified') {
      filtered = filtered.filter(donation => donation.is_verified !== true)
    }

    setFilteredDonations(filtered)
  }

  const calculateStats = () => {
    const total = filteredDonations.reduce((sum, d) => sum + Number(d.amount), 0)
    const count = filteredDonations.length
    const average = count > 0 ? total / count : 0

    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonth = filteredDonations
      .filter(d => new Date(d.donated_at) >= firstDayOfMonth)
      .reduce((sum, d) => sum + Number(d.amount), 0)

    setStats({ total, count, average, thisMonth })
  }

  const getMonthlyData = () => {
    const monthlyData: { [key: string]: number } = {}
    
    donations.forEach(donation => {
      const date = new Date(donation.donated_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + Number(donation.amount)
    })

    return Object.entries(monthlyData)
      .sort()
      .slice(-6)
      .map(([month, amount]) => ({
        month: new Date(month + '-01').toLocaleDateString('default', { month: 'short', year: 'numeric' }),
        amount
      }))
  }

  const exportToCSV = () => {
    const headers = ['Donor Name', 'Amount', 'Transaction ID', 'UPI Ref', 'Date']
    const rows = filteredDonations.map(donation => [
      donation.donor_name,
      donation.amount,
      donation.transaction_id || 'N/A',
      donation.upi_ref || 'N/A',
      new Date(donation.donated_at).toLocaleDateString()
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `donations-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('CSV exported successfully')
  }

  const deleteDonation = async (donationId: string) => {
    if (!confirm('Are you sure you want to delete this donation? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('donations')
        .delete()
        .eq('id', donationId)

      if (error) throw error

      toast.success('Donation deleted successfully')
      setSelectedDonation(null)
      fetchDonations()
    } catch (error) {
      console.error('Error deleting donation:', error)
      toast.error('Failed to delete donation')
    }
  }

  const toggleVerification = async (donationId: string, currentStatus: boolean | null) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const newStatus = !currentStatus
      const { error } = await supabase
        .from('donations')
        .update({
          is_verified: newStatus,
          verified_by: newStatus ? user?.id : null,
          verified_at: newStatus ? new Date().toISOString() : null,
          admin_notes: newStatus ? adminNotes : null,
        })
        .eq('id', donationId)

      if (error) throw error

      toast.success(`Donation marked as ${newStatus ? 'verified' : 'unverified'}`)
      setSelectedDonation(null)
      setAdminNotes('')
      fetchDonations()
    } catch (error) {
      console.error('Error updating verification:', error)
      toast.error('Failed to update verification')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Donations</h1>
          <p className="text-gray-600 mt-1">Track and manage community donations</p>
        </div>
        <Button onClick={exportToCSV}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Donations</p>
                <p className="text-2xl font-bold text-green-600 mt-2">₹{stats.total.toLocaleString()}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Donors</p>
                <p className="text-2xl font-bold mt-2">{stats.count}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Donation</p>
                <p className="text-2xl font-bold mt-2">₹{Math.round(stats.average).toLocaleString()}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-orange-600 mt-2">₹{stats.thisMonth.toLocaleString()}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Donation Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={getMonthlyData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `₹${Number(value).toLocaleString()}`} />
              <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, transaction ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Input
              type="date"
              placeholder="From Date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              type="date"
              placeholder="To Date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            <Select value={verificationFilter} onValueChange={setVerificationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Verification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Donations</SelectItem>
                <SelectItem value="verified">Verified Only</SelectItem>
                <SelectItem value="unverified">Unverified Only</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-gray-600 flex items-center">
              Showing {filteredDonations.length} of {donations.length} donations
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Donations Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Donor Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredDonations.map((donation) => (
                  <tr key={donation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{donation.donor_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-green-600">₹{Number(donation.amount).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {donation.transaction_id || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      {donation.is_verified ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="w-3 h-3 mr-1" />
                          Unverified
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(donation.donated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedDonation(donation)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteDonation(donation.id)}
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

      {/* Donation Details Dialog */}
      <Dialog open={!!selectedDonation} onOpenChange={() => setSelectedDonation(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Donation Details</DialogTitle>
          </DialogHeader>
          {selectedDonation && (
            <div className="space-y-4">
              <div className="bg-green-50 p-6 rounded-lg text-center">
                <p className="text-sm text-gray-600">Donation Amount</p>
                <p className="text-4xl font-bold text-green-600 mt-2">
                  ₹{Number(selectedDonation.amount).toLocaleString()}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Donor Name</label>
                  <p className="text-gray-900 font-medium">{selectedDonation.donor_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Date</label>
                  <p className="text-gray-900">{new Date(selectedDonation.donated_at).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Transaction ID</label>
                  <p className="text-gray-900">{selectedDonation.transaction_id || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">UPI Reference</label>
                  <p className="text-gray-900">{selectedDonation.upi_ref || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Verification Status</label>
                  <div className="mt-1">
                    {selectedDonation.is_verified ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="w-3 h-3 mr-1" />
                        Unverified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {selectedDonation.admin_notes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Admin Notes</label>
                  <p className="text-gray-900 mt-1 bg-gray-50 p-3 rounded">{selectedDonation.admin_notes}</p>
                </div>
              )}

              {/* Admin Notes Input */}
              <div>
                <Label htmlFor="adminNotes">Add Admin Notes (Optional)</Label>
                <Textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this donation verification..."
                  rows={2}
                />
              </div>

              {selectedDonation.receipt_url && (
                <div>
                  <label className="text-sm font-medium text-gray-500 block mb-2">Receipt</label>
                  <a 
                    href={selectedDonation.receipt_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View Receipt
                  </a>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="pt-4 border-t space-y-2">
                <Button
                  variant={selectedDonation.is_verified ? "outline" : "default"}
                  onClick={() => toggleVerification(selectedDonation.id, selectedDonation.is_verified)}
                  className="w-full"
                >
                  {selectedDonation.is_verified ? (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Mark as Unverified
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as Verified
                    </>
                  )}
                </Button>
                
                <Button
                  variant="destructive"
                  onClick={() => deleteDonation(selectedDonation.id)}
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete This Donation
                </Button>
                <p className="text-xs text-center text-gray-500">
                  Delete fake or test donations. Verify real donations.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}