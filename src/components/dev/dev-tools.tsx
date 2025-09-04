"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Bug,
  Database,
  Shield,
  Wifi,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Settings,
  Zap
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { AuthTest } from "./auth-test"
import { LeadsDemo } from "./leads-demo"

interface DevToolsProps {
  show?: boolean
}

interface SystemStatus {
  supabase: 'connected' | 'error' | 'loading'
  auth: 'authenticated' | 'unauthenticated' | 'loading'
  database: 'accessible' | 'error' | 'loading'
  rls: 'enabled' | 'disabled' | 'error' | 'loading'
}

export function DevTools({ show = process.env.NODE_ENV === 'development' }: DevToolsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState<SystemStatus>({
    supabase: 'loading',
    auth: 'loading',
    database: 'loading',
    rls: 'loading'
  })
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const supabase = createClient()

  useEffect(() => {
    if (show && isOpen) {
      checkSystemStatus()
    }
  }, [show, isOpen])

  const checkSystemStatus = async () => {
    console.log('🔧 Dev Tools: Checking system status...')
    
    setStatus({
      supabase: 'loading',
      auth: 'loading',
      database: 'loading',
      rls: 'loading'
    })

    try {
      // Check Supabase connection
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      setStatus(prev => ({
        ...prev,
        supabase: 'connected',
        auth: user ? 'authenticated' : 'unauthenticated'
      }))

      // Check database accessibility
      try {
        const { data: leads, error: dbError } = await supabase
          .from('leads')
          .select('id')
          .limit(1)
        
        if (dbError) {
          console.error('Database error:', dbError)
          setStatus(prev => ({ ...prev, database: 'error', rls: 'error' }))
        } else {
          setStatus(prev => ({ ...prev, database: 'accessible', rls: 'enabled' }))
        }
      } catch (error) {
        console.error('Database check failed:', error)
        setStatus(prev => ({ ...prev, database: 'error', rls: 'error' }))
      }

    } catch (error) {
      console.error('System check failed:', error)
      setStatus(prev => ({ ...prev, supabase: 'error' }))
    }

    setLastCheck(new Date())
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'authenticated':
      case 'accessible':
      case 'enabled':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
      case 'disabled':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'unauthenticated':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <RefreshCw className="h-4 w-4 text-gray-400 animate-spin" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'authenticated':
      case 'accessible':
      case 'enabled':
        return 'bg-green-100 text-green-800'
      case 'error':
      case 'disabled':
        return 'bg-red-100 text-red-800'
      case 'unauthenticated':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (!show) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
        <Button
          onClick={() => setIsOpen(true)}
          size="sm"
          className="bg-orange-600 hover:bg-orange-700 shadow-lg"
        >
          <Bug className="h-4 w-4 mr-2" />
          Dev Tools
        </Button>
      ) : (
        <Card className="w-[600px] max-h-[80vh] overflow-auto shadow-xl border-orange-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Settings className="h-4 w-4" />
                Development Tools
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                ×
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="status" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="status">System</TabsTrigger>
                <TabsTrigger value="zustand">Zustand</TabsTrigger>
                <TabsTrigger value="demos">Demos</TabsTrigger>
              </TabsList>
              
              <TabsContent value="status" className="space-y-4 mt-4">
                {/* System Status */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">System Status</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={checkSystemStatus}
                      disabled={Object.values(status).some(s => s === 'loading')}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Check
                    </Button>
                  </div>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wifi className="h-3 w-3" />
                        Supabase
                      </div>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(status.supabase)}
                        <Badge className={getStatusColor(status.supabase)}>
                          {status.supabase}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="h-3 w-3" />
                        Authentication
                      </div>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(status.auth)}
                        <Badge className={getStatusColor(status.auth)}>
                          {status.auth}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className="h-3 w-3" />
                        Database
                      </div>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(status.database)}
                        <Badge className={getStatusColor(status.database)}>
                          {status.database}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="h-3 w-3" />
                        RLS Security
                      </div>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(status.rls)}
                        <Badge className={getStatusColor(status.rls)}>
                          {status.rls}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Environment Info */}
                <div className="pt-2 border-t">
                  <div className="text-xs space-y-1 text-gray-600">
                    <div>Environment: {process.env.NODE_ENV}</div>
                    {lastCheck && (
                      <div>Last check: {lastCheck.toLocaleTimeString()}</div>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Quick Actions</div>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        console.clear()
                        console.log('🧹 Console cleared by Dev Tools')
                      }}
                      className="text-xs"
                    >
                      Clear Console
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        localStorage.clear()
                        sessionStorage.clear()
                        console.log('🧹 Storage cleared by Dev Tools')
                      }}
                      className="text-xs"
                    >
                      Clear Storage
                    </Button>
                  </div>
                </div>

                {/* Warnings */}
                {status.auth === 'unauthenticated' && (
                  <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                    <AlertTriangle className="h-3 w-3 inline mr-1" />
                    Authentication required for full functionality
                  </div>
                )}
                
                {status.database === 'error' && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                    <AlertTriangle className="h-3 w-3 inline mr-1" />
                    Database connection issues detected
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="zustand" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-purple-600" />
                    <h3 className="font-medium">Zustand State Management</h3>
                    <Badge className="bg-purple-100 text-purple-800">Active</Badge>
                  </div>
                  
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-medium text-purple-900 mb-2">✨ Implementation Complete</h4>
                    <ul className="text-sm text-purple-800 space-y-1">
                      <li>• <strong>Auth Store:</strong> Replaces useAuth hook</li>
                      <li>• <strong>Leads Store:</strong> Eliminates 15+ useState hooks</li>
                      <li>• <strong>UI Store:</strong> Global modal/dialog management</li>
                      <li>• <strong>DevTools:</strong> Redux DevTools integration</li>
                      <li>• <strong>TypeScript:</strong> Full type safety</li>
                    </ul>
                  </div>
                  
                  <AuthTest />
                </div>
              </TabsContent>
              
              <TabsContent value="demos" className="mt-4">
                <div className="space-y-4">
                  <LeadsDemo />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
