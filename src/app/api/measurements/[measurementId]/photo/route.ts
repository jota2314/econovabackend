import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

interface Props {
  params: Promise<{ measurementId: string }>
}

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { measurementId } = await params
    const formData = await request.formData()
    const photo = formData.get('photo') as File

    if (!photo) {
      return NextResponse.json(
        { success: false, error: 'No photo file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!photo.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'File must be an image' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    if (photo.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Verify measurement exists
    const { data: measurement, error: fetchError } = await supabase
      .from('measurements')
      .select('id, job_id')
      .eq('id', measurementId)
      .single()

    if (fetchError || !measurement) {
      return NextResponse.json(
        { success: false, error: 'Measurement not found' },
        { status: 404 }
      )
    }

    try {
      // Create uploads directory if it doesn't exist
      const uploadsDir = join(process.cwd(), 'public', 'uploads', 'measurements')
      await mkdir(uploadsDir, { recursive: true })

      // Generate unique filename
      const fileExtension = photo.name.split('.').pop() || 'jpg'
      const fileName = `${measurementId}-${Date.now()}.${fileExtension}`
      const filePath = join(uploadsDir, fileName)
      
      // Convert file to buffer and save
      const bytes = await photo.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)

      // Update measurement with photo URL
      const photoUrl = `/uploads/measurements/${fileName}`
      const { error: updateError } = await supabase
        .from('measurements')
        .update({ photo_url: photoUrl })
        .eq('id', measurementId)

      if (updateError) {
        console.error('Error updating measurement with photo URL:', updateError)
        return NextResponse.json(
          { success: false, error: 'Failed to update measurement with photo' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        photoUrl,
        message: 'Photo uploaded successfully'
      })

    } catch (fileError) {
      console.error('Error saving photo file:', fileError)
      return NextResponse.json(
        { success: false, error: 'Failed to save photo file' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in photo upload:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}