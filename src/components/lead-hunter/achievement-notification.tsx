"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star, X } from 'lucide-react'

interface Achievement {
  id: string
  title: string
  description: string
  xp: number
  icon: string
}

interface AchievementNotificationProps {
  achievement: Achievement
  isDarkMode: boolean
}

export function AchievementNotification({ achievement, isDarkMode }: AchievementNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    // Slide in animation
    setTimeout(() => setIsVisible(true), 100)
    
    // Auto dismiss after 4 seconds
    const timer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(() => setIsVisible(false), 300)
    }, 4000)

    return () => clearTimeout(timer)
  }, [])

  if (!isVisible) return null

  return (
    <Card className={`
      ${isDarkMode ? 'bg-gradient-to-r from-purple-800 to-blue-800 border-purple-600' : 'bg-gradient-to-r from-purple-100 to-blue-100 border-purple-300'}
      backdrop-blur-sm shadow-2xl transform transition-all duration-300 ease-out max-w-sm
      ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
    `}>
      <div className="p-4">
        <div className="flex items-start space-x-3">
          {/* Achievement Icon */}
          <div className="text-2xl animate-bounce">
            {achievement.icon}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Achievement Unlocked!
              </h4>
              <Star className={`w-4 h-4 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-500'} animate-pulse`} />
            </div>
            
            <h5 className={`font-semibold ${isDarkMode ? 'text-purple-200' : 'text-purple-800'} mb-1`}>
              {achievement.title}
            </h5>
            
            <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'} mb-2`}>
              {achievement.description}
            </p>
            
            <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0">
              +{achievement.xp} XP
            </Badge>
          </div>
          
          {/* Close button */}
          <button
            onClick={() => {
              setIsExiting(true)
              setTimeout(() => setIsVisible(false), 300)
            }}
            className={`p-1 rounded-full hover:bg-black/10 transition-colors ${isDarkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Confetti Effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-ping"
            style={{
              left: `${20 + i * 15}%`,
              top: `${10 + (i % 2) * 20}%`,
              animationDelay: `${i * 200}ms`,
              animationDuration: '1s'
            }}
          />
        ))}
      </div>
    </Card>
  )
}