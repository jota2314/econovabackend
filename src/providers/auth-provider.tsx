'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { User as SupabaseUser, Session } from '@supabase/supabase-js'
import { User } from '@/lib/types/database'

interface AuthContextType {
  user: SupabaseUser | null
  profile: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<any>
  signUp: (email: string, password: string, metadata?: any) => Promise<any>
  signOut: () => Promise<any>
  resetPassword: (email: string) => Promise<any>
  updatePassword: (password: string) => Promise<any>
  updateProfile: (updates: Partial<User>) => Promise<any>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}