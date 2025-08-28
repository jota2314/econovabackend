"use client"

import { useState, useEffect } from 'react'
import { LeadHunterArena } from '@/components/lead-hunter/lead-hunter-arena'
import { BattleStats } from '@/components/lead-hunter/battle-stats'
import { Leaderboard } from '@/components/lead-hunter/leaderboard'
import { AchievementNotification } from '@/components/lead-hunter/achievement-notification'
import { DailyChallenges } from '@/components/lead-hunter/daily-challenges'
import { VictorySummary } from '@/components/lead-hunter/victory-summary'

interface Achievement {
  id: string
  title: string
  description: string
  xp: number
  icon: string
}

interface LeadHunterStats {
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

export default function LeadHunterPage() {
  const [stats, setStats] = useState<LeadHunterStats>({
    currentXP: 780,
    targetXP: 1000,
    level: 8,
    todayStreak: 23,
    powerUps: {
      coffeeBreak: 2,
      lightningRound: 1,
      perfectPitch: 3
    }
  })

  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [showVictory, setShowVictory] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(true)

  const addAchievement = (achievement: Achievement) => {
    setAchievements(prev => [...prev, achievement])
    setTimeout(() => {
      setAchievements(prev => prev.filter(a => a.id !== achievement.id))
    }, 5000)
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Main Container */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Lead Hunter Dashboard
            </h1>
            <p className="text-lg text-slate-600 mt-1">
              Track your progress, make calls, and hit your targets! 📞
            </p>
          </div>
        </div>

        {/* Battle Stats */}
        <BattleStats stats={stats} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-8">
          {/* Main Arena - Takes up 3 columns */}
          <div className="lg:col-span-3">
            <LeadHunterArena 
              stats={stats}
              setStats={setStats}
              addAchievement={addAchievement}
            />
            
            {/* Daily Challenges */}
            <div className="mt-6">
              <DailyChallenges />
            </div>
          </div>

          {/* Sidebar - Leaderboard */}
          <div className="lg:col-span-1">
            <Leaderboard />
          </div>
        </div>
      </div>

      {/* Achievement Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {achievements.map((achievement) => (
          <AchievementNotification
            key={achievement.id}
            achievement={achievement}
          />
        ))}
      </div>

      {/* Victory Summary Modal */}
      {showVictory && (
        <VictorySummary
          onClose={() => setShowVictory(false)}
          stats={stats}
        />
      )}
    </div>
  )
}