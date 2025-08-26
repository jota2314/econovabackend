import { NextRequest, NextResponse } from 'next/server'
import { twilioService } from '@/lib/services/twilio'
import { communicationsService } from '@/lib/services/communications'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId, phoneNumber, message, userId } = body

    if (!leadId || !phoneNumber || !message) {
      return NextResponse.json(
        { success: false, error: 'Lead ID, phone number, and message are required' },
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

    // Send SMS through Twilio
    const smsResult = await twilioService.sendSMS(formattedPhone, message)
    
    if (!smsResult.success) {
      return NextResponse.json(
        { success: false, error: smsResult.error },
        { status: 500 }
      )
    }

    // Log the SMS in the database
    const logResult = await communicationsService.logSMS({
      leadId,
      userId,
      direction: 'outbound',
      content: message,
      status: smsResult.status,
      twilioSid: smsResult.messageSid
    })

    if (!logResult.success) {
      console.error('Failed to log SMS in database:', logResult.error)
    }

    return NextResponse.json({
      success: true,
      messageSid: smsResult.messageSid,
      status: smsResult.status,
      data: smsResult.data
    })

  } catch (error) {
    console.error('Error sending SMS:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}