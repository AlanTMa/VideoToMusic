// components/features/emotion/EmotionControls.tsx

import React from 'react';
import { EmotionControlsProps } from '../../../utils/types';
import RussellCircumplex from './RussellCircumplex';

const EmotionControls: React.FC<EmotionControlsProps> = ({
  emotion,
  onChange,
  disabled = false,
}) => {
  const handleValenceChange = (valence: number) => {
    onChange({ ...emotion, valence });
  };

  const handleArousalChange = (arousal: number) => {
    onChange({ ...emotion, arousal });
  };

  const presetEmotions = [
    { name: 'Happy', valence: 0.8, arousal: 0.6, color: 'bg-yellow-400' },
    { name: 'Excited', valence: 0.8, arousal: 0.9, color: 'bg-orange-400' },
    { name: 'Calm', valence: 0.7, arousal: 0.2, color: 'bg-blue-400' },
    { name: 'Sad', valence: 0.2, arousal: 0.3, color: 'bg-gray-400' },
    { name: 'Tense', valence: 0.3, arousal: 0.8, color: 'bg-red-400' },
    { name: 'Peaceful', valence: 0.6, arousal: 0.1, color: 'bg-green-400' },
  ];

  const getEmotionLabel = (valence: number, arousal: number) => {
    if (valence > 0.7 && arousal > 0.7) return 'Excited';
    if (valence > 0.7 && arousal < 0.3) return 'Peaceful';
    if (valence > 0.6) return 'Happy';
    if (valence < 0.3 && arousal > 0.7) return 'Angry';
    if (valence < 0.3 && arousal < 0.3) return 'Sad';
    if (arousal > 0.7) return 'Energetic';
    if (arousal < 0.3) return 'Calm';
    return 'Neutral';
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Emotion Controls</h3>
        <p className="text-gray-600">
          Adjust the emotional parameters using Russell's Circumplex Model
        </p>
      </div>

      {/* Current Emotion Display */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Current Emotion</h4>
            <p className="text-lg font-semibold text-purple-700">
              {getEmotionLabel(emotion.valence, emotion.arousal)}
            </p>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p>Valence: {emotion.valence.toFixed(2)}</p>
            <p>Arousal: {emotion.arousal.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Sliders */}
      <div className="space-y-6">
        {/* Valence Slider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Valence (Pleasantness)
          </label>
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={emotion.valence}
              onChange={(e) => handleValenceChange(parseFloat(e.target.value))}
              disabled={disabled}
              className="w-full h-3 bg-gradient-to-r from-red-300 via-gray-300 to-green-300 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Negative</span>
              <span>Neutral</span>
              <span>Positive</span>
            </div>
          </div>
        </div>

        {/* Arousal Slider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Arousal (Energy Level)
          </label>
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={emotion.arousal}
              onChange={(e) => handleArousalChange(parseFloat(e.target.value))}
              disabled={disabled}
              className="w-full h-3 bg-gradient-to-r from-blue-300 via-purple-300 to-red-300 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Calm</span>
              <span>Moderate</span>
              <span>Energetic</span>
            </div>
          </div>
        </div>
      </div>

      {/* Preset Emotions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Quick Presets
        </label>
        <div className="grid grid-cols-3 gap-2">
          {presetEmotions.map((preset) => (
            <button
              key={preset.name}
              onClick={() => onChange({ valence: preset.valence, arousal: preset.arousal })}
              disabled={disabled}
              className={`
                p-3 rounded-lg border-2 text-sm font-medium transition-all
                ${emotion.valence === preset.valence && emotion.arousal === preset.arousal
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-50'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <div className={`w-4 h-4 ${preset.color} rounded-full mx-auto mb-1`}></div>
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Russell's Circumplex Visualization */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Emotion Space Visualization
        </label>
        <RussellCircumplex
          currentEmotion={emotion}
          onEmotionChange={onChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
};

export default EmotionControls;
