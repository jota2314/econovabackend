import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    console.log('API called: /api/permits/recommendations')

    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured')
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    console.log('Environment variables check passed')

    // Get location filtering parameters
    const { searchParams } = new URL(request.url)
    const citiesParam = searchParams.get('cities')
    const cities = citiesParam ? citiesParam.split(',').map(c => c.trim()) : null

    // Build the query with location filtering and exclude rejected permits
    let query = supabase
      .from('permits')
      .select(`
        id,
        address,
        city,
        state,
        zip_code,
        builder_name,
        builder_phone,
        permit_type,
        status,
        notes,
        latitude,
        longitude,
        created_at
      `)
      .not('status', 'eq', 'rejected')

    // Apply city filtering if provided
    if (cities && cities.length > 0) {
      console.log('Applying city filter for cities:', cities)
      query = query.in('city', cities)
    } else {
      console.log('No city filter applied')
    }

    console.log('Executing Supabase query...')
    const { data: permits, error: fetchError } = await query.order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Error fetching permits:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch permits', details: fetchError.message },
        { status: 500 }
      )
    }

    console.log('Fetched permits count:', permits?.length || 0)

    if (!permits || permits.length === 0) {
      console.log('No permits found - returning empty recommendations')
      return NextResponse.json({
        success: true,
        recommendations: [],
        message: 'No permits available for analysis'
      })
    }

    // Prepare data for AI analysis
    const permitData = permits.map(permit => ({
      id: permit.id,
      address: permit.address,
      city: permit.city,
      builderName: permit.builder_name,
      permitType: permit.permit_type,
      status: permit.status,
      notes: permit.notes || 'No notes available',
      daysOld: Math.floor((Date.now() - new Date(permit.created_at).getTime()) / (1000 * 60 * 60 * 24)),
      hasPhone: !!permit.builder_phone
    }))

    // Create AI prompt for recommendations
    const analysisPrompt = `
    You are an expert sales strategist analyzing building permits for lead generation.
    Your goal is to recommend which properties to visit today based on multiple factors.

    Here's the permit data to analyze:
    ${JSON.stringify(permitData, null, 2)}

    Please analyze each permit and provide visit recommendations based on these criteria:

    HIGH PRIORITY FACTORS:
    - Status: "new" permits get highest priority, "hot" are very important
    - Recency: Newer permits (0-7 days) are more valuable
    - Builder activity: Multiple permits from same builder indicates active construction
    - Notes: Positive notes or interest indicators boost priority
    - Contact availability: Having phone numbers is beneficial

    MEDIUM PRIORITY:
    - Permit type: Residential usually better than commercial for certain markets
    - Geographic clustering: Properties close to each other for efficient routes

    LOW PRIORITY:
    - Avoid: "rejected", "cold", or "converted_to_lead" statuses unless special circumstances

    Return a JSON response with:
    {
      "recommendedVisits": [
        {
          "permitId": "string",
          "priority": "high|medium|low",
          "score": number (1-100),
          "reasons": ["reason1", "reason2"],
          "recommendedAction": "string",
          "timeOfDay": "morning|afternoon|evening"
        }
      ],
      "summary": {
        "totalAnalyzed": number,
        "highPriority": number,
        "mediumPriority": number,
        "lowPriority": number,
        "dailyGoal": "string recommendation for today"
      }
    }

    Focus on the top 20 highest scoring permits for today's visits.
    Consider geographic efficiency and realistic daily capacity.
    `

    console.log('Calling OpenAI with', permitData.length, 'permits')
    console.log('Sample permit data:', JSON.stringify(permitData[0], null, 2))

    let recommendations;

    try {
      // Try OpenAI API with extended timeout for thorough analysis
      const completion = await Promise.race([
        openai.chat.completions.create({
          model: 'gpt-4o',  // Using GPT-4o for better analysis of notes
          messages: [
            {
              role: 'system',
              content: 'You are an expert sales strategist for construction/renovation leads. Analyze ALL permit data including notes to recommend the best properties to visit today. Pay special attention to notes that indicate interest, urgency, or opportunities.'
            },
            {
              role: 'user',
              content: `Analyze ALL ${permitData.length} permits and recommend top 20 visits.

CRITICAL: Read every single note carefully! Notes contain vital information about:
- Customer interest level
- Previous conversations
- Follow-up timing
- Special circumstances
- Voice notes from field visits

SCORING SYSTEM (be consistent):
- 90-100: Urgent voice notes, callbacks requested, immediate interest
- 80-89: Hot leads, active interest, scheduled follow-ups
- 70-79: New permits, recent activity, good potential
- 60-69: Standard leads, basic follow-up needed
- 50-59: Low priority, cold leads

HIGH PRIORITY INDICATORS (score 85+):
- Voice notes indicating urgency or callbacks
- Status: "hot" leads with active interest
- Notes mentioning specific dates or immediate needs
- Client requested estimates or follow-ups

MEDIUM PRIORITY (score 70-84):
- Status: "new" permits (good potential)
- Recent permits (0-7 days old)
- Active builders with multiple projects
- Notes showing some interest

ANALYZE THESE NOTES CAREFULLY:
${JSON.stringify(permitData, null, 2)}

Return JSON format - BE CONSISTENT WITH SCORING:
{
  "recommendedVisits": [
    {
      "permitId": "string",
      "priority": "high|medium|low",
      "score": number (1-100 - BE CONSISTENT),
      "reasons": ["specific reason based on notes", "status analysis", "timing factors"],
      "recommendedAction": "specific action based on notes analysis",
      "timeOfDay": "morning|afternoon|evening"
    }
  ],
  "summary": {
    "totalAnalyzed": ${permitData.length},
    "highPriority": number,
    "mediumPriority": number,
    "lowPriority": number,
    "dailyGoal": "specific strategy based on notes analysis"
  }
}`
            }
          ],
          temperature: 0.2,
          response_format: { type: "json_object" }
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('OpenAI timeout')), 45000))
      ]);

      console.log('OpenAI response received')
      const aiResponse = (completion as any).choices?.[0]?.message?.content

      if (!aiResponse) {
        throw new Error('No response from AI analysis')
      }

      recommendations = JSON.parse(aiResponse)

      // Post-process to ensure consistent priority assignments based on scores
      if (recommendations.recommendedVisits) {
        recommendations.recommendedVisits = recommendations.recommendedVisits.map((rec: any) => ({
          ...rec,
          priority: rec.score >= 85 ? 'high' : rec.score >= 70 ? 'medium' : 'low'
        }))

        // Update summary to match the actual priorities
        const highPriorityCount = recommendations.recommendedVisits.filter((r: any) => r.priority === 'high').length
        const mediumPriorityCount = recommendations.recommendedVisits.filter((r: any) => r.priority === 'medium').length
        const lowPriorityCount = recommendations.recommendedVisits.filter((r: any) => r.priority === 'low').length

        recommendations.summary = {
          ...recommendations.summary,
          highPriority: highPriorityCount,
          mediumPriority: mediumPriorityCount,
          lowPriority: lowPriorityCount
        }
      }
    } catch (aiError) {
      console.error('OpenAI API failed, using fallback logic:', aiError)

      // Fallback: Simple rule-based recommendations
      const fallbackRecommendations = permitData
        .map(permit => ({
          permitId: permit.id,
          priority: permit.status === 'new' ? 'high' : permit.status === 'hot' ? 'high' : 'medium',
          score: permit.status === 'new' ? 90 : permit.status === 'hot' ? 85 : permit.hasPhone ? 75 : 60,
          reasons: [
            permit.status === 'new' && 'New permit - high priority',
            permit.status === 'hot' && 'Hot lead',
            permit.hasPhone && 'Phone number available',
            permit.daysOld <= 7 && 'Recent permit',
            permit.notes?.length > 10 && 'Has detailed notes'
          ].filter(Boolean),
          recommendedAction: permit.status === 'new' ? 'Visit immediately - new opportunity' : 'Schedule follow-up visit',
          timeOfDay: permit.status === 'new' ? 'morning' : 'afternoon'
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 20)

      recommendations = {
        recommendedVisits: fallbackRecommendations,
        summary: {
          totalAnalyzed: permitData.length,
          highPriority: fallbackRecommendations.filter(r => r.priority === 'high').length,
          mediumPriority: fallbackRecommendations.filter(r => r.priority === 'medium').length,
          lowPriority: fallbackRecommendations.filter(r => r.priority === 'low').length,
          dailyGoal: `Focus on ${fallbackRecommendations.filter(r => r.priority === 'high').length} high-priority permits today`
        }
      }
    }

    // Enrich recommendations with full permit data
    const enrichedRecommendations = recommendations.recommendedVisits.map((rec: any) => {
      const permit = permits.find(p => p.id === rec.permitId)
      return {
        ...rec,
        permit: permit ? {
          id: permit.id,
          address: permit.address,
          city: permit.city,
          state: permit.state,
          zip_code: permit.zip_code,
          builder_name: permit.builder_name,
          builder_phone: permit.builder_phone,
          permit_type: permit.permit_type,
          status: permit.status,
          notes: permit.notes,
          latitude: permit.latitude,
          longitude: permit.longitude
        } : null
      }
    }).filter((rec: any) => rec.permit !== null)

    return NextResponse.json({
      success: true,
      recommendations: enrichedRecommendations,
      summary: recommendations.summary,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error generating recommendations:', error)

    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Detailed error:', errorMessage)

    return NextResponse.json(
      {
        error: 'Failed to generate visit recommendations',
        details: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}