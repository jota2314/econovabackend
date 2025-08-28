"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  name: string
  email: string
  role: string
  userId?: string
}

interface RoleContextType {
  user: User | null
  refreshUser: () => Promise<void>
  isLoading: boolean
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

interface RoleProviderProps {
  children: ReactNode
  initialUser?: User | null
}

export function RoleProvider({ children, initialUser = null }: RoleProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser)
  const [isLoading, setIsLoading] = useState(!initialUser)

  const refreshUser = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/user/role')
      if (response.ok) {
        const userData = await response.json()
        setUser({
          name: userData.name,
          email: userData.email,
          role: userData.role,
          userId: userData.userId
        })
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!initialUser) {
      refreshUser()
    } else {
      setIsLoading(false)
    }
  }, [initialUser])

  return (
    <RoleContext.Provider value={{ user, refreshUser, isLoading }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  const context = useContext(RoleContext)
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider')
  }
  return context
}