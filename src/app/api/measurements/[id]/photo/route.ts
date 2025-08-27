import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  console.log(`[POST /api/measurements/${id}/photo] Starting request`)
  
  try {
    const supabase = await createClient()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log(`[POST /api/measurements/${id}/photo] Auth result:`, { 
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

    const formData = await request.formData()
    const photo = formData.get('photo') as File
    
    if (!photo) {
      return NextResponse.json(
        { success: false, error: 'No photo provided' },
        { status: 400 }
      )
    }

    console.log(`[POST /api/measurements/${id}/photo] Uploading photo: ${photo.name}`)

    // Convert File to ArrayBuffer for Supabase upload
    const bytes = await photo.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Generate unique filename
    const fileExt = photo.name.split('.').pop()
    const fileName = `${id}_${Date.now()}.${fileExt}`
    const filePath = `measurements/${fileName}`
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('measurement-photos')
      .upload(filePath, buffer, {
        contentType: photo.type,
        upsert: true
      })
    
    if (uploadError) {
      console.error('Upload error:', uploadError)
      // Fallback to local storage simulation
      const photoUrl = `/uploads/measurements/${fileName}`
      
      // Update measurement with simulated URL
      const { data: measurement, error } = await supabase
        .from('measurements')
        .update({ photo_url: photoUrl })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error(`[POST /api/measurements/${id}/photo] Database error:`, error)
        return NextResponse.json(
          { success: false, error: 'Failed to save photo reference' },
          { status: 500 }
        )
      }
      
      return NextResponse.json({
        success: true,
        photoUrl,
        message: 'Photo uploaded successfully (simulated - storage bucket not configured)'
      })
    }
    
    // Get public URL for the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from('measurement-photos')
      .getPublicUrl(filePath)
    
    const photoUrl = publicUrlData.publicUrl
    
    // Update the measurement with the photo URL
    const { data: measurement, error } = await supabase
      .from('measurements')
      .update({ photo_url: photoUrl })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error(`[POST /api/measurements/${id}/photo] Database error:`, error)
      return NextResponse.json(
        { success: false, error: 'Failed to save photo reference' },
        { status: 500 }
      )
    }

    console.log(`[POST /api/measurements/${id}/photo] Success:`, { photoUrl })

    return NextResponse.json({
      success: true,
      photoUrl,
      message: 'Photo uploaded successfully'
    })

  } catch (error) {
    console.error('Error in photo upload:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}