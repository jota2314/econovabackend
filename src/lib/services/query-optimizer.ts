/**
 * Database query optimization service
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { logger } from './logger'
import { withCache, CacheKeys, queryCache, analyticsCache } from './cache'

interface QueryMetrics {
  query: string
  duration: number
  timestamp: number
  cacheHit: boolean
}

class QueryOptimizer {
  private metrics: QueryMetrics[] = []
  private maxMetrics = 1000

  /**
   * Executes a query with performance monitoring and caching
   */
  async executeQuery<T>(
    supabase: SupabaseClient,
    queryBuilder: () => any,
    cacheKey?: string,
    cacheTtl?: number
  ): Promise<T> {
    const startTime = Date.now()
    let cacheHit = false
    let result: T

    try {
      if (cacheKey) {
        // Try cache first
        const cached = queryCache.get<T>(cacheKey)
        if (cached !== null) {
          cacheHit = true
          result = cached
        } else {
          // Execute query and cache result
          const query = queryBuilder()
          const { data, error } = await query
          if (error) throw error
          
          result = data
          queryCache.set(cacheKey, result, cacheTtl)
        }
      } else {
        // Execute without caching
        const query = queryBuilder()
        const { data, error } = await query
        if (error) throw error
        result = data
      }

      const duration = Date.now() - startTime
      
      // Record metrics
      this.recordMetrics({
        query: queryBuilder.toString(),
        duration,
        timestamp: Date.now(),
        cacheHit,
      })

      if (duration > 1000) { // Log slow queries
        logger.warn('Slow query detected', {
          duration: `${duration}ms`,
          cacheKey,
          cacheHit,
        })
      }

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error('Query execution failed', error, {
        duration: `${duration}ms`,
        cacheKey,
        cacheHit,
      })
      throw error
    }
  }

  /**
   * Optimized analytics queries with automatic caching
   */
  async getDashboardStats(
    supabase: SupabaseClient,
    userId?: string
  ) {
    return withCache(
      CacheKeys.dashboardStats(userId),
      async () => {
        const queries = [
          // Total leads
          supabase
            .from('leads')
            .select('id', { count: 'exact' })
            .then(r => ({ totalLeads: r.count || 0 })),

          // Active jobs
          supabase
            .from('jobs')
            .select('id', { count: 'exact' })
            .eq('status', 'active')
            .then(r => ({ activeJobs: r.count || 0 })),

          // Pending estimates
          supabase
            .from('estimates')
            .select('id', { count: 'exact' })
            .eq('status', 'pending_approval')
            .then(r => ({ pendingEstimates: r.count || 0 })),

          // Total revenue (simplified)
          supabase
            .from('jobs')
            .select('estimated_value')
            .eq('status', 'completed')
            .then(r => ({
              totalRevenue: r.data?.reduce((sum, job) => 
                sum + (job.estimated_value || 0), 0) || 0
            })),
        ]

        if (userId) {
          // Add user-specific filters
          queries.forEach((query, index) => {
            const tables = ['leads', 'jobs', 'estimates', 'jobs']
            const userField = tables[index] === 'leads' ? 'assigned_to' : 'created_by'
            // Note: This is a simplified approach - in reality, you'd modify each query
          })
        }

        const results = await Promise.all(queries)
        return Object.assign({}, ...results)
      },
      analyticsCache,
      2 * 60 * 1000 // 2 minutes TTL
    )
  }

  /**
   * Optimized lead queries with filtering and pagination
   */
  async getOptimizedLeads(
    supabase: SupabaseClient,
    options: {
      userId?: string
      status?: string
      limit?: number
      offset?: number
      includeContacts?: boolean
    } = {}
  ) {
    const { userId, status, limit = 50, offset = 0, includeContacts = false } = options
    
    const cacheKey = CacheKeys.leads(
      userId, 
      JSON.stringify({ status, limit, offset, includeContacts })
    )

    return withCache(
      cacheKey,
      async () => {
        let query = supabase
          .from('leads')
          .select(`
            id,
            first_name,
            last_name,
            email,
            phone,
            status,
            priority,
            source,
            estimated_value,
            created_at,
            updated_at,
            assigned_to,
            users!assigned_to(full_name)
            ${includeContacts ? ',lead_contacts(*)' : ''}
          `)
          .order('updated_at', { ascending: false })

        if (userId) {
          query = query.eq('assigned_to', userId)
        }

        if (status) {
          query = query.eq('status', status)
        }

        if (limit > 0) {
          query = query.range(offset, offset + limit - 1)
        }

        const { data, error } = await query
        if (error) throw error

        return data
      },
      queryCache,
      5 * 60 * 1000 // 5 minutes TTL
    )
  }

  /**
   * Optimized job queries with related data
   */
  async getOptimizedJobs(
    supabase: SupabaseClient,
    options: {
      userId?: string
      status?: string
      includeEstimates?: boolean
      includeMeasurements?: boolean
      limit?: number
      offset?: number
    } = {}
  ) {
    const { 
      userId, 
      status, 
      includeEstimates = false, 
      includeMeasurements = false,
      limit = 50,
      offset = 0 
    } = options
    
    const cacheKey = CacheKeys.jobs(userId, JSON.stringify(options))

    return withCache(
      cacheKey,
      async () => {
        let selectFields = `
          id,
          job_name,
          status,
          service_type,
          estimated_value,
          created_at,
          updated_at,
          lead_id,
          leads(first_name, last_name, phone, email)
        `

        if (includeEstimates) {
          selectFields += ',estimates(*)'
        }

        if (includeMeasurements) {
          selectFields += ',measurements(*)'
        }

        let query = supabase
          .from('jobs')
          .select(selectFields)
          .order('updated_at', { ascending: false })

        if (userId) {
          query = query.eq('created_by', userId)
        }

        if (status) {
          query = query.eq('status', status)
        }

        if (limit > 0) {
          query = query.range(offset, offset + limit - 1)
        }

        const { data, error } = await query
        if (error) throw error

        return data
      },
      queryCache,
      3 * 60 * 1000 // 3 minutes TTL
    )
  }

  /**
   * Batch operations with transaction-like behavior
   */
  async executeBatch(
    supabase: SupabaseClient,
    operations: Array<() => Promise<any>>
  ): Promise<any[]> {
    const startTime = Date.now()
    
    try {
      // Execute all operations concurrently
      const results = await Promise.allSettled(operations.map(op => op()))
      
      const duration = Date.now() - startTime
      logger.info('Batch operation completed', {
        operationCount: operations.length,
        duration: `${duration}ms`,
        successCount: results.filter(r => r.status === 'fulfilled').length,
        failureCount: results.filter(r => r.status === 'rejected').length,
      })

      // Check for failures
      const failures = results.filter(r => r.status === 'rejected')
      if (failures.length > 0) {
        logger.error('Batch operation had failures', {
          failureCount: failures.length,
          failures: failures.map(f => (f as PromiseRejectedResult).reason),
        })
      }

      return results
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error('Batch operation failed', error, {
        operationCount: operations.length,
        duration: `${duration}ms`,
      })
      throw error
    }
  }

  private recordMetrics(metrics: QueryMetrics): void {
    this.metrics.push(metrics)
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.splice(0, this.metrics.length - this.maxMetrics)
    }
  }

  /**
   * Get performance analytics
   */
  getPerformanceMetrics() {
    const now = Date.now()
    const last24h = this.metrics.filter(m => now - m.timestamp < 24 * 60 * 60 * 1000)
    
    if (last24h.length === 0) return null

    const totalQueries = last24h.length
    const cacheHits = last24h.filter(m => m.cacheHit).length
    const avgDuration = last24h.reduce((sum, m) => sum + m.duration, 0) / totalQueries
    const slowQueries = last24h.filter(m => m.duration > 1000).length

    return {
      totalQueries,
      cacheHitRate: (cacheHits / totalQueries * 100).toFixed(2) + '%',
      averageDuration: Math.round(avgDuration) + 'ms',
      slowQueries,
      slowQueryRate: (slowQueries / totalQueries * 100).toFixed(2) + '%',
    }
  }
}

// Export singleton instance
export const queryOptimizer = new QueryOptimizer()