import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/permits/all-cities - Get all unique cities from permits
export async function GET() {
  try {
    const supabase = await createClient()

    // Query distinct cities from all permits
    const { data, error } = await supabase
      .from('permits')
      .select('city')
      .not('city', 'is', null)
      .order('city')

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch cities' }, { status: 500 })
    }

    // Extract unique city names, normalize them, and sort
    const cities = [...new Set(
      data
        .map((row: { city: string }) => {
          const city = row.city?.trim()
          // Normalize case variations (e.g., "NEWTON" -> "Newton")
          return city ? city.charAt(0).toUpperCase() + city.slice(1).toLowerCase() : null
        })
        .filter((city: string | null) => city && city.length > 0)
    )].sort()

    return NextResponse.json(cities)

  } catch (error) {
    console.error('Error fetching all cities:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
