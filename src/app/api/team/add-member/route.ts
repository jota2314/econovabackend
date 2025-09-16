import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { email, full_name, role, phone, password } = await request.json()

    // Validate required fields
    if (!email || !full_name || !password || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Use service role client to create user (bypasses rate limits)
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if user already exists
    const { data: existingUsers } = await serviceClient.auth.admin.listUsers()
    const existingUser = existingUsers.users.find(u => u.email === email)

    if (existingUser) {
      return NextResponse.json(
        { error: `A user with email ${email} already exists` },
        { status: 400 }
      )
    }

    // Create auth user
    const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: full_name,
        role: role
      }
    })

    if (authError) {
      console.error('Auth creation error:', authError)
      return NextResponse.json(
        { error: `Failed to create user: ${authError.message}` },
        { status: 500 }
      )
    }

    // Create user profile in users table
    if (authData.user) {
      const { error: profileError } = await serviceClient
        .from('users')
        .insert({
          id: authData.user.id,
          email: email,
          full_name: full_name,
          role: role,
          phone: phone || null
        })

      if (profileError) {
        console.error('Profile creation error:', profileError)
        // Try to delete the auth user if profile creation fails
        await serviceClient.auth.admin.deleteUser(authData.user.id)
        return NextResponse.json(
          { error: 'User created but profile setup failed' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      message: 'Team member added successfully',
      data: {
        id: authData.user?.id,
        email: email,
        full_name: full_name,
        role: role,
        phone: phone
      }
    })

  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}