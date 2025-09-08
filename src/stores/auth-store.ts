'use client'

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { createClient } from '@/lib/supabase/client'
import type { AuthStore } from './types'

export const useAuthStore = create<AuthStore>()(
  typeof window !== 'undefined'
    ? devtools(
        (set, get) => ({
      // Initial State
      user: null,
      profile: null,
      session: null,
      loading: true,
      error: null,

      // Computed Selectors
      get isAuthenticated() {
        return !!get().user
      },

      get userRole() {
        return get().profile?.role || null
      },

      get userId() {
        return get().user?.id || null
      },

      // Actions
      setAuth: (user, profile, session) => 
        set(
          { user, profile: profile || null, session, loading: false, error: null },
          false,
          'setAuth'
        ),

      clearAuth: () => 
        set(
          { user: null, profile: null, session: null, loading: false, error: null },
          false,
          'clearAuth'
        ),

      setLoading: (loading) => 
        set({ loading }, false, 'setLoading'),

      setError: (error) => 
        set({ error }, false, 'setError'),

      // Async Actions
      signIn: async (email, password) => {
        const supabase = createClient()
        set({ loading: true, error: null }, false, 'signIn:start')
        
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (error) {
            set({ loading: false, error: error.message }, false, 'signIn:error')
            return { error }
          }

          // Auth state will be updated via the auth listener
          return { data }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Sign in failed'
          set({ loading: false, error: errorMessage }, false, 'signIn:exception')
          return { error: { message: errorMessage } }
        }
      },

      signUp: async (email, password, metadata) => {
        const supabase = createClient()
        set({ loading: true, error: null }, false, 'signUp:start')
        
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: metadata,
            },
          })

          if (error) {
            set({ loading: false, error: error.message }, false, 'signUp:error')
            return { error }
          }

          set({ loading: false }, false, 'signUp:success')
          return { data }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Sign up failed'
          set({ loading: false, error: errorMessage }, false, 'signUp:exception')
          return { error: { message: errorMessage } }
        }
      },

      signOut: async () => {
        const supabase = createClient()
        set({ loading: true, error: null }, false, 'signOut:start')
        
        try {
          const { error } = await supabase.auth.signOut()
          
          if (error) {
            set({ loading: false, error: error.message }, false, 'signOut:error')
            return { error }
          }

          // Auth state will be cleared via the auth listener
          return {}
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Sign out failed'
          set({ loading: false, error: errorMessage }, false, 'signOut:exception')
          return { error: { message: errorMessage } }
        }
      },

      resetPassword: async (email) => {
        const supabase = createClient()
        set({ error: null }, false, 'resetPassword:start')
        
        try {
          const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
          })
          
          if (error) {
            set({ error: error.message }, false, 'resetPassword:error')
            return { error }
          }

          return { data }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Password reset failed'
          set({ error: errorMessage }, false, 'resetPassword:exception')
          return { error: { message: errorMessage } }
        }
      },

      updatePassword: async (password) => {
        const supabase = createClient()
        set({ loading: true, error: null }, false, 'updatePassword:start')
        
        try {
          const { data, error } = await supabase.auth.updateUser({
            password,
          })
          
          if (error) {
            set({ loading: false, error: error.message }, false, 'updatePassword:error')
            return { error }
          }

          set({ loading: false }, false, 'updatePassword:success')
          return { data }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Password update failed'
          set({ loading: false, error: errorMessage }, false, 'updatePassword:exception')
          return { error: { message: errorMessage } }
        }
      },

      updateProfile: async (updates) => {
        const { user } = get()
        if (!user) return { error: { message: 'No user logged in' } }

        const supabase = createClient()
        set({ loading: true, error: null }, false, 'updateProfile:start')
        
        try {
          const { data, error } = await supabase
            .from('users')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', user.id)
            .select()
            .single()

          if (error) {
            set({ loading: false, error: error.message }, false, 'updateProfile:error')
            return { error }
          }

          if (data) {
            set(
              (state) => ({ ...state, profile: data, loading: false }),
              false,
              'updateProfile:success'
            )
          }

          return { data }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Profile update failed'
          set({ loading: false, error: errorMessage }, false, 'updateProfile:exception')
          return { error: { message: errorMessage } }
        }
      },

      refreshProfile: async () => {
        const { user } = get()
        if (!user) return

        const supabase = createClient()
        
        try {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single()

          if (profile) {
            set(
              (state) => ({ ...state, profile }),
              false,
              'refreshProfile:success'
            )
          }
        } catch (err) {
          console.error('Failed to refresh profile:', err)
          set({ error: 'Failed to refresh profile' }, false, 'refreshProfile:error')
        }
      },
        }),
        {
          name: 'auth-store',
          enabled: process.env.NODE_ENV === 'development'
        }
      )
    : // Server-side fallback store (minimal implementation)
      (set, get) => ({
        // Initial State
        user: null,
        profile: null,
        session: null,
        loading: true,
        error: null,

        // Computed Selectors
        get isAuthenticated() { return false },
        get userRole() { return null },
        get userId() { return null },

        // Stub actions for SSR
        setAuth: () => {},
        clearAuth: () => {},
        setLoading: () => {},
        setError: () => {},
        signIn: async () => ({ error: { message: 'SSR mode' } }),
        signUp: async () => ({ error: { message: 'SSR mode' } }),
        signOut: async () => ({ error: { message: 'SSR mode' } }),
        resetPassword: async () => ({ error: { message: 'SSR mode' } }),
        updatePassword: async () => ({ error: { message: 'SSR mode' } }),
        updateProfile: async () => ({ error: { message: 'SSR mode' } }),
        refreshProfile: async () => {},
      })
)

// Initialize auth state listener
let authListenerInitialized = false

export const initializeAuthListener = () => {
  if (authListenerInitialized || typeof window === 'undefined') return

  const supabase = createClient()
  const { setAuth, clearAuth, setLoading } = useAuthStore.getState()

  // Get initial session
  const getInitialSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error getting session:', error)
        setLoading(false)
        return
      }

      if (session?.user) {
        // Get user profile
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        setAuth(session.user, profile, session)
      } else {
        setLoading(false)
      }
    } catch (err) {
      console.error('Error initializing auth:', err)
      setLoading(false)
    }
  }

  // Listen for auth changes
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      // Get user profile
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()

      setAuth(session.user, profile, session)
    } else {
      clearAuth()
    }
  })

  getInitialSession()
  authListenerInitialized = true
}