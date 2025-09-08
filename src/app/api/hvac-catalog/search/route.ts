/**
 * API route for HVAC system search/autocomplete functionality
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { type HvacSystemSearchResult, type HvacSearchResponse } from '@/types/hvac-simple'

// GET /api/hvac-catalog/search - Search HVAC systems for autocomplete
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    
    const query = searchParams.get('q') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50) // Max 50 results
    
    if (!query.trim()) {
      return NextResponse.json({
        success: true,
        data: { results: [], total: 0 }
      })
    }

    // Search using full-text search with ranking
    const { data: systems, error, count } = await supabase
      .from('hvac_systems_catalog')
      .select(`
        id,
        system_name,
        system_type,
        manufacturer,
        condenser_model,
        tonnage,
        base_price
      `)
      .eq('is_active', true)
      .textSearch('search_vector', query)
      .order('system_name', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('Error searching HVAC systems:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to search HVAC systems'
      }, { status: 500 })
    }

    // Format results for autocomplete
    const results: HvacSystemSearchResult[] = (systems || []).map(system => ({
      id: system.id,
      system_name: system.system_name,
      system_type: system.system_type,
      manufacturer: system.manufacturer,
      condenser_model: system.condenser_model,
      tonnage: system.tonnage,
      base_price: system.base_price,
      // Simple highlighting (can be enhanced later)
      highlighted_name: highlightSearchTerms(system.system_name, query)
    }))

    const response: HvacSearchResponse = {
      success: true,
      data: {
        results,
        total: count || 0
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in HVAC search:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

/**
 * Simple search term highlighting function
 * Can be enhanced with more sophisticated highlighting later
 */
function highlightSearchTerms(text: string, searchQuery: string): string {
  if (!searchQuery.trim()) return text
  
  const terms = searchQuery.trim().split(/\s+/)
  let highlightedText = text
  
  terms.forEach(term => {
    const regex = new RegExp(`(${term})`, 'gi')
    highlightedText = highlightedText.replace(regex, '<mark>$1</mark>')
  })
  
  return highlightedText
}