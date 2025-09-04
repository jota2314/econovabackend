'use client'

import { useEffect } from 'react'
import { useLeadsStore } from '@/stores/leads-store'
import type { LeadWithAssignee } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, RefreshCw } from 'lucide-react'

export function LeadsDemo() {
  const {
    // State
    leads,
    loading,
    error,
    filteredLeads,
    totalLeads,
    searchTerm,
    viewMode,
    
    // Actions
    fetchLeads,
    setSearchTerm,
    setViewMode,
    openAddDialog,
    selectLead,
  } = useLeadsStore()

  // Fetch leads on mount
  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800'
      case 'contacted': return 'bg-yellow-100 text-yellow-800'
      case 'closed_won': return 'bg-green-100 text-green-800'
      case 'closed_lost': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">
            🚀 Zustand Leads Store Demo
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {totalLeads} total leads
            </Badge>
            <Badge variant="outline">
              {filteredLeads.length} filtered
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Button 
            variant="outline"
            onClick={() => fetchLeads(true)}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>

        <div className="flex gap-2 mt-4">
          {(['communication', 'pipeline', 'map', 'enhanced'] as const).map((mode) => (
            <Button
              key={mode}
              variant={viewMode === mode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode(mode)}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Button>
          ))}
        </div>
      </CardHeader>
      
      <CardContent>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}
        
        <div className="space-y-3">
          {filteredLeads.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No leads match your search' : 'No leads found'}
            </div>
          ) : (
            filteredLeads.slice(0, 10).map((lead: LeadWithAssignee) => (
              <div
                key={lead.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => selectLead(lead)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-medium">{lead.name}</h3>
                      <p className="text-sm text-gray-600">
                        {lead.email} • {lead.phone}
                      </p>
                      {lead.company && (
                        <p className="text-sm text-gray-500">{lead.company}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Badge className={getStatusColor(lead.status)}>
                    {lead.status.replace('_', ' ')}
                  </Badge>
                  
                  <div className="text-right text-sm text-gray-500">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))
          )}
          
          {filteredLeads.length > 10 && (
            <div className="text-center py-4 text-gray-500">
              ... and {filteredLeads.length - 10} more leads
            </div>
          )}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">✨ Zustand Benefits Demonstrated:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Simplified State:</strong> No more 15+ useState hooks</li>
            <li>• <strong>Computed Values:</strong> Automatic filteredLeads calculation</li>
            <li>• <strong>Type Safety:</strong> Full TypeScript support</li>
            <li>• <strong>DevTools:</strong> Redux DevTools integration</li>
            <li>• <strong>Performance:</strong> Granular subscriptions prevent unnecessary re-renders</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}