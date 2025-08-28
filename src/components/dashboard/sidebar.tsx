"use client"

import Link from "next/link"
import Image from "next/image"
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
          <div className="flex items-center justify-center mb-6 px-2">
            <Image
              src="/Logo (4).png"
              alt="Econova Energy Savings"
              width={350}
              height={85}
              className="h-24 w-auto"
            />
          </div>
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const active = isActive(item)
              return (
                <Button
                  key={item.href}
                  variant={active ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
                    active && "bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold border-l-2 border-primary rounded-l-none"
                  )}
                  asChild
                >
                  <Link href={item.href}>
                    <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                    <span className="truncate">{item.title}</span>
                  </Link>
                </Button>
              )
            })}
          </div>
        </div>
        <Separator />
        <div className="px-3 py-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">
            Quick Actions
          </div>
          <div className="space-y-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
              asChild
            >
              <Link href="/dashboard/leads">
                New Lead
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
              asChild
            >
              <Link href="/dashboard/jobs">
                Schedule Job
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
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
              className="w-full justify-start gap-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
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
              className="w-full justify-start gap-3 text-xs text-destructive hover:text-destructive/90 hover:bg-destructive/10"
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