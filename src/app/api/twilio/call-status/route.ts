import { NextRequest, NextResponse } from 'next/server'
import { communicationsService } from '@/lib/services/communications'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    const callSid = formData.get('CallSid') as string
    const callStatus = formData.get('CallStatus') as string
    const callDuration = formData.get('CallDuration') as string
    
    console.log('Call status webhook:', {
      callSid,
      callStatus,
      callDuration
    })

    // Update the call status in the database
    if (callSid) {
      const duration = callDuration ? parseInt(callDuration, 10) : undefined
      
      await communicationsService.updateCallStatus(
        callSid,
        callStatus,
        duration
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in call status webhook:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}