"use client"

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Crown, Medal, Trophy, TrendingUp, Target } from 'lucide-react'

interface LeaderboardPlayer {
  id: string
  name: string
  avatar: string
  points: number
  position: number
  trend: 'up' | 'down' | 'same'
  isCurrentUser?: boolean
}

interface LeaderboardProps {}

const mockLeaderboard: LeaderboardPlayer[] = [
  {
    id: '1',
    name: 'Sarah Connor',
    avatar: '👩‍💼',
    points: 2450,
    position: 1,
    trend: 'up'
  },
  {
    id: '2', 
    name: 'Mike Johnson',
    avatar: '👨‍💼',
    points: 2380,
    position: 2,
    trend: 'same'
  },
  {
    id: '3',
    name: 'Jennifer Davis',
    avatar: '👩‍🦰',
    points: 2290,
    position: 3,
    trend: 'up'
  },
  {
    id: '4',
    name: 'You',
    avatar: '🎯',
    points: 2245,
    position: 4,
    trend: 'down',
    isCurrentUser: true
  },
  {
    id: '5',
    name: 'Tom Wilson',
    avatar: '👨‍💻',
    points: 2180,
    position: 5,
    trend: 'up'
  },
  {
    id: '6',
    name: 'Lisa Anderson',
    avatar: '👩‍🔬',
    points: 2120,
    position: 6,
    trend: 'down'
  },
  {
    id: '7',
    name: 'David Brown',
    avatar: '👨‍🏫',
    points: 2050,
    position: 7,
    trend: 'same'
  }
]

export function Leaderboard(): JSX.Element {
  const [activeTab, setActiveTab] = useState('daily')
  
  const currentUser = mockLeaderboard.find(player => player.isCurrentUser)
  const nextPlayer = mockLeaderboard.find(player => player.position === (currentUser?.position || 4) - 1)
  const pointsToOvertake = nextPlayer ? nextPlayer.points - (currentUser?.points || 0) : 0

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1: return <Crown className="w-5 h-5 text-yellow-500" />
      case 2: return <Medal className="w-5 h-5 text-gray-400" />
      case 3: return <Trophy className="w-5 h-5 text-amber-600" />
      default: return <span className="text-sm font-bold text-slate-600">#{position}</span>
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3 text-green-500" />
      case 'down': return <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />
      default: return <div className="w-3 h-3 bg-gray-400 rounded-full" />
    }
  }

  return (
    <Card className="bg-white border-slate-200 sticky top-6">
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Target className="w-6 h-6 text-orange-500" />
          <h3 className="text-xl font-bold text-slate-900">
            Leaderboard
          </h3>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
          <TabsList className="grid w-full grid-cols-3 bg-slate-100">
            <TabsTrigger value="daily" className="text-xs">Daily</TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs">Weekly</TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs">Monthly</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-3">
            {mockLeaderboard.map((player) => (
              <div
                key={player.id}
                className={`flex items-center space-x-3 p-3 rounded-lg transition-all hover:scale-[1.02] ${
                  player.isCurrentUser
                    ? 'bg-gradient-to-r from-orange-100/50 to-amber-100/50 border border-orange-300/50'
                    : 'bg-slate-50 hover:bg-slate-100 border'
                }`}
              >
                {/* Rank */}
                <div className="flex items-center justify-center w-8">
                  {getRankIcon(player.position)}
                </div>

                {/* Avatar */}
                <div className="text-xl">
                  {player.avatar}
                </div>

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className={`font-semibold truncate ${
                      player.isCurrentUser
                        ? 'text-orange-700'
                        : 'text-slate-900'
                    }`}>
                      {player.name}
                    </p>
                    {getTrendIcon(player.trend)}
                  </div>
                  <p className="text-sm text-slate-600">
                    {player.points.toLocaleString()} pts
                  </p>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        {/* Overtake Challenge */}
        {nextPlayer && (
          <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-orange-100 to-red-100 border border-orange-300">
            <div className="text-center">
              <p className="text-sm font-medium text-orange-800 mb-2">
                🎯 Challenge
              </p>
              <p className="font-bold text-slate-900">
                Overtake {nextPlayer.name}
              </p>
              <Badge className="mt-2 bg-gradient-to-r from-orange-500 to-red-500 text-white border-0">
                +{pointsToOvertake} more points
              </Badge>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg text-center bg-slate-100 border">
            <div className="text-lg font-bold text-orange-600">
              #4
            </div>
            <div className="text-xs text-slate-600">
              Your Rank
            </div>
          </div>
          <div className="p-3 rounded-lg text-center bg-slate-100 border">
            <div className="text-lg font-bold text-green-600">
              87%
            </div>
            <div className="text-xs text-slate-600">
              Efficiency
            </div>
          </div>
        </div>

        {/* Motivation */}
        <div className="mt-4 text-center">
          <p className="text-sm text-slate-600 italic">
            "Every call is a chance to climb higher! 🚀"
          </p>
        </div>
      </div>
    </Card>
  )
}