import { ReactNode } from 'react'

export interface TableColumn<T> {
  key: keyof T | string
  label: string
  sortable?: boolean
  width?: string
  render?: (value: any, row: T) => ReactNode
}

export interface FilterOption {
  label: string
  value: string
  count?: number
}

export interface SelectOption {
  label: string
  value: string
  disabled?: boolean
}

export interface FormFieldProps {
  label: string
  name: string
  required?: boolean
  error?: string
  helpText?: string
}

export interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
}

export interface TabItem {
  id: string
  label: string
  content: ReactNode
  disabled?: boolean
}

export interface ChartDataPoint {
  name: string
  value: number
  color?: string
}