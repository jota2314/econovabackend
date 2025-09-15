import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { permitId, note } = await request.json()

    if (!permitId || !note) {
      return NextResponse.json(
        { error: 'Permit ID and note are required' },
        { status: 400 }
      )
    }

    // First, get the current notes
    const { data: currentPermit, error: fetchError } = await supabase
      .from('permits')
      .select('notes')
      .eq('id', permitId)
      .single()

    if (fetchError) {
      console.error('Error fetching permit:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch permit' },
        { status: 500 }
      )
    }

    // Append the new note with timestamp
    const timestamp = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    const newNote = `[Voice Note - ${timestamp}]\n${note}`
    const updatedNotes = currentPermit.notes
      ? `${currentPermit.notes}\n\n${newNote}`
      : newNote

    // Update the permit
    const { error: updateError } = await supabase
      .from('permits')
      .update({ notes: updatedNotes })
      .eq('id', permitId)

    if (updateError) {
      console.error('Error updating permit:', updateError)
      return NextResponse.json(
        { error: 'Failed to update permit notes' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Note saved successfully',
      updatedNotes
    })

  } catch (error) {
    console.error('Error saving note:', error)
    return NextResponse.json(
      { error: 'Failed to save note' },
      { status: 500 }
    )
  }
}