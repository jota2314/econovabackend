import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { createClient } from '@/lib/supabase/server'
import { Measurement } from '@/types/business/measurements'
import { EstimateLineItem } from '@/types/business/estimates'

interface GroupOverride {
  [key: string]: {
    price_per_sqft?: number
    total_override?: number
  }
}

interface GroupedMeasurement {
  insulation_type: string
  measurements: Measurement[]
  total_square_feet: number
  price_per_sqft: number
  total_price: number
}

interface PDFMeasurement {
  room_name: string
  floor_level?: string | null
  area_type?: string | null
  surface_type: string
  square_feet: number
  height: number
  width: number
  insulation_type?: 'open_cell' | 'closed_cell' | 'batt' | 'blown_in' | 'hybrid' | 'mineral_wool' | null
  r_value?: string | number | null
  framing_size?: string | null
  closed_cell_inches?: number
  open_cell_inches?: number
  blown_in_inches?: number
  is_hybrid_system?: boolean
  photo_url?: string
  unit_price?: number
  line_total?: number
  [key: string]: unknown
}

interface PDFGenerationRequest {
  measurements: Measurement[]
  jobName: string
  customerName: string
  jobPhotos?: string[]
  additionalData?: {
    customerEmail?: string
    customerPhone?: string
    customerAddress?: string
    projectAddress?: string
    projectCity?: string
    projectState?: string
    projectZipCode?: string
    buildingType?: string
    projectType?: string
    salespersonName?: string
    salespersonEmail?: string
    salespersonPhone?: string
    companyWebsite?: string
    overrideTotal?: number
    groupOverrides?: GroupOverride
    groupedMeasurements?: Record<string, GroupedMeasurement>
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  console.log('[PDF API] Starting PDF generation for job:', id)
  
  try {
    const supabase = await createClient()
    const jobId = id

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log('[PDF API] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[PDF API] User authenticated:', user.id)

    // Get job data
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('structural_framing')
      .eq('id', jobId)
      .single()
    
    if (jobError) {
      console.log('[PDF API] Error fetching job:', jobError)
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Parse request body
    const body: PDFGenerationRequest = await request.json()
    const { measurements, jobName, customerName, jobPhotos, additionalData } = body
    
    console.log('[PDF API] Checking for updated estimate data...')
    
    // Check if there are approved estimates with updated line items
    const { data: latestEstimate } = await supabase
      .from('estimates')
      .select(`
        id,
        estimate_number,
        subtotal,
        total_amount,
        status,
        estimate_line_items (
          id,
          description,
          quantity,
          unit_price,
          total
        )
      `)
      .eq('job_id', jobId)
      .in('status', ['approved', 'sent', 'pending_approval'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    // Always use live measurements instead of approved estimate data
    const finalMeasurements: PDFMeasurement[] = measurements.map(m => ({
      room_name: m.room_name,
      floor_level: m.floor_level,
      area_type: m.area_type,
      surface_type: m.surface_type,
      square_feet: m.square_feet || 0,
      height: m.height,
      width: m.width,
      insulation_type: m.insulation_type,
      r_value: m.r_value || '30',
      framing_size: job?.structural_framing || '2x6',
      closed_cell_inches: m.closed_cell_inches || undefined,
      open_cell_inches: m.open_cell_inches || undefined,
      blown_in_inches: m.insulation_type === 'blown_in' ? (m.closed_cell_inches || 0) + (m.open_cell_inches || 0) : 0,
      is_hybrid_system: m.is_hybrid_system || false,
      photo_url: m.photo_url || undefined
    }))
    const finalOverrideTotal = additionalData?.overrideTotal
    
    // COMMENTED OUT: Force use of live measurements instead of approved estimate data
    // This ensures PDF always matches what user sees in the app
    /* 
    if (latestEstimate && latestEstimate.estimate_line_items && latestEstimate.estimate_line_items.length > 0) {
      console.log('[PDF API] Found latest estimate with line items:', latestEstimate.estimate_number)
      console.log('[PDF API] Line items count:', latestEstimate.estimate_line_items.length)
      console.log('[PDF API] Using updated estimate data instead of raw measurements')
      
      // Convert estimate line items back to measurement format for PDF
      finalMeasurements = latestEstimate.estimate_line_items.map((item: any, index: number): PDFMeasurement => {
        console.log(`[PDF API] Processing line item ${index + 1}:`, {
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total
        })
        
        return {
          room_name: item.description || `Item ${index + 1}`,
          surface_type: 'wall',
          square_feet: item.quantity,
          height: Math.sqrt(item.quantity), // Approximate
          width: Math.sqrt(item.quantity), // Approximate
          insulation_type: 'closed_cell',
          r_value: 30,
          framing_size: '2x6',
          photo_url: undefined,
          // Pass the actual pricing data
          unit_price: item.unit_price,
          line_total: item.total
        }
      })
      
      // Use the updated total from estimate
      finalOverrideTotal = latestEstimate.total_amount
      
      console.log(`[PDF API] Using estimate total: $${latestEstimate.total_amount}`)
      console.log(`[PDF API] Final measurements for PDF:`, finalMeasurements.length, 'items')
    } else {
      console.log('[PDF API] No estimate line items found, using raw measurements')
    }
    */
    console.log('[PDF API] No estimate line items found, using raw measurements')
    
    console.log('[PDF API] Request data:', {
      jobName,
      customerName,
      measurementCount: measurements?.length || 0,
      hasAdditionalData: !!additionalData
    })

    // Generate timestamp and filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `estimate_${jobName.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.pdf`

    console.log('[PDF API] Generating PDF using your custom design...')
    
    // Use your existing professional PDF generator
    // We'll modify it to return a buffer instead of downloading
    const { generateEstimatePDF } = await import('@/lib/utils/estimate-pdf-generator')
    
    // Create the estimate data structure that your custom PDF expects
    const estimateData = {
      jobName: jobName,
      customerName: customerName,
      customerPhone: additionalData?.customerPhone || '',
      customerEmail: additionalData?.customerEmail || '',
      projectAddress: additionalData?.projectAddress || '',
      projectCity: additionalData?.projectCity || '',
      projectState: additionalData?.projectState || '',
      projectZipCode: additionalData?.projectZipCode || '',
      salespersonName: additionalData?.salespersonName || 'Manager',
      salespersonEmail: additionalData?.salespersonEmail || 'jorge@EconovaEnergySavings.com',
      salespersonPhone: additionalData?.salespersonPhone || '617-596-2476',
      companyWebsite: additionalData?.companyWebsite || 'EconovaEnergySavings.com',
      measurements: finalMeasurements, // Use updated measurements if available
      jobPhotos: jobPhotos || [],
      generatedDate: new Date(),
      validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      overrideTotal: finalOverrideTotal, // Use updated total if available
      groupOverrides: additionalData?.groupOverrides,
      groupedMeasurements: additionalData?.groupedMeasurements,
      returnBuffer: true // Flag to return buffer instead of downloading
    }

    // Generate PDF buffer using your custom design
    const pdfBuffer = await generateEstimatePDF(estimateData)
    
    if (!pdfBuffer) {
      throw new Error('PDF generation failed - no buffer returned')
    }
    
    console.log('[PDF API] PDF buffer generated, size:', pdfBuffer.length)

    console.log('[PDF API] Uploading PDF to Supabase Storage...')
    // Use existing bucket (verified via Supabase: estimate-pdfs)
    const bucket = 'estimate-pdfs'
    const storagePath = `jobs/${jobId}/${fileName}`

    // Upload PDF buffer to Storage (avoid huge JSON/body sizes)
    // Upload PDF (try Buffer first for Node.js; fallback to Blob)
    let uploadError: Error | null = null
    {
      const attempt = await supabase.storage
        .from(bucket)
        .upload(storagePath, Buffer.from(pdfBuffer), {
          contentType: 'application/pdf',
          upsert: true,
        })
      uploadError = attempt.error
    }
    if (uploadError) {
      console.warn('[PDF API] Buffer upload failed, retrying with Blob...', uploadError)
      try {
        const pdfBlob = new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' })
        const attempt2 = await supabase.storage
          .from(bucket)
          .upload(storagePath, pdfBlob, { upsert: true })
        uploadError = attempt2.error
      } catch (e: unknown) {
        uploadError = e instanceof Error ? e : new Error(String(e))
      }
    }

    if (uploadError) {
      console.error('[PDF API] Storage upload error (both attempts):', uploadError)
      const message = uploadError instanceof Error ? uploadError.message : 'Unknown upload error'
      return NextResponse.json({ error: 'Failed to upload PDF to storage', details: message }, { status: 500 })
    }

    // Get a public URL for the uploaded file
    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(storagePath)
    let publicUrl = publicUrlData?.publicUrl

    // If bucket is private, provide a signed URL fallback (24h)
    if (!publicUrl) {
      const { data: signed } = await supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, 60 * 60 * 24)
      publicUrl = signed?.signedUrl || ''
    }

    if (!publicUrl) {
      return NextResponse.json({ error: 'Failed to get public URL for uploaded PDF' }, { status: 500 })
    }

    console.log('[PDF API] Storage upload complete. Public URL:', publicUrl)

    console.log('[PDF API] Updating job record...')
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        latest_estimate_pdf_url: publicUrl,
        latest_estimate_pdf_name: fileName,
        pdf_generated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (updateError) {
      console.error('[PDF API] Database update error:', updateError)
      return NextResponse.json({ error: 'Failed to update job record', details: updateError.message }, { status: 500 })
    }

    console.log('[PDF API] PDF generation completed successfully')

    return NextResponse.json({
      success: true,
      pdfUrl: publicUrl,
      fileName: fileName,
      message: 'PDF generated and uploaded to storage successfully'
    })

  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
