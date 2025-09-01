/**
 * Environment variable validation and configuration
 */

import { z } from 'zod'

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required').optional(),

  // Twilio
  TWILIO_ACCOUNT_SID: z.string().startsWith('AC').optional(),
  TWILIO_AUTH_TOKEN: z.string().min(1, 'Twilio Auth Token is required').optional(),
  TWILIO_PHONE_NUMBER: z.string().min(1, 'Twilio Phone Number is required').optional(),

  // Email
  RESEND_API_KEY: z.string().min(1, 'Resend API key is required').optional(),
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
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      throw new Error(`Invalid environment variables:\n${missingVars.join('\n')}`)
    }
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