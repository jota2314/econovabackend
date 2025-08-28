import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'

export async function GET() {
  try {
    const profile = await getCurrentProfile()
    
    if (!profile) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    return NextResponse.json({ 
      role: profile.role,
      userId: profile.id,
      name: profile.full_name,
      email: profile.email
    })
  } catch (error) {
    console.error('Error fetching user role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}