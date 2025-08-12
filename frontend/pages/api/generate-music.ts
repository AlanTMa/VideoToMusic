import { NextRequest, NextResponse } from 'next/server'

// This is a proxy API route that forwards requests to the Python backend
// In production, you might want to run this logic directly in Node.js or use a microservice

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    // Extract form data
    const video = formData.get('video') as File
    const textDescription = formData.get('text_description') as string
    const valence = formData.get('valence') as string
    const arousal = formData.get('arousal') as string

    // Validate inputs
    if (!video) {
      return NextResponse.json(
        { error: 'No video file provided' },
        { status: 400 }
      )
    }

    if (!video.type.startsWith('video/')) {
      return NextResponse.json(
        { error: 'File must be a video' },
        { status: 400 }
      )
    }

    // Check file size (100MB limit)
    const maxSize = 100 * 1024 * 1024 // 100MB in bytes
    if (video.size > maxSize) {
      return NextResponse.json(
        { error: 'Video file too large. Maximum size is 100MB.' },
        { status: 400 }
      )
    }

    // Forward to Python backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'

    const backendFormData = new FormData()
    backendFormData.append('video', video)
    backendFormData.append('text_description', textDescription || '')
    backendFormData.append('valence', valence || '0.5')
    backendFormData.append('arousal', arousal || '0.5')

    const backendResponse = await fetch(`${backendUrl}/api/generate-music`, {
      method: 'POST',
      body: backendFormData,
      // Don't set Content-Type header, let fetch handle it for FormData
    })

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.error || 'Backend service error' },
        { status: backendResponse.status }
      )
    }

    const result = await backendResponse.json()

    // Transform URLs to be relative to our frontend
    const transformedResult = {
      ...result,
      audio_url: `/api/audio/${result.session_id}`,
      midi_download_url: `/api/download/${result.session_id}/midi`,
      audio_download_url: `/api/download/${result.session_id}/audio`,
    }

    return NextResponse.json(transformedResult)

  } catch (error: any) {
    console.error('API Error:', error)

    if (error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout. Please try with a shorter video.' },
        { status: 408 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    )
  }
}

// Handle GET requests for API documentation
export async function GET() {
  return NextResponse.json({
    name: 'MusicPairer API',
    version: '1.0.0',
    description: 'Generate emotionally-aligned music for videos',
    endpoints: {
      'POST /api/generate-music': {
        description: 'Generate music for uploaded video',
        parameters: {
          video: 'Video file (required)',
          text_description: 'Text description of desired music (optional)',
          valence: 'Emotion valence 0-1 (optional, default: 0.5)',
          arousal: 'Emotion arousal 0-1 (optional, default: 0.5)',
        },
        response: {
          session_id: 'Unique session identifier',
          emotion_alignment: 'Emotion alignment score',
          musical_quality: 'Musical quality metrics',
          audio_url: 'URL to generated audio',
          midi_download_url: 'URL to download MIDI file',
          audio_download_url: 'URL to download audio file',
        }
      }
    },
    limits: {
      max_file_size: '100MB',
      supported_formats: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'],
      timeout: '5 minutes'
    }
  })
}