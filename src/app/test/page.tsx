"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestPage() {
  const [connectionStatus, setConnectionStatus] = useState<string>('Testing...')
  const [authStatus, setAuthStatus] = useState<string>('Checking...')
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const testConnection = async () => {
    try {
      setConnectionStatus('Testing...')
      setError(null)

      // Test API route
      const apiResponse = await fetch('/api/test-supabase')
      const apiResult = await apiResponse.json()
      
      if (apiResult.success) {
        setConnectionStatus('✅ Supabase connected successfully')
      } else {
        setConnectionStatus('❌ Connection failed')
        setError(apiResult.error)
      }

      // Test auth status
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        setAuthStatus('❌ Auth check failed: ' + authError.message)
      } else if (user) {
        setAuthStatus('✅ User authenticated: ' + user.email)
      } else {
        setAuthStatus('⚪ No authenticated user')
      }

    } catch (err) {
      setConnectionStatus('❌ Connection test failed')
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const testSignUp = async () => {
    const { data, error } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'testpassword123',
      options: {
        data: {
          full_name: 'Test User'
        }
      }
    })

    if (error) {
      setError('Signup test failed: ' + error.message)
    } else {
      setAuthStatus('✅ Signup test successful (check email for verification)')
    }
  }

  useEffect(() => {
    testConnection()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Supabase Connection Test</CardTitle>
            <CardDescription>
              Testing connection to your Supabase instance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold">Database Connection:</h3>
              <p className="text-sm text-muted-foreground">{connectionStatus}</p>
            </div>
            
            <div>
              <h3 className="font-semibold">Authentication Status:</h3>
              <p className="text-sm text-muted-foreground">{authStatus}</p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <h4 className="text-sm font-semibold text-red-800">Error:</h4>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={testConnection} variant="outline">
                Retest Connection
              </Button>
              <Button onClick={testSignUp} variant="secondary">
                Test Signup
              </Button>
              <Button onClick={() => window.location.href = '/login'}>
                Go to Login
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              <p>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
              <p>Anon Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Present' : '❌ Missing'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}