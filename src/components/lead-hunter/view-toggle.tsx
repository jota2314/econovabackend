"use client"

import { Button } from '@/components/ui/button'
import { Map, Table } from 'lucide-react'

export type ViewMode = 'map' | 'table'

interface ViewToggleProps {
  currentView: ViewMode
  onViewChange: (view: ViewMode) => void
  permitCount: number
}

export function ViewToggle({ currentView, onViewChange, permitCount }: ViewToggleProps) {
  return (
    <div className="flex items-center space-x-2 sm:space-x-3">
      {/* Modern Toggle Switch */}
      <div className="relative bg-slate-200 rounded-full p-0.5 sm:p-1 flex items-center shadow-inner">
        {/* Sliding Background */}
        <div 
          className={`absolute h-7 sm:h-8 rounded-full bg-gradient-to-r from-green-500 to-green-600 shadow-lg transition-all duration-300 ease-in-out ${
            currentView === 'map' 
              ? 'w-[75px] sm:w-[110px] translate-x-0' 
              : 'w-[75px] sm:w-[120px] translate-x-[73px] sm:translate-x-[108px]'
          }`}
        />
        
        {/* Map View Button */}
        <button
          onClick={() => onViewChange('map')}
          className={`relative z-10 flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1 sm:py-1.5 rounded-full transition-all duration-300 ${
            currentView === 'map'
              ? 'text-white font-semibold scale-105'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          aria-label="Map View"
          title="Switch to Map View"
        >
          <Map className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm whitespace-nowrap">
            <span className="hidden sm:inline">Map View</span>
            <span className="sm:hidden">Map</span>
          </span>
        </button>
        
        {/* Table View Button */}
        <button
          onClick={() => onViewChange('table')}
          className={`relative z-10 flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1 sm:py-1.5 rounded-full transition-all duration-300 ${
            currentView === 'table'
              ? 'text-white font-semibold scale-105'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          aria-label="Table View"
          title="Switch to Table View"
        >
          <Table className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm whitespace-nowrap">
            <span className="hidden sm:inline">Table View</span>
            <span className="sm:hidden">Table</span>
          </span>
        </button>
      </div>
      
      {/* Permit Count Badge */}
      {permitCount > 0 && (
        <div className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 rounded-full text-xs sm:text-sm font-semibold border border-green-300 shadow-sm">
          <span className="hidden sm:inline">{permitCount} {permitCount === 1 ? 'permit' : 'permits'}</span>
          <span className="sm:hidden">{permitCount}</span>
        </div>
      )}
    </div>
  )
}