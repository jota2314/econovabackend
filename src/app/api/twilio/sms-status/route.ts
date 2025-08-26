import { NextRequest, NextResponse } from 'next/server'
import { communicationsService } from '@/lib/services/communications'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    const messageSid = formData.get('MessageSid') as string
    const messageStatus = formData.get('MessageStatus') as string
    const errorCode = formData.get('ErrorCode') as string
    
    console.log('SMS status webhook:', {
      messageSid,
      messageStatus,
      errorCode
    })

    // Update the SMS status in the database
    if (messageSid) {
      const status = errorCode ? `error_${errorCode}` : messageStatus
      
      await communicationsService.updateSMSStatus(
        messageSid,
        status
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in SMS status webhook:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}