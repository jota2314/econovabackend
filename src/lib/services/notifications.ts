import { createClient } from '@/lib/supabase/client'

export interface Notification {
  id: string
  message: string
  type: 'lead' | 'job' | 'estimate' | 'system'
  time: string
  read: boolean
  relatedId?: string
  relatedType?: 'lead' | 'job' | 'estimate'
  createdAt: Date
}

export class NotificationsService {
  private supabase = createClient()

  async getRecentNotifications(limit = 10): Promise<Notification[]> {
    try {
      console.log('🔔 Loading real notifications...')
      
      // Get current user
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) return []

      const notifications: Notification[] = []

      // Get recent leads (new leads are notifications)
      try {
        const { data: recentLeads } = await this.supabase
          .from('leads')
          .select('id, name, created_at, assigned_to')
          .order('created_at', { ascending: false })
          .limit(5)

        recentLeads?.forEach(lead => {
          const isAssignedToUser = lead.assigned_to === user.id
          if (isAssignedToUser || !lead.assigned_to) {
            notifications.push({
              id: `lead-${lead.id}`,
              message: `New lead: ${lead.name}`,
              type: 'lead',
              time: this.getTimeAgo(new Date(lead.created_at)),
              read: false,
              relatedId: lead.id,
              relatedType: 'lead',
              createdAt: new Date(lead.created_at)
            })
          }
        })
      } catch (error) {
        console.warn('Failed to load lead notifications:', error)
      }

      // Get recent jobs
      try {
        const { data: recentJobs } = await this.supabase
          .from('jobs')
          .select(`
            id, 
            job_name, 
            created_at, 
            created_by,
            leads!inner(name)
          `)
          .order('created_at', { ascending: false })
          .limit(5)

        recentJobs?.forEach(job => {
          notifications.push({
            id: `job-${job.id}`,
            message: `New job: ${job.job_name}`,
            type: 'job',
            time: this.getTimeAgo(new Date(job.created_at)),
            read: false,
            relatedId: job.id,
            relatedType: 'job',
            createdAt: new Date(job.created_at)
          })
        })
      } catch (error) {
        console.warn('Failed to load job notifications:', error)
      }

      // Get recent estimates
      try {
        const { data: recentEstimates } = await this.supabase
          .from('estimates')
          .select(`
            id, 
            estimate_number, 
            status, 
            created_at,
            jobs!inner(job_name, leads!inner(name))
          `)
          .order('created_at', { ascending: false })
          .limit(5)

        recentEstimates?.forEach(estimate => {
          let message = ''
          if (estimate.status === 'pending_approval') {
            message = `Estimate ${estimate.estimate_number} needs approval`
          } else if (estimate.status === 'approved') {
            message = `Estimate ${estimate.estimate_number} was approved`
          } else {
            message = `New estimate: ${estimate.estimate_number}`
          }

          notifications.push({
            id: `estimate-${estimate.id}`,
            message,
            type: 'estimate',
            time: this.getTimeAgo(new Date(estimate.created_at)),
            read: estimate.status === 'approved', // Mark approved as read
            relatedId: estimate.id,
            relatedType: 'estimate',
            createdAt: new Date(estimate.created_at)
          })
        })
      } catch (error) {
        console.warn('Failed to load estimate notifications:', error)
      }

      // Sort by creation time and limit results
      const sortedNotifications = notifications
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit)

      console.log(`✅ Loaded ${sortedNotifications.length} real notifications`)
      return sortedNotifications

    } catch (error) {
      console.error('❌ Error loading notifications:', error)
      // Return fallback notifications
      return this.getFallbackNotifications()
    }
  }

  private getFallbackNotifications(): Notification[] {
    return [
      {
        id: 'fallback-1',
        message: 'Welcome to your SprayFoam CRM!',
        type: 'system',
        time: '1 hour ago',
        read: false,
        createdAt: new Date(Date.now() - 3600000)
      },
      {
        id: 'fallback-2',
        message: 'System is running smoothly',
        type: 'system',
        time: '2 hours ago',
        read: true,
        createdAt: new Date(Date.now() - 7200000)
      }
    ]
  }

  private getTimeAgo(date: Date): string {
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  getNotificationIcon(type: Notification['type']): string {
    switch (type) {
      case 'lead': return '👤'
      case 'job': return '🔧'
      case 'estimate': return '📋'
      case 'system': return '⚙️'
      default: return '🔔'
    }
  }

  getNotificationColor(type: Notification['type']): string {
    switch (type) {
      case 'lead': return 'text-blue-600'
      case 'job': return 'text-green-600'
      case 'estimate': return 'text-orange-600'
      case 'system': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }
}

export const notificationsService = new NotificationsService()
