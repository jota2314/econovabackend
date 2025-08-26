import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'

const VoiceResponse = twilio.twiml.VoiceResponse

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const callSid = formData.get('CallSid') as string
    
    // Create TwiML response for outbound calls
    const twiml = new VoiceResponse()
    
    // For outbound calls, we want to connect the caller to the lead
    // This is basic - you might want to add more sophisticated routing
    twiml.say({
      voice: 'alice'
    }, 'Connecting your call. Please hold.')
    
    // You could add more logic here like:
    // - Play hold music
    // - Gather input from caller
    // - Route to different agents based on lead data
    
    return new NextResponse(twiml.toString(), {
      headers: {
        'Content-Type': 'text/xml'
      }
    })
  } catch (error) {
    console.error('Error in voice webhook:', error)
    
    const twiml = new VoiceResponse()
    twiml.say('We apologize, but we are experiencing technical difficulties. Please try again later.')
    
    return new NextResponse(twiml.toString(), {
      headers: {
        'Content-Type': 'text/xml'
      }
    })
  }
}