/**
 * Shared API operations for measurements
 */

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { logger } from '@/lib/services/logger'
import { BaseMeasurement, ServiceType } from '../../types'

interface ApiOperations<T extends BaseMeasurement> {
  loading: boolean
  saving: boolean
  loadMeasurements: (jobId: string) => Promise<T[]>
  saveMeasurements: (jobId: string, measurements: T[]) => Promise<T[]>
  deleteMeasurement: (measurementId: string) => Promise<void>
  uploadPhoto: (measurementId: string, file: File) => Promise<string>
}

export function useMeasurementApi<T extends BaseMeasurement>(
  serviceType: ServiceType,
  tableName: string
): ApiOperations<T> {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const getApiEndpoint = (action: string, id?: string) => {
    const baseUrl = `/api/measurements/${serviceType}`
    switch (action) {
      case 'load':
        return `${baseUrl}?jobId=${id}`
      case 'save':
        return baseUrl
      case 'delete':
        return `${baseUrl}/${id}`
      case 'photo':
        return `/api/measurements/${id}/photo`
      default:
        return baseUrl
    }
  }

  const loadMeasurements = useCallback(async (jobId: string): Promise<T[]> => {
    setLoading(true)
    try {
      logger.info('Loading measurements', { serviceType, jobId, tableName })
      
      const response = await fetch(getApiEndpoint('load', jobId))
      
      if (!response.ok) {
        throw new Error(`Failed to load ${serviceType} measurements`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load measurements')
      }

      logger.info('Measurements loaded successfully', { 
        serviceType, 
        jobId, 
        count: data.data?.length || 0 
      })

      return data.data || []
    } catch (error) {
      logger.error('Failed to load measurements', error, { serviceType, jobId })
      toast.error(`Failed to load ${serviceType} measurements`)
      throw error
    } finally {
      setLoading(false)
    }
  }, [serviceType, tableName])

  const saveMeasurements = useCallback(async (jobId: string, measurements: T[]): Promise<T[]> => {
    setSaving(true)
    try {
      logger.info('Saving measurements', { 
        serviceType, 
        jobId, 
        count: measurements.length,
        tableName 
      })

      const response = await fetch(getApiEndpoint('save'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId,
          measurements,
          serviceType,
          tableName
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to save ${serviceType} measurements`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to save measurements')
      }

      logger.info('Measurements saved successfully', { 
        serviceType, 
        jobId, 
        count: data.data?.length || 0 
      })

      toast.success(`${serviceType.charAt(0).toUpperCase() + serviceType.slice(1)} measurements saved successfully`)
      
      return data.data || []
    } catch (error) {
      logger.error('Failed to save measurements', error, { serviceType, jobId })
      toast.error(`Failed to save ${serviceType} measurements`)
      throw error
    } finally {
      setSaving(false)
    }
  }, [serviceType, tableName])

  const deleteMeasurement = useCallback(async (measurementId: string): Promise<void> => {
    try {
      logger.info('Deleting measurement', { serviceType, measurementId })

      const response = await fetch(getApiEndpoint('delete', measurementId), {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(`Failed to delete ${serviceType} measurement`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete measurement')
      }

      logger.info('Measurement deleted successfully', { serviceType, measurementId })
      toast.success('Measurement deleted successfully')
    } catch (error) {
      logger.error('Failed to delete measurement', error, { serviceType, measurementId })
      toast.error('Failed to delete measurement')
      throw error
    }
  }, [serviceType])

  const uploadPhoto = useCallback(async (measurementId: string, file: File): Promise<string> => {
    try {
      logger.info('Uploading photo', { serviceType, measurementId, fileName: file.name })

      const formData = new FormData()
      formData.append('photo', file)
      formData.append('measurementId', measurementId)

      const response = await fetch(getApiEndpoint('photo', measurementId), {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload photo')
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to upload photo')
      }

      logger.info('Photo uploaded successfully', { 
        serviceType, 
        measurementId, 
        url: data.url 
      })

      toast.success('Photo uploaded successfully')
      return data.url
    } catch (error) {
      logger.error('Failed to upload photo', error, { serviceType, measurementId })
      toast.error('Failed to upload photo')
      throw error
    }
  }, [serviceType])

  return {
    loading,
    saving,
    loadMeasurements,
    saveMeasurements,
    deleteMeasurement,
    uploadPhoto,
  }
}