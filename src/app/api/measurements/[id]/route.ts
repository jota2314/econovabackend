import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  console.log(`[DELETE /api/measurements/${id}] Starting request`)
  
  try {
    const supabase = await createClient()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log(`[DELETE /api/measurements/${id}] Auth result:`, { 
      hasUser: !!user, 
      userId: user?.id, 
      authError: authError?.message 
    })
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log(`[DELETE /api/measurements/${id}] Deleting measurement`)
    
    const { error } = await supabase
      .from('measurements')
      .delete()
      .eq('id', id)

    if (error) {
      console.error(`[DELETE /api/measurements/${id}] Database error:`, error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete measurement' },
        { status: 500 }
      )
    }

    console.log(`[DELETE /api/measurements/${id}] Success`)

    return NextResponse.json({
      success: true,
      message: 'Measurement deleted successfully'
    })

  } catch (error) {
    console.error('Error in measurement DELETE:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}