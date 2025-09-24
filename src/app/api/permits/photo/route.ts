import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/permits/photo - Upload a permit photo and return a public URL
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('photo') as unknown as File | null

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const fileExt = (file.name || 'upload').split('.').pop() || 'jpg'
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`
    const filePath = `permits/${user.id}/${fileName}`

    // Try Buffer upload (Node runtime). If it fails, fall back to Blob
    let uploadError: Error | null = null
    {
      const attempt = await supabase.storage
        .from('permit-photos')
        .upload(filePath, Buffer.from(bytes), {
          contentType: file.type || 'image/jpeg',
          upsert: true,
        })
      uploadError = attempt.error as unknown as Error | null
    }

    if (uploadError) {
      try {
        const blob = new Blob([new Uint8Array(bytes)], { type: file.type || 'image/jpeg' })
        const attempt2 = await supabase.storage
          .from('permit-photos')
          .upload(filePath, blob, { upsert: true })
        uploadError = attempt2.error as unknown as Error | null
      } catch (e: unknown) {
        uploadError = e instanceof Error ? e : new Error(String(e))
      }
    }

    if (uploadError) {
      return NextResponse.json(
        { success: false, error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    const { data: publicUrlData } = supabase.storage
      .from('permit-photos')
      .getPublicUrl(filePath)

    const url = publicUrlData?.publicUrl
    if (!url) {
      return NextResponse.json(
        { success: false, error: 'Failed to get public URL' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, url })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}





