import { NextRequest, NextResponse } from 'next/server'
import { communicationsService } from '@/lib/services/communications'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId, phoneNumber, userId, leadName } = body

    console.log('Make call request:', { leadId, phoneNumber, userId, leadName })

    if (!leadId || !phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Lead ID and phone number are required' },
        { status: 400 }
      )
    }

    // Validate environment variables first
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      console.error('Missing Twilio credentials:', {
        hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
        hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
        hasPhoneNumber: !!process.env.TWILIO_PHONE_NUMBER
      })
      return NextResponse.json(
        { 
          success: false, 
          error: 'Twilio credentials not configured properly. Please check environment variables.',
          details: 'Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER'
        },
        { status: 500 }
      )
    }

    // Validate app URL for webhooks
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      console.error('Missing NEXT_PUBLIC_APP_URL for webhook callbacks')
      return NextResponse.json(
        { 
          success: false, 
          error: 'App URL not configured for webhook callbacks',
          details: 'NEXT_PUBLIC_APP_URL environment variable is required'
        },
        { status: 500 }
      )
    }

    // Dynamically import Twilio service only when credentials are available
    const { twilioService } = await import('@/lib/services/twilio')
    
    // Format and validate phone number
    const formattedPhone = twilioService.formatPhoneNumber(phoneNumber)
    console.log('Formatted phone:', formattedPhone)
    
    if (!twilioService.isValidPhoneNumber(formattedPhone)) {
      return NextResponse.json(
        { success: false, error: `Invalid phone number format: ${formattedPhone}` },
        { status: 400 }
      )
    }

    // Create call with enhanced parameters
    const callResult = await twilioService.makeDirectCall(
      formattedPhone,
      leadName || 'Lead',
      leadId
    )
    
    if (!callResult.success) {
      console.error('Twilio call failed:', callResult.error)
      
      // Parse common Twilio errors for better user feedback
      let userFriendlyError = callResult.error
      if (typeof callResult.error === 'string') {
        if (callResult.error.includes('phone number is not valid')) {
          userFriendlyError = `Invalid phone number: ${phoneNumber}. Please verify the number is correct.`
        } else if (callResult.error.includes('not a valid URL')) {
          userFriendlyError = 'Webhook URL configuration error. Please contact support.'
        } else if (callResult.error.includes('authentication failed')) {
          userFriendlyError = 'Twilio authentication failed. Please check credentials.'
        } else if (callResult.error.includes('insufficient funds')) {
          userFriendlyError = 'Insufficient Twilio account balance to make calls.'
        } else if (callResult.error.includes('forbidden')) {
          userFriendlyError = 'Phone number not allowed by Twilio trial restrictions.'
        }
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: userFriendlyError,
          originalError: callResult.error 
        },
        { status: 500 }
      )
    }

    console.log('Call initiated successfully:', callResult.callSid)

    // Log the call in the database
    const logResult = await communicationsService.logCall({
      leadId,
      userId,
      direction: 'outbound',
      status: callResult.status,
      twilioSid: callResult.callSid
    })

    if (!logResult.success) {
      console.error('Failed to log call in database:', logResult.error)
    }

    return NextResponse.json({
      success: true,
      callSid: callResult.callSid,
      status: callResult.status,
      message: `Call initiated to ${formattedPhone}`,
      data: callResult.data
    })

  } catch (error) {
    console.error('Error in make-call endpoint:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}