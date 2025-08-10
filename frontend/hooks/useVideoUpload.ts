// hooks/useVideoUpload.ts

import { useState, useCallback } from 'react';
import { UseVideoUploadResult, UploadProgress } from '../utils/types';

export const useVideoUpload = (): UseVideoUploadResult => {
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadVideo = useCallback(async (file: File) => {
    setIsUploading(true);
    setError(null);
    setProgress(null);

    try {
      // Validate file
      if (!file.type.startsWith('video/')) {
        throw new Error('Please select a valid video file');
      }

      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        throw new Error('Video file must be smaller than 100MB');
      }

      // Simulate upload progress (replace with actual upload logic)
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setProgress({
          loaded: (file.size * i) / 100,
          total: file.size,
          percentage: i,
        });
      }

      setIsUploading(false);
    } catch (err: any) {
      setError(err.message);
      setIsUploading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setProgress(null);
    setIsUploading(false);
    setError(null);
  }, []);

  return { uploadVideo, progress, isUploading, error, reset };
};

