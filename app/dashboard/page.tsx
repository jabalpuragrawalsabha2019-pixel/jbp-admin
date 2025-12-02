'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Heart, Calendar, Briefcase, Droplet, DollarSign, CheckCircle, Clock } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

interface Stats {
  totalUsers: number
  verifiedUsers: number
  pendingApprovals: number
  totalEvents: number
  totalMatrimonial: number
  totalJobs: number
  totalDonations: number
  pendingMatrimonial: number
  pendingEvents: number
  pendingJobs: number
}

interface RecentActivity {
  users: any[]
  events: any[]
  donations: any[]
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    verifiedUsers: 0,
    pendingApprovals: 0,
    totalEvents: 0,
    totalMatrimonial: 0,
    totalJobs: 0,
    totalDonations: 0,
    pendingMatrimonial: 0,
    pendingEvents: 0,
    pendingJobs: 0,
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity>({
    users: [],
    events: [],
    donations: [],
  })
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient()

  useEffect(() => {
    fetchStats()
    fetchRecentActivity()
  }, [])

  const fetchStats = async () => {
    try {
      // Users stats
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      const { count: verifiedUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_verified', true)

      // Matrimonial stats
      const { count: totalMatrimonial } = await supabase
        .from('matrimonial_profiles')
        .select('*', { count: 'exact', head: true })

      const { count: pendingMatrimonial } = await supabase
        .from('matrimonial_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      // Events stats
      const { count: totalEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })

      const { count: pendingEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      // Jobs stats
      const { count: totalJobs } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })

      const { count: pendingJobs } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      // Donations stats
      const { data: donations } = await supabase
        .from('donations')
        .select('amount')

      const totalDonations = donations?.reduce((sum, d) => sum + Number(d.amount), 0) || 0

      const pendingApprovals = (pendingMatrimonial || 0) + (pendingEvents || 0) + (pendingJobs || 0)

      setStats({
        totalUsers: totalUsers || 0,
        verifiedUsers: verifiedUsers || 0,
        pendingApprovals,
        totalEvents: totalEvents || 0,
        totalMatrimonial: totalMatrimonial || 0,
        totalJobs: totalJobs || 0,
        totalDonations,
        pendingMatrimonial: pendingMatrimonial || 0,
        pendingEvents: pendingEvents || 0,
        pendingJobs: pendingJobs || 0,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentActivity = async () => {
    try {
      const { data: users } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      const { data: events } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      const { data: donations } = await supabase
        .from('donations')
        .select('*')
        .order('donated_at', { ascending: false })
        .limit(5)

      setRecentActivity({
        users: users || [],
        events: events || [],
        donations: donations || [],
      })
    } catch (error) {
      console.error('Error fetching recent activity:', error)
    }
  }

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: Users, color: 'bg-blue-500' },
    { title: 'Verified Users', value: stats.verifiedUsers, icon: CheckCircle, color: 'bg-green-500' },
    { title: 'Pending Approvals', value: stats.pendingApprovals, icon: Clock, color: 'bg-yellow-500' },
    { title: 'Matrimonial Profiles', value: stats.totalMatrimonial, icon: Heart, color: 'bg-pink-500' },
    { title: 'Events', value: stats.totalEvents, icon: Calendar, color: 'bg-purple-500' },
    { title: 'Jobs', value: stats.totalJobs, icon: Briefcase, color: 'bg-indigo-500' },
    { title: 'Total Donations', value: `₹${stats.totalDonations.toLocaleString()}`, icon: DollarSign, color: 'bg-emerald-500' },
  ]

  const approvalData = [
    { name: 'Matrimonial', value: stats.pendingMatrimonial, color: '#ec4899' },
    { name: 'Events', value: stats.pendingEvents, color: '#8b5cf6' },
    { name: 'Jobs', value: stats.pendingJobs, color: '#6366f1' },
  ]

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your community management system</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold mt-2">{stat.value}</p>
                  </div>
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={approvalData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {approvalData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Verification Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Verified', value: stats.verifiedUsers, color: '#10b981' },
                    { name: 'Unverified', value: stats.totalUsers - stats.verifiedUsers, color: '#6b7280' },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#6b7280" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.users.map((user) => (
                <div key={user.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{user.full_name || 'No name'}</p>
                    <p className="text-xs text-gray-500">{user.phone}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${user.is_verified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {user.is_verified ? 'Verified' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.events.map((event) => (
                <div key={event.id} className="py-2 border-b last:border-0">
                  <p className="font-medium text-sm">{event.title}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(event.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Donations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.donations.map((donation) => (
                <div key={donation.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{donation.donor_name}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(donation.donated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="font-semibold text-green-600">
                    ₹{Number(donation.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}