import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: pricingData, error } = await supabase
      .from('pricing_catalog')
      .select('*')
      .order('service_type', { ascending: true })
      .order('item_name', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch pricing catalog: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      data: pricingData || []
    })
  } catch (error) {
    console.error('Error fetching pricing catalog:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pricing catalog' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { service_type, description, item_name, unit, base_price, markup_percentage, notes } = body

    // Validate required fields
    if (!service_type || !item_name || !unit || base_price === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('pricing_catalog')
      .insert({
        service_type,
        description,
        item_name,
        unit,
        base_price,
        markup_percentage: markup_percentage || 0,
        notes
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create pricing item: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('Error creating pricing item:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create pricing item' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { id, service_type, description, item_name, unit, base_price, markup_percentage, notes } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required for updates' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('pricing_catalog')
      .update({
        service_type,
        description,
        item_name,
        unit,
        base_price,
        markup_percentage: markup_percentage || 0,
        notes
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update pricing item: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('Error updating pricing item:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update pricing item' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required for deletion' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('pricing_catalog')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete pricing item: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Pricing item deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting pricing item:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete pricing item' },
      { status: 500 }
    )
  }
}
