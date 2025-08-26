"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Users,
  Briefcase,
  Ruler,
  MessageSquare,
  BarChart3,
  Settings,
  Home,
  SprayCan
} from "lucide-react"

const navigationItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home
  },
  {
    title: "Leads",
    href: "/dashboard/leads",
    icon: Users
  },
  {
    title: "Jobs",
    href: "/dashboard/jobs",
    icon: Briefcase
  },
  {
    title: "Measurements",
    href: "/dashboard/measurements",
    icon: Ruler
  },
  {
    title: "Communications",
    href: "/dashboard/communications",
    icon: MessageSquare
  },
  {
    title: "Reports",
    href: "/dashboard/reports",
    icon: BarChart3
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings
  }
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className={cn("pb-12", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="flex items-center gap-2 mb-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500">
              <SprayCan className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              SprayFoam CRM
            </h2>
          </div>
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <Button
                key={item.href}
                variant={pathname === item.href ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-2 text-slate-700",
                  pathname === item.href && "bg-orange-50 text-orange-900 hover:bg-orange-50"
                )}
                asChild
              >
                <Link href={item.href}>
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Link>
              </Button>
            ))}
          </div>
        </div>
        <Separator />
        <div className="px-3 py-2">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-3">
            Quick Actions
          </div>
          <div className="space-y-1">
            <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-slate-600">
              New Lead
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-slate-600">
              Schedule Job
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-slate-600">
              Add Measurement
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}