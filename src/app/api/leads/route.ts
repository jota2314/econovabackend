import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Starting leads API query...')
    
    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('❌ Database error fetching leads:', error)
      
      // Handle specific database errors
      if (error.message?.includes('relation "leads" does not exist')) {
        console.warn('⚠️ Leads table does not exist, returning empty array')
        return NextResponse.json({ 
          success: true,
          data: [],
          message: 'Leads table not initialized'
        })
      }
      
      return NextResponse.json({ 
        success: false,
        error: error.message,
        data: []
      }, { status: 500 })
    }
    
    console.log(`✅ Successfully fetched ${leads?.length || 0} leads from API`)
    return NextResponse.json({ 
      success: true,
      data: leads || [],
      message: `Found ${leads?.length || 0} leads`
    })
    
  } catch (error) {
    console.error('💥 API error in leads route:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      data: []
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const leadData = await request.json()
    
    console.log('📥 API received lead data:', leadData)
    
    const { data: lead, error } = await supabase
      .from('leads')
      .insert([leadData])
      .select()
      .single()
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ lead })
    
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
