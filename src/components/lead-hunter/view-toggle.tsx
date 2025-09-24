"use client"

import { Button } from '@/components/ui/button'
import { Map, Table, Brain } from 'lucide-react'

export type ViewMode = 'map' | 'table' | 'recommendations'

interface ViewToggleProps {
  currentView: ViewMode
  onViewChange: (view: ViewMode) => void
}

export function ViewToggle({ currentView, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center space-x-2 sm:space-x-3">
      {/* Modern Toggle Switch */}
      <div className="relative bg-slate-200 rounded-full p-0.5 sm:p-1 flex items-center shadow-inner">
        {/* Sliding Background */}
        <div
          className={`absolute h-8 w-8 rounded-full bg-gradient-to-r from-green-500 to-green-600 shadow-lg transition-all duration-300 ease-in-out ${
            currentView === 'map'
              ? 'translate-x-0'
              : currentView === 'table'
              ? 'translate-x-8'
              : 'translate-x-16'
          }`}
        />

        {/* Map View Button */}
        <button
          onClick={() => onViewChange('map')}
          className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${
            currentView === 'map'
              ? 'text-white scale-105'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          aria-label="Map View"
          title="Switch to Map View"
        >
          <Map className="w-4 h-4" />
        </button>

        {/* Table View Button */}
        <button
          onClick={() => onViewChange('table')}
          className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${
            currentView === 'table'
              ? 'text-white scale-105'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          aria-label="Table View"
          title="Switch to Table View"
        >
          <Table className="w-4 h-4" />
        </button>

        {/* Recommendations View Button */}
        <button
          onClick={() => onViewChange('recommendations')}
          className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${
            currentView === 'recommendations'
              ? 'text-white scale-105'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          aria-label="AI Recommendations View"
          title="Switch to AI Recommendations View"
        >
          <Brain className="w-4 h-4" />
        </button>
      </div>
      
    </div>
  )
}