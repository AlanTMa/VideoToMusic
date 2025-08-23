// hooks/useEmotionAnalysis.ts

import { useState, useCallback } from 'react';
import { API_BASE_URL } from '../config/api';

export interface EmotionPoint {
  timestamp: number;
  valence: number;
  arousal: number;
  dominant_emotion: string;
  confidence: number;
  face_detected: boolean;
  scene_mood: string | null;
  color_energy: number;
}

export interface EmotionTimeline {
  emotions: EmotionPoint[];
  average_valence: number;
  average_arousal: number;
  dominant_emotion: string;
  video_duration: number;
  analysis_interval: number;
}

export interface UseEmotionAnalysisResult {
  analyzeVideo: (file: File, interval?: number) => Promise<void>;
  emotionTimeline: EmotionTimeline | null;
  isAnalyzing: boolean;
  analysisProgress: number;
  error: string | null;
  reset: () => void;
}

export const useEmotionAnalysis = (): UseEmotionAnalysisResult => {
  const [emotionTimeline, setEmotionTimeline] = useState<EmotionTimeline | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const analyzeVideo = useCallback(async (file: File, interval: number = 5) => {
    setIsAnalyzing(true);
    setError(null);
    setAnalysisProgress(0);

    try {
      // Validate file
      if (!file.type.startsWith('video/')) {
        throw new Error('Please select a valid video file');
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Simulate progress updates (in production, use WebSocket or SSE)
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      // Make API call
      const response = await fetch(`${API_BASE_URL}/api/analysis/analyze-emotion?interval=${interval}`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to analyze video emotions');
      }

      const data: EmotionTimeline = await response.json();

      // Set progress to 100%
      setAnalysisProgress(100);

      // Set the timeline data
      setEmotionTimeline(data);

      // Reset progress after a short delay
      setTimeout(() => {
        setAnalysisProgress(0);
        setIsAnalyzing(false);
      }, 500);

    } catch (err: any) {
      console.error('Emotion analysis error:', err);
      setError(err.message || 'Failed to analyze video emotions');
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  }, []);

  const reset = useCallback(() => {
    setEmotionTimeline(null);
    setIsAnalyzing(false);
    setAnalysisProgress(0);
    setError(null);
  }, []);

  return {
    analyzeVideo,
    emotionTimeline,
    isAnalyzing,
    analysisProgress,
    error,
    reset,
  };
};