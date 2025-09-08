'use client'

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/services/logger'

export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  created_at: string
  user_id: string
  read: boolean
  metadata?: Record<string, any>
}

interface NotificationsState {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: string | null
  lastFetch: Date | null
  isPolling: boolean
}

interface NotificationsActions {
  // Data Actions
  setNotifications: (notifications: Notification[]) => void
  addNotification: (notification: Notification) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  
  // Async Actions
  fetchNotifications: (forceRefresh?: boolean) => Promise<void>
  startPolling: () => void
  stopPolling: () => void
  
  // Utility Actions
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // Cache Management (private methods)
  _getFromCache: () => Notification[] | null
  _setCache: (data: Notification[]) => void
}

interface NotificationsSelectors {
  unreadNotifications: Notification[]
  readNotifications: Notification[]
}

export type NotificationsStore = NotificationsState & NotificationsActions & NotificationsSelectors

// Cache configuration
const CACHE_KEY = 'notifications_cache'
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes
const POLLING_INTERVAL = 10 * 60 * 1000 // 10 minutes (reduced for performance)

let pollingTimer: NodeJS.Timeout | null = null

export const useNotificationsStore = create<NotificationsStore>()(
  devtools(
    (set, get) => ({
      // Initial State
      notifications: [],
      unreadCount: 0,
      loading: true,
      error: null,
      lastFetch: null,
      isPolling: false,

      // Computed Selectors
      get unreadNotifications() {
        return get().notifications.filter(n => !n.read)
      },

      get readNotifications() {
        return get().notifications.filter(n => n.read)
      },

      // Data Actions
      setNotifications: (notifications) => {
        const unreadCount = notifications.filter(n => !n.read).length
        set({ 
          notifications, 
          unreadCount,
          lastFetch: new Date() 
        }, false, 'setNotifications')
      },

      addNotification: (notification) =>
        set(
          (state) => ({
            notifications: [notification, ...state.notifications],
            unreadCount: notification.read ? state.unreadCount : state.unreadCount + 1
          }),
          false,
          'addNotification'
        ),

      markAsRead: (id) =>
        set(
          (state) => {
            const updated = state.notifications.map(n => 
              n.id === id ? { ...n, read: true } : n
            )
            return {
              notifications: updated,
              unreadCount: updated.filter(n => !n.read).length
            }
          },
          false,
          'markAsRead'
        ),

      markAllAsRead: () =>
        set(
          (state) => ({
            notifications: state.notifications.map(n => ({ ...n, read: true })),
            unreadCount: 0
          }),
          false,
          'markAllAsRead'
        ),

      removeNotification: (id) =>
        set(
          (state) => {
            const filtered = state.notifications.filter(n => n.id !== id)
            return {
              notifications: filtered,
              unreadCount: filtered.filter(n => !n.read).length
            }
          },
          false,
          'removeNotification'
        ),

      // Utility Actions
      setLoading: (loading) =>
        set({ loading }, false, 'setLoading'),

      setError: (error) =>
        set({ error }, false, 'setError'),

      // Cache Management (private methods)
      _getFromCache: () => {
        try {
          const cached = localStorage.getItem(CACHE_KEY)
          if (!cached) return null
          
          const parsed = JSON.parse(cached)
          const isExpired = Date.now() - parsed.timestamp > CACHE_DURATION
          
          if (isExpired) {
            localStorage.removeItem(CACHE_KEY)
            return null
          }
          
          return parsed.data
        } catch {
          return null
        }
      },

      _setCache: (data: Notification[]) => {
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            data,
            timestamp: Date.now()
          }))
        } catch (error) {
          logger.warn('Failed to cache notifications', { error })
        }
      },

      // Async Actions
      fetchNotifications: async (forceRefresh = false) => {
        try {
          set({ loading: true, error: null }, false, 'fetchNotifications:start')
          
          // Check cache first unless force refresh
          if (!forceRefresh) {
            const store = get()
            const cached = store._getFromCache()
            if (cached) {
              logger.debug('Using cached notifications data')
              store.setNotifications(cached)
              set({ loading: false })
              return
            }
          }
          
          logger.debug('Fetching notifications from API')
          
          // For now, create mock notifications since notifications table doesn't exist
          const mockNotifications: Notification[] = [
            {
              id: '1',
              title: 'New Lead Assigned',
              message: 'You have been assigned a new lead: John Smith',
              type: 'info',
              created_at: new Date().toISOString(),
              user_id: 'current-user',
              read: false,
              metadata: { relatedType: 'lead', leadId: '123' }
            },
            {
              id: '2', 
              title: 'Estimate Approved',
              message: 'Estimate #EST-001 has been approved',
              type: 'success',
              created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
              user_id: 'current-user',
              read: true,
              metadata: { relatedType: 'estimate', estimateId: 'EST-001' }
            }
          ]
          
          const store = get()
          store.setNotifications(mockNotifications)
          store._setCache(mockNotifications)
          
          logger.debug('Fetched notifications (mock data)', { count: mockNotifications.length })
          
        } catch (error) {
          logger.error('Error fetching notifications', error)
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch notifications'
          
          set({
            error: errorMessage,
            loading: false,
            notifications: [],
            unreadCount: 0
          }, false, 'fetchNotifications:error')
        }
      },

      startPolling: () => {
        const state = get()
        if (state.isPolling) return
        
        logger.info('Starting notifications polling (every 2 minutes)')
        set({ isPolling: true }, false, 'startPolling')
        
        // Initial fetch
        state.fetchNotifications()
        
        // Set up polling
        pollingTimer = setInterval(() => {
          const currentState = get()
          if (currentState.isPolling) {
            currentState.fetchNotifications()
          }
        }, POLLING_INTERVAL)
      },

      stopPolling: () => {
        logger.info('Stopping notifications polling')
        set({ isPolling: false }, false, 'stopPolling')
        
        if (pollingTimer) {
          clearInterval(pollingTimer)
          pollingTimer = null
        }
      },
    }),
    {
      name: 'notifications-store',
    }
  )
)

// Cleanup on module unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (pollingTimer) {
      clearInterval(pollingTimer)
    }
  })
}