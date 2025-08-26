import { NextRequest, NextResponse } from 'next/server'
import { communicationsService } from '@/lib/services/communications'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    const callSid = formData.get('CallSid') as string
    const callStatus = formData.get('CallStatus') as string
    const callDuration = formData.get('CallDuration') as string
    const answeredBy = formData.get('AnsweredBy') as string
    const direction = formData.get('Direction') as string
    const from = formData.get('From') as string
    const to = formData.get('To') as string
    const timestamp = formData.get('Timestamp') as string
    
    console.log('Twilio Status Webhook received:', {
      callSid,
      callStatus,
      callDuration,
      answeredBy,
      direction,
      from,
      to,
      timestamp,
      receivedAt: new Date().toISOString()
    })

    if (!callSid || !callStatus) {
      console.warn('Missing required fields in status webhook:', { callSid, callStatus })
      return NextResponse.json(
        { success: false, error: 'Missing CallSid or CallStatus' },
        { status: 400 }
      )
    }

    // Update the call status in the database
    const duration = callDuration ? parseInt(callDuration, 10) : null
    
    const result = await communicationsService.updateCallStatus(
      callSid,
      callStatus,
      duration
    )
    
    if (result.success) {
      console.log(`✅ Successfully updated call ${callSid} with status: ${callStatus}`)
      
      // Log additional details for completed calls
      if (callStatus === 'completed' && duration) {
        console.log(`📞 Call completed - Duration: ${duration} seconds, Answered by: ${answeredBy || 'human'}`)
      }
    } else {
      console.error('❌ Failed to update call status:', result.error)
    }

    return NextResponse.json({ 
      success: true,
      message: 'Status webhook processed successfully',
      callSid,
      status: callStatus,
      duration: duration || 0
    })
    
  } catch (error) {
    console.error('❌ Error processing status webhook:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}