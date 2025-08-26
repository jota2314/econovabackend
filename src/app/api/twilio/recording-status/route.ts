import { NextRequest, NextResponse } from 'next/server'
import { communicationsService } from '@/lib/services/communications'
import { twilioService } from '@/lib/services/twilio'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    const callSid = formData.get('CallSid') as string
    const recordingSid = formData.get('RecordingSid') as string
    const recordingStatus = formData.get('RecordingStatus') as string
    
    console.log('Recording status webhook:', {
      callSid,
      recordingSid,
      recordingStatus
    })

    // If recording is completed, get the recording URL and update the database
    if (recordingSid && recordingStatus === 'completed') {
      const recordingResult = await twilioService.getRecordingUrl(recordingSid)
      
      if (recordingResult.success && callSid) {
        await communicationsService.addRecordingUrl(
          callSid,
          recordingResult.url!
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in recording status webhook:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}