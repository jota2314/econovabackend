"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Trophy, Medal, Award, TrendingUp, Star, Users } from "lucide-react"

interface LeaderboardEntry {
  userId: string
  salesperson_name: string
  performance_score: number
  total_revenue: number
  leads_converted: number
  calls_made: number
  response_rate: number
  rank: number
}

interface PerformanceLeaderboardProps {
  className?: string
}

export function PerformanceLeaderboard({ className }: PerformanceLeaderboardProps) {
  const [data, setData] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'quarter'>('month')

  useEffect(() => {
    loadLeaderboardData()
  }, [timeframe])

  const loadLeaderboardData = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        timeframe
      })

      const response = await fetch(`/api/analytics/leaderboard?${params}`)
      const result = await response.json()

      if (result.success) {
        // Ensure data is an array before setting state
        const validData = Array.isArray(result.data) ? result.data : []
        setData(validData)
      }
    } catch (error) {
      console.error('Error loading leaderboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="h-5 w-5 text-yellow-500" />
      case 2: return <Medal className="h-5 w-5 text-gray-400" />
      case 3: return <Award className="h-5 w-5 text-amber-600" />
      default: return <div className="h-5 w-5 flex items-center justify-center text-sm font-bold text-gray-500">#{rank}</div>
    }
  }

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-yellow-100 text-yellow-800'
      case 2: return 'bg-gray-100 text-gray-800'
      case 3: return 'bg-amber-100 text-amber-800'
      default: return 'bg-blue-100 text-blue-800'
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Performance Leaderboard
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Top performing salespeople based on multiple metrics
            </p>
          </div>
          
          <Select value={timeframe} onValueChange={(value: typeof timeframe) => setTimeframe(value)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        {Array.isArray(data) && data.length > 0 ? (
          <div className="space-y-6">
            {/* Top 3 Podium */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {Array.isArray(data) ? data.slice(0, 3).map((entry, index) => {
                const actualRank = entry.rank
                return (
                  <div 
                    key={entry.userId}
                    className={`text-center p-4 rounded-lg border-2 ${
                      actualRank === 1 ? 'border-yellow-300 bg-yellow-50' :
                      actualRank === 2 ? 'border-gray-300 bg-gray-50' :
                      'border-amber-300 bg-amber-50'
                    }`}
                  >
                    <div className="flex justify-center mb-2">
                      {getRankIcon(actualRank)}
                    </div>
                    <Avatar className="mx-auto mb-3 h-12 w-12">
                      <AvatarFallback className="bg-orange-100 text-orange-700">
                        {getInitials(entry.salesperson_name)}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="font-semibold text-lg">{entry.salesperson_name}</h3>
                    <div className="flex items-center justify-center gap-1 mt-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="font-bold text-lg">{entry.performance_score}</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      ${entry.total_revenue.toLocaleString()}
                    </div>
                  </div>
                )
              }) : []}
            </div>

            {/* Detailed Rankings */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Complete Rankings
              </h4>
              
              {Array.isArray(data) ? data.map((entry) => (
                <div 
                  key={entry.userId}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8">
                      {getRankIcon(entry.rank)}
                    </div>
                    
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-orange-100 text-orange-700">
                        {getInitials(entry.salesperson_name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <h3 className="font-semibold">{entry.salesperson_name}</h3>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span>{entry.leads_converted} conversions</span>
                        <span>•</span>
                        <span>{entry.calls_made} calls</span>
                        <span>•</span>
                        <span>{entry.response_rate.toFixed(1)}% response</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getRankBadgeColor(entry.rank)}>
                        #{entry.rank}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="font-bold">{entry.performance_score}</span>
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-green-600">
                      ${entry.total_revenue.toLocaleString()}
                    </div>
                  </div>
                </div>
              )) : []}
            </div>

            {/* Performance Metrics Legend */}
            <div className="bg-gray-50 rounded-lg p-4 mt-6">
              <h4 className="font-semibold text-gray-900 mb-3">Performance Score Calculation</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                <div>• Revenue Generated (40%)</div>
                <div>• Leads Converted (25%)</div>
                <div>• Call Activity (20%)</div>
                <div>• Response Rate (15%)</div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Scores are calculated based on weighted performance across multiple metrics
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Trophy className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No performance data</h3>
            <p className="text-gray-600">
              Performance rankings will appear once salespeople start generating activity
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}