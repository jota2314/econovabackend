import { createClient } from '@/lib/supabase/client'
import type { Communication, TablesInsert, TablesUpdate } from '@/lib/types/database'

export class CommunicationsService {
  private supabase = createClient()

  async logCommunication(communication: TablesInsert<'communications'>) {
    try {
      const { data, error } = await this.supabase
        .from('communications')
        .insert(communication)
        .select()
        .single()

      if (error) {
        console.error('Error logging communication:', error)
        return { success: false, error }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Error in logCommunication:', error)
      return { success: false, error }
    }
  }

  async getCommunicationsForLead(leadId: string) {
    try {
      const { data, error } = await this.supabase
        .from('communications')
        .select(`
          *,
          user:users!user_id(full_name, email)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching communications:', error)
        return { success: false, error, data: [] }
      }

      return { success: true, data: data || [] }
    } catch (error) {
      console.error('Error in getCommunicationsForLead:', error)
      return { success: false, error, data: [] }
    }
  }

  async updateCommunication(id: string, updates: TablesUpdate<'communications'>) {
    try {
      const { data, error } = await this.supabase
        .from('communications')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating communication:', error)
        return { success: false, error }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Error in updateCommunication:', error)
      return { success: false, error }
    }
  }

  async logCall(params: {
    leadId: string
    userId: string | null
    direction: 'inbound' | 'outbound'
    status?: string
    twilioSid?: string
    durationSeconds?: number
    recordingUrl?: string
  }) {
    return this.logCommunication({
      lead_id: params.leadId,
      user_id: params.userId || 'system',
      type: 'call',
      direction: params.direction,
      content: null,
      status: params.status || 'initiated',
      twilio_sid: params.twilioSid || null,
      recording_url: params.recordingUrl || null,
      duration_seconds: params.durationSeconds || null
    })
  }

  async logSMS(params: {
    leadId: string
    userId: string | null
    direction: 'inbound' | 'outbound'
    content: string
    status?: string
    twilioSid?: string
  }) {
    return this.logCommunication({
      lead_id: params.leadId,
      user_id: params.userId || 'system',
      type: 'sms',
      direction: params.direction,
      content: params.content,
      status: params.status || 'sent',
      twilio_sid: params.twilioSid || null,
      recording_url: null,
      duration_seconds: null
    })
  }

  async updateCallStatus(twilioSid: string, status: string, durationSeconds?: number) {
    try {
      const updates: TablesUpdate<'communications'> = {
        status,
        duration_seconds: durationSeconds || null
      }

      const { data, error } = await this.supabase
        .from('communications')
        .update(updates)
        .eq('twilio_sid', twilioSid)
        .select()

      if (error) {
        console.error('Error updating call status:', error)
        return { success: false, error }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Error in updateCallStatus:', error)
      return { success: false, error }
    }
  }

  async updateSMSStatus(twilioSid: string, status: string) {
    try {
      const { data, error } = await this.supabase
        .from('communications')
        .update({ status })
        .eq('twilio_sid', twilioSid)
        .select()

      if (error) {
        console.error('Error updating SMS status:', error)
        return { success: false, error }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Error in updateSMSStatus:', error)
      return { success: false, error }
    }
  }

  async addRecordingUrl(twilioSid: string, recordingUrl: string) {
    try {
      const { data, error } = await this.supabase
        .from('communications')
        .update({ recording_url: recordingUrl })
        .eq('twilio_sid', twilioSid)
        .select()

      if (error) {
        console.error('Error adding recording URL:', error)
        return { success: false, error }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Error in addRecordingUrl:', error)
      return { success: false, error }
    }
  }

  // Get communication statistics for a lead
  async getLeadCommunicationStats(leadId: string) {
    try {
      const { data, error } = await this.supabase
        .from('communications')
        .select('type, direction, status')
        .eq('lead_id', leadId)

      if (error) {
        console.error('Error fetching communication stats:', error)
        return {
          success: false,
          error,
          stats: { totalCalls: 0, totalSMS: 0, lastContact: null }
        }
      }

      const stats = {
        totalCalls: data?.filter(c => c.type === 'call').length || 0,
        totalSMS: data?.filter(c => c.type === 'sms').length || 0,
        outboundCalls: data?.filter(c => c.type === 'call' && c.direction === 'outbound').length || 0,
        inboundCalls: data?.filter(c => c.type === 'call' && c.direction === 'inbound').length || 0,
        outboundSMS: data?.filter(c => c.type === 'sms' && c.direction === 'outbound').length || 0,
        inboundSMS: data?.filter(c => c.type === 'sms' && c.direction === 'inbound').length || 0
      }

      return { success: true, stats }
    } catch (error) {
      console.error('Error in getLeadCommunicationStats:', error)
      return {
        success: false,
        error,
        stats: { totalCalls: 0, totalSMS: 0, lastContact: null }
      }
    }
  }

  // Get recent communications across all leads
  async getRecentCommunications(limit = 20) {
    try {
      const { data, error } = await this.supabase
        .from('communications')
        .select(`
          *,
          lead:leads!lead_id(name, phone),
          user:users!user_id(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching recent communications:', error)
        return { success: false, error, data: [] }
      }

      return { success: true, data: data || [] }
    } catch (error) {
      console.error('Error in getRecentCommunications:', error)
      return { success: false, error, data: [] }
    }
  }
}

export const communicationsService = new CommunicationsService()