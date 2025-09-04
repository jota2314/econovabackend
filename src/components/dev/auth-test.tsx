'use client'

import { useAuthStore } from '@/stores/auth-store'

export function AuthTest() {
  const { user, loading, isAuthenticated, userRole } = useAuthStore()

  if (loading) {
    return <div>Loading auth state...</div>
  }

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">🎯 Zustand Auth Store Test</h3>
      <div className="space-y-2">
        <p><strong>Authenticated:</strong> {isAuthenticated ? '✅ Yes' : '❌ No'}</p>
        <p><strong>User ID:</strong> {user?.id || 'None'}</p>
        <p><strong>Email:</strong> {user?.email || 'None'}</p>
        <p><strong>Role:</strong> {userRole || 'None'}</p>
        <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
      </div>
    </div>
  )
}