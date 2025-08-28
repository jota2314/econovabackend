"use client"

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
  
  // Ensure we always have user data for consistent rendering
  const userData = user || {
    name: "Guest User",
    email: "guest@sprayfoam.com",
    role: "salesperson"
  }
  
  const handleLogout = async () => {
    // Clear any local storage or cookies if needed
    router.push('/login')
  }
  
  const handleSearch = () => {
    // In a real app, this would open a search modal or navigate to search page
    alert('Search functionality coming soon!')
  }
  
  // Sample notifications (in real app, these would come from API)
  const notifications = [
    { id: 1, message: "New lead assigned to you", time: "5 min ago", read: false },
    { id: 2, message: "Job #1234 measurement complete", time: "1 hour ago", read: false },
    { id: 3, message: "Quote approved by customer", time: "2 hours ago", read: true }
  ]
  
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
                    <Badge variant="secondary" className="text-xs">
                      {unreadCount} new
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-500">
                    No new notifications
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className={`flex flex-col items-start p-3 ${!notification.read ? 'bg-slate-50' : ''}`}
                    >
                      <span className="text-sm font-medium">{notification.message}</span>
                      <span className="text-xs text-slate-500">{notification.time}</span>
                    </DropdownMenuItem>
                  ))
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-center justify-center text-sm text-blue-600 hover:text-blue-700"
                  onClick={() => router.push('/dashboard')}
                >
                  View all notifications
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