"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Phone, 
  Trophy, 
  RotateCcw, 
  X, 
  Voicemail, 
  Timer,
  Star,
  Target,
  MapPin,
  Calendar
} from 'lucide-react'

interface LeadHunterArenaProps {
  stats: any
  setStats: any
  addAchievement: any
}

interface Prospect {
  id: string
  name: string
  phone: string
  address: string
  source: string
  difficulty: 'Easy' | 'Medium' | 'Boss'
  potentialXP: number
  leadScore: number
}

const mockProspects: Prospect[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    phone: '(555) 123-4567',
    address: '123 Oak Street, Boston, MA',
    source: 'Pool Permit',
    difficulty: 'Easy',
    potentialXP: 15,
    leadScore: 85
  },
  {
    id: '2', 
    name: 'Mike Thompson',
    phone: '(555) 987-6543',
    address: '456 Pine Avenue, Cambridge, MA',
    source: 'Facebook Lead',
    difficulty: 'Medium',
    potentialXP: 25,
    leadScore: 65
  },
  {
    id: '3',
    name: 'Jennifer Davis',
    phone: '(555) 555-0123',
    address: '789 Elm Drive, Newton, MA',
    source: 'Cold Call',
    difficulty: 'Boss',
    potentialXP: 50,
    leadScore: 45
  }
]

export function LeadHunterArena({ stats, setStats, addAchievement }: LeadHunterArenaProps) {
  const [currentProspect, setCurrentProspect] = useState<Prospect>(mockProspects[0])
  const [isDialing, setIsDialing] = useState(false)
  const [callTimer, setCallTimer] = useState(0)
  const [isCallActive, setIsCallActive] = useState(false)
  const [consecutiveSuccesses, setConsecutiveSuccesses] = useState(0)

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-500'
      case 'Medium': return 'bg-yellow-500' 
      case 'Boss': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'Pool Permit': return '🏊‍♂️'
      case 'Facebook Lead': return '📘'
      case 'Cold Call': return '❄️'
      default: return '📞'
    }
  }

  const startCall = () => {
    setIsDialing(true)
    setCallTimer(0)
    
    setTimeout(() => {
      setIsDialing(false)
      setIsCallActive(true)
    }, 2000)
  }

  const endCall = (disposition: 'victory' | 'callback' | 'defeated' | 'voicemail') => {
    setIsCallActive(false)
    setCallTimer(0)

    // Handle XP and achievements
    let xpGained = 0
    const newAchievements: any[] = []

    switch (disposition) {
      case 'victory':
        xpGained = currentProspect.potentialXP
        setConsecutiveSuccesses(prev => {
          const newCount = prev + 1
          if (newCount === 1) {
            newAchievements.push({
              id: Date.now().toString(),
              title: 'First Blood',
              description: 'First qualified lead of the day',
              xp: 25,
              icon: '🩸'
            })
          }
          if (newCount === 5) {
            newAchievements.push({
              id: (Date.now() + 1).toString(),
              title: 'Hot Streak',
              description: '5 successful contacts in a row',
              xp: 100,
              icon: '🔥'
            })
          }
          return newCount
        })
        break
      case 'callback':
        xpGained = Math.floor(currentProspect.potentialXP * 0.3)
        break
      case 'voicemail':
        xpGained = Math.floor(currentProspect.potentialXP * 0.2)
        break
      case 'defeated':
        setConsecutiveSuccesses(0)
        xpGained = 5 // Small consolation XP
        break
    }

    // Update stats
    setStats((prev: any) => ({
      ...prev,
      currentXP: prev.currentXP + xpGained,
      todayStreak: disposition === 'victory' ? prev.todayStreak + 1 : prev.todayStreak
    }))

    // Add achievements
    newAchievements.forEach(achievement => addAchievement(achievement))

    // Load next prospect
    const nextIndex = Math.floor(Math.random() * mockProspects.length)
    setCurrentProspect(mockProspects[nextIndex])
  }

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isCallActive) {
      interval = setInterval(() => {
        setCallTimer(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isCallActive])

  return (
    <div className="space-y-6">
      {/* Main Dialer Arena */}
      <Card className="bg-white border-slate-200">
        <div className="p-8">
          {/* Prospect Card */}
          <div className="mb-8 p-6 rounded-xl bg-slate-50 border transform transition-all duration-500 hover:scale-[1.02]">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  {currentProspect.name}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-600">
                      {currentProspect.phone}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-600">
                      {currentProspect.address}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right space-y-2">
                <Badge className={`${getDifficultyColor(currentProspect.difficulty)} text-white px-3 py-1`}>
                  {currentProspect.difficulty}
                </Badge>
                <div className="text-sm text-slate-500">
                  Potential XP: <span className="text-orange-500 font-bold">+{currentProspect.potentialXP}</span>
                </div>
              </div>
            </div>

            {/* Lead Stats */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="p-3 rounded-lg bg-white border text-center">
                <div className="text-lg font-bold text-orange-500">{currentProspect.leadScore}%</div>
                <div className="text-xs text-slate-600">Lead Score</div>
              </div>
              <div className="p-3 rounded-lg bg-white border text-center">
                <div className="text-lg">
                  {getSourceIcon(currentProspect.source)}
                </div>
                <div className="text-xs text-slate-600">{currentProspect.source}</div>
              </div>
              <div className="p-3 rounded-lg bg-white border text-center">
                <div className="text-lg font-bold text-green-500">
                  {consecutiveSuccesses}
                </div>
                <div className="text-xs text-slate-600">Streak</div>
              </div>
            </div>
          </div>

          {/* Dialer Interface */}
          <div className="text-center space-y-6">
            {/* Call Timer */}
            {isCallActive && (
              <div className="text-center animate-pulse">
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <Timer className="w-5 h-5 text-orange-500" />
                  <span className="text-xl font-mono text-orange-500">
                    {Math.floor(callTimer / 60)}:{(callTimer % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                <div className="text-sm text-slate-600">
                  Call in progress...
                </div>
              </div>
            )}

            {/* Main Dial Button */}
            <div className="relative">
              <Button
                onClick={startCall}
                disabled={isDialing || isCallActive}
                className={`w-32 h-32 rounded-full text-white font-bold text-lg shadow-xl transform transition-all duration-300 ${
                  isDialing || isCallActive
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                    : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 hover:scale-110'
                }`}
              >
                <Phone className="w-8 h-8" />
              </Button>
              
              {/* Pulsing Ring Effect */}
              {(isDialing || isCallActive) && (
                <div className="absolute inset-0 w-32 h-32 rounded-full border-4 border-orange-500 animate-ping opacity-30" />
              )}
            </div>

            {/* Status Text */}
            <div className="text-lg font-semibold text-slate-900">
              {isDialing && 'Connecting...'}
              {isCallActive && 'Live Call - Choose Your Action!'}
              {!isDialing && !isCallActive && 'Ready to Call!'}
            </div>
          </div>

          {/* Disposition Buttons */}
          {isCallActive && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 animate-fade-in">
              <Button
                onClick={() => endCall('victory')}
                className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-lg transform hover:scale-105 transition-all"
              >
                <Trophy className="w-5 h-5 mr-2" />
                Qualified!
              </Button>
              
              <Button
                onClick={() => endCall('callback')}
                className="bg-amber-500 hover:bg-amber-600 text-white p-4 rounded-lg transform hover:scale-105 transition-all"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Call Back
              </Button>
              
              <Button
                onClick={() => endCall('voicemail')}
                className="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-lg transform hover:scale-105 transition-all"
              >
                <Voicemail className="w-5 h-5 mr-2" />
                Voicemail
              </Button>
              
              <Button
                onClick={() => endCall('defeated')}
                className="bg-slate-500 hover:bg-slate-600 text-white p-4 rounded-lg transform hover:scale-105 transition-all"
              >
                <X className="w-5 h-5 mr-2" />
                No Interest
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}