'use client'

import { useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { User as DbUser } from '@/lib/types/database'

interface AuthState {
  user: User | null
  profile: DbUser | null
  session: Session | null
  loading: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
  })

  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error getting session:', error)
        setState(prev => ({ ...prev, loading: false }))
        return
      }

      if (session?.user) {
        // Get user profile
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        setState({
          user: session.user,
          profile: profile || null,
          session,
          loading: false,
        })
      } else {
        setState(prev => ({ ...prev, loading: false }))
      }
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Get user profile
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()

          setState({
            user: session.user,
            profile: profile || null,
            session,
            loading: false,
          })
        } else {
          setState({
            user: null,
            profile: null,
            session: null,
            loading: false,
          })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signUp = async (email: string, password: string, metadata?: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    })
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const resetPassword = async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { data, error }
  }

  const updatePassword = async (password: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password,
    })
    return { data, error }
  }

  const updateProfile = async (updates: Partial<DbUser>) => {
    if (!state.user) return { error: { message: 'No user logged in' } }

    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', state.user.id)
      .select()
      .single()

    if (data) {
      setState(prev => ({ ...prev, profile: data }))
    }

    return { data, error }
  }

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
  }
}