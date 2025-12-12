'use client'

import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UserX, AlertCircle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AccountDeletionPage() {
  const [formData, setFormData] = useState({
    phone: '',
    email: '',
    reason: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const supabase = createBrowserClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Create deletion request in database
      const { error } = await supabase
        .from('deletion_requests')
        .insert({
          phone: formData.phone,
          email: formData.email,
          reason: formData.reason,
          status: 'pending',
          requested_at: new Date().toISOString(),
        })

      if (error) throw error

      setSubmitted(true)
      toast.success('Deletion request submitted successfully')
      
      // Reset form
      setFormData({ phone: '', email: '', reason: '' })
    } catch (error: any) {
      console.error('Error submitting request:', error)
      toast.error(error.message || 'Failed to submit request')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Request Submitted</CardTitle>
            <CardDescription>
              Your account deletion request has been received
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>What happens next:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Our team will review your request within 7-10 business days</li>
                  <li>You will receive a confirmation email once processed</li>
                  <li>All your personal data will be permanently deleted</li>
                  <li>This action cannot be undone</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Need to cancel this request?</strong><br />
                Contact us at: <a href="mailto:jabalpuragrawalsabha2019@gmail.com" className="underline">jabalpuragrawalsabha2019@gmail.com</a>
              </p>
            </div>

            <Button 
              onClick={() => setSubmitted(false)} 
              className="w-full"
              variant="outline"
            >
              Submit Another Request
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserX className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Account Deletion Request</CardTitle>
          <CardDescription>
            Request permanent deletion of your JBP Agrawal Sabha account and data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-900">
              <strong>Warning:</strong> Account deletion is permanent and cannot be undone. 
              All your data including profile, posts, and interactions will be permanently deleted.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+91 9999999999"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the phone number associated with your account
              </p>
            </div>

            <div>
              <Label htmlFor="email">Email Address (Optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                We'll send confirmation to this email
              </p>
            </div>

            <div>
              <Label htmlFor="reason">Reason for Deletion (Optional)</Label>
              <Textarea
                id="reason"
                placeholder="Please let us know why you're leaving..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={4}
              />
            </div>

            <div className="bg-gray-50 p-4 rounded-lg text-sm">
              <p className="font-semibold mb-2">What will be deleted:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Your profile information</li>
                <li>Matrimonial profile (if any)</li>
                <li>Posted events and jobs</li>
                <li>Blood donor information</li>
                <li>All personal data and preferences</li>
              </ul>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg text-sm">
              <p className="font-semibold mb-2">Processing Time:</p>
              <p className="text-gray-700">
                Your request will be reviewed and processed within 7-10 business days. 
                You will receive confirmation once completed.
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-red-600 hover:bg-red-700" 
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Deletion Request'}
            </Button>

            <p className="text-xs text-center text-gray-500">
              By submitting this request, you acknowledge that this action is permanent 
              and cannot be reversed.
            </p>
          </form>

          <div className="mt-6 pt-6 border-t text-center">
            <p className="text-sm text-gray-600">
              Need help? Contact us at{' '}
              <a 
                href="mailto:jabalpuragrawalsabha2019@gmail.com" 
                className="text-blue-600 hover:underline"
              >
                jabalpuragrawalsabha2019@gmail.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}