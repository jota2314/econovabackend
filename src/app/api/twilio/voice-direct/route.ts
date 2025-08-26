import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'

const VoiceResponse = twilio.twiml.VoiceResponse

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const leadId = url.searchParams.get('leadId')
    const leadName = url.searchParams.get('leadName') || 'Lead'
    
    const formData = await request.formData()
    const callStatus = formData.get('CallStatus') as string
    const answeredBy = formData.get('AnsweredBy') as string
    
    console.log('Voice Direct webhook:', { leadId, leadName, callStatus, answeredBy })
    
    const twiml = new VoiceResponse()
    
    // Handle different call scenarios
    if (answeredBy === 'machine_start') {
      // Answering machine detected - leave a message
      twiml.say({
        voice: 'alice'
      }, `Hi, this is a call regarding your spray foam insulation inquiry. Please call us back at your convenience. Thank you!`)
      
    } else {
      // Human answered or machine detection disabled
      twiml.say({
        voice: 'alice'
      }, `Hello! This is a call from your spray foam insulation company regarding ${leadName}. Please hold while we connect you.`)
      
      // You could add a <Dial> verb here to connect to your phone
      // For now, we'll just provide a simple message
      twiml.pause({ length: 2 })
      twiml.say({
        voice: 'alice'  
      }, `Thank you for your interest in spray foam insulation. We'll follow up with you shortly. Have a great day!`)
    }
    
    return new NextResponse(twiml.toString(), {
      headers: {
        'Content-Type': 'text/xml'
      }
    })
    
  } catch (error) {
    console.error('Error in voice-direct webhook:', error)
    
    const twiml = new VoiceResponse()
    twiml.say({
      voice: 'alice'
    }, 'Thank you for your interest. We will contact you soon.')
    
    return new NextResponse(twiml.toString(), {
      headers: {
        'Content-Type': 'text/xml'
      }
    })
  }
}