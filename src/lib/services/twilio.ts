import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID!
const authToken = process.env.TWILIO_AUTH_TOKEN!
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER!

const client = twilio(accountSid, authToken)

export class TwilioService {
  // Direct call method for connecting user directly to lead
  async makeDirectCall(to: string, leadName: string, leadId: string, from?: string) {
    try {
      console.log(`Initiating direct call to ${to} (${leadName})`)
      
      const call = await client.calls.create({
        to: to,
        from: from || twilioPhoneNumber,
        url: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice-direct?leadId=${leadId}&leadName=${encodeURIComponent(leadName)}`,
        record: true,
        recordingStatusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/recording-status`,
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/call-status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
        timeout: 30, // Ring for 30 seconds
        machineDetection: 'Enable' // Detect answering machines
      })

      return {
        success: true,
        callSid: call.sid,
        status: call.status,
        data: call
      }
    } catch (error) {
      console.error('Error making direct call:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async makeOutboundCall(to: string, from?: string) {
    try {
      const call = await client.calls.create({
        to: to,
        from: from || twilioPhoneNumber,
        url: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice`, // TwiML endpoint
        record: true, // Enable call recording
        recordingStatusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/recording-status`,
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/call-status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST'
      })

      return {
        success: true,
        callSid: call.sid,
        status: call.status,
        data: call
      }
    } catch (error) {
      console.error('Error making outbound call:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async sendSMS(to: string, message: string, from?: string) {
    try {
      const sms = await client.messages.create({
        to: to,
        from: from || twilioPhoneNumber,
        body: message,
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/sms-status`
      })

      return {
        success: true,
        messageSid: sms.sid,
        status: sms.status,
        data: sms
      }
    } catch (error) {
      console.error('Error sending SMS:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async getCallDetails(callSid: string) {
    try {
      const call = await client.calls(callSid).fetch()
      return {
        success: true,
        data: call
      }
    } catch (error) {
      console.error('Error fetching call details:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async getCallRecordings(callSid: string) {
    try {
      const recordings = await client.recordings.list({ callSid })
      return {
        success: true,
        data: recordings
      }
    } catch (error) {
      console.error('Error fetching call recordings:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async getRecordingUrl(recordingSid: string) {
    try {
      const recording = await client.recordings(recordingSid).fetch()
      const recordingUrl = `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`
      
      return {
        success: true,
        url: recordingUrl,
        data: recording
      }
    } catch (error) {
      console.error('Error fetching recording URL:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Get SMS message details
  async getMessageDetails(messageSid: string) {
    try {
      const message = await client.messages(messageSid).fetch()
      return {
        success: true,
        data: message
      }
    } catch (error) {
      console.error('Error fetching message details:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Format phone number for Twilio (ensure +1 prefix for US numbers)
  formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digits
    const digits = phoneNumber.replace(/\D/g, '')
    
    // If 10 digits, assume US number and add +1
    if (digits.length === 10) {
      return `+1${digits}`
    }
    
    // If 11 digits and starts with 1, add +
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`
    }
    
    // If already has + return as is
    if (phoneNumber.startsWith('+')) {
      return phoneNumber
    }
    
    // Default: add +1
    return `+1${digits}`
  }

  // Validate phone number
  isValidPhoneNumber(phoneNumber: string): boolean {
    const digits = phoneNumber.replace(/\D/g, '')
    return digits.length >= 10 && digits.length <= 15
  }
}

export const twilioService = new TwilioService()

// SMS Templates for spray foam follow-ups
export const SMS_TEMPLATES = {
  initial_contact: {
    name: "Initial Contact",
    template: "Hi {name}, thanks for your interest in spray foam insulation! We'd love to schedule a free consultation to discuss your project. When would be a good time to chat?"
  },
  measurement_followup: {
    name: "Measurement Follow-up", 
    template: "Hi {name}, following up on your spray foam insulation inquiry. We can schedule a measurement visit this week. What day works best for you?"
  },
  quote_ready: {
    name: "Quote Ready",
    template: "Hi {name}, great news! Your spray foam insulation quote is ready. We found some excellent solutions for your {project_type}. Can we schedule a call to review the details?"
  },
  proposal_sent: {
    name: "Proposal Sent",
    template: "Hi {name}, I've sent your spray foam insulation proposal to your email. Please review it and let me know if you have any questions. Ready to move forward?"
  },
  appointment_reminder: {
    name: "Appointment Reminder",
    template: "Hi {name}, this is a reminder about your spray foam consultation tomorrow at {time}. Our team will arrive on time and the estimate should take about 30 minutes. See you then!"
  },
  check_in: {
    name: "General Check-in",
    template: "Hi {name}, just checking in on your spray foam insulation project. Do you have any questions or would you like to move forward with scheduling?"
  }
}