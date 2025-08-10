// utils/api.ts

import axios, { AxiosProgressEvent, AxiosResponse } from 'axios';
import {
  ApiResponse,
  MusicGenerationRequest,
  GenerationResult,
  TrainingProgress,
  ModelInfo,
  EvaluationMetrics,
  VisualizationData,
  UploadProgress,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes for video processing
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// API Functions

/**
 * Health check endpoint
 */
export const healthCheck = async (): Promise<ApiResponse> => {
  try {
    const response = await apiClient.get('/api/health');
    return { success: true, data: response.data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Generate music from video and parameters
 */
export const generateMusic = async (
  request: MusicGenerationRequest,
  onProgress?: (progress: UploadProgress) => void
): Promise<ApiResponse<GenerationResult>> => {
  try {
    const formData = new FormData();
    formData.append('video', request.video_file);
    formData.append('text_description', request.text_description);
    formData.append('valence', request.emotion_params.valence.toString());
    formData.append('arousal', request.emotion_params.arousal.toString());
    formData.append('generation_params', JSON.stringify(request.generation_params));

    const response = await apiClient.post('/api/generate-music', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress: UploadProgress = {
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
          };
          onProgress(progress);
        }
      },
    });

    return { success: true, data: response.data };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.detail || error.message
    };
  }
};

/**
 * Generate music with real-time streaming
 */
export const generateMusicRealTime = async (
  request: MusicGenerationRequest,
  onChunk?: (chunk: any) => void
): Promise<ApiResponse<GenerationResult>> => {
  try {
    const formData = new FormData();
    formData.append('video', request.video_file);
    formData.append('text_description', request.text_description);
    formData.append('valence', request.emotion_params.valence.toString());
    formData.append('arousal', request.emotion_params.arousal.toString());
    formData.append('generation_params', JSON.stringify({
      ...request.generation_params,
      real_time: true,
    }));

    const response = await apiClient.post('/api/generate-music-stream', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      responseType: 'stream',
    });

    // Handle streaming response
    if (onChunk) {
      response.data.on('data', (chunk: any) => {
        try {
          const data = JSON.parse(chunk.toString());
          onChunk(data);
        } catch (e) {
          // Handle non-JSON chunks
        }
      });
    }

    return { success: true, data: response.data };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.detail || error.message
    };
  }
};

/**
 * Generate multi-instrument music
 */
export const generateMultiInstrumentMusic = async (
  request: MusicGenerationRequest & { instruments: string[] }
): Promise<ApiResponse<GenerationResult>> => {
  try {
    const formData = new FormData();
    formData.append('video', request.video_file);
    formData.append('text_description', request.text_description);
    formData.append('valence', request.emotion_params.valence.toString());
    formData.append('arousal', request.emotion_params.arousal.toString());
    formData.append('instruments', JSON.stringify(request.instruments));
    formData.append('generation_params', JSON.stringify(request.generation_params));

    const response = await apiClient.post('/api/generate-multi-instrument', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return { success: true, data: response.data };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.detail || error.message
    };
  }
};

/**
 * Get evaluation metrics for generated music
 */
export const evaluateMusic = async (
  sessionId: string
): Promise<ApiResponse<EvaluationMetrics>> => {
  try {
    const response = await apiClient.get(`/api/evaluate/${sessionId}`);
    return { success: true, data: response.data };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.detail || error.message
    };
  }
};

/**
 * Get visualization data for analysis
 */
export const getVisualizationData = async (
  sessionId: string
): Promise<ApiResponse<VisualizationData>> => {
  try {
    const response = await apiClient.get(`/api/visualization/${sessionId}`);
    return { success: true, data: response.data };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.detail || error.message
    };
  }
};

/**
 * Start model training
 */
export const startTraining = async (
  trainingConfig: any
): Promise<ApiResponse<{ training_id: string }>> => {
  try {
    const response = await apiClient.post('/api/train/start', trainingConfig);
    return { success: true, data: response.data };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.detail || error.message
    };
  }
};

/**
 * Get training progress
 */
export const getTrainingProgress = async (
  trainingId: string
): Promise<ApiResponse<TrainingProgress>> => {
  try {
    const response = await apiClient.get(`/api/train/progress/${trainingId}`);
    return { success: true, data: response.data };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.detail || error.message
    };
  }
};

/**
 * Get available models
 */
export const getModels = async (): Promise<ApiResponse<ModelInfo[]>> => {
  try {
    const response = await apiClient.get('/api/models');
    return { success: true, data: response.data };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.detail || error.message
    };
  }
};

/**
 * Download generated files
 */
export const downloadFile = async (
  sessionId: string,
  fileType: 'midi' | 'audio' | 'video'
): Promise<Blob> => {
  try {
    const response = await apiClient.get(`/api/download/${sessionId}/${fileType}`, {
      responseType: 'blob',
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || error.message);
  }
};

/**
 * WebSocket connection for real-time updates
 */
export class SilentVideoSynthWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(sessionId?: string) {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
    this.url = sessionId ? `${wsUrl}/ws/${sessionId}` : `${wsUrl}/ws`;
  }

  connect(
    onMessage?: (data: any) => void,
    onError?: (error: Event) => void,
    onClose?: () => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('🔌 WebSocket connected');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            onMessage?.(data);
          } catch (e) {
            console.error('Failed to parse WebSocket message:', e);
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          onError?.(error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('🔌 WebSocket disconnected');
          onClose?.();
          this.attemptReconnect(onMessage, onError, onClose);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private attemptReconnect(
    onMessage?: (data: any) => void,
    onError?: (error: Event) => void,
    onClose?: () => void
  ) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

      setTimeout(() => {
        this.connect(onMessage, onError, onClose);
      }, 1000 * this.reconnectAttempts);
    }
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export default {
  healthCheck,
  generateMusic,
  generateMusicRealTime,
  generateMultiInstrumentMusic,
  evaluateMusic,
  getVisualizationData,
  startTraining,
  getTrainingProgress,
  getModels,
  downloadFile,
  SilentVideoSynthWebSocket,
};