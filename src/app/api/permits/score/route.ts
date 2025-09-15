import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/lib/types/database'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { permitId } = await request.json()

    if (!permitId) {
      return NextResponse.json(
        { success: false, error: 'Permit ID is required' },
        { status: 400 }
      )
    }

    // Calculate permit score using our AI algorithm
    const score = await calculatePermitScore(permitId, supabase)
    const temperature = calculateTemperature(score)

    // Update the permit with new score and temperature
    const { data, error } = await supabase
      .from('permits')
      .update({
        priority_score: score,
        temperature: temperature,
        updated_at: new Date().toISOString()
      })
      .eq('id', permitId)
      .select()
      .single()

    if (error) {
      console.error('Error updating permit score:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        permitId,
        score,
        temperature,
        updated: data
      }
    })

  } catch (error) {
    console.error('Error in permit score API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  // Bulk update all permit scores
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all permits that need scoring
    const { data: permits, error: permitsError } = await supabase
      .from('permits')
      .select('id, project_value, permit_type, city, state, address, created_at, status')
      .not('status', 'eq', 'closed')

    if (permitsError) {
      throw new Error(permitsError.message)
    }

    const updates = []

    for (const permit of permits || []) {
      const score = await calculatePermitScore(permit.id, supabase)
      const temperature = calculateTemperature(score)

      updates.push({
        id: permit.id,
        priority_score: score,
        temperature: temperature,
        updated_at: new Date().toISOString()
      })
    }

    // Batch update all permits
    const { error: updateError } = await supabase
      .from('permits')
      .upsert(updates)

    if (updateError) {
      throw new Error(updateError.message)
    }

    return NextResponse.json({
      success: true,
      data: {
        updated_count: updates.length,
        permits: updates
      }
    })

  } catch (error) {
    console.error('Error in bulk permit score update:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function calculatePermitScore(permitId: string, supabase: SupabaseClient<Database>): Promise<number> {
  let score = 0

  // Get permit data
  const { data: permit } = await supabase
    .from('permits')
    .select('*')
    .eq('id', permitId)
    .single()

  if (!permit) return 0

  // Project Value Scoring (40% weight - most important factor)
  if (permit.project_value && permit.project_value > 0) {
    if (permit.project_value >= 1000000) {
      score += 40 // Million+ projects
    } else if (permit.project_value >= 500000) {
      score += 35 // $500k+ projects
    } else if (permit.project_value >= 250000) {
      score += 30 // $250k+ projects
    } else if (permit.project_value >= 100000) {
      score += 25 // $100k+ projects
    } else if (permit.project_value >= 50000) {
      score += 20 // $50k+ projects
    } else if (permit.project_value >= 25000) {
      score += 15 // $25k+ projects
    } else {
      score += 10 // Any value better than none
    }
  } else {
    score += 5 // Default for permits without value data
  }

  // Property Type Scoring (15% weight)
  const permitTypeScores = {
    'residential': 15, // Residential preferred for insulation business
    'commercial': 10   // Commercial still valuable but different process
  }
  score += permitTypeScores[permit.permit_type as keyof typeof permitTypeScores] || 10

  // Geographic Scoring (15% weight)
  const highValueCities = [
    // Massachusetts high-value areas
    'Newton', 'Brookline', 'Cambridge', 'Wellesley', 'Lexington', 'Concord',
    'Lincoln', 'Weston', 'Dover', 'Needham', 'Dedham', 'Milton', 'Hingham',
    // New Hampshire high-value areas
    'Hanover', 'New London', 'Portsmouth', 'Exeter', 'Bedford', 'Amherst'
  ]

  if (permit.state === 'MA' || permit.state === 'NH') {
    score += 8 // Service area bonus

    if (permit.city && highValueCities.includes(permit.city)) {
      score += 7 // High-value location bonus
    }
  }

  // Status Progression Scoring (10% weight)
  const statusScores = {
    'new': 10,           // Fresh leads are valuable
    'contacted': 8,      // Good engagement
    'scheduled': 6,      // In process
    'visited': 4,        // Cooling down
    'quoted': 2,         // Waiting for decision
    'closed': -10        // Done, no longer relevant
  }
  score += statusScores[permit.status as keyof typeof statusScores] || 5

  // Permit Recency Scoring (10% weight)
  const permitAge = Math.floor(
    (Date.now() - new Date(permit.created_at).getTime()) / (1000 * 60 * 60 * 24)
  )

  if (permitAge <= 7) {
    score += 10 // Fresh permits (1 week)
  } else if (permitAge <= 30) {
    score += 8  // Recent permits (1 month)
  } else if (permitAge <= 90) {
    score += 5  // Moderately old (3 months)
  } else {
    score += 2  // Old permits still have some value
  }

  // Builder Reputation Scoring (5% weight)
  if (permit.builder_name && permit.builder_name !== 'Unknown Builder') {
    // Known builders are more likely to have ongoing projects
    score += 3

    // High-volume builders (future enhancement: could check historical data)
    const knownHighVolumeBuilders = [
      'Pulte', 'Lennar', 'DR Horton', 'Toll Brothers', 'Ryan Homes'
    ]
    if (knownHighVolumeBuilders.some(builder =>
      permit.builder_name?.toLowerCase().includes(builder.toLowerCase())
    )) {
      score += 2
    }
  }

  // Description Quality Scoring (5% weight)
  if (permit.description && permit.description.length > 20) {
    // Detailed descriptions suggest serious projects
    score += 5

    // Look for high-value keywords
    const highValueKeywords = [
      'addition', 'renovation', 'remodel', 'new construction',
      'energy efficient', 'insulation', 'hvac', 'custom'
    ]
    const descriptionLower = permit.description.toLowerCase()
    const keywordMatches = highValueKeywords.filter(keyword =>
      descriptionLower.includes(keyword)
    ).length

    score += Math.min(keywordMatches * 2, 8) // Max 8 bonus points
  }

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, Math.round(score)))
}

function calculateTemperature(score: number): 'hot' | 'warm' | 'cold' {
  if (score >= 75) return 'hot'   // Top-tier opportunities
  if (score >= 50) return 'warm'  // Good prospects
  return 'cold'                   // Lower priority
}