"use client"

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Trophy, 
  TrendingUp, 
  Target, 
  Star, 
  Share2, 
  X,
  Crown,
  Medal,
  Zap
} from 'lucide-react'

interface VictorySummaryProps {
  onClose: () => void
  stats: any
  isDarkMode: boolean
}

const mockDayStats = {
  totalXP: 450,
  callsMade: 35,
  qualified: 6,
  appointments: 2,
  achievements: [
    { title: 'First Blood', icon: '🩸' },
    { title: 'Hot Streak', icon: '🔥' },
    { title: 'The Closer', icon: '🎯' }
  ],
  rankChange: +2,
  newRank: 2,
  efficiency: 85
}

const tomorrowChallenges = [
  { title: 'Master Qualifier', description: 'Qualify 15 leads', xp: 750 },
  { title: 'Speed Demon', description: 'Complete 50 calls in 4 hours', xp: 400 },
  { title: 'Perfect Storm', description: 'Achieve 90% contact rate', xp: 300 }
]

export function VictorySummary({ onClose, stats, isDarkMode }: VictorySummaryProps) {
  const shareResults = () => {
    const message = `🎯 Just crushed it in Lead Hunter Arena! 
📞 ${mockDayStats.callsMade} calls made
✅ ${mockDayStats.qualified} qualified leads
🏆 ${mockDayStats.totalXP} XP earned
📈 Climbed to rank #${mockDayStats.newRank}!

#LeadHunter #Sales #Crushing It`
    
    // In a real app, this would share to team chat or social media
    console.log('Sharing:', message)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className={`max-w-2xl w-full max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="relative">
          {/* Close Button */}
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 p-2 rounded-full ${isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'} transition-colors`}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center pt-8 pb-6 px-6">
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <h2 className={`text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent`}>
              Victory Achieved!
            </h2>
            <p className={`text-lg ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              Another day of hunting success in the books!
            </p>
          </div>

          {/* Main Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 mb-6">
            <Card className={`p-4 text-center ${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
              <div className={`text-2xl font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-600'} mb-1`}>
                {mockDayStats.totalXP}
              </div>
              <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                XP Earned
              </div>
            </Card>

            <Card className={`p-4 text-center ${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
              <div className={`text-2xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} mb-1`}>
                {mockDayStats.callsMade}
              </div>
              <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Calls Made
              </div>
            </Card>

            <Card className={`p-4 text-center ${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
              <div className={`text-2xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'} mb-1`}>
                {mockDayStats.qualified}
              </div>
              <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Qualified
              </div>
            </Card>

            <Card className={`p-4 text-center ${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
              <div className={`text-2xl font-bold ${isDarkMode ? 'text-orange-400' : 'text-orange-600'} mb-1`}>
                {mockDayStats.efficiency}%
              </div>
              <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Efficiency
              </div>
            </Card>
          </div>

          {/* Rank Change */}
          <div className="px-6 mb-6">
            <Card className={`p-4 ${isDarkMode ? 'bg-gradient-to-r from-green-800/50 to-emerald-800/50 border-green-600/50' : 'bg-gradient-to-r from-green-100 to-emerald-100 border-green-300'}`}>
              <div className="flex items-center justify-center space-x-3">
                <TrendingUp className={`w-6 h-6 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                <div className="text-center">
                  <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Rank Up! 📈
                  </div>
                  <div className={`text-sm ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                    Climbed {mockDayStats.rankChange} positions to #{mockDayStats.newRank}
                  </div>
                </div>
                {mockDayStats.newRank <= 3 && (
                  <div className="text-2xl">
                    {mockDayStats.newRank === 1 ? '👑' : mockDayStats.newRank === 2 ? '🥈' : '🥉'}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Achievements Unlocked */}
          <div className="px-6 mb-6">
            <h3 className={`text-lg font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              🏆 Achievements Unlocked
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {mockDayStats.achievements.map((achievement, index) => (
                <Card key={index} className={`p-3 text-center ${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'} hover:scale-105 transition-transform`}>
                  <div className="text-2xl mb-1">{achievement.icon}</div>
                  <div className={`text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {achievement.title}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Tomorrow's Challenges Preview */}
          <div className="px-6 mb-6">
            <h3 className={`text-lg font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              🚀 Tomorrow's Challenges
            </h3>
            <div className="space-y-3">
              {tomorrowChallenges.map((challenge, index) => (
                <Card key={index} className={`p-3 ${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {challenge.title}
                      </div>
                      <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {challenge.description}
                      </div>
                    </div>
                    <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0">
                      +{challenge.xp} XP
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3">
            <Button
              onClick={shareResults}
              className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share Results
            </Button>
            
            <Button
              onClick={onClose}
              variant="outline"
              className={`flex-1 ${isDarkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
            >
              Continue Hunting
            </Button>
          </div>

          {/* Motivational Quote */}
          <div className="px-6 pb-6 text-center">
            <div className={`text-sm italic ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              "Success is not final, failure is not fatal: it is the courage to continue that counts."
            </div>
            <div className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
              - Winston Churchill
            </div>
          </div>
        </div>

        {/* Background Confetti Effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${i * 500}ms`,
                animationDuration: '2s'
              }}
            />
          ))}
        </div>
      </Card>
    </div>
  )
}