import { NextRequest, NextResponse } from 'next/server'
import { twilioService } from '@/lib/services/twilio'
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

    // Validate environment variables
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      console.error('Missing Twilio credentials')
      return NextResponse.json(
        { success: false, error: 'Twilio credentials not configured' },
        { status: 500 }
      )
    }

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
      return NextResponse.json(
        { success: false, error: callResult.error },
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