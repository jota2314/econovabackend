import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { env } from '@/lib/config/env'

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

    if (job.latest_estimate_pdf_url && !job.latest_estimate_pdf_url.startsWith('data:')) {
      // Use existing saved PDF file
      console.log('[Email API] Using existing PDF:', job.latest_estimate_pdf_url)
      
      const fs = await import('fs')
      const path = await import('path')
      
      const pdfPath = path.join(process.cwd(), 'public', job.latest_estimate_pdf_url)
      
      if (fs.existsSync(pdfPath)) {
        pdfBuffer = fs.readFileSync(pdfPath)
        pdfFileName = job.latest_estimate_pdf_name || pdfFileName
        console.log('[Email API] Using saved PDF, size:', pdfBuffer.length)
      } else {
        console.log('[Email API] Saved PDF file not found, generating new one...')
        // Generate new PDF if file doesn't exist
        const pdfGenerationResponse = await fetch(`${request.url.split('/send-estimate')[0]}/generate-pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            measurements: job.measurements || [],
            jobName: job.job_name || 'Spray Foam Estimate',
            customerName: job.lead?.name || 'Valued Customer',
            jobPhotos: [],
            additionalData: {
              customerPhone: job.lead?.phone || '',
              customerEmail: job.lead?.email || '',
              projectAddress: (job as any).project_address || '',
              projectCity: (job as any).project_city || '',
              projectState: (job as any).project_state || '',
              projectZipCode: (job as any).project_zip_code || '',
              salespersonName: 'Manager',
              salespersonEmail: 'jorge@EconovaEnergySavings.com',
              salespersonPhone: '617-596-2476',
              companyWebsite: 'EconovaEnergySavings.com'
            }
          })
        })
        
        const pdfResult = await pdfGenerationResponse.json()
        if (pdfResult.success) {
          // Read the newly generated PDF
          const newPdfPath = path.join(process.cwd(), 'public', pdfResult.pdfUrl)
          pdfBuffer = fs.readFileSync(newPdfPath)
          pdfFileName = pdfResult.fileName
          console.log('[Email API] Generated new PDF, size:', pdfBuffer.length)
        } else {
          throw new Error('Failed to generate PDF: ' + pdfResult.error)
        }
      }
    } else if (job.latest_estimate_pdf_url?.startsWith('data:')) {
      // Handle legacy data URL format
      console.log('[Email API] Converting data URL to buffer...')
      const base64Data = job.latest_estimate_pdf_url.split(',')[1]
      pdfBuffer = Buffer.from(base64Data, 'base64')
      console.log('[Email API] Converted data URL, size:', pdfBuffer.length)
    } else {
      // No PDF exists, generate one
      console.log('[Email API] No PDF exists, generating new one...')
      const pdfGenerationResponse = await fetch(`${request.url.split('/send-estimate')[0]}/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          measurements: job.measurements || [],
          jobName: job.job_name || 'Spray Foam Estimate',
          customerName: job.lead?.name || 'Valued Customer',
          jobPhotos: [],
          additionalData: {
            customerPhone: job.lead?.phone || '',
            customerEmail: job.lead?.email || '',
            projectAddress: (job as any).project_address || '',
            projectCity: (job as any).project_city || '',
            projectState: (job as any).project_state || '',
            projectZipCode: (job as any).project_zip_code || '',
            salespersonName: 'Manager',
            salespersonEmail: 'jorge@EconovaEnergySavings.com',
            salespersonPhone: '617-596-2476',
            companyWebsite: 'EconovaEnergySavings.com'
          }
        })
      })
      
      const pdfResult = await pdfGenerationResponse.json()
      if (pdfResult.success) {
        const fs = await import('fs')
        const path = await import('path')
        const newPdfPath = path.join(process.cwd(), 'public', pdfResult.pdfUrl)
        pdfBuffer = fs.readFileSync(newPdfPath)
        pdfFileName = pdfResult.fileName
        console.log('[Email API] Generated new PDF, size:', pdfBuffer.length)
      } else {
        throw new Error('Failed to generate PDF: ' + pdfResult.error)
      }
    }

    // Create email content
    const customerName = job.lead?.name || 'Valued Customer'
    const firstName = customerName.split(' ')[0]
    const projectAddress = (job as any).project_address || 'your property'
    
    const emailSubject = `Your Spray Foam Insulation Estimate - ${projectAddress}`
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #28a745; margin: 0;">ECONOVA ENERGY SAVINGS</h1>
          <p style="color: #666; margin: 5px 0;">Professional Spray Foam Insulation</p>
        </div>
        
        <div style="padding: 30px 20px;">
          <h2 style="color: #333;">Hello ${firstName},</h2>
          
          <p style="line-height: 1.6; color: #555;">
            Thank you for your interest in our spray foam insulation services! 
            We're excited to help you improve your property's energy efficiency.
          </p>
          
          <p style="line-height: 1.6; color: #555;">
            Please find attached your personalized estimate for the spray foam insulation 
            project at <strong>${projectAddress}</strong>.
          </p>
          
          <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #28a745; margin-top: 0;">What's Next?</h3>
            <ul style="color: #555; line-height: 1.6;">
              <li>Review the attached detailed estimate</li>
              <li>Feel free to call us with any questions</li>
              <li>We can schedule a site visit if needed</li>
              <li>This estimate is valid for 30 days</li>
            </ul>
          </div>
          
          <p style="line-height: 1.6; color: #555;">
            We pride ourselves on providing high-quality insulation services that will 
            help reduce your energy costs and improve your home's comfort year-round.
          </p>
          
          <p style="line-height: 1.6; color: #555;">
            If you have any questions or would like to discuss the estimate, 
            please don't hesitate to reach out to us at <strong>617-596-2476</strong> 
            or reply to this email.
          </p>
          
          <p style="line-height: 1.6; color: #555;">
            Thank you for choosing Econova Energy Savings!
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="margin: 0; color: #666;"><strong>Manager</strong></p>
            <p style="margin: 5px 0; color: #666;">Econova Energy Savings</p>
            <p style="margin: 0; color: #666;">Phone: 617-596-2476</p>
            <p style="margin: 0; color: #666;">Email: jorge@EconovaEnergySavings.com</p>
            <p style="margin: 0; color: #666;">Website: EconovaEnergySavings.com</p>
          </div>
        </div>
      </div>
    `

    // Initialize Resend client at runtime when environment variables are available
    const resend = new Resend(env.RESEND_API_KEY)

    // Send email with PDF attachment
    console.log('[Email API] Sending email to:', job.lead.email)
    console.log('[Email API] From email:', env.FROM_EMAIL || 'estimates@econovaenergysavings.com')
    console.log('[Email API] PDF attachment size:', pdfBuffer.length, 'bytes')
    console.log('[Email API] PDF filename:', pdfFileName)
    console.log('[Email API] Resend API key configured:', !!env.RESEND_API_KEY)
    
    const emailResult = await resend.emails.send({
      from: env.FROM_EMAIL || 'onboarding@resend.dev',
      to: job.lead.email,
      subject: emailSubject,
      html: emailHtml,
      attachments: [
        {
          filename: pdfFileName,
          content: pdfBuffer instanceof Buffer ? pdfBuffer.toString('base64') : Buffer.from(pdfBuffer).toString('base64'),
          type: 'application/pdf',
        },
      ],
    })

    if (emailResult.error) {
      console.error('[Email API] Email send error:', emailResult.error)
      console.error('[Email API] Email result:', emailResult)
      return NextResponse.json({ 
        error: 'Failed to send email', 
        details: emailResult.error,
        fullError: emailResult
      }, { status: 500 })
    }

    console.log('[Email API] Email sent successfully:', emailResult.data?.id)

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
      emailId: emailResult.data?.id,
      customerName: customerName,
      customerEmail: job.lead.email
    })

  } catch (error) {
    console.error('[Email API] Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
