"use client"

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Sword, Star, Clock, Target } from 'lucide-react'

interface Challenge {
  id: string
  type: 'main' | 'side' | 'bonus'
  title: string
  description: string
  progress: number
  target: number
  xp: number
  icon: string
  timeLimit?: string
}

interface DailyChallengesProps {
  isDarkMode: boolean
}

const mockChallenges: Challenge[] = [
  {
    id: '1',
    type: 'main',
    title: 'Lead Qualifier',
    description: 'Qualify 10 leads today',
    progress: 4,
    target: 10,
    xp: 500,
    icon: '🏆'
  },
  {
    id: '2',
    type: 'side',
    title: 'Pool Hunter',
    description: 'Call 20 pool permits',
    progress: 12,
    target: 20,
    xp: 200,
    icon: '🏊‍♂️'
  },
  {
    id: '3',
    type: 'bonus',
    title: 'Iron Will',
    description: 'No breaks for 2 hours',
    progress: 45,
    target: 120,
    xp: 100,
    icon: '⚡',
    timeLimit: '1h 15m left'
  }
]

export function DailyChallenges({ isDarkMode }: DailyChallengesProps) {
  const getChallengeColor = (type: string, isDark: boolean) => {
    const colors = {
      main: isDark ? 'from-purple-800 to-blue-800 border-purple-600' : 'from-purple-100 to-blue-100 border-purple-300',
      side: isDark ? 'from-green-800 to-teal-800 border-green-600' : 'from-green-100 to-teal-100 border-green-300',
      bonus: isDark ? 'from-orange-800 to-red-800 border-orange-600' : 'from-orange-100 to-red-100 border-orange-300'
    }
    return colors[type as keyof typeof colors] || colors.side
  }

  const getChallengeTitle = (type: string) => {
    switch (type) {
      case 'main': return 'Main Quest'
      case 'side': return 'Side Quest'
      case 'bonus': return 'Bonus Challenge'
      default: return 'Challenge'
    }
  }

  const getChallengeIcon = (type: string) => {
    switch (type) {
      case 'main': return <Sword className="w-5 h-5" />
      case 'side': return <Target className="w-5 h-5" />
      case 'bonus': return <Star className="w-5 h-5" />
      default: return <Target className="w-5 h-5" />
    }
  }

  return (
    <Card className={`${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white/80 border-slate-200'} backdrop-blur-sm transition-colors duration-300`}>
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Sword className={`w-6 h-6 ${isDarkMode ? 'text-purple-400' : 'text-purple-500'}`} />
          <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Daily Challenges
          </h3>
        </div>

        <div className="space-y-4">
          {mockChallenges.map((challenge) => {
            const progressPercentage = (challenge.progress / challenge.target) * 100
            const isCompleted = challenge.progress >= challenge.target

            return (
              <Card
                key={challenge.id}
                className={`p-4 border bg-gradient-to-r ${getChallengeColor(challenge.type, isDarkMode)} transition-all hover:scale-[1.02] ${
                  isCompleted ? 'animate-pulse' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  {/* Challenge Icon */}
                  <div className="text-2xl animate-bounce">
                    {challenge.icon}
                  </div>

                  {/* Challenge Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      {getChallengeIcon(challenge.type)}
                      <Badge
                        className={`text-xs ${
                          challenge.type === 'main'
                            ? 'bg-purple-500 text-white'
                            : challenge.type === 'side'
                            ? 'bg-green-500 text-white'
                            : 'bg-orange-500 text-white'
                        }`}
                      >
                        {getChallengeTitle(challenge.type)}
                      </Badge>
                      {challenge.timeLimit && (
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-orange-400" />
                          <span className={`text-xs ${isDarkMode ? 'text-orange-300' : 'text-orange-600'}`}>
                            {challenge.timeLimit}
                          </span>
                        </div>
                      )}
                    </div>

                    <h4 className={`font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {challenge.title}
                    </h4>
                    
                    <p className={`text-sm mb-3 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      {challenge.description}
                    </p>

                    {/* Progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                          Progress: {challenge.progress}/{challenge.target}
                        </span>
                        <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 text-xs">
                          +{challenge.xp} XP
                        </Badge>
                      </div>
                      
                      <Progress
                        value={progressPercentage}
                        className={`h-2 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}
                      />
                      
                      <div className={`text-xs text-right ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {Math.round(progressPercentage)}% complete
                      </div>
                    </div>

                    {/* Completion Status */}
                    {isCompleted && (
                      <div className="mt-2 flex items-center space-x-2 text-green-500">
                        <span className="text-lg">✅</span>
                        <span className="font-semibold text-sm">Challenge Complete!</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        {/* Summary */}
        <div className={`mt-6 p-4 rounded-lg ${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-100'} text-center`}>
          <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'} mb-2`}>
            Total Potential XP Today
          </p>
          <p className={`text-2xl font-bold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
            {mockChallenges.reduce((sum, challenge) => sum + challenge.xp, 0)} XP
          </p>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
            Complete all challenges to maximize your gains!
          </p>
        </div>
      </div>
    </Card>
  )
}