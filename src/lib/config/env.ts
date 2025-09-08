/**
 * Environment variable validation and configuration
 */

import { z } from 'zod'
import { logger } from '@/lib/services/logger'

const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required'),

  // Twilio
  TWILIO_ACCOUNT_SID: z.string().startsWith('AC', 'Twilio Account SID must start with AC'),
  TWILIO_AUTH_TOKEN: z.string().min(1, 'Twilio Auth Token is required'),
  TWILIO_PHONE_NUMBER: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid Twilio phone number format'),

  // Email
  RESEND_API_KEY: z.string().min(1, 'Resend API key is required'),
  FROM_EMAIL: z.string().email('Invalid from email address').optional(),

  // App configuration
  NEXT_PUBLIC_APP_URL: z.string().url('Invalid app URL').default('http://localhost:3000'),
  APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),

  // Feature flags
  ENABLE_ANALYTICS: z.string().transform(val => val === 'true').default('true'),
  ENABLE_NOTIFICATIONS: z.string().transform(val => val === 'true').default('true'),
  ENABLE_AUDIT_LOG: z.string().transform(val => val === 'true').default('false'),

  // Business configuration
  DEFAULT_COMMISSION_RATE: z.string().transform(val => parseFloat(val)).default('0.05'),
  ESTIMATE_APPROVAL_THRESHOLD: z.string().transform(val => parseInt(val)).default('5000'),
  MAX_UPLOAD_SIZE_MB: z.string().transform(val => parseInt(val)).default('10'),
})

function validateEnv() {
  try {
    const parsed = envSchema.parse(process.env)
    logger.info('Environment configuration validated successfully', {
      nodeEnv: parsed.NODE_ENV,
      appEnv: parsed.APP_ENV,
      features: {
        analytics: parsed.ENABLE_ANALYTICS,
        notifications: parsed.ENABLE_NOTIFICATIONS,
        auditLog: parsed.ENABLE_AUDIT_LOG,
      },
      services: {
        twilio: !!(parsed.TWILIO_ACCOUNT_SID && parsed.TWILIO_AUTH_TOKEN),
        email: !!parsed.RESEND_API_KEY,
      }
    })
    return parsed
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      const errorMessage = `Invalid environment variables:\n${missingVars.join('\n')}`
      
      logger.error('Environment validation failed', error, { errors: missingVars })
      
      // In production, fail fast
      if (process.env.NODE_ENV === 'production') {
        console.error(errorMessage)
        process.exit(1)
      }
      
      throw new Error(errorMessage)
    }
    logger.error('Unexpected error during environment validation', error)
    throw error
  }
}

export const env = validateEnv()

// Helper functions for environment checks
export const isDevelopment = env.APP_ENV === 'development'
export const isProduction = env.APP_ENV === 'production'
export const isStaging = env.APP_ENV === 'staging'

// Feature flag helpers
export const features = {
  analytics: env.ENABLE_ANALYTICS,
  notifications: env.ENABLE_NOTIFICATIONS,
  auditLog: env.ENABLE_AUDIT_LOG,
} as const

// Service availability checks
export const services = {
  twilio: !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN),
  email: !!env.RESEND_API_KEY,
} as const

/**
 * Additional helper functions for better environment management
 */
export function requireEnvVar(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`)
  }
  return value
}

export function getOptionalEnvVar(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue
}

/**
 * Validate environment on server startup
 */
export function validateEnvironmentOnStartup(): void {
  if (typeof window === 'undefined' && env.APP_ENV === 'production') {
    // Additional production-only validations
    const requiredForProduction = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
      'SUPABASE_SERVICE_ROLE_KEY',
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN',
      'TWILIO_PHONE_NUMBER',
      'RESEND_API_KEY'
    ]
    
    const missing = requiredForProduction.filter(key => !process.env[key])
    
    if (missing.length > 0) {
      const errorMessage = `Missing required environment variables for production: ${missing.join(', ')}`
      logger.error(errorMessage)
      console.error(errorMessage)
      process.exit(1)
    }
    
    logger.info('Production environment validation completed successfully')
  }
}