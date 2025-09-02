"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Bell, Search, User, LogOut, Settings, HelpCircle } from "lucide-react"
import { MobileSidebar } from "./mobile-sidebar"
import { notificationsService, type Notification } from "@/lib/services/notifications"

interface HeaderProps {
  title?: string
  user?: {
    name: string
    email: string
    avatar?: string
    role: string
  }
}

export function Header({ 
  title = "Dashboard",
  user
}: HeaderProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  
  // Ensure we always have user data for consistent rendering
  const userData = user || {
    name: "Guest User",
    email: "guest@sprayfoam.com",
    role: "salesperson"
  }
  
  // Load real notifications
  useEffect(() => {
    loadNotifications()
    // Refresh notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const realNotifications = await notificationsService.getRecentNotifications(10)
      setNotifications(realNotifications)
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleLogout = async () => {
    // Clear any local storage or cookies if needed
    router.push('/login')
  }
  
  const handleSearch = () => {
    // In a real app, this would open a search modal or navigate to search page
    alert('Search functionality coming soon!')
  }

  const handleNotificationClick = (notification: Notification) => {
    // Navigate to relevant page based on notification type
    if (notification.relatedType === 'lead') {
      router.push('/dashboard/leads')
    } else if (notification.relatedType === 'job') {
      router.push('/dashboard/jobs')
    } else if (notification.relatedType === 'estimate') {
      router.push('/dashboard/estimate-approvals')
    }
  }
  
  const unreadCount = notifications.filter(n => !n.read).length
  return (
    <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="flex h-14 items-center px-4 lg:px-6">
        <MobileSidebar />
        
        <div className="flex-1 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-slate-900 hidden sm:block">
              {title}
            </h1>
            <Badge variant="secondary" className="hidden lg:flex">
              Online
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="hidden sm:flex"
              onClick={handleSearch}
            >
              <Search className="h-4 w-4" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive rounded-full text-[10px] text-destructive-foreground flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80" align="end">
                <DropdownMenuLabel>
                  <div className="flex items-center justify-between">
                    <span>Notifications</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {loading ? '...' : `${unreadCount} new`}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          loadNotifications()
                        }}
                        disabled={loading}
                        className="h-6 w-6 p-0"
                      >
                        <div className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`}>
                          🔄
                        </div>
                      </Button>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {loading ? (
                  <div className="p-4 text-center text-sm text-slate-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-400 mx-auto mb-2"></div>
                    Loading notifications...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-500">
                    <Bell className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    No new notifications
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className={`flex items-start p-3 cursor-pointer hover:bg-slate-50 ${
                          !notification.read ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex-shrink-0 mr-3 mt-0.5">
                          <span className="text-lg">
                            {notificationsService.getNotificationIcon(notification.type)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium ${
                            notificationsService.getNotificationColor(notification.type)
                          }`}>
                            {notification.message}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {notification.time}
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-center justify-center text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
                  onClick={() => router.push('/dashboard')}
                >
                  <Button variant="ghost" size="sm" className="w-full">
                    View all notifications
                  </Button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full" suppressHydrationWarning>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userData.avatar} alt={userData.name} />
                    <AvatarFallback className="bg-secondary text-secondary-foreground">
                      {userData.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userData.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {userData.email}
                    </p>
                    <Badge variant="outline" className="w-fit text-xs mt-1">
                      {userData.role}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.open('https://support.sprayfoam.com', '_blank')}>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  <span>Support</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}