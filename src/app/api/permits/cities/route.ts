import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/permits/cities?county=Essex
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const county = searchParams.get('county')

    if (!county) {
      return NextResponse.json({ error: 'County parameter required' }, { status: 400 })
    }

    // Query distinct cities for the given county, ordered alphabetically
    const { data, error } = await supabase
      .from('permits')
      .select('city')
      .eq('county', county)
      .not('city', 'is', null)
      .order('city')

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch cities' }, { status: 500 })
    }

    // Extract unique city names and normalize them
    const cities = [...new Set(
      data
        .map((row: { city: string }) => row.city?.trim())
        .filter((city: string | undefined) => city && city.length > 0)
    )].sort()

    return NextResponse.json(cities)

  } catch (error) {
    console.error('Error fetching cities:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
