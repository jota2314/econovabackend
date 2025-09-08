export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface BulkOperationResponse<T> {
  success_count: number
  error_count: number
  results: T[]
  errors: Array<{
    index: number
    error: string
  }>
}