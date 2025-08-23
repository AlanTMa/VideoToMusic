// components/features/emotion/EmotionControls.tsx

import React, { useState, useEffect } from 'react';
import RussellCircumplex from './RussellCircumplex';
import EmotionTimeline from './EmotionTimeline';
import { EmotionControlsProps } from '../../../utils/types';

import {
  Heart,
  Sparkles,
  TrendingUp,
  Activity,
  Wand2,
  SlidersHorizontal,
  ToggleLeft,
  ToggleRight,
  AlertCircle
} from 'lucide-react';

interface ExtendedEmotionControlsProps extends EmotionControlsProps {
  emotionTimeline?: any;
  isAnalyzing?: boolean;
  analysisProgress?: number;
  videoFile?: File | null;
  onAnalyzeVideo?: () => void;
  currentVideoTime?: number;
  onTimeSelect?: (timestamp: number) => void;
}

const EmotionControls: React.FC<ExtendedEmotionControlsProps> = ({
  emotion,
  onChange,
  disabled = false,
  emotionTimeline,
  isAnalyzing = false,
  analysisProgress = 0,
  videoFile,
  onAnalyzeVideo,
  currentVideoTime = 0,
  onTimeSelect
}) => {
  const [isAutoDetect, setIsAutoDetect] = useState(false);
  const [selectedTimelineEmotion, setSelectedTimelineEmotion] = useState<any>(null);

  // Emotion presets
  const presets = [
    { label: 'Happy', emoji: '😊', valence: 0.7, arousal: 0.6 },
    { label: 'Excited', emoji: '🎉', valence: 0.8, arousal: 0.9 },
    { label: 'Calm', emoji: '😌', valence: 0.5, arousal: 0.2 },
    { label: 'Sad', emoji: '😢', valence: 0.2, arousal: 0.3 },
    { label: 'Tense', emoji: '😰', valence: 0.3, arousal: 0.8 },
    { label: 'Peaceful', emoji: '🌊', valence: 0.6, arousal: 0.1 },
  ];

  // Get current emotion label based on valence and arousal
  const getCurrentEmotionLabel = (valence: number, arousal: number): string => {
    if (valence > 0.5) {
      if (arousal > 0.5) return 'Excited';
      return 'Happy';
    } else if (valence > 0) {
      if (arousal > 0.5) return 'Alert';
      return 'Content';
    } else if (valence > -0.5) {
      if (arousal > 0.5) return 'Tense';
      return 'Neutral';
    } else {
      if (arousal > 0.5) return 'Angry';
      return 'Sad';
    }
  };

  const currentEmotionLabel = getCurrentEmotionLabel(emotion.valence, emotion.arousal);

  // Get emoji for current emotion
  const getCurrentEmotionEmoji = (): string => {
    const emojiMap: { [key: string]: string } = {
      'Happy': '😊',
      'Excited': '🎉',
      'Content': '😌',
      'Alert': '😮',
      'Neutral': '😐',
      'Tense': '😰',
      'Angry': '😠',
      'Sad': '😢',
    };
    return emojiMap[currentEmotionLabel] || '😐';
  };

  const handlePresetClick = (preset: typeof presets[0]) => {
    if (!disabled && !isAutoDetect) {
      onChange({ valence: preset.valence, arousal: preset.arousal });
    }
  };

  const handleAutoDetectToggle = async () => {
    if (isAutoDetect) {
      // Switching to manual mode
      setIsAutoDetect(false);
    } else {
      // Switching to auto mode
      if (videoFile && onAnalyzeVideo) {
        setIsAutoDetect(true);
        await onAnalyzeVideo();
      }
    }
  };

  const handleTimelineEmotionSelect = (emotionData: { valence: number; arousal: number }) => {
    if (!disabled) {
      onChange(emotionData);
      setSelectedTimelineEmotion(emotionData);
    }
  };

  // Update emotion when timeline average changes
  useEffect(() => {
    if (isAutoDetect && emotionTimeline && !selectedTimelineEmotion) {
      // Use average emotion from timeline
      onChange({
        valence: emotionTimeline.average_valence,
        arousal: emotionTimeline.average_arousal
      });
    }
  }, [emotionTimeline, isAutoDetect, selectedTimelineEmotion]);

  return (
    <div className="space-y-6">
      {/* Auto-Detect Toggle */}
      {videoFile && (
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <Wand2 className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Emotion Detection Mode</h4>
                <p className="text-sm text-gray-600">
                  {isAutoDetect ? 'AI is analyzing video emotions' : 'Manually set emotions'}
                </p>
              </div>
            </div>

            <button
              onClick={handleAutoDetectToggle}
              disabled={disabled || isAnalyzing}
              className={`
                relative inline-flex items-center px-4 py-2 rounded-lg font-medium text-sm
                transition-all duration-200
                ${isAutoDetect
                  ? 'bg-violet-600 text-white hover:bg-violet-700'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }
                ${(disabled || isAnalyzing) ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {isAutoDetect ? (
                <>
                  <ToggleRight className="w-4 h-4 mr-2" />
                  Auto-Detect ON
                </>
              ) : (
                <>
                  <ToggleLeft className="w-4 h-4 mr-2" />
                  Manual Mode
                </>
              )}
            </button>
          </div>

          {!isAutoDetect && videoFile && (
            <div className="mt-3 p-3 bg-white/50 rounded-lg">
              <p className="text-xs text-gray-600 flex items-start">
                <AlertCircle className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                Click "Auto-Detect ON" to analyze emotions from your video automatically
              </p>
            </div>
          )}
        </div>
      )}

      {/* Emotion Timeline (shown when auto-detect is on) */}
      {isAutoDetect && (
        <EmotionTimeline
          emotions={emotionTimeline?.emotions || []}
          videoDuration={emotionTimeline?.video_duration || 0}
          currentTime={currentVideoTime}
          onTimeSelect={onTimeSelect}
          onEmotionSelect={handleTimelineEmotionSelect}
          isAnalyzing={isAnalyzing}
          analysisProgress={analysisProgress}
        />
      )}

      {/* Manual Controls (shown when auto-detect is off or as override) */}
      {(!isAutoDetect || (isAutoDetect && emotionTimeline)) && (
        <>
          {/* Current Emotion Display */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500" />
                Current Emotion
              </h3>
              {isAutoDetect && (
                <span className="px-2 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-medium">
                  AI Selected
                </span>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-6xl">{getCurrentEmotionEmoji()}</div>
              <div className="flex-1">
                <p className="text-2xl font-bold text-gray-900">{currentEmotionLabel}</p>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="text-sm">
                    <span className="text-gray-500">Valence: </span>
                    <span className="font-semibold text-gray-900">
                      {((emotion.valence + 1) * 50).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Arousal: </span>
                    <span className="font-semibold text-gray-900">
                      {(emotion.arousal * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Manual Sliders */}
          {!isAutoDetect && (
            <div className="space-y-4">
              {/* Valence Slider */}
              <div className="bg-white rounded-xl p-5 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-gray-700">
                    Valence (Pleasantness)
                  </label>
                  <span className="text-sm font-bold text-violet-600">
                    {((emotion.valence + 1) * 50).toFixed(0)}%
                  </span>
                </div>

                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  value={emotion.valence}
                  onChange={(e) => onChange({ ...emotion, valence: parseFloat(e.target.value) })}
                  disabled={disabled}
                  className="w-full h-2 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-lg appearance-none cursor-pointer slider"
                />

                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>😢 Negative</span>
                  <span>😐 Neutral</span>
                  <span>😊 Positive</span>
                </div>
              </div>

              {/* Arousal Slider */}
              <div className="bg-white rounded-xl p-5 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-gray-700">
                    Arousal (Energy Level)
                  </label>
                  <span className="text-sm font-bold text-orange-600">
                    {(emotion.arousal * 100).toFixed(0)}%
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={emotion.arousal}
                  onChange={(e) => onChange({ ...emotion, arousal: parseFloat(e.target.value) })}
                  disabled={disabled}
                  className="w-full h-2 bg-gradient-to-r from-blue-500 to-red-500 rounded-lg appearance-none cursor-pointer slider"
                />

                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>😴 Calm</span>
                  <span>😊 Moderate</span>
                  <span>⚡ Energetic</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Presets */}
          {!isAutoDetect && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Quick Presets</h4>
              <div className="grid grid-cols-3 gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePresetClick(preset)}
                    disabled={disabled}
                    className={`
                      px-4 py-3 rounded-lg border-2 transition-all duration-200
                      ${emotion.valence === preset.valence && emotion.arousal === preset.arousal
                        ? 'border-violet-500 bg-violet-50'
                        : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50'
                      }
                      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <div className="flex flex-col items-center space-y-1">
                      <span className="text-2xl">{preset.emoji}</span>
                      <span className="text-xs font-medium text-gray-700">{preset.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Emotion Space Visualization */}
          {!isAutoDetect && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Emotion Space Visualization
              </h4>
              <RussellCircumplex
                currentEmotion={emotion}
                onEmotionChange={onChange}
                disabled={disabled}
              />
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          border: 2px solid #6366f1;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          border: 2px solid #6366f1;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};

export default EmotionControls;