import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const supabase = await createClient()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log(`❌ Rejecting estimate ${id} by user ${user.id}`)

    // Check if user is a manager
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userProfile?.role !== 'manager') {
      return NextResponse.json(
        { success: false, error: 'Only managers can reject estimates' },
        { status: 403 }
      )
    }

    // Update estimate status to rejected
    const { data: updatedEstimate, error: updateError } = await supabase
      .from('estimates')
      .update({
        status: 'rejected',
        approved_by: user.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error rejecting estimate:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to reject estimate' },
        { status: 500 }
      )
    }

    console.log(`❌ Estimate ${id} rejected successfully`)

    return NextResponse.json({
      success: true,
      message: 'Estimate rejected successfully',
      estimate: updatedEstimate
    })

  } catch (error) {
    console.error('Error in reject estimate API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
