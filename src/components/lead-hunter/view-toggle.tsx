"use client"

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Map, Table, LayoutGrid } from 'lucide-react'

export type ViewMode = 'map' | 'table'

interface ViewToggleProps {
  currentView: ViewMode
  onViewChange: (view: ViewMode) => void
  permitCount: number
}

export function ViewToggle({ currentView, onViewChange, permitCount }: ViewToggleProps) {
  return (
    <Card className="p-1 flex items-center space-x-1 w-fit">
      <Button
        variant={currentView === 'map' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('map')}
        className={`flex items-center space-x-2 ${
          currentView === 'map' 
            ? 'bg-orange-500 hover:bg-orange-600 text-white' 
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <Map className="w-4 h-4" />
        <span className="hidden sm:inline">Map View</span>
      </Button>
      
      <Button
        variant={currentView === 'table' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('table')}
        className={`flex items-center space-x-2 ${
          currentView === 'table' 
            ? 'bg-orange-500 hover:bg-orange-600 text-white' 
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <Table className="w-4 h-4" />
        <span className="hidden sm:inline">Table View</span>
      </Button>
      
      {permitCount > 0 && (
        <div className="px-3 py-1 bg-slate-100 rounded text-sm text-slate-600 ml-2">
          {permitCount} permits
        </div>
      )}
    </Card>
  )
}