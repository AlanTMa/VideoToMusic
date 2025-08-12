import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string; fileType: string } }
) {
  try {
    const { sessionId, fileType } = params

    // Validate parameters
    if (!sessionId || !fileType) {
      return NextResponse.json(
        { error: 'Missing session ID or file type' },
        { status: 400 }
      )
    }

    if (!['midi', 'audio'].includes(fileType)) {
      return NextResponse.json(
        { error: 'Invalid file type. Must be "midi" or "audio"' },
        { status: 400 }
      )
    }

    // Forward to Python backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'

    const backendResponse = await fetch(
      `${backendUrl}/api/download/${sessionId}/${fileType}`,
      {
        method: 'GET',
      }
    )

    if (!backendResponse.ok) {
      if (backendResponse.status === 404) {
        return NextResponse.json(
          { error: 'File not found or session expired' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: 'Error retrieving file from backend' },
        { status: backendResponse.status }
      )
    }

    // Get the file data
    const fileData = await backendResponse.arrayBuffer()
    const contentType = backendResponse.headers.get('content-type') || 'application/octet-stream'

    // Determine filename and content type
    let filename: string
    let mimeType: string

    if (fileType === 'midi') {
      filename = `musicpairer_${sessionId}.mid`
      mimeType = 'audio/midi'
    } else {
      filename = `musicpairer_${sessionId}.wav`
      mimeType = 'audio/wav'
    }

    // Return the file with proper headers
    return new NextResponse(fileData, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileData.byteLength.toString(),
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
      },
    })

  } catch (error: any) {
    console.error('Download API Error:', error)

    return NextResponse.json(
      { error: 'Internal server error while downloading file' },
      { status: 500 }
    )
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}