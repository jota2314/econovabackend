import { User as SupabaseUser, Session } from '@supabase/supabase-js'
import { User } from '@/lib/types/database'

// Auth Store Types
export interface AuthState {
  user: SupabaseUser | null
  profile: User | null
  session: Session | null
  loading: boolean
  error: string | null
}

export interface AuthActions {
  setAuth: (user: SupabaseUser, profile: User | null, session: Session) => void
  clearAuth: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  signIn: (email: string, password: string) => Promise<{ data?: any; error?: any }>
  signUp: (email: string, password: string, metadata?: any) => Promise<{ data?: any; error?: any }>
  signOut: () => Promise<{ error?: any }>
  resetPassword: (email: string) => Promise<{ data?: any; error?: any }>
  updatePassword: (password: string) => Promise<{ data?: any; error?: any }>
  updateProfile: (updates: Partial<User>) => Promise<{ data?: any; error?: any }>
  refreshProfile: () => Promise<void>
}

export interface AuthSelectors {
  isAuthenticated: boolean
  userRole: string | null
  userId: string | null
}

export type AuthStore = AuthState & AuthActions & AuthSelectors

// UI Store Types
export interface UIState {
  modals: {
    addLead: boolean
    importLeads: boolean
    smsDialog: boolean
    communicationHistory: boolean
    editLead: boolean
  }
  dialogData: {
    selectedLeadForComms: any | null
    editingLead: any | null
  }
  sidebarCollapsed: boolean
  theme: 'light' | 'dark'
}

export interface UIActions {
  openModal: (modal: keyof UIState['modals'], data?: any) => void
  closeModal: (modal: keyof UIState['modals']) => void
  closeAllModals: () => void
  setDialogData: (key: keyof UIState['dialogData'], data: any) => void
  clearDialogData: () => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setTheme: (theme: 'light' | 'dark') => void
}

export type UIStore = UIState & UIActions