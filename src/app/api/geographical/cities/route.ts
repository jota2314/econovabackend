import { NextResponse } from 'next/server'

// Major cities/towns by county
const CITIES_BY_COUNTY: Record<string, string[]> = {
  // Massachusetts
  'Middlesex': [
    'Cambridge', 'Lowell', 'Newton', 'Somerville', 'Framingham', 'Malden', 
    'Medford', 'Waltham', 'Arlington', 'Belmont', 'Watertown', 'Lexington',
    'Burlington', 'Woburn', 'Melrose', 'Stoneham', 'Winchester', 'Reading'
  ],
  'Worcester': [
    'Worcester', 'Fitchburg', 'Leominster', 'Milford', 'Shrewsbury', 'Westborough',
    'Marlborough', 'Gardner', 'Clinton', 'Grafton', 'Northborough', 'Southborough',
    'Hudson', 'Holden', 'Auburn', 'Oxford'
  ],
  'Essex': [
    'Lynn', 'Lawrence', 'Haverhill', 'Peabody', 'Salem', 'Methuen', 'Beverly',
    'Gloucester', 'Danvers', 'Andover', 'North Andover', 'Newburyport', 
    'Amesbury', 'Marblehead', 'Saugus', 'Swampscott'
  ],
  'Norfolk': [
    'Quincy', 'Brookline', 'Weymouth', 'Braintree', 'Franklin', 'Needham',
    'Wellesley', 'Dedham', 'Milton', 'Randolph', 'Stoughton', 'Canton',
    'Norwood', 'Westwood', 'Sharon', 'Walpole'
  ],
  'Plymouth': [
    'Plymouth', 'Brockton', 'Taunton', 'Bridgewater', 'Marshfield', 'Hanover',
    'Whitman', 'Abington', 'East Bridgewater', 'West Bridgewater', 'Rockland',
    'Norwell', 'Scituate', 'Hingham', 'Hull', 'Cohasset'
  ],
  'Bristol': [
    'New Bedford', 'Fall River', 'Attleboro', 'Taunton', 'Mansfield',
    'North Attleborough', 'Dartmouth', 'Fairhaven', 'Somerset', 'Swansea',
    'Seekonk', 'Rehoboth', 'Dighton', 'Berkley', 'Freetown', 'Westport'
  ],
  'Suffolk': [
    'Boston', 'Revere', 'Chelsea', 'Winthrop'
  ],
  'Hampden': [
    'Springfield', 'Chicopee', 'Westfield', 'Holyoke', 'Agawam',
    'West Springfield', 'Ludlow', 'East Longmeadow', 'Longmeadow',
    'Wilbraham', 'Palmer', 'Monson', 'Hampden', 'Southwick'
  ],
  'Hampshire': [
    'Northampton', 'Amherst', 'Easthampton', 'South Hadley', 'Hadley',
    'Belchertown', 'Granby', 'Ware', 'Southampton', 'Westfield'
  ],
  'Berkshire': [
    'Pittsfield', 'North Adams', 'Lenox', 'Great Barrington', 'Adams',
    'Williamstown', 'Lee', 'Stockbridge', 'Sheffield', 'West Stockbridge'
  ],
  'Franklin': [
    'Greenfield', 'Orange', 'Montague', 'Shelburne Falls', 'Athol',
    'Turners Falls', 'Deerfield', 'Shelburne', 'Buckland', 'Charlemont'
  ],
  'Barnstable': [
    'Barnstable', 'Hyannis', 'Falmouth', 'Sandwich', 'Dennis', 'Yarmouth',
    'Brewster', 'Orleans', 'Eastham', 'Wellfleet', 'Truro', 'Provincetown',
    'Chatham', 'Harwich', 'Mashpee', 'Bourne'
  ],
  'Dukes': [
    'Vineyard Haven', 'Oak Bluffs', 'Edgartown', 'West Tisbury', 
    'Chilmark', 'Aquinnah'
  ],
  'Nantucket': [
    'Nantucket'
  ],

  // New Hampshire
  'Hillsborough': [
    'Manchester', 'Nashua', 'Merrimack', 'Bedford', 'Goffstown', 'Hudson',
    'Milford', 'Amherst', 'Hollis', 'Litchfield', 'Pelham', 'Derry',
    'Salem', 'Windham', 'New Boston', 'Mont Vernon'
  ],
  'Rockingham': [
    'Derry', 'Salem', 'Portsmouth', 'Londonderry', 'Windham', 'Exeter',
    'Hampton', 'Seabrook', 'Plaistow', 'Atkinson', 'Sandown', 'Danville',
    'Fremont', 'Brentwood', 'Kingston', 'East Kingston'
  ],
  'Merrimack': [
    'Concord', 'Franklin', 'Hopkinton', 'Bow', 'Hooksett', 'Henniker',
    'Warner', 'Contoocook', 'Penacook', 'Pittsfield', 'Epsom', 'Chichester'
  ],
  'Strafford': [
    'Dover', 'Rochester', 'Somersworth', 'Durham', 'Farmington',
    'Barrington', 'Lee', 'Madbury', 'Rollinsford', 'Milton', 'New Durham'
  ],
  'Cheshire': [
    'Keene', 'Jaffrey', 'Peterborough', 'Swanzey', 'Hinsdale', 'Winchester',
    'Troy', 'Fitzwilliam', 'Rindge', 'Dublin', 'Marlborough', 'Richmond'
  ],
  'Grafton': [
    'Lebanon', 'Hanover', 'Littleton', 'Plymouth', 'Bristol', 'Claremont',
    'Newport', 'Enfield', 'Canaan', 'Franconia', 'Lincoln', 'North Haverhill'
  ],
  'Belknap': [
    'Laconia', 'Gilford', 'Belmont', 'Tilton', 'Franklin', 'Meredith',
    'Alton', 'New Hampton', 'Sanbornton', 'Barnstead'
  ],
  'Carroll': [
    'Conway', 'Wolfeboro', 'Ossipee', 'North Conway', 'Jackson', 'Bartlett',
    'Madison', 'Freedom', 'Effingham', 'Wakefield', 'Brookfield', 'Eaton'
  ],
  'Sullivan': [
    'Claremont', 'Newport', 'Charlestown', 'Sunapee', 'New London',
    'Grantham', 'Springfield', 'Goshen', 'Lempster', 'Washington'
  ],
  'Coos': [
    'Berlin', 'Gorham', 'Lancaster', 'Whitefield', 'Littleton', 'Bethlehem',
    'Jefferson', 'Randolph', 'Milan', 'Stark', 'Northumberland', 'Groveton'
  ]
}

// GET /api/geographical/cities - Get cities by county
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const county = searchParams.get('county')

    if (!county) {
      return NextResponse.json(
        { error: 'County parameter is required' },
        { status: 400 }
      )
    }

    const cities = CITIES_BY_COUNTY[county]
    
    if (!cities) {
      return NextResponse.json(
        { error: `County '${county}' not found` },
        { status: 404 }
      )
    }

    return NextResponse.json({
      county,
      cities: cities.sort()
    })
  } catch (error) {
    console.error('Error fetching cities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cities' },
      { status: 500 }
    )
  }
}