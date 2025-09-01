/**
 * Date formatting and manipulation utilities
 */

import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns'

/**
 * Formats a date string or Date object for display
 */
export function formatDate(
  date: string | Date,
  formatString: string = 'MMM d, yyyy'
): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    
    if (!isValid(dateObj)) {
      return 'Invalid date'
    }

    return format(dateObj, formatString)
  } catch (error) {
    console.warn('Error formatting date:', error)
    return 'Invalid date'
  }
}

/**
 * Formats a date as relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    
    if (!isValid(dateObj)) {
      return 'Unknown'
    }

    return formatDistanceToNow(dateObj, { addSuffix: true })
  } catch (error) {
    console.warn('Error formatting relative time:', error)
    return 'Unknown'
  }
}

/**
 * Formats a date for input fields (YYYY-MM-DD)
 */
export function formatDateForInput(date: string | Date): string {
  return formatDate(date, 'yyyy-MM-dd')
}

/**
 * Formats a date and time for display
 */
export function formatDateTime(
  date: string | Date,
  options: {
    includeTime?: boolean
    includeSeconds?: boolean
    use24Hour?: boolean
  } = {}
): string {
  const {
    includeTime = true,
    includeSeconds = false,
    use24Hour = false
  } = options

  let formatString = 'MMM d, yyyy'
  
  if (includeTime) {
    if (use24Hour) {
      formatString += includeSeconds ? ' HH:mm:ss' : ' HH:mm'
    } else {
      formatString += includeSeconds ? ' h:mm:ss a' : ' h:mm a'
    }
  }

  return formatDate(date, formatString)
}

/**
 * Gets the start of the current business week (Monday)
 */
export function getStartOfBusinessWeek(): Date {
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Sunday
  
  const monday = new Date(today.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  
  return monday
}

/**
 * Calculates business days between two dates
 */
export function getBusinessDaysBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  let businessDays = 0

  const currentDate = new Date(start)
  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      businessDays++
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return businessDays
}

/**
 * Checks if a date is within business hours (9 AM - 5 PM, Mon-Fri)
 */
export function isBusinessHours(date: Date = new Date()): boolean {
  const day = date.getDay()
  const hour = date.getHours()
  
  // Monday = 1, Friday = 5
  const isWeekday = day >= 1 && day <= 5
  const isWorkingHours = hour >= 9 && hour < 17
  
  return isWeekday && isWorkingHours
}