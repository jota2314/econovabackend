import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Papa from 'papaparse'

interface CsvRow {
  address?: string
  city?: string
  zip_code?: string
  permit_date?: string
  builder_name?: string
  builder_phone?: string
  permit_type?: string
  project_value?: string
  description?: string
}

interface ImportResult {
  success: boolean
  message: string
  imported: number
  errors: string[]
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 })
    }

    // Read and parse CSV
    const csvText = await file.text()
    const parseResult = Papa.parse<CsvRow>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toLowerCase().trim().replace(/\s+/g, '_')
    })

    if (parseResult.errors.length > 0) {
      return NextResponse.json({
        error: 'CSV parsing failed',
        details: parseResult.errors.map(e => e.message)
      }, { status: 400 })
    }

    const rows = parseResult.data
    const errors: string[] = []
    const permits: any[] = []

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2 // Account for header row

      // Skip empty rows
      if (!row.address || Object.values(row).every(val => !val)) {
        continue
      }

      // Validate required fields
      if (!row.address?.trim()) {
        errors.push(`Row ${rowNum}: Address is required`)
        continue
      }

      // Clean and validate data
      const permitData = {
        address: row.address.trim(),
        city: row.city?.trim() || null,
        state: 'MA', // Default to MA
        zip_code: row.zip_code?.trim() || null,
        builder_name: row.builder_name?.trim() || 'Unknown Builder',
        builder_phone: row.builder_phone?.trim() || null,
        permit_type: validatePermitType(row.permit_type),
        notes: row.permit_date ? `Permit Date: ${row.permit_date}` : null,
        project_value: parseProjectValue(row.project_value),
        description: row.description?.trim() || null,
        status: 'new',
        created_by: user.id,
        // Will geocode coordinates later via API
        latitude: 0,
        longitude: 0
      }

      permits.push(permitData)
    }

    if (permits.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No valid permits found in CSV',
        imported: 0,
        errors
      })
    }

    // Batch insert permits
    const { data: insertedPermits, error: insertError } = await supabase
      .from('permits')
      .insert(permits)
      .select()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({
        success: false,
        message: 'Failed to import permits: ' + insertError.message,
        imported: 0,
        errors
      })
    }

    // Geocode addresses and score permits in background (don't wait)
    geocodePermitsInBackground(insertedPermits || [])
    scorePermitsInBackground(insertedPermits || [])

    const result: ImportResult = {
      success: true,
      message: `Successfully imported ${permits.length} permits`,
      imported: permits.length,
      errors
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('CSV import error:', error)
    return NextResponse.json({
      error: 'Import failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function validatePermitType(type?: string): 'residential' | 'commercial' {
  if (!type) return 'residential'
  const cleaned = type.toLowerCase().trim()
  if (cleaned.includes('commercial') || cleaned.includes('comm')) {
    return 'commercial'
  }
  return 'residential'
}

function parseProjectValue(value?: string): number | null {
  if (!value) return null

  // Remove currency symbols, commas, and spaces
  const cleaned = value.toString().replace(/[$,\s]/g, '')

  // Try to parse as number
  const parsed = parseFloat(cleaned)

  // Return valid positive numbers only
  return !isNaN(parsed) && parsed >= 0 ? parsed : null
}

async function geocodePermitsInBackground(permits: any[]) {
  // This runs in background - don't await
  try {
    // Use relative URL or construct proper URL
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3002'

    for (const permit of permits) {
      if (permit.address) {
        try {
          // Call geocoding API to update coordinates
          const response = await fetch(`${baseUrl}/api/permits/${permit.id}/geocode`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          })

          if (!response.ok) {
            console.log(`Geocoding failed for ${permit.address}: HTTP ${response.status}`)
          } else {
            const result = await response.json()
            console.log(`Geocoded ${permit.address}:`, result.latitude, result.longitude)
          }
        } catch (err) {
          console.log('Geocoding failed for', permit.address, err instanceof Error ? err.message : 'Unknown error')
        }

        // Add small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
  } catch (error) {
    console.log('Background geocoding error:', error)
  }
}

async function scorePermitsInBackground(permits: any[]) {
  // This runs in background - don't await
  try {
    // Use relative URL or construct proper URL
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3002'

    for (const permit of permits) {
      try {
        // Call permit scoring API to calculate and update score
        const response = await fetch(`${baseUrl}/api/permits/score`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ permitId: permit.id })
        })

        if (!response.ok) {
          console.log(`Permit scoring failed for ${permit.address}: HTTP ${response.status}`)
        } else {
          const result = await response.json()
          console.log(`Scored permit ${permit.address}:`, result.data.score, result.data.temperature)
        }
      } catch (err) {
        console.log('Permit scoring failed for', permit.address, err instanceof Error ? err.message : 'Unknown error')
      }

      // Add small delay to avoid overloading the system
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  } catch (error) {
    console.log('Background permit scoring error:', error)
  }
}