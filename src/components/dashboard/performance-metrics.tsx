"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Activity,
  Clock,
  Database,
  Shield,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Zap
} from "lucide-react"

interface PerformanceMetric {
  name: string
  value: number
  unit: string
  status: 'good' | 'warning' | 'critical'
  trend?: 'up' | 'down' | 'stable'
}

interface SystemHealth {
  database_response_time: number
  active_connections: number
  memory_usage: number
  cpu_usage: number
  error_rate: number
  uptime_hours: number
}

export function PerformanceMetrics() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([])
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPerformanceMetrics()
    // Refresh metrics every 30 seconds
    const interval = setInterval(loadPerformanceMetrics, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadPerformanceMetrics = async () => {
    try {
      // Simulate performance metrics (in a real app, this would call your API)
      const mockMetrics: PerformanceMetric[] = [
        {
          name: "Database Response Time",
          value: 45,
          unit: "ms",
          status: "good",
          trend: "stable"
        },
        {
          name: "Active Database Connections",
          value: 12,
          unit: "connections",
          status: "good",
          trend: "up"
        },
        {
          name: "Memory Usage",
          value: 67,
          unit: "%",
          status: "warning",
          trend: "up"
        },
        {
          name: "Error Rate",
          value: 0.2,
          unit: "%",
          status: "good",
          trend: "down"
        },
        {
          name: "API Response Time",
          value: 120,
          unit: "ms",
          status: "good",
          trend: "stable"
        },
        {
          name: "Lead Processing Rate",
          value: 95,
          unit: "%",
          status: "good",
          trend: "up"
        }
      ]

      const mockSystemHealth: SystemHealth = {
        database_response_time: 45,
        active_connections: 12,
        memory_usage: 67,
        cpu_usage: 34,
        error_rate: 0.2,
        uptime_hours: 168
      }

      setMetrics(mockMetrics)
      setSystemHealth(mockSystemHealth)
    } catch (error) {
      console.error('Error loading performance metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'bg-green-100 text-green-800'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800'
      case 'critical':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-500" />
      case 'down':
        return <TrendingUp className="h-3 w-3 text-red-500 transform rotate-180" />
      case 'stable':
        return <div className="h-3 w-3 bg-gray-400 rounded-full" />
      default:
        return null
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Database className="h-8 w-8 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {systemHealth?.database_response_time}ms
              </div>
              <div className="text-sm text-gray-500">DB Response</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Zap className="h-8 w-8 text-yellow-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {systemHealth?.cpu_usage}%
              </div>
              <div className="text-sm text-gray-500">CPU Usage</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Activity className="h-8 w-8 text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {systemHealth?.memory_usage}%
              </div>
              <div className="text-sm text-gray-500">Memory</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-8 w-8 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {systemHealth ? Math.floor(systemHealth.uptime_hours / 24) : 0}d
              </div>
              <div className="text-sm text-gray-500">Uptime</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Metrics
            <Badge variant="secondary" className="ml-auto">
              Live
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.map((metric, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(metric.status)}
                  <div>
                    <div className="font-medium text-gray-900">
                      {metric.name}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(metric.status)}>
                        {metric.status}
                      </Badge>
                      {metric.trend && (
                        <div className="flex items-center gap-1">
                          {getTrendIcon(metric.trend)}
                          <span className="text-xs text-gray-500 capitalize">
                            {metric.trend}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    {metric.value}
                    <span className="text-sm font-normal text-gray-500 ml-1">
                      {metric.unit}
                    </span>
                  </div>
                  {metric.name.toLowerCase().includes('usage') && (
                    <Progress 
                      value={metric.value} 
                      className="w-20 mt-1"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>System Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => loadPerformanceMetrics()}
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <Activity className="h-8 w-8 text-blue-500 mb-2" />
              <div className="font-medium">Refresh Metrics</div>
              <div className="text-sm text-gray-500">Update all performance data</div>
            </button>
            
            <button className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left">
              <Database className="h-8 w-8 text-green-500 mb-2" />
              <div className="font-medium">Database Health</div>
              <div className="text-sm text-gray-500">Check database status</div>
            </button>
            
            <button className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left">
              <Shield className="h-8 w-8 text-purple-500 mb-2" />
              <div className="font-medium">Security Scan</div>
              <div className="text-sm text-gray-500">Run security audit</div>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
