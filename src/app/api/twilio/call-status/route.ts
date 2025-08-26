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
    
    console.log('Call status webhook received:', {
      callSid,
      callStatus,
      callDuration,
      answeredBy,
      direction,
      from,
      to,
      timestamp: new Date().toISOString()
    })

    // Update the call status in the database
    if (callSid && callStatus) {
      const duration = callDuration ? parseInt(callDuration, 10) : undefined
      
      const result = await communicationsService.updateCallStatus(
        callSid,
        callStatus,
        duration
      )
      
      if (!result.success) {
        console.error('Failed to update call status:', result.error)
      } else {
        console.log(`Successfully updated call ${callSid} with status ${callStatus}`)
      }
    } else {
      console.warn('Missing callSid or callStatus in webhook')
    }

    return NextResponse.json({ 
      success: true,
      message: 'Call status processed',
      callSid,
      status: callStatus 
    })
    
  } catch (error) {
    console.error('Error in call status webhook:', error)
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