import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import emailService from '@/lib/services/business/email-service'
import { logger } from '@/lib/services/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  logger.info('Starting estimate email for job', { jobId: resolvedParams.id })
  
  try {
    const supabase = await createClient()
    const jobId = resolvedParams.id

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.warn('Email API auth error', { error: authError })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.debug('User authenticated for estimate email', { userId: user.id })

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
      logger.error('Job not found for estimate email', jobError, { jobId })
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    logger.debug('Job loaded for estimate email', { jobName: job.job_name, jobId })

    // Check if customer has email
    if (!job.lead?.email) {
      logger.error('Customer email not found for estimate', { jobId, leadId: job.lead_id })
      return NextResponse.json({ error: 'Customer email not found' }, { status: 400 })
    }

    // Check if PDF already exists
    let pdfBuffer: Buffer
    let pdfFileName = `Estimate_${job.job_name.replace(/[^a-z0-9]/gi, '_')}.pdf`

    if (job.latest_estimate_pdf_url?.startsWith('data:')) {
      // Use existing PDF data URL (standard for Vercel deployment)
      logger.debug('Using existing PDF data URL for estimate email')
      const base64Data = job.latest_estimate_pdf_url.split(',')[1]
      pdfBuffer = Buffer.from(base64Data, 'base64')
      pdfFileName = job.latest_estimate_pdf_name || pdfFileName
      logger.debug('Using saved PDF', { pdfSize: pdfBuffer.length, fileName: pdfFileName })
    } else {
      // No PDF exists, generate one directly using the PDF generator
      logger.debug('No PDF exists, generating new one for estimate email', { jobId })
      
      try {
        // Import and use the PDF generation function directly
        const { generateEstimatePDF } = await import('@/lib/utils/estimate-pdf-generator')
        
        // Create the estimate data structure
        const estimateData = {
          jobName: job.job_name || 'Spray Foam Estimate',
          customerName: job.lead?.name || 'Valued Customer',
          customerPhone: job.lead?.phone || '',
          customerEmail: job.lead?.email || '',
          projectAddress: (job as unknown as Record<string, string>).project_address || '',
          projectCity: (job as unknown as Record<string, string>).project_city || '',
          projectState: (job as unknown as Record<string, string>).project_state || '',
          projectZipCode: (job as unknown as Record<string, string>).project_zip_code || '',
          salespersonName: 'Manager',
          salespersonEmail: 'jorge@EconovaEnergySavings.com',
          salespersonPhone: '617-596-2476',
          companyWebsite: 'EconovaEnergySavings.com',
          measurements: (job.measurements || []).map(m => ({
            room_name: m.room_name,
            floor_level: m.floor_level,
            area_type: m.area_type,
            surface_type: m.surface_type,
            square_feet: m.square_feet || 0,
            height: m.height,
            width: m.width,
            insulation_type: m.insulation_type,
            r_value: m.r_value,
            framing_size: (m as any).framing_size || null,
            closed_cell_inches: m.closed_cell_inches,
            open_cell_inches: m.open_cell_inches,
            blown_in_inches: (m as any).blown_in_inches || 0,
            is_hybrid_system: m.is_hybrid_system,
            photo_url: m.photo_url
          })),
          jobPhotos: [],
          generatedDate: new Date(),
          validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
          returnBuffer: true // Return buffer instead of downloading
        } as any
        
        // Generate PDF buffer
        const generatedPdf = await generateEstimatePDF(estimateData)
        if (!generatedPdf) {
          throw new Error('PDF generation returned no data')
        }
        pdfBuffer = Buffer.from(generatedPdf)
        logger.debug('Generated new PDF for estimate email', { pdfSize: pdfBuffer.length, fileName: pdfFileName })
        
        // Update job with PDF info (optional - for caching)
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        pdfFileName = `estimate_${job.job_name.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.pdf`
        
      } catch (pdfError) {
        logger.error('Direct PDF generation error for estimate email', pdfError, { jobId })
        throw new Error('Failed to generate PDF: ' + (pdfError instanceof Error ? pdfError.message : 'Unknown error'))
      }
    }

    // Prepare email data
    const customerName = job.lead?.name || 'Valued Customer'
    const projectAddress = (job as unknown as Record<string, string>).project_address || 'your property'

    // Send email using business service
    logger.info('Sending estimate email using business service', { 
      jobId, 
      customerEmail: job.lead.email,
      serviceStatus: emailService.getServiceStatus()
    })

    const emailResult = await emailService.sendEstimateEmail({
      customerEmail: job.lead.email,
      customerName,
      projectAddress,
      pdfBuffer,
      pdfFileName
    })

    if (!emailResult.success) {
      logger.error('Email service error for estimate email', emailResult.error, {
        jobId,
        serviceStatus: emailService.getServiceStatus(),
        customerEmail: job.lead.email,
        pdfSize: pdfBuffer.length
      })
      
      return NextResponse.json({ 
        error: emailResult.error || 'Failed to send email',
        details: {
          serviceStatus: emailService.getServiceStatus(),
          customerEmail: job.lead.email,
          pdfSize: pdfBuffer.length
        }
      }, { status: 500 })
    }

    logger.info('Estimate email sent successfully', { 
      jobId,
      emailId: emailResult.data?.emailId,
      customerEmail: job.lead.email 
    })

    // Update job workflow status to sent
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        workflow_status: 'send_to_customer',
        estimate_sent_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (updateError) {
      logger.error('Failed to update job status after sending estimate email', updateError, { jobId })
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
    logger.error('Error in send estimate email API', error, { jobId: resolvedParams.id })
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}