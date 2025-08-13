// hooks/useMusicGeneration.ts

import { useState, useCallback } from 'react';
import { UseMusicGenerationResult, MusicGenerationRequest, GenerationResult } from '../utils/types';
import { generateMusic, generateMusicRealTime } from '../utils/api';
import { generateVideoThumbnail } from '../utils/helpers';

interface UseMusicGenerationWithHistoryProps {
  onSaveToHistory?: (historyData: any) => void;
}

export const useMusicGeneration = (props?: UseMusicGenerationWithHistoryProps): UseMusicGenerationResult => {
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

      // Save to history if callback provided
      if (props?.onSaveToHistory) {
        try {
          // Generate thumbnail for the video
          let thumbnail: string | undefined;
          try {
            thumbnail = await generateVideoThumbnail(request.video_file);
          } catch (thumbnailError) {
            console.warn('Could not generate video thumbnail:', thumbnailError);
            // Continue without thumbnail
          }

          // Prepare history data
          const historyData = {
            videoFile: {
              name: request.video_file.name,
              size: request.video_file.size,
              type: request.video_file.type,
            },
            videoThumbnail: thumbnail,
            emotionParams: request.emotion_params,
            generationParams: request.generation_params,
            selectedInstruments: getInstrumentsFromParams(request.generation_params),
            textDescription: request.text_description,
            result: response.data,
          };

          props.onSaveToHistory(historyData);
        } catch (historyError) {
          console.error('Failed to save to history:', historyError);
          // Don't throw - the generation was successful
        }
      }

      return response.data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [props]);

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

// Helper function to extract instruments from generation parameters
// This would need to be adapted based on how instruments are stored in your generation params
const getInstrumentsFromParams = (params: any): string[] => {
  // This is a placeholder - you'll need to adapt this based on your actual data structure
  // For now, I'll return a default based on num_instruments
  const defaultInstruments = ['piano', 'guitar', 'violin', 'flute', 'drums', 'bass', 'synth', 'organ'];
  return defaultInstruments.slice(0, params.num_instruments || 1);
};