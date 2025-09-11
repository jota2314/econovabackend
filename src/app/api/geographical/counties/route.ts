import { NextResponse } from 'next/server'

// Massachusetts and New Hampshire geographical data
const GEOGRAPHICAL_DATA = {
  MA: {
    name: 'Massachusetts',
    counties: [
      'Barnstable', 'Berkshire', 'Bristol', 'Dukes', 'Essex', 'Franklin',
      'Hampden', 'Hampshire', 'Middlesex', 'Nantucket', 'Norfolk', 'Plymouth',
      'Suffolk', 'Worcester'
    ]
  },
  NH: {
    name: 'New Hampshire',
    counties: [
      'Belknap', 'Carroll', 'Cheshire', 'Coos', 'Grafton', 'Hillsborough',
      'Merrimack', 'Rockingham', 'Strafford', 'Sullivan'
    ]
  }
}

// GET /api/geographical/counties - Get all counties by state
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const state = searchParams.get('state')

    if (state && ['MA', 'NH'].includes(state)) {
      const stateData = GEOGRAPHICAL_DATA[state as 'MA' | 'NH']
      return NextResponse.json({
        state: state,
        name: stateData.name,
        counties: stateData.counties.sort()
      })
    }

    // Return all states and counties
    const allData = Object.entries(GEOGRAPHICAL_DATA).map(([code, data]) => ({
      state: code,
      name: data.name,
      counties: data.counties.sort()
    }))

    return NextResponse.json(allData)
  } catch (error) {
    console.error('Error fetching geographical data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch geographical data' },
      { status: 500 }
    )
  }
}