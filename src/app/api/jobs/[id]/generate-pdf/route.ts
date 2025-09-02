import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import jsPDF from 'jspdf'

interface PDFGenerationRequest {
  measurements: any[]
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
    groupOverrides?: any
    groupedMeasurements?: any
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[PDF API] Starting PDF generation for job:', params.id)
  
  try {
    const supabase = await createClient()
    const jobId = params.id

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log('[PDF API] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[PDF API] User authenticated:', user.id)

    // Parse request body
    const body: PDFGenerationRequest = await request.json()
    const { measurements, jobName, customerName, jobPhotos, additionalData } = body
    
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
      measurements: measurements,
      jobPhotos: jobPhotos || [],
      generatedDate: new Date(),
      validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      overrideTotal: additionalData?.overrideTotal,
      groupOverrides: additionalData?.groupOverrides,
      groupedMeasurements: additionalData?.groupedMeasurements,
      returnBuffer: true // Flag to return buffer instead of downloading
    }

    // Generate PDF buffer using your custom design
    const pdfBuffer = await generateEstimatePDF(estimateData)
    
    console.log('[PDF API] PDF buffer generated, size:', pdfBuffer.length)

    console.log('[PDF API] Saving PDF to file system...')
    
    // Save PDF to public directory for easy access
    const fs = await import('fs')
    const path = await import('path')
    
    // Create pdfs directory if it doesn't exist
    const publicDir = path.join(process.cwd(), 'public')
    const pdfsDir = path.join(publicDir, 'pdfs')
    
    if (!fs.existsSync(pdfsDir)) {
      fs.mkdirSync(pdfsDir, { recursive: true })
    }
    
    // Save PDF file
    const filePath = path.join(pdfsDir, fileName)
    fs.writeFileSync(filePath, pdfBuffer)
    
    // Create public URL
    const publicUrl = `/pdfs/${fileName}`
    
    console.log('[PDF API] PDF saved to:', filePath)
    console.log('[PDF API] Public URL:', publicUrl)
    console.log('[PDF API] Updating job record...')
    
    // Update job record with PDF info
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        latest_estimate_pdf_url: publicUrl, // Use public file URL
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
      pdfUrl: publicUrl, // Return public URL for immediate viewing
      fileName: fileName,
      message: 'PDF generated and saved successfully'
    })

  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
