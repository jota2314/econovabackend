import { NextRequest, NextResponse } from 'next/server'
import { twilioService } from '@/lib/services/twilio'
import { communicationsService } from '@/lib/services/communications'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId, phoneNumber, userId } = body

    if (!leadId || !phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Lead ID and phone number are required' },
        { status: 400 }
      )
    }

    // Format phone number
    const formattedPhone = twilioService.formatPhoneNumber(phoneNumber)
    
    if (!twilioService.isValidPhoneNumber(formattedPhone)) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    // Initiate the call through Twilio
    const callResult = await twilioService.makeOutboundCall(formattedPhone)
    
    if (!callResult.success) {
      return NextResponse.json(
        { success: false, error: callResult.error },
        { status: 500 }
      )
    }

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
      data: callResult.data
    })

  } catch (error) {
    console.error('Error initiating call:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}