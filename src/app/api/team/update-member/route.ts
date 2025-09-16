import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('id')

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      )
    }

    const { full_name, role, phone } = await request.json()

    // Validate required fields
    if (!full_name || !role) {
      return NextResponse.json(
        { error: 'Full name and role are required' },
        { status: 400 }
      )
    }

    // Check if current user is authorized (manager/admin)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get current user's role
    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!currentUser || (currentUser.role !== 'manager' && currentUser.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Use service role client for admin operations
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Update user profile in users table
    const { data, error: profileError } = await serviceClient
      .from('users')
      .update({
        full_name: full_name,
        role: role,
        phone: phone || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .select()

    if (profileError) {
      console.error('Profile update error:', profileError)
      return NextResponse.json(
        { error: 'Failed to update team member profile' },
        { status: 500 }
      )
    }

    // Update auth user metadata
    const { error: authError } = await serviceClient.auth.admin.updateUserById(
      memberId,
      {
        user_metadata: {
          full_name: full_name,
          role: role
        }
      }
    )

    if (authError) {
      console.error('Auth update error:', authError)
      // Don't fail the request if metadata update fails, profile update is more important
    }

    return NextResponse.json({
      message: 'Team member updated successfully',
      data: data?.[0] || null
    })

  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}