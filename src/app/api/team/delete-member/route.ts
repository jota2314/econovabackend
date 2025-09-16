import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('id')

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
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
      .select('role, id')
      .eq('id', user.id)
      .single()

    if (!currentUser || (currentUser.role !== 'manager' && currentUser.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Prevent deleting yourself
    if (memberId === currentUser.id) {
      return NextResponse.json(
        { error: "You can't delete your own account" },
        { status: 400 }
      )
    }

    // Use service role client for admin operations
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Delete from users table first
    const { error: profileError } = await serviceClient
      .from('users')
      .delete()
      .eq('id', memberId)

    if (profileError) {
      console.error('Profile deletion error:', profileError)
      return NextResponse.json(
        { error: 'Failed to delete user profile' },
        { status: 500 }
      )
    }

    // Delete the auth user
    const { error: authError } = await serviceClient.auth.admin.deleteUser(memberId)

    if (authError) {
      console.error('Auth deletion error:', authError)
      return NextResponse.json(
        { error: 'Failed to delete user account' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Team member deleted successfully'
    })

  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}