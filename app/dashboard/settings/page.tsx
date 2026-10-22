'use client'

import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '@/lib/adminApi'
import { createBrowserClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import {
  Settings as SettingsIcon,
  Bell,
  Shield,
  Database,
  Download,
  CreditCard,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { replaceAdminImage } from '@/lib/cloudinaryClient'

/**
 * The two society membership plans and the app_settings key that holds each
 * plan's fee. There is deliberately no default here: a blank fee means "not
 * configured", which the mobile form shows as such and the database refuses to
 * charge — rather than inventing a price.
 */
const MEMBERSHIP_PLAN_FIELDS = [
  {
    key: 'membership.fee',
    name: 'lifetime',
    label: 'Lifetime Membership',
    description: 'Single lifetime member. Fee charged for the Lifetime Membership plan.',
  },
  {
    key: 'membership.fee_spouse',
    name: 'lifetime_spouse',
    label: 'Lifetime Membership with Spouse',
    description: 'Lifetime member plus spouse. Fee charged for that plan only.',
  },
] as const

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [adminUser, setAdminUser] = useState<any>(null)
  const [uploading, setUploading] = useState(false)
  const [settings, setSettings] = useState({
    appName: 'JBP Agrawal Sabha',
    appEmail: 'jabalpuragrawalsabha2019@gmail.com',
    appPhone: '+91 9826115733',
    upiId: 'jbpagrawalsabha@upi',
    upiQrCode: '', // QR code URL
    autoApproveVerified: false,
    emailNotifications: true,
    smsNotifications: false,
  })
  const [planFees, setPlanFees] = useState<Record<string, string>>({
    lifetime: '',
    lifetime_spouse: '',
  })
  const [savingFees, setSavingFees] = useState(false)

  const supabase = createBrowserClient()

  useEffect(() => {
    fetchAdminUser()
    fetchPlanFees()
  }, [])

  const fetchAdminUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()
        setAdminUser(data)
      }
    } catch (error) {
      console.error('Error fetching admin user:', error)
    }
  }

  /**
   * Reads the current plan fees through the secured admin API (service role) so
   * the dashboard never depends on the browser's own RLS view.
   */
  const fetchPlanFees = useCallback(async () => {
    try {
      const { data, error } = await adminApi<{ setting_key: string; setting_value: string }[]>(
        '/api/admin/settings',
        'GET',
      )
      if (error) {
        toast.error(error)
        return
      }
      const map: Record<string, string> = {}
      ;(data || []).forEach((row) => {
        map[row.setting_key] = row.setting_value ?? ''
      })
      setPlanFees((prev) => ({
        lifetime: map['membership.fee'] ?? prev.lifetime,
        lifetime_spouse: map['membership.fee_spouse'] ?? prev.lifetime_spouse,
      }))
    } catch (error) {
      console.error('Error loading plan fees:', error)
    }
  }, [])

  /**
   * Saves the two plan fees independently.
   *
   * Both are validated client-side for feedback AND on the server before the
   * write. Changing a fee only affects applications submitted afterwards: each
   * membership request keeps the fee that was due at submission, so existing
   * payments are never repriced.
   */
  const handleSavePlanFees = async () => {
    const invalid = MEMBERSHIP_PLAN_FIELDS.find(({ name }) => {
      const raw = String(planFees[name] ?? '').trim()
      if (raw === '') return false // allowed: an unset fee simply disables the plan
      return !/^\d+(\.\d{1,2})?$/.test(raw) || Number(raw) <= 0
    })
    if (invalid) {
      toast.error(`${invalid.label}: enter a positive amount (e.g. 1000 or 1000.50), or leave it empty to disable`)
      return
    }

    setSavingFees(true)
    try {
      for (const { key, name } of MEMBERSHIP_PLAN_FIELDS) {
        const value = String(planFees[name] ?? '').trim()
        // Saving an emptied field writes an empty value = "not configured yet",
        // which is how the spouse plan ships. Never skip it silently.
        const { error } = await adminApi('/api/admin/settings', 'POST', { key, value })
        if (error) {
          toast.error(error)
          return
        }
      }
      toast.success('Membership plan fees saved')
      fetchPlanFees()
    } finally {
      setSavingFees(false)
    }
  }

  const handleSaveAppSettings = () => {
    setLoading(true)
    // In a real app, save to database
    setTimeout(() => {
      toast.success('App settings saved successfully')
      setLoading(false)
    }, 1000)
  }

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const uploaded = await replaceAdminImage(
        file,
        'settings/qr-codes',
        settings.upiQrCode,
      )
      setSettings({ ...settings, upiQrCode: uploaded.url })
      toast.success('QR Code uploaded successfully')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload QR code')
    } finally {
      setUploading(false)
    }
  }

  const handleSaveNotificationSettings = () => {
    setLoading(true)
    setTimeout(() => {
      toast.success('Notification settings saved')
      setLoading(false)
    }, 1000)
  }

  const exportDatabase = async () => {
    toast.loading('Preparing database export...')
    
    try {
      // Export all tables
      const tables = [
        'users',
        'matrimonial_profiles',
        'events',
        'jobs',
        'blood_donors',
        'donations',
        'post_holders',
        'approved_members'
      ]

      const exports: any = {}

      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
        
        if (!error && data) {
          exports[table] = data
        }
      }

      const jsonStr = JSON.stringify(exports, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `jbp-database-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      window.URL.revokeObjectURL(url)

      toast.dismiss()
      toast.success('Database exported successfully')
    } catch (error) {
      toast.dismiss()
      toast.error('Failed to export database')
    }
  }

  const clearCache = () => {
    localStorage.clear()
    sessionStorage.clear()
    toast.success('Cache cleared successfully')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your admin panel configuration</p>
      </div>

      <Tabs defaultValue="app" className="space-y-6">
        <TabsList>
          <TabsTrigger value="app">
            <SettingsIcon className="w-4 h-4 mr-2" />
            App Settings
          </TabsTrigger>
          <TabsTrigger value="membership">
            <CreditCard className="w-4 h-4 mr-2" />
            Membership Plans
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="data">
            <Database className="w-4 h-4 mr-2" />
            Data Management
          </TabsTrigger>
        </TabsList>

        {/* App Settings */}
        <TabsContent value="app">
          <Card>
            <CardHeader>
              <CardTitle>Application Settings</CardTitle>
              <CardDescription>Configure basic app information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="appName">App Name</Label>
                <Input
                  id="appName"
                  value={settings.appName}
                  onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="appEmail">Contact Email</Label>
                <Input
                  id="appEmail"
                  type="email"
                  value={settings.appEmail}
                  onChange={(e) => setSettings({ ...settings, appEmail: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="appPhone">Contact Phone</Label>
                <Input
                  id="appPhone"
                  type="tel"
                  value={settings.appPhone}
                  onChange={(e) => setSettings({ ...settings, appPhone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="upiId">UPI ID for Donations</Label>
                <Input
                  id="upiId"
                  value={settings.upiId}
                  onChange={(e) => setSettings({ ...settings, upiId: e.target.value })}
                  placeholder="yourname@upi"
                />
              </div>

              {/* QR Code Upload */}
              <div>
                <Label>UPI Payment QR Code</Label>
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQrUpload}
                    className="hidden"
                    id="qr-upload"
                    disabled={uploading}
                  />
                  <label htmlFor="qr-upload">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full" 
                      disabled={uploading} 
                      asChild
                    >
                      <span>
                        {uploading ? 'Uploading...' : settings.upiQrCode ? 'Change QR Code' : 'Upload QR Code'}
                      </span>
                    </Button>
                  </label>
                  {settings.upiQrCode && (
                    <div className="mt-4 border rounded-lg p-4 bg-gray-50">
                      <p className="text-sm font-medium mb-2">Current QR Code:</p>
                      <img 
                        src={settings.upiQrCode} 
                        alt="UPI QR Code" 
                        className="w-48 h-48 object-contain mx-auto border rounded"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSettings({ ...settings, upiQrCode: '' })}
                        className="mt-2 text-red-600 w-full"
                      >
                        Remove QR Code
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Upload your UPI payment QR code for donations. This will be shown to users when they want to donate.
                  </p>
                </div>
              </div>

              <Button onClick={handleSaveAppSettings} disabled={loading}>
                Save App Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Membership plan fees */}
        <TabsContent value="membership">
          <Card>
            <CardHeader>
              <CardTitle>Membership Plan Fees</CardTitle>
              <CardDescription>
                The society sells exactly two membership plans. Set each fee here; the mobile
                membership form reads these values and shows the fee for the plan a member selects.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {MEMBERSHIP_PLAN_FIELDS.map(({ name, label, description }) => (
                <div key={name}>
                  <Label htmlFor={`fee-${name}`}>{label} fee (₹)</Label>
                  <Input
                    id={`fee-${name}`}
                    type="text"
                    inputMode="decimal"
                    value={planFees[name] ?? ''}
                    onChange={(e) => setPlanFees({ ...planFees, [name]: e.target.value })}
                    placeholder="e.g. 1000"
                  />
                  <p className="text-xs text-gray-500 mt-1">{description}</p>
                  {!String(planFees[name] ?? '').trim() && (
                    <p className="text-xs text-amber-600 mt-1">
                      Not configured. Members cannot select or submit this plan until a fee is set.
                    </p>
                  )}
                </div>
              ))}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
                Saving a new fee applies to applications submitted <strong>after</strong> the change.
                Every existing membership application keeps the fee that was due when it was
                submitted, so pending and approved payments are never repriced.
              </div>

              <Button onClick={handleSavePlanFees} disabled={savingFees}>
                {savingFees ? 'Saving…' : 'Save plan fees'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Control how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Email Notifications</h4>
                  <p className="text-sm text-gray-500">Receive email alerts for new submissions</p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, emailNotifications: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">SMS Notifications</h4>
                  <p className="text-sm text-gray-500">Receive SMS alerts for important updates</p>
                </div>
                <Switch
                  checked={settings.smsNotifications}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, smsNotifications: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Auto-Approve Verified Users</h4>
                  <p className="text-sm text-gray-500">
                    Automatically approve submissions from verified users
                  </p>
                </div>
                <Switch
                  checked={settings.autoApproveVerified}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, autoApproveVerified: checked })
                  }
                />
              </div>
              <Button onClick={handleSaveNotificationSettings} disabled={loading}>
                Save Notification Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Admin Account</CardTitle>
                <CardDescription>Your admin account information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {adminUser && (
                  <>
                    <div>
                      <Label>Name</Label>
                      <p className="text-gray-900 font-medium">{adminUser.full_name || 'Not set'}</p>
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <p className="text-gray-900">{adminUser.phone}</p>
                    </div>
                    <div>
                      <Label>Email</Label>
                      <p className="text-gray-900">{adminUser.email || 'Not set'}</p>
                    </div>
                    <div>
                      <Label>Role</Label>
                      <p className="text-gray-900 font-semibold text-blue-600">Administrator</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your admin password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input id="currentPassword" type="password" />
                </div>
                <div>
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input id="newPassword" type="password" />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input id="confirmPassword" type="password" />
                </div>
                <Button>Update Password</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>Add an extra layer of security</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline">Enable 2FA (Coming Soon)</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Data Management */}
        <TabsContent value="data">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Database Export</CardTitle>
                <CardDescription>Download a backup of your database</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Export all data including users, profiles, events, jobs, donations, and more.
                  The export will be in JSON format.
                </p>
                <Button onClick={exportDatabase}>
                  <Download className="w-4 h-4 mr-2" />
                  Export Database
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cache Management</CardTitle>
                <CardDescription>Clear cached data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Clear local cache if you're experiencing issues or want to free up space.
                </p>
                <Button variant="outline" onClick={clearCache}>
                  Clear Cache
                </Button>
              </CardContent>
            </Card>

            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600">Danger Zone</CardTitle>
                <CardDescription>Irreversible actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-medium text-red-900 mb-2">Delete All Data</h4>
                  <p className="text-sm text-red-700 mb-4">
                    This will permanently delete all users, profiles, events, and other data. 
                    This action cannot be undone.
                  </p>
                  <Button 
                    variant="destructive" 
                    disabled
                    onClick={() => toast.error('This feature is disabled for safety')}
                  >
                    Delete All Data (Disabled)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}