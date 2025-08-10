// hooks/useMusicGeneration.ts

import { useState, useCallback } from 'react';
import { UseMusicGenerationResult, MusicGenerationRequest, GenerationResult } from '../utils/types';
import { generateMusic, generateMusicRealTime } from '../utils/api';

export const useMusicGeneration = (): UseMusicGenerationResult => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);

  const generateMusicCallback = useCallback(async (request: MusicGenerationRequest): Promise<GenerationResult> => {
    setIsGenerating(true);
    setError(null);
    setProgress(0);

    try {
      let response;

      if (request.generation_params.real_time) {
        // Use real-time generation
        response = await generateMusicRealTime(
          request,
          (chunk) => {
            // Handle real-time chunks
            if (chunk.type === 'progress') {
              setProgress(chunk.data.percentage);
            }
          }
        );
      } else {
        // Use standard generation
        response = await generateMusic(
          request,
          (uploadProgress) => {
            setProgress(uploadProgress.percentage * 0.3); // Upload is 30% of total
          }
        );
      }

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to generate music');
      }

      setResult(response.data);
      setProgress(100);
      return response.data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsGenerating(false);
    setProgress(0);
    setError(null);
    setResult(null);
  }, []);

  return {
    generateMusic: generateMusicCallback,
    isGenerating,
    progress,
    error,
    result,
    reset,
  };
};
