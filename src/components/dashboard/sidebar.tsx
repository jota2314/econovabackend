"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Users,
  Briefcase,
  BarChart3,
  Home,
  SprayCan,
  LogOut,
  User2
} from "lucide-react"

const navigationItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
    exact: true
  },
  {
    title: "Leads",
    href: "/dashboard/leads",
    icon: Users,
    exact: false
  },
  {
    title: "Jobs",
    href: "/dashboard/jobs",
    icon: Briefcase,
    exact: false
  },
  {
    title: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
    exact: false
  }
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (item: typeof navigationItems[0]) => {
    if (item.exact) {
      return pathname === item.href
    }
    return pathname.startsWith(item.href)
  }

  const handleLogout = () => {
    // Clear any auth tokens if needed
    router.push('/login')
  }

  return (
    <div className={cn("pb-12 h-full", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="flex items-center gap-2 mb-6 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 shadow-sm">
              <SprayCan className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              SprayFoam CRM
            </h2>
          </div>
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const active = isActive(item)
              return (
                <Button
                  key={item.href}
                  variant={active ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors",
                    active && "bg-gradient-to-r from-orange-50 to-orange-100/50 text-orange-900 hover:from-orange-100 hover:to-orange-100 font-semibold border-l-2 border-orange-500 rounded-l-none"
                  )}
                  asChild
                >
                  <Link href={item.href}>
                    <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-orange-600" : "text-slate-400")} />
                    <span className="truncate">{item.title}</span>
                  </Link>
                </Button>
              )
            })}
          </div>
        </div>
        <Separator />
        <div className="px-3 py-2">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-3">
            Quick Actions
          </div>
          <div className="space-y-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              asChild
            >
              <Link href="/dashboard/leads">
                New Lead
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              asChild
            >
              <Link href="/dashboard/jobs">
                Schedule Job
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              asChild
            >
              <Link href="/dashboard/jobs">
                Add Measurement
              </Link>
            </Button>
          </div>
        </div>
        <Separator />
        <div className="px-3 py-2">
          <div className="space-y-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start gap-3 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              asChild
            >
              <Link href="/dashboard">
                <User2 className="h-4 w-4" />
                <span>Profile Settings</span>
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start gap-3 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}