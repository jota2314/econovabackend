"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
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
    <div className="min-h-screen bg-slate-50/50">
      <div className="grid lg:grid-cols-[280px_1fr] h-screen">
        <div className="hidden lg:block border-r bg-white">
          <ScrollArea className="h-full">
            <Sidebar />
          </ScrollArea>
        </div>
        
        <div className="flex flex-col overflow-hidden">
          <Header title={title} user={user} />
          
          <main className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 lg:p-6 space-y-6">
                {children}
              </div>
            </ScrollArea>
          </main>
        </div>
      </div>
    </div>
  )
}