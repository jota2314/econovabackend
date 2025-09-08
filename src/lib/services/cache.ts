/**
 * Caching service for database queries and API responses
 */

import { logger } from './logger'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private maxSize: number = 1000
  private defaultTtl: number = 5 * 60 * 1000 // 5 minutes

  constructor(maxSize = 1000, defaultTtl = 5 * 60 * 1000) {
    this.maxSize = maxSize
    this.defaultTtl = defaultTtl
  }

  private isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }

  private evictExpired(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  private evictOldest(): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }
  }

  set<T>(key: string, data: T, ttl?: number): void {
    this.evictExpired()
    this.evictOldest()

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTtl,
    })

    logger.debug('Cache set', { key, ttl: ttl || this.defaultTtl })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined

    if (!entry) {
      logger.debug('Cache miss', { key })
      return null
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key)
      logger.debug('Cache expired', { key })
      return null
    }

    logger.debug('Cache hit', { key })
    return entry.data
  }

  delete(key: string): boolean {
    const result = this.cache.delete(key)
    logger.debug('Cache delete', { key, deleted: result })
    return result
  }

  clear(): void {
    this.cache.clear()
    logger.debug('Cache cleared')
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    return entry ? !this.isExpired(entry) : false
  }

  size(): number {
    this.evictExpired()
    return this.cache.size
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      defaultTtl: this.defaultTtl,
    }
  }
}

// Cache instances for different data types
export const queryCache = new MemoryCache(500, 5 * 60 * 1000) // 5 minutes
export const userCache = new MemoryCache(100, 15 * 60 * 1000) // 15 minutes
export const configCache = new MemoryCache(50, 60 * 60 * 1000) // 1 hour
export const analyticsCache = new MemoryCache(200, 2 * 60 * 1000) // 2 minutes

/**
 * Generic cache wrapper for async functions
 */
export async function withCache<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  cache: MemoryCache = queryCache,
  ttl?: number
): Promise<T> {
  // Try to get from cache first
  const cached = cache.get<T>(cacheKey)
  if (cached !== null) {
    return cached
  }

  // Fetch fresh data
  try {
    const data = await fetchFn()
    cache.set(cacheKey, data, ttl)
    return data
  } catch (error) {
    logger.error('Cache fetch failed', error, { cacheKey })
    throw error
  }
}

/**
 * Cache key generators
 */
export const CacheKeys = {
  // User data
  user: (userId: string) => `user:${userId}`,
  userProfile: (userId: string) => `user_profile:${userId}`,
  userPermissions: (userId: string) => `user_permissions:${userId}`,

  // Analytics
  dashboardStats: (userId?: string) => `dashboard_stats:${userId || 'all'}`,
  dailyMetrics: (date: string, userId?: string) => `daily_metrics:${date}:${userId || 'all'}`,
  leaderboard: (period: string) => `leaderboard:${period}`,
  revenueBySource: (period: string) => `revenue_by_source:${period}`,

  // Business data
  leads: (userId?: string, filters?: string) => `leads:${userId || 'all'}:${filters || 'none'}`,
  jobs: (userId?: string, status?: string) => `jobs:${userId || 'all'}:${status || 'all'}`,
  estimates: (userId?: string, status?: string) => `estimates:${userId || 'all'}:${status || 'all'}`,

  // Pricing data
  pricingCatalog: (serviceType: string) => `pricing_catalog:${serviceType}`,
  unitPrices: (insulationType: string, thickness: string) => `unit_prices:${insulationType}:${thickness}`,

  // Configuration
  systemSettings: () => 'system_settings',
  businessRules: (ruleType: string) => `business_rules:${ruleType}`,
} as const

/**
 * Cache invalidation helpers
 */
export const CacheInvalidation = {
  // Invalidate user-related caches
  user: (userId: string) => {
    queryCache.delete(CacheKeys.user(userId))
    userCache.delete(CacheKeys.userProfile(userId))
    userCache.delete(CacheKeys.userPermissions(userId))
  },

  // Invalidate analytics caches
  analytics: () => {
    // Clear all analytics cache entries
    const keysToDelete: string[] = []
    for (const key of queryCache['cache'].keys()) {
      if (key.startsWith('dashboard_stats:') || 
          key.startsWith('daily_metrics:') || 
          key.startsWith('leaderboard:') || 
          key.startsWith('revenue_by_source:')) {
        keysToDelete.push(key)
      }
    }
    keysToDelete.forEach(key => queryCache.delete(key))
    analyticsCache.clear()
  },

  // Invalidate business data caches
  leads: (userId?: string) => {
    if (userId) {
      queryCache.delete(CacheKeys.leads(userId))
    } else {
      // Clear all lead-related caches
      const keysToDelete: string[] = []
      for (const key of queryCache['cache'].keys()) {
        if (key.startsWith('leads:')) {
          keysToDelete.push(key)
        }
      }
      keysToDelete.forEach(key => queryCache.delete(key))
    }
  },

  jobs: (userId?: string) => {
    if (userId) {
      queryCache.delete(CacheKeys.jobs(userId))
    } else {
      const keysToDelete: string[] = []
      for (const key of queryCache['cache'].keys()) {
        if (key.startsWith('jobs:')) {
          keysToDelete.push(key)
        }
      }
      keysToDelete.forEach(key => queryCache.delete(key))
    }
  },

  estimates: (userId?: string) => {
    if (userId) {
      queryCache.delete(CacheKeys.estimates(userId))
    } else {
      const keysToDelete: string[] = []
      for (const key of queryCache['cache'].keys()) {
        if (key.startsWith('estimates:')) {
          keysToDelete.push(key)
        }
      }
      keysToDelete.forEach(key => queryCache.delete(key))
    }
  },

  // Clear all caches
  all: () => {
    queryCache.clear()
    userCache.clear()
    configCache.clear()
    analyticsCache.clear()
  },
}

/**
 * Periodic cache cleanup
 */
let cleanupInterval: NodeJS.Timeout | null = null

export function startCacheCleanup(intervalMs = 10 * 60 * 1000): void { // 10 minutes
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
  }

  cleanupInterval = setInterval(() => {
    const beforeSize = queryCache.size() + userCache.size() + configCache.size() + analyticsCache.size()
    
    // Force cleanup of expired entries
    queryCache['evictExpired']()
    userCache['evictExpired']()
    configCache['evictExpired']()
    analyticsCache['evictExpired']()
    
    const afterSize = queryCache.size() + userCache.size() + configCache.size() + analyticsCache.size()
    
    if (beforeSize !== afterSize) {
      logger.debug('Cache cleanup completed', { 
        beforeSize, 
        afterSize, 
        evicted: beforeSize - afterSize 
      })
    }
  }, intervalMs)
}

export function stopCacheCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
  }
}

// Start cleanup in production
if (process.env.NODE_ENV === 'production') {
  startCacheCleanup()
}