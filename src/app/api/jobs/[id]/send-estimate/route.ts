import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { env } from '@/lib/config/env'
import emailService from '@/lib/services/business/email-service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  console.log('[Email API] Starting estimate email for job:', resolvedParams.id)
  
  try {
    const supabase = await createClient()
    const jobId = resolvedParams.id

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log('[Email API] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Email API] User authenticated:', user.id)

    // Get job details with lead information
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        *,
        lead:leads!lead_id(name, email, phone, address),
        measurements(*)
      `)
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      console.error('[Email API] Job not found:', jobError)
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    console.log('[Email API] Job loaded:', job.job_name)

    // Check if customer has email
    if (!job.lead?.email) {
      console.error('[Email API] Customer email not found')
      return NextResponse.json({ error: 'Customer email not found' }, { status: 400 })
    }

    // Check if PDF already exists
    let pdfBuffer: Uint8Array
    let pdfFileName = `Estimate_${job.job_name.replace(/[^a-z0-9]/gi, '_')}.pdf`

    if (job.latest_estimate_pdf_url?.startsWith('data:')) {
      // Use existing PDF data URL (standard for Vercel deployment)
      console.log('[Email API] Using existing PDF data URL...')
      const base64Data = job.latest_estimate_pdf_url.split(',')[1]
      pdfBuffer = Buffer.from(base64Data, 'base64')
      pdfFileName = job.latest_estimate_pdf_name || pdfFileName
      console.log('[Email API] Using saved PDF, size:', pdfBuffer.length)
    } else {
      // No PDF exists, generate one directly using the PDF generator
      console.log('[Email API] No PDF exists, generating new one...')
      
      try {
        // Import and use the PDF generation function directly
        const { generateEstimatePDF } = await import('@/lib/utils/estimate-pdf-generator')
        
        // Create the estimate data structure
        const estimateData = {
          jobName: job.job_name || 'Spray Foam Estimate',
          customerName: job.lead?.name || 'Valued Customer',
          customerPhone: job.lead?.phone || '',
          customerEmail: job.lead?.email || '',
          projectAddress: (job as any).project_address || '',
          projectCity: (job as any).project_city || '',
          projectState: (job as any).project_state || '',
          projectZipCode: (job as any).project_zip_code || '',
          salespersonName: 'Manager',
          salespersonEmail: 'jorge@EconovaEnergySavings.com',
          salespersonPhone: '617-596-2476',
          companyWebsite: 'EconovaEnergySavings.com',
          measurements: job.measurements || [],
          jobPhotos: [],
          generatedDate: new Date(),
          validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
          returnBuffer: true // Return buffer instead of downloading
        }
        
        // Generate PDF buffer
        pdfBuffer = await generateEstimatePDF(estimateData)
        console.log('[Email API] Generated new PDF, size:', pdfBuffer.length)
        
        // Update job with PDF info (optional - for caching)
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        pdfFileName = `estimate_${job.job_name.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.pdf`
        
      } catch (pdfError) {
        console.error('[Email API] Direct PDF generation error:', pdfError)
        throw new Error('Failed to generate PDF: ' + (pdfError instanceof Error ? pdfError.message : 'Unknown error'))
      }
    }

    // Prepare email data
    const customerName = job.lead?.name || 'Valued Customer'
    const projectAddress = (job as any).project_address || 'your property'

    // Send email using business service
    console.log('[Email API] Sending estimate email using business service')
    console.log('[Email API] Service status:', emailService.getServiceStatus())

    const emailResult = await emailService.sendEstimateEmail({
      customerEmail: job.lead.email,
      customerName,
      projectAddress,
      pdfBuffer: Buffer.from(pdfBuffer),
      pdfFileName
    })

    if (!emailResult.success) {
      console.error('[Email API] Email service error details:')
      console.error('[Email API] Error message:', emailResult.error)
      console.error('[Email API] Service status:', emailService.getServiceStatus())
      console.error('[Email API] Customer email:', job.lead.email)
      console.error('[Email API] PDF size:', pdfBuffer.length)
      
      return NextResponse.json({ 
        error: emailResult.error || 'Failed to send email',
        details: {
          serviceStatus: emailService.getServiceStatus(),
          customerEmail: job.lead.email,
          pdfSize: pdfBuffer.length
        }
      }, { status: 500 })
    }

    console.log('[Email API] Email sent successfully via business service:', emailResult.data?.emailId)

    // Update job workflow status to sent
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        workflow_status: 'send_to_customer',
        estimate_sent_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (updateError) {
      console.error('[Email API] Failed to update job status:', updateError)
      // Don't fail the whole operation if status update fails
    }

    return NextResponse.json({
      success: true,
      message: `Estimate sent successfully to ${job.lead.email}`,
      emailId: emailResult.data?.emailId,
      customerName: emailResult.data?.customerName,
      customerEmail: emailResult.data?.customerEmail
    })

  } catch (error) {
    console.error('[Email API] Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}