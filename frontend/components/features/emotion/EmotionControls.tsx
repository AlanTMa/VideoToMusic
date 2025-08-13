// components/features/emotion/EmotionControls.tsx

import React from 'react';
import { Heart, Sparkles, TrendingUp, Battery } from 'lucide-react';
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
    { name: 'Happy', valence: 0.8, arousal: 0.6, emoji: '😊', gradient: 'from-yellow-400 to-orange-400' },
    { name: 'Excited', valence: 0.8, arousal: 0.9, emoji: '🎉', gradient: 'from-orange-400 to-red-400' },
    { name: 'Calm', valence: 0.7, arousal: 0.2, emoji: '😌', gradient: 'from-blue-400 to-cyan-400' },
    { name: 'Sad', valence: 0.2, arousal: 0.3, emoji: '😢', gradient: 'from-gray-400 to-blue-400' },
    { name: 'Tense', valence: 0.3, arousal: 0.8, emoji: '😰', gradient: 'from-red-400 to-purple-400' },
    { name: 'Peaceful', valence: 0.6, arousal: 0.1, emoji: '🌊', gradient: 'from-green-400 to-teal-400' },
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

  const currentEmotionLabel = getEmotionLabel(emotion.valence, emotion.arousal);
  const getEmotionEmoji = () => {
    switch(currentEmotionLabel) {
      case 'Excited': return '🎉';
      case 'Happy': return '😊';
      case 'Peaceful': return '🌊';
      case 'Calm': return '😌';
      case 'Sad': return '😢';
      case 'Angry': return '😠';
      case 'Energetic': return '⚡';
      default: return '😐';
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Emotion Display - Enhanced */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-100 via-purple-50 to-pink-100 border-2 border-violet-200 rounded-2xl p-6 shadow-lg">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-300/20 to-purple-300/20 rounded-full blur-2xl"></div>

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-5xl animate-pulse">{getEmotionEmoji()}</div>
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-1">Current Emotion</h4>
              <p className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                {currentEmotionLabel}
              </p>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm">
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-500" />
                <span className="text-gray-600">Valence:</span>
                <span className="font-semibold text-gray-900">{emotion.valence.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Battery className="w-4 h-4 text-orange-500" />
                <span className="text-gray-600">Arousal:</span>
                <span className="font-semibold text-gray-900">{emotion.arousal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sliders - Enhanced */}
      <div className="space-y-6">
        {/* Valence Slider */}
        <div className="bg-white rounded-xl p-5 shadow-md border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Heart className="w-4 h-4 text-pink-500" />
              Valence (Pleasantness)
            </label>
            <span className="px-3 py-1 bg-gradient-to-r from-pink-50 to-rose-50 rounded-full text-xs font-medium text-rose-700">
              {(emotion.valence * 100).toFixed(0)}%
            </span>
          </div>
          <div className="space-y-3">
            <div className="relative">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={emotion.valence}
                onChange={(e) => handleValenceChange(parseFloat(e.target.value))}
                disabled={disabled}
                className="w-full h-3 bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 rounded-full appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: `linear-gradient(to right, #f87171 0%, #fbbf24 50%, #34d399 100%)`,
                }}
              />
              {/* Custom thumb indicator */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-3 border-violet-500 rounded-full shadow-lg pointer-events-none"
                style={{ left: `calc(${emotion.valence * 100}% - 12px)` }}
              >
                <div className="absolute inset-1 bg-gradient-to-br from-violet-400 to-purple-500 rounded-full"></div>
              </div>
            </div>
            <div className="flex justify-between text-xs font-medium">
              <span className="text-red-600">😢 Negative</span>
              <span className="text-gray-500">😐 Neutral</span>
              <span className="text-green-600">😊 Positive</span>
            </div>
          </div>
        </div>

        {/* Arousal Slider */}
        <div className="bg-white rounded-xl p-5 shadow-md border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Battery className="w-4 h-4 text-orange-500" />
              Arousal (Energy Level)
            </label>
            <span className="px-3 py-1 bg-gradient-to-r from-orange-50 to-amber-50 rounded-full text-xs font-medium text-orange-700">
              {(emotion.arousal * 100).toFixed(0)}%
            </span>
          </div>
          <div className="space-y-3">
            <div className="relative">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={emotion.arousal}
                onChange={(e) => handleArousalChange(parseFloat(e.target.value))}
                disabled={disabled}
                className="w-full h-3 bg-gradient-to-r from-blue-400 via-purple-400 to-red-400 rounded-full appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: `linear-gradient(to right, #60a5fa 0%, #a78bfa 50%, #f87171 100%)`,
                }}
              />
              {/* Custom thumb indicator */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-3 border-violet-500 rounded-full shadow-lg pointer-events-none"
                style={{ left: `calc(${emotion.arousal * 100}% - 12px)` }}
              >
                <div className="absolute inset-1 bg-gradient-to-br from-violet-400 to-purple-500 rounded-full"></div>
              </div>
            </div>
            <div className="flex justify-between text-xs font-medium">
              <span className="text-blue-600">😴 Calm</span>
              <span className="text-purple-600">😊 Moderate</span>
              <span className="text-red-600">⚡ Energetic</span>
            </div>
          </div>
        </div>
      </div>

      {/* Preset Emotions - Enhanced */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-violet-500" />
          <label className="text-sm font-semibold text-gray-800">
            Quick Presets
          </label>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {presetEmotions.map((preset) => {
            const isSelected = emotion.valence === preset.valence && emotion.arousal === preset.arousal;
            return (
              <button
                key={preset.name}
                onClick={() => onChange({ valence: preset.valence, arousal: preset.arousal })}
                disabled={disabled}
                className={`
                  relative p-4 rounded-xl border-2 transition-all transform hover:scale-105
                  ${isSelected
                    ? 'border-violet-500 bg-gradient-to-br from-violet-50 to-purple-50 shadow-lg scale-105'
                    : 'border-gray-200 bg-white hover:border-violet-300 hover:shadow-md'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                `}
              >
                {isSelected && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <div className="text-2xl mb-2">{preset.emoji}</div>
                <p className={`text-sm font-medium ${isSelected ? 'text-violet-700' : 'text-gray-700'}`}>
                  {preset.name}
                </p>
                <div className={`h-1 w-full bg-gradient-to-r ${preset.gradient} rounded-full mt-2 opacity-60`}></div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Russell's Circumplex Visualization */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-violet-500" />
          <label className="text-sm font-semibold text-gray-800">
            Emotion Space Visualization
          </label>
        </div>
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