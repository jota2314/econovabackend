"use client"


import { Header } from "./header"
import { Sidebar } from "./sidebar"

interface DashboardLayoutProps {
  children: React.ReactNode
  title?: string
  user?: {
    name: string
    email: string
    avatar?: string
    role: string
  }
}

export function DashboardLayout({ children, title, user }: DashboardLayoutProps) {
  return (
    <div className="h-screen bg-slate-50/50 flex flex-col" suppressHydrationWarning>
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden lg:block w-[280px] border-r bg-white overflow-y-auto">
          <Sidebar user={user} />
        </div>
        
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header title={title} user={user} />
          
          <main className="flex-1 overflow-y-auto">
            <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}