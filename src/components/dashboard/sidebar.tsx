"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Briefcase,
  BarChart3,
  Home,
  LogOut,
  User2,
  Target,
  Phone,
  Upload,
  Settings,
  UserCheck,
  DollarSign,
  BadgeIcon
} from "lucide-react"

// Define navigation items by role
const getNavigationItems = (role: string) => {
  const baseItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: Home,
      exact: true,
      roles: ['manager', 'salesperson', 'lead_hunter']
    }
  ]

  const roleSpecificItems = {
    manager: [
      { title: "Leads", href: "/dashboard/leads", icon: Users, exact: false },
      { title: "Jobs", href: "/dashboard/jobs", icon: Briefcase, exact: false },
      { title: "Lead Hunter", href: "/dashboard/lead-hunter", icon: Target, exact: false },
      { title: "Analytics", href: "/dashboard/analytics", icon: BarChart3, exact: false },
      { title: "Pricing", href: "/dashboard/pricing", icon: DollarSign, exact: false },
      { title: "Team", href: "/dashboard/team", icon: UserCheck, exact: false },
      { title: "Settings", href: "/dashboard/settings", icon: Settings, exact: false }
    ],
    salesperson: [
      { title: "Leads", href: "/dashboard/leads", icon: Users, exact: false },
      { title: "Jobs", href: "/dashboard/jobs", icon: Briefcase, exact: false },
      { title: "Analytics", href: "/dashboard/analytics", icon: BarChart3, exact: false },
      { title: "Profile", href: "/dashboard/profile", icon: User2, exact: false }
    ],
    lead_hunter: [
      { title: "Lead Hunter Dashboard", href: "/dashboard/lead-hunter", icon: Target, exact: false },
      { title: "Dialer", href: "/dashboard/dialer", icon: Phone, exact: false },
      { title: "Upload Lists", href: "/dashboard/upload-lists", icon: Upload, exact: false },
      { title: "My Stats", href: "/dashboard/my-stats", icon: BarChart3, exact: false }
    ]
  }

  return [
    ...baseItems,
    ...(roleSpecificItems[role as keyof typeof roleSpecificItems] || roleSpecificItems.salesperson)
  ]
}

interface SidebarProps {
  className?: string
  user?: {
    name: string
    email: string
    avatar?: string
    role: string
  }
}

export function Sidebar({ className, user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const userRole = user?.role || 'salesperson'
  const navigationItems = getNavigationItems(userRole)

  const isActive = (item: typeof navigationItems[0]) => {
    if (item.exact) {
      return pathname === item.href
    }
    return pathname.startsWith(item.href)
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'manager': return 'Manager'
      case 'salesperson': return 'Salesperson'
      case 'lead_hunter': return 'Lead Hunter'
      default: return 'User'
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'manager': return 'bg-purple-100 text-purple-800'
      case 'salesperson': return 'bg-blue-100 text-blue-800'
      case 'lead_hunter': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleLogout = () => {
    // Clear any auth tokens if needed
    router.push('/login')
  }

  return (
    <div className={cn("pb-12 h-full", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="flex items-center justify-center mb-4 px-2">
            <Image
              src="/Logo (4).png"
              alt="Econova Energy Savings"
              width={350}
              height={85}
              className="h-20 w-auto"
            />
          </div>
          
          {/* User Role Badge */}
          {user && (
            <div className="flex items-center justify-center mb-6">
              <div className={cn(
                "px-3 py-1 rounded-full text-xs font-medium",
                getRoleBadgeColor(userRole)
              )}>
                {getRoleDisplayName(userRole)}
              </div>
            </div>
          )}
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
            {(userRole === 'manager' || userRole === 'salesperson') && (
              <>
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
              </>
            )}
            
            {userRole === 'manager' && (
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
            )}

            {userRole === 'lead_hunter' && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                  asChild
                >
                  <Link href="/dashboard/dialer">
                    Start Dialing
                  </Link>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                  asChild
                >
                  <Link href="/dashboard/upload-lists">
                    Upload List
                  </Link>
                </Button>
              </>
            )}
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