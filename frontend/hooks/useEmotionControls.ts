
// hooks/useEmotionControls.ts

import { useState, useCallback } from 'react';
import { UseEmotionControlsResult, EmotionCoordinates } from '../utils/types';

const DEFAULT_EMOTION: EmotionCoordinates = { valence: 0.5, arousal: 0.5 };

export const useEmotionControls = (): UseEmotionControlsResult => {
  const [emotion, setEmotion] = useState<EmotionCoordinates>({
    valence: 0.5,
    arousal: 0.5
  });

  const updateValence = useCallback((valence: number) => {
    setEmotion((prev: EmotionCoordinates) => ({ ...prev, valence }));
  }, []);

  const updateArousal = useCallback((arousal: number) => {
    setEmotion((prev: EmotionCoordinates) => ({ ...prev, arousal }));
  }, []);

  const reset = useCallback(() => {
    setEmotion({ valence: 0.5, arousal: 0.5 });
  }, []);

  return { emotion, setEmotion, updateValence, updateArousal, reset };
};

