// frontend/config/api.ts
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  TIMEOUT: 300000, // 5 minutes for music generation
  ENDPOINTS: {
    GENERATE_MUSIC: '/api/generate-music',
    DOWNLOAD: '/api/download',
    HEALTH: '/api/health',
    MODELS: '/api/models',
    TRAINING: '/api/training',
    EVALUATION: '/api/evaluation'
  }
} as const;

export const WEBSOCKET_CONFIG = {
  URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws',
  RECONNECT_INTERVAL: 3000,
  MAX_RECONNECT_ATTEMPTS: 5
} as const;

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface GenerationResponse {
  session_id: string;
  emotion_alignment: number;
  musical_quality: {
    overall_quality: number;
    pitch_diversity: number;
    rhythm_regularity: number;
    harmonic_consonance: number;
  };
  audio_url: string;
  midi_download_url: string;
  audio_download_url: string;
}

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  uptime: number;
  memory_usage?: {
    used: number;
    total: number;
  };
}