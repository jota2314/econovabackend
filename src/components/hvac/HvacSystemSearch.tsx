'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Plus, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { type HvacSystemSearchResult } from '@/types/hvac-simple'

interface HvacSystemSearchProps {
  onSystemSelect: (system: HvacSystemSearchResult) => void
  onCreateNew: () => void
  placeholder?: string
  className?: string
}

export function HvacSystemSearch({ 
  onSystemSelect, 
  onCreateNew, 
  placeholder = "Search HVAC systems...",
  className 
}: HvacSystemSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<HvacSystemSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  
  const searchRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  // Debounced search function
  const searchSystems = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      setIsOpen(false)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/hvac-catalog/search?q=${encodeURIComponent(searchQuery)}&limit=10`)
      const data = await response.json()
      
      if (data.success) {
        setResults(data.data.results)
        setIsOpen(true)
        setSelectedIndex(-1)
      } else {
        console.error('Search failed:', data.error)
        setResults([])
      }
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle input changes with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    
    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    
    // Set new debounce
    debounceRef.current = setTimeout(() => {
      searchSystems(value)
    }, 300)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        )
        break
      
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > -1 ? prev - 1 : -1)
        break
      
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSystemSelect(results[selectedIndex])
        }
        break
      
      case 'Escape':
        setIsOpen(false)
        setSelectedIndex(-1)
        break
    }
  }

  // Handle system selection
  const handleSystemSelect = (system: HvacSystemSearchResult) => {
    setQuery(system.system_name)
    setIsOpen(false)
    setSelectedIndex(-1)
    onSystemSelect(system)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node) &&
          searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Format price for display
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          ref={searchRef}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query && setIsOpen(true)}
          placeholder={placeholder}
          className="pl-10 pr-12"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <Card 
          ref={resultsRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 max-h-96 overflow-y-auto border shadow-lg"
        >
          {results.length > 0 ? (
            <div className="p-1">
              {results.map((system, index) => (
                <div
                  key={system.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors",
                    "hover:bg-muted/50",
                    selectedIndex === index && "bg-muted"
                  )}
                  onClick={() => handleSystemSelect(system)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span 
                        className="font-medium text-sm"
                        dangerouslySetInnerHTML={{ 
                          __html: system.highlighted_name || system.system_name 
                        }}
                      />
                      {system.tonnage && (
                        <Badge variant="secondary" className="text-xs">
                          {system.tonnage} tons
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {system.manufacturer && (
                        <span>{system.manufacturer}</span>
                      )}
                      {system.manufacturer && system.condenser_model && (
                        <span> • </span>
                      )}
                      {system.condenser_model && (
                        <span>{system.condenser_model}</span>
                      )}
                      {(system.manufacturer || system.condenser_model) && (
                        <span> • </span>
                      )}
                      <span className="text-blue-600">{system.system_type}</span>
                    </div>
                  </div>
                  <div className="text-right ml-3">
                    <div className="font-medium text-sm">
                      {formatPrice(system.base_price)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      base price
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : query.trim() ? (
            <div className="p-4 text-center text-muted-foreground">
              <p className="mb-2">No systems found for "{query}"</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onCreateNew}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Create New System
              </Button>
            </div>
          ) : null}
        </Card>
      )}
    </div>
  )
}