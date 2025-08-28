"use client"

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Coffee, Zap, Target, TrendingUp } from 'lucide-react'

interface BattleStatsProps {
  stats: {
    currentXP: number
    targetXP: number
    level: number
    todayStreak: number
    powerUps: {
      coffeeBreak: number
      lightningRound: number
      perfectPitch: number
    }
  }
}

export function BattleStats({ stats }: BattleStatsProps) {
  const xpProgress = (stats.currentXP / stats.targetXP) * 100

  return (
    <Card className="bg-white border-slate-200">
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* XP Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900">
                Level {stats.level} Hunter
              </h3>
              <Badge className="bg-orange-500 text-white border-0">
                <TrendingUp className="w-3 h-3 mr-1" />
                {stats.currentXP} XP
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="h-3 rounded-full overflow-hidden bg-slate-200">
                <div 
                  className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                  style={{ width: `${xpProgress}%` }}
                >
                  {/* Animated shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                </div>
              </div>
              <p className="text-sm text-slate-600">
                {stats.currentXP}/{stats.targetXP} XP to Level {stats.level + 1}
              </p>
            </div>
          </div>

          {/* Streak */}
          <div className="space-y-3">
            <h3 className="font-bold text-lg text-slate-900">
              Today's Calls
            </h3>
            <div className="flex items-center space-x-2">
              <div className="text-3xl animate-bounce">📞</div>
              <div>
                <p className="text-2xl font-bold text-orange-500">
                  {stats.todayStreak}
                </p>
                <p className="text-sm text-slate-600">
                  Keep calling!
                </p>
              </div>
            </div>
          </div>

          {/* Power-Ups */}
          <div className="space-y-3">
            <h3 className="font-bold text-lg text-slate-900">
              Tools Available
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-lg text-center bg-slate-50 hover:bg-slate-100 hover:scale-105 transition-all cursor-pointer border">
                <Coffee className="w-5 h-5 mx-auto mb-1 text-amber-600" />
                <p className="text-xs text-slate-600">Break</p>
                <Badge className="mt-1 bg-amber-500 text-white text-xs">
                  {stats.powerUps.coffeeBreak}
                </Badge>
              </div>
              
              <div className="p-3 rounded-lg text-center bg-slate-50 hover:bg-slate-100 hover:scale-105 transition-all cursor-pointer border">
                <Zap className="w-5 h-5 mx-auto mb-1 text-orange-600" />
                <p className="text-xs text-slate-600">Boost</p>
                <Badge className="mt-1 bg-orange-500 text-white text-xs">
                  {stats.powerUps.lightningRound}
                </Badge>
              </div>
              
              <div className="p-3 rounded-lg text-center bg-slate-50 hover:bg-slate-100 hover:scale-105 transition-all cursor-pointer border">
                <Target className="w-5 h-5 mx-auto mb-1 text-green-600" />
                <p className="text-xs text-slate-600">Guide</p>
                <Badge className="mt-1 bg-green-500 text-white text-xs">
                  {stats.powerUps.perfectPitch}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}