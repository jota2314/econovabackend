import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface TeamMember {
  id: string
  email: string
  full_name: string
  role: string
  phone?: string
  created_at: string
}

interface CurrentUser {
  id: string
  email: string
  full_name: string
  role: string
}

interface TeamState {
  teamMembers: TeamMember[]
  currentUser: CurrentUser | null
  loading: boolean
  error: string | null

  // Actions
  loadTeamMembers: () => Promise<void>
  loadCurrentUser: () => Promise<void>
  addMember: (memberData: {
    email: string
    full_name: string
    role: string
    phone?: string
    password: string
  }) => Promise<void>
  updateMember: (memberId: string, memberData: {
    full_name: string
    role: string
    phone?: string
  }) => Promise<void>
  deleteMember: (memberId: string) => Promise<void>
}

export const useTeamStore = create<TeamState>((set, get) => ({
  teamMembers: [],
  currentUser: null,
  loading: false,
  error: null,

  loadTeamMembers: async () => {
    console.log('🔄 Loading team members...')
    set({ loading: true, error: null })

    try {
      // Use API route to fetch team members
      const response = await fetch('/api/team/members')
      console.log('📡 API request made')

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      console.log('📊 API result:', { data: result?.data?.length || 0, error: result?.error })

      if (result.error) {
        console.error('❌ Error loading team members:', result.error)
        set({ error: result.error, loading: false })
        toast.error('Failed to load team members')
      } else {
        console.log('✅ Team members loaded:', result.data?.length || 0)
        console.log('✅ Data:', result.data)
        set({ teamMembers: result.data || [], loading: false })
      }
    } catch (error: any) {
      console.error('💥 Catch error loading team members:', error)
      set({ error: error.message, loading: false })
      toast.error('Failed to load team members')
    }
  },

  loadCurrentUser: async () => {
    try {
      console.log('🔄 Loading current user...')

      // Use API route to fetch current user
      const response = await fetch('/api/team/current-user')

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.error) {
        console.error('❌ Error loading current user:', result.error)
        set({ error: result.error })
      } else {
        console.log('✅ Current user loaded:', result.data?.role)
        set({ currentUser: result.data })
      }
    } catch (error: any) {
      console.error('💥 Error loading current user:', error)
      set({ error: error.message })
    }
  },

  addMember: async (memberData) => {
    try {
      console.log('🔄 Adding team member...')

      const response = await fetch('/api/team/add-member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(memberData),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('❌ Error adding team member:', result.error)
        toast.error(result.error || 'Failed to add team member')
        return
      }

      console.log('✅ Team member added successfully')
      toast.success('Team member added successfully')

      // Reload team members
      get().loadTeamMembers()
    } catch (error: any) {
      console.error('💥 Error adding team member:', error)
      toast.error('Failed to add team member')
    }
  },

  updateMember: async (memberId, memberData) => {
    try {
      console.log('🔄 Updating team member...')

      const response = await fetch(`/api/team/update-member?id=${memberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(memberData),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('❌ Error updating team member:', result.error)
        toast.error(result.error || 'Failed to update team member')
        return
      }

      console.log('✅ Team member updated successfully')
      toast.success('Team member updated successfully')

      // Reload team members
      get().loadTeamMembers()
    } catch (error: any) {
      console.error('💥 Error updating team member:', error)
      toast.error('Failed to update team member')
    }
  },

  deleteMember: async (memberId) => {
    const { currentUser } = get()

    if (memberId === currentUser?.id) {
      toast.error("You can't delete your own account")
      return
    }

    if (!confirm('Are you sure you want to remove this team member?')) {
      return
    }

    try {
      console.log('🔄 Deleting team member...')

      const response = await fetch(`/api/team/delete-member?id=${memberId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('❌ Error deleting team member:', result.error)
        toast.error(result.error || 'Failed to remove team member')
        return
      }

      console.log('✅ Team member deleted successfully')
      toast.success('Team member removed successfully')

      // Reload team members
      get().loadTeamMembers()
    } catch (error: any) {
      console.error('💥 Error deleting team member:', error)
      toast.error('Failed to remove team member')
    }
  }
}))