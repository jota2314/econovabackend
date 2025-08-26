import { createClient } from './supabase/server'
import { redirect } from 'next/navigation'
import { User } from './types/database'

export async function getCurrentUser() {
  const supabase = await createClient()
  
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}

export async function getCurrentProfile(): Promise<User | null> {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) {
    return null
  }

  const { data: profile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    return null
  }

  return profile
}

export async function requireAuth() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/login')
  }

  return user
}

export async function requireRole(allowedRoles: string[]) {
  const profile = await getCurrentProfile()
  
  if (!profile || !allowedRoles.includes(profile.role)) {
    redirect('/unauthorized')
  }

  return profile
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}