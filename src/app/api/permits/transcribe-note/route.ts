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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const permitId = formData.get('permitId') as string
    const returnTranscription = formData.get('returnTranscription') === 'true'

    if (!audioFile || !permitId) {
      return NextResponse.json(
        { error: 'Audio file and permit ID are required' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    console.log('Processing audio for permit:', permitId)
    console.log('Audio file size:', audioFile.size, 'bytes')

    // Step 1: Transcribe audio using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en', // Let Whisper auto-detect, but we'll handle translation separately
    })

    console.log('Transcription result:', transcription.text)

    // Step 2: Detect language and translate to English if needed
    let finalText = transcription.text

    if (transcription.text.trim()) {
      // Use OpenAI to detect language and translate if needed
      const translationPrompt = `
        Analyze this text and determine if it's in English, Spanish, or Portuguese.
        If it's not in English, translate it to English.
        If it's already in English, return it as-is.

        Text: "${transcription.text}"

        Return only the English text, nothing else.
      `

      const translationResponse = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a translator that converts Spanish and Portuguese text to English. Return only the translated text.'
          },
          {
            role: 'user',
            content: translationPrompt
          }
        ],
        temperature: 0.3,
      })

      finalText = translationResponse.choices[0]?.message?.content?.trim() || transcription.text
      console.log('Final translated text:', finalText)
    }

    // If only returning transcription, don't save to database
    if (returnTranscription) {
      return NextResponse.json({
        success: true,
        transcription: finalText,
        message: 'Audio transcribed successfully'
      })
    }

    // Step 3: Update the permit with the new note
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

    const newNote = `[Voice Note - ${timestamp}]\n${finalText}`
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
      transcription: transcription.text,
      translation: finalText,
      message: 'Voice note added successfully'
    })

  } catch (error) {
    console.error('Error processing audio:', error)
    return NextResponse.json(
      { error: 'Failed to process audio recording' },
      { status: 500 }
    )
  }
}