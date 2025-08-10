# SilentVideoSynth API Documentation

## Overview

SilentVideoSynth provides a RESTful API for generating emotionally-aligned music from video content. The API supports video upload, feature extraction, emotion encoding, music generation, and audio synthesis.

## Base URL

```
Development: http://localhost:8000
Production: https://api.silentvideosynth.com
```

## Authentication

Currently, no authentication is required for the API endpoints.

## Rate Limiting

- **Music Generation**: 5 requests per minute per IP
- **File Downloads**: 100 requests per minute per IP
- **Health Checks**: No limit

## Endpoints

### 1. Generate Music

Generate music for an uploaded video with optional text description and emotion parameters.

**Endpoint:** `POST /api/generate-music`

**Content-Type:** `multipart/form-data`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `video` | File | Yes | Video file (MP4, AVI, MOV, WMV, WebM, MKV) |
| `text_description` | String | No | Text description of desired music mood |
| `valence` | Float | No | Emotion valence (0.0-1.0, default: 0.5) |
| `arousal` | Float | No | Emotion arousal (0.0-1.0, default: 0.5) |
| `genre` | String | No | Musical genre preference |
| `tempo` | Integer | No | Tempo in BPM (60-180, default: 120) |
| `duration` | Integer | No | Generated music duration in seconds |

**Request Example:**

```bash
curl -X POST "http://localhost:8000/api/generate-music" \
  -F "video=@example.mp4" \
  -F "text_description=Upbeat electronic music" \
  -F "valence=0.8" \
  -F "arousal=0.7"
```

**Response:**

```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "emotion_alignment": 0.85,
  "musical_quality": {
    "overall_quality": 0.78,
    "pitch_diversity": 0.82,
    "rhythm_regularity": 0.76,
    "harmonic_consonance": 0.73
  },
  "audio_url": "/api/download/550e8400-e29b-41d4-a716-446655440000/audio",
  "midi_download_url": "/api/download/550e8400-e29b-41d4-a716-446655440000/midi",
  "audio_download_url": "/api/download/550e8400-e29b-41d4-a716-446655440000/audio"
}
```

### 2. Download Generated Files

Download MIDI or audio files from a generation session.

**Endpoint:** `GET /api/download/{session_id}/{file_type}`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `session_id` | String | Yes | Session ID from generation response |
| `file_type` | String | Yes | File type: "midi" or "audio" |

**Request Example:**

```bash
curl -O "http://localhost:8000/api/download/550e8400-e29b-41d4-a716-446655440000/audio"
```

**Response:** Binary file download

### 3. Health Check

Check the health status of the API and AI model.

**Endpoint:** `GET /api/health`

**Response:**

```json
{
  "status": "healthy",
  "model_loaded": true,
  "uptime": 3600,
  "memory_usage": {
    "used": 2048,
    "total": 8192
  }
}
```

### 4. Model Information

Get information about available models and their capabilities.

**Endpoint:** `GET /api/models`

**Response:**

```json
{
  "available_models": [
    {
      "name": "SilentVideoSynth-v1",
      "version": "1.0.0",
      "description": "Hybrid Transformer-LSTM model for video-to-music generation",
      "capabilities": [
        "emotion_encoding",
        "chord_progression",
        "expressive_notes",
        "multi_instrument"
      ],
      "max_video_duration": 300,
      "supported_formats": ["mp4", "avi", "mov", "wmv", "webm", "mkv"]
    }
  ],
  "current_model": "SilentVideoSynth-v1"
}
```

### 5. Training Status (Admin)

Get training status and metrics for model development.

**Endpoint:** `GET /api/training/status`

**Response:**

```json
{
  "is_training": false,
  "current_epoch": 45,
  "total_epochs": 50,
  "train_loss": 0.023,
  "val_loss": 0.031,
  "best_val_loss": 0.028,
  "metrics": {
    "chord_accuracy": 0.87,
    "emotion_alignment": 0.82
  }
}
```

### 6. Start Training (Admin)

Start model training with specified parameters.

**Endpoint:** `POST /api/training/start`

**Request Body:**

```json
{
  "dataset_path": "/data/training",
  "epochs": 50,
  "batch_size": 16,
  "learning_rate": 0.0001,
  "model_config": {
    "feature_dim": 512,
    "num_heads": 8,
    "num_layers": 6
  }
}
```

## WebSocket API

For real-time updates during music generation, connect to the WebSocket endpoint.

**Endpoint:** `ws://localhost:8000/ws`

**Events:**

### Client → Server

```json
{
  "type": "subscribe",
  "session_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Server → Client

```json
{
  "type": "generation_progress",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "stage": "extracting_features",
  "progress": 0.3,
  "message": "Extracting video features..."
}
```

**Event Types:**

- `generation_start`: Generation process started
- `generation_progress`: Progress update with current stage
- `generation_complete`: Generation finished successfully
- `generation_error`: Error occurred during generation

## Error Handling

### HTTP Status Codes

- `200`: Success
- `400`: Bad Request (invalid parameters)
- `404`: Not Found (session or file not found)
- `413`: Payload Too Large (video file too big)
- `422`: Unprocessable Entity (invalid video format)
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error
- `503`: Service Unavailable (model not loaded)

### Error Response Format

```json
{
  "error": "File size exceeds maximum limit",
  "error_code": "FILE_TOO_LARGE",
  "details": {
    "max_size": 104857600,
    "received_size": 209715200
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## File Size Limits

- **Video Files**: Maximum 100MB
- **Video Duration**: Maximum 5 minutes
- **Supported Formats**: MP4, AVI, MOV, WMV, WebM, MKV

## Generation Process Stages

1. **uploading**: Video file upload in progress
2. **extracting_features**: Extracting semantic, emotion, motion, and scene features
3. **encoding_emotions**: Processing emotions with Russell's Circumplex Model
4. **generating_music**: Creating chord progressions and note sequences
5. **synthesizing_audio**: Converting MIDI to audio format
6. **completed**: Generation finished successfully

## Examples

### Python Client Example

```python
import requests
import json

# Upload video and generate music
with open('video.mp4', 'rb') as f:
    files = {'video': f}
    data = {
        'text_description': 'Happy upbeat music',
        'valence': 0.8,
        'arousal': 0.7
    }

    response = requests.post(
        'http://localhost:8000/api/generate-music',
        files=files,
        data=data
    )

    result = response.json()
    session_id = result['session_id']

# Download generated audio
audio_response = requests.get(
    f'http://localhost:8000/api/download/{session_id}/audio'
)

with open('generated_music.wav', 'wb') as f:
    f.write(audio_response.content)
```

### JavaScript Client Example

```javascript
const formData = new FormData();
formData.append('video', videoFile);
formData.append('text_description', 'Relaxing ambient music');
formData.append('valence', '0.6');
formData.append('arousal', '0.3');

try {
  const response = await fetch('http://localhost:8000/api/generate-music', {
    method: 'POST',
    body: formData
  });

  const result = await response.json();
  console.log('Generation completed:', result);

  // Download audio
  const audioUrl = `http://localhost:8000${result.audio_url}`;
  const audioElement = document.createElement('audio');
  audioElement.src = audioUrl;
  audioElement.controls = true;
  document.body.appendChild(audioElement);

} catch (error) {
  console.error('Generation failed:', error);
}
```

## SDK and Libraries

Official SDKs are available for:

- **Python**: `pip install silentvideosynth-python`
- **JavaScript/Node.js**: `npm install silentvideosynth-js`
- **React Hooks**: Included in the frontend application

## Changelog

### v1.0.0 (Current)
- Initial API release
- Basic video-to-music generation
- Russell's Circumplex emotion encoding
- MIDI and audio output
- WebSocket real-time updates