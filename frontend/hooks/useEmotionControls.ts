
// hooks/useEmotionControls.ts

import { useState, useCallback } from 'react';
import { UseEmotionControlsResult, EmotionCoordinates } from '../utils/types';

const DEFAULT_EMOTION: EmotionCoordinates = { valence: 0.5, arousal: 0.5 };

export const useEmotionControls = (initialEmotion?: EmotionCoordinates): UseEmotionControlsResult => {
  const [emotion, setEmotionState] = useState<EmotionCoordinates>(initialEmotion || DEFAULT_EMOTION);

  const setEmotion = useCallback((newEmotion: EmotionCoordinates) => {
    setEmotionState({
      valence: Math.max(0, Math.min(1, newEmotion.valence)),
      arousal: Math.max(0, Math.min(1, newEmotion.arousal)),
    });
  }, []);

  const setValence = useCallback((valence: number) => {
    setEmotionState(prev => ({
      ...prev,
      valence: Math.max(0, Math.min(1, valence)),
    }));
  }, []);

  const setArousal = useCallback((arousal: number) => {
    setEmotionState(prev => ({
      ...prev,
      arousal: Math.max(0, Math.min(1, arousal)),
    }));
  }, []);

  const reset = useCallback(() => {
    setEmotionState(DEFAULT_EMOTION);
  }, []);

  return { emotion, setEmotion, setValence, setArousal, reset };
};

