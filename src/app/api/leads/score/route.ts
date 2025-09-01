import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    const { leadId } = await request.json()

    if (!leadId) {
      return NextResponse.json(
        { success: false, error: 'Lead ID is required' },
        { status: 400 }
      )
    }

    // Calculate lead score using our algorithm
    const score = await calculateLeadScore(leadId, supabase)
    const temperature = calculateTemperature(score)

    // Update the lead with new score and temperature
    const { data, error } = await supabase
      .from('leads')
      .update({ 
        lead_score: score,
        temperature: temperature,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)
      .select()
      .single()

    if (error) {
      console.error('Error updating lead score:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        leadId,
        score,
        temperature,
        updated: data
      }
    })

  } catch (error) {
    console.error('Error in lead score API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  // Bulk update all lead scores
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all leads that need scoring
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, lead_source, status, created_at')
      .not('status', 'in', '(closed_won,closed_lost)')

    if (leadsError) {
      throw new Error(leadsError.message)
    }

    const updates = []
    
    for (const lead of leads || []) {
      const score = await calculateLeadScore(lead.id, supabase)
      const temperature = calculateTemperature(score)
      
      updates.push({
        id: lead.id,
        lead_score: score,
        temperature: temperature,
        updated_at: new Date().toISOString()
      })
    }

    // Batch update all leads
    const { error: updateError } = await supabase
      .from('leads')
      .upsert(updates)

    if (updateError) {
      throw new Error(updateError.message)
    }

    return NextResponse.json({
      success: true,
      data: {
        updated_count: updates.length,
        leads: updates
      }
    })

  } catch (error) {
    console.error('Error in bulk score update:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function calculateLeadScore(leadId: string, supabase: any): Promise<number> {
  let score = 0

  // Get lead data
  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single()

  if (!lead) return 0

  // Base scoring by lead source (higher quality sources get more points)
  const sourceScores = {
    'referral': 30,
    'website': 20,
    'permit': 25,
    'drive_by': 15,
    'csv_import': 10,
    'other': 10
  }
  score += sourceScores[lead.lead_source as keyof typeof sourceScores] || 10

  // Status progression scoring
  const statusScores = {
    'new': 5,
    'contacted': 15,
    'measurement_scheduled': 30,
    'measured': 40,
    'quoted': 50,
    'proposal_sent': 60,
    'closed_won': 100,
    'closed_lost': -50
  }
  score += statusScores[lead.status as keyof typeof statusScores] || 5

  // Communication frequency scoring
  const { count: communicationCount } = await supabase
    .from('communications')
    .select('*', { count: 'exact', head: true })
    .eq('lead_id', leadId)

  score += Math.min((communicationCount || 0) * 5, 25) // Max 25 points for communications

  // Recency scoring (penalize old leads without contact)
  if (lead.last_contact_date) {
    const daysSinceContact = Math.floor(
      (Date.now() - new Date(lead.last_contact_date).getTime()) / (1000 * 60 * 60 * 24)
    )
    
    if (daysSinceContact <= 7) {
      score += 15
    } else if (daysSinceContact <= 14) {
      score += 10
    } else if (daysSinceContact <= 30) {
      score += 5
    } else {
      score -= 10 // Penalize very old leads
    }
  }

  // Geographic scoring (MA/NH preference)
  if (lead.state === 'MA' || lead.state === 'NH') {
    score += 10
  }

  // Company leads might be worth more
  if (lead.company) {
    score += 5
  }

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, score))
}

function calculateTemperature(score: number): 'hot' | 'warm' | 'cold' {
  if (score >= 70) return 'hot'
  if (score >= 50) return 'warm'
  return 'cold'
}
