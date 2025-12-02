'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldAlert } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase'

export default function UnauthorizedPage() {
  const router = useRouter()
  const supabase = createBrowserClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <ShieldAlert className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-red-600">Access Denied</CardTitle>
          <CardDescription>You do not have admin access to this panel</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800 text-center">
              This admin panel is restricted to authorized administrators only.
              Please contact your system administrator if you believe this is an error.
            </p>
          </div>
          <div className="space-y-2">
            <Button onClick={handleLogout} className="w-full" variant="destructive">
              Logout
            </Button>
            <Button onClick={() => router.push('/')} className="w-full" variant="outline">
              Go to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}