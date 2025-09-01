/**
 * Business-specific error classes and error handling utilities
 */

export class BusinessError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly details?: Record<string, any>

  constructor(
    message: string,
    code: string,
    statusCode: number = 400,
    details?: Record<string, any>
  ) {
    super(message)
    this.name = 'BusinessError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

export class ValidationError extends BusinessError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, details)
    this.name = 'ValidationError'
  }
}

export class AuthorizationError extends BusinessError {
  constructor(message: string = 'Not authorized to perform this action') {
    super(message, 'AUTHORIZATION_ERROR', 403)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends BusinessError {
  constructor(resource: string, id?: string) {
    const message = id 
      ? `${resource} with ID '${id}' not found`
      : `${resource} not found`
    
    super(message, 'NOT_FOUND_ERROR', 404)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends BusinessError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'CONFLICT_ERROR', 409, details)
    this.name = 'ConflictError'
  }
}

export class WorkflowError extends BusinessError {
  constructor(message: string, currentState?: string, attemptedTransition?: string) {
    super(message, 'WORKFLOW_ERROR', 422, {
      currentState,
      attemptedTransition
    })
    this.name = 'WorkflowError'
  }
}

export class ExternalServiceError extends BusinessError {
  constructor(service: string, message: string, details?: Record<string, any>) {
    super(`${service} error: ${message}`, 'EXTERNAL_SERVICE_ERROR', 502, {
      service,
      ...details
    })
    this.name = 'ExternalServiceError'
  }
}

// Specific business errors
export class InvalidLeadTransitionError extends WorkflowError {
  constructor(fromStatus: string, toStatus: string) {
    super(
      `Cannot transition lead from '${fromStatus}' to '${toStatus}'`,
      fromStatus,
      toStatus
    )
  }
}

export class EstimateApprovalRequiredError extends BusinessError {
  constructor(amount: number, threshold: number) {
    super(
      `Estimate of $${amount.toLocaleString()} requires approval (threshold: $${threshold.toLocaleString()})`,
      'APPROVAL_REQUIRED',
      422,
      { amount, threshold }
    )
  }
}

export class ServiceAreaRestrictionError extends ValidationError {
  constructor(state: string) {
    super(
      `Service not available in ${state}. We only serve MA and NH.`,
      { state, allowedStates: ['MA', 'NH'] }
    )
  }
}

export class DuplicateLeadError extends ConflictError {
  constructor(phone: string) {
    super(
      'A lead with this phone number already exists',
      { phone, field: 'phone' }
    )
  }
}

// Error handler utility
export function handleBusinessError(error: unknown): {
  message: string
  code: string
  statusCode: number
  details?: Record<string, any>
} {
  if (error instanceof BusinessError) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details
    }
  }

  if (error instanceof Error) {
    // Handle Supabase errors
    if (error.message.includes('duplicate key value')) {
      return {
        message: 'A record with this information already exists',
        code: 'DUPLICATE_ERROR',
        statusCode: 409
      }
    }

    if (error.message.includes('foreign key constraint')) {
      return {
        message: 'Referenced record does not exist',
        code: 'REFERENCE_ERROR',
        statusCode: 400
      }
    }

    if (error.message.includes('JWT')) {
      return {
        message: 'Authentication required',
        code: 'AUTH_ERROR',
        statusCode: 401
      }
    }

    // Generic error
    return {
      message: error.message,
      code: 'INTERNAL_ERROR',
      statusCode: 500
    }
  }

  // Unknown error
  return {
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    statusCode: 500
  }
}

// Error logging utility
export function logBusinessError(error: unknown, context?: Record<string, any>): void {
  const errorInfo = handleBusinessError(error)
  
  console.error('Business Error:', {
    ...errorInfo,
    timestamp: new Date().toISOString(),
    context
  })

  // In production, you might want to send to an error tracking service
  // like Sentry, DataDog, or similar
}