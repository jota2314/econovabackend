import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ width: string; height: string }> }
) {
  const { width, height } = await params
  
  // Create a simple colored SVG placeholder
  const w = parseInt(width) || 400
  const h = parseInt(height) || 300
  
  const svg = `
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${w}" height="${h}" fill="#f3f4f6"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="16" fill="#6b7280">
        ${w} × ${h}
      </text>
      <text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="12" fill="#9ca3af">
        Placeholder Image
      </text>
    </svg>
  `

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}