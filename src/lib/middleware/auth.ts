import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface AuthenticatedRequest extends NextRequest {
  user?: any
  userProfile?: any
}

export interface AuthOptions {
  requireRole?: 'manager' | 'salesperson'
  allowedRoles?: ('manager' | 'salesperson')[]
}

export async function withAuth(
  handler: (req: AuthenticatedRequest, context: any) => Promise<NextResponse>,
  options: AuthOptions = {}
) {
  return async (request: NextRequest, context: any) => {
    try {
      const supabase = await createClient()
      
      // Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        )
      }

      // Get user profile if role checking is needed
      let userProfile = null
      if (options.requireRole || options.allowedRoles) {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError || !profile) {
          return NextResponse.json(
            { success: false, error: 'User profile not found' },
            { status: 403 }
          )
        }

        userProfile = profile

        // Check role requirements
        if (options.requireRole && profile.role !== options.requireRole) {
          return NextResponse.json(
            { success: false, error: `Requires ${options.requireRole} role` },
            { status: 403 }
          )
        }

        if (options.allowedRoles && !options.allowedRoles.includes(profile.role)) {
          return NextResponse.json(
            { success: false, error: 'Insufficient permissions' },
            { status: 403 }
          )
        }
      }

      // Add user data to request
      const authenticatedRequest = request as AuthenticatedRequest
      authenticatedRequest.user = user
      authenticatedRequest.userProfile = userProfile

      return handler(authenticatedRequest, context)
    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

export async function requireManagerRole(
  handler: (req: AuthenticatedRequest, context: any) => Promise<NextResponse>
) {
  return withAuth(handler, { requireRole: 'manager' })
}

export async function requireAuth(
  handler: (req: AuthenticatedRequest, context: any) => Promise<NextResponse>
) {
  return withAuth(handler)
}