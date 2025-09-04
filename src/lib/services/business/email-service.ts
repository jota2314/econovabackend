/**
 * Email Business Service
 * Provides standardized API response format and error handling for email operations
 * Following the established business service layer pattern
 */

import { Resend } from 'resend'
import { env } from '@/lib/config/env'
import type { ApiResponse } from '@/types/api/responses'

export interface EmailAttachment {
  filename: string
  content: Buffer | Uint8Array | string
  type?: string
}

export interface SendEmailOptions {
  to: string | string[]
  from?: string
  subject: string
  html: string
  attachments?: EmailAttachment[]
}

export interface EmailResult {
  emailId: string
  to: string | string[]
  subject: string
}

class EmailService {
  private resend: Resend | null = null

  constructor() {
    // Initialize Resend only if API key is available
    console.log('🔧 EmailService: Initializing email service...')
    console.log('🔧 EmailService: RESEND_API_KEY available:', !!env.RESEND_API_KEY)
    console.log('🔧 EmailService: FROM_EMAIL:', env.FROM_EMAIL)
    
    if (env.RESEND_API_KEY) {
      this.resend = new Resend(env.RESEND_API_KEY)
      console.log('✅ EmailService: Resend client initialized successfully')
    } else {
      console.error('❌ EmailService: No RESEND_API_KEY found in environment')
    }
  }

  /**
   * Check if email service is properly configured
   */
  isConfigured(): boolean {
    return !!(env.RESEND_API_KEY && this.resend)
  }

  /**
   * Send an email with optional attachments
   */
  async sendEmail(options: SendEmailOptions): Promise<ApiResponse<EmailResult>> {
    try {
      console.log('📧 EmailService: Sending email to:', options.to)

      // Check if service is configured
      if (!this.isConfigured()) {
        console.error('❌ EmailService: Service not configured - missing RESEND_API_KEY')
        return {
          success: false,
          error: 'Email service not configured. Please check RESEND_API_KEY environment variable.',
          data: null
        }
      }

      // Validate email addresses
      const toEmails = Array.isArray(options.to) ? options.to : [options.to]
      for (const email of toEmails) {
        if (!this.isValidEmail(email)) {
          return {
            success: false,
            error: `Invalid email address: ${email}`,
            data: null
          }
        }
      }

      // Prepare email data
      const fromEmail = options.from || env.FROM_EMAIL || 'onboarding@resend.dev'
      
      console.log('📧 EmailService: Using from email:', fromEmail)
      console.log('📧 EmailService: Subject:', options.subject)
      console.log('📧 EmailService: Attachments:', options.attachments?.length || 0)

      // Prepare attachments
      const attachments = options.attachments?.map(attachment => ({
        filename: attachment.filename,
        content: attachment.content instanceof Buffer 
          ? attachment.content.toString('base64')
          : attachment.content instanceof Uint8Array
          ? Buffer.from(attachment.content).toString('base64')
          : attachment.content,
        type: attachment.type || 'application/octet-stream'
      }))

      // Send email using Resend
      const emailResult = await this.resend!.emails.send({
        from: fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments
      })

      if (emailResult.error) {
        console.error('❌ EmailService: Resend API error:', emailResult.error)
        return {
          success: false,
          error: `Failed to send email: ${emailResult.error.message || emailResult.error}`,
          data: null
        }
      }

      console.log('✅ EmailService: Email sent successfully:', emailResult.data?.id)
      return {
        success: true,
        data: {
          emailId: emailResult.data?.id || '',
          to: options.to,
          subject: options.subject
        },
        error: null
      }
    } catch (error) {
      console.error('❌ EmailService: Unexpected error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred while sending email',
        data: null
      }
    }
  }

  /**
   * Send estimate email with PDF attachment
   */
  async sendEstimateEmail(options: {
    customerEmail: string
    customerName: string
    projectAddress: string
    pdfBuffer: Buffer | Uint8Array
    pdfFileName: string
  }): Promise<ApiResponse<EmailResult & { customerName: string; customerEmail: string }>> {
    try {
      console.log('📧 EmailService: Sending estimate email')

      const firstName = options.customerName.split(' ')[0]
      const emailSubject = `Your Spray Foam Insulation Estimate - ${options.projectAddress}`
      
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
              project at <strong>${options.projectAddress}</strong>.
            </p>
            
            <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #28a745; margin-top: 0;">What's Next?</h3>
              <p style="margin-bottom: 0; color: #555;">
                Our team is ready to schedule your installation at your convenience. 
                We'll handle all the details to ensure a smooth and professional experience.
              </p>
            </div>
            
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

      const emailResult = await this.sendEmail({
        to: options.customerEmail,
        subject: emailSubject,
        html: emailHtml,
        attachments: [{
          filename: options.pdfFileName,
          content: options.pdfBuffer,
          type: 'application/pdf'
        }]
      })

      if (!emailResult.success) {
        return emailResult as any
      }

      return {
        success: true,
        data: {
          ...emailResult.data!,
          customerName: options.customerName,
          customerEmail: options.customerEmail
        },
        error: null
      }
    } catch (error) {
      console.error('❌ EmailService: Error sending estimate email:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send estimate email',
        data: null
      }
    }
  }

  /**
   * Validate email address format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Get service status for debugging
   */
  getServiceStatus() {
    return {
      configured: this.isConfigured(),
      hasApiKey: !!env.RESEND_API_KEY,
      fromEmail: env.FROM_EMAIL || 'onboarding@resend.dev'
    }
  }
}

// Export a singleton instance
export const emailService = new EmailService()
export default emailService