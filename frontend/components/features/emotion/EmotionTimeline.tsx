// components/features/emotion/EmotionTimeline.tsx

import React, { useState, useRef, useEffect } from 'react';
import {
  Activity,
  Heart,
  TrendingUp,
  TrendingDown,
  User,
  Camera,
  Palette,
  Clock,
  ChevronRight,
  AlertCircle,
  Sparkles
} from 'lucide-react';

interface EmotionPoint {
  timestamp: number;
  valence: number;
  arousal: number;
  dominant_emotion: string;
  confidence: number;
  face_detected: boolean;
  scene_mood: string | null;
  color_energy: number;
}

interface EmotionTimelineProps {
  emotions: EmotionPoint[];
  videoDuration: number;
  currentTime?: number;
  onTimeSelect?: (timestamp: number) => void;
  onEmotionSelect?: (emotion: { valence: number; arousal: number }) => void;
  isAnalyzing?: boolean;
  analysisProgress?: number;
}

const EmotionTimeline: React.FC<EmotionTimelineProps> = ({
  emotions,
  videoDuration,
  currentTime = 0,
  onTimeSelect,
  onEmotionSelect,
  isAnalyzing = false,
  analysisProgress = 0
}) => {
  const [selectedPoint, setSelectedPoint] = useState<EmotionPoint | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<EmotionPoint | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Emotion colors based on valence/arousal
  const getEmotionColor = (valence: number, arousal: number): string => {
    if (valence > 0.3) {
      return arousal > 0.5 ? '#f59e0b' : '#10b981'; // orange (excited) : green (happy)
    } else if (valence < -0.3) {
      return arousal > 0.5 ? '#ef4444' : '#6366f1'; // red (angry) : indigo (sad)
    }
    return '#6b7280'; // gray (neutral)
  };

  const getEmotionEmoji = (emotion: string): string => {
    const emojiMap: { [key: string]: string } = {
      'happy': '😊',
      'excited': '🎉',
      'content': '😌',
      'neutral': '😐',
      'sad': '😢',
      'angry': '😠',
      'tense': '😰',
      'alert': '😮'
    };
    return emojiMap[emotion] || '😐';
  };

  const handlePointClick = (point: EmotionPoint) => {
    setSelectedPoint(point);
    if (onTimeSelect) {
      onTimeSelect(point.timestamp);
    }
    if (onEmotionSelect) {
      onEmotionSelect({ valence: point.valence, arousal: point.arousal });
    }
  };

  // Format timestamp to mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate graph points for smooth curve
  const generatePath = (data: EmotionPoint[], metric: 'valence' | 'arousal'): string => {
    if (data.length === 0) return '';

    const width = 100;
    const height = 50;
    const points = data.map((point, index) => {
      const x = (index / (data.length - 1)) * width;
      const value = metric === 'valence'
        ? (point.valence + 1) / 2  // Normalize -1 to 1 -> 0 to 1
        : point.arousal;
      const y = height - (value * height);
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  };

  if (isAnalyzing) {
    return (
      <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-6 border border-violet-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <Activity className="w-5 h-5 text-violet-600 animate-pulse" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Analyzing Video Emotions</h3>
              <p className="text-sm text-gray-600">Detecting faces and analyzing scenes...</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-violet-600">{analysisProgress}%</span>
          </div>
        </div>

        <div className="relative">
          <div className="h-2 bg-white rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-500"
              style={{ width: `${analysisProgress}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-500">
            <span>Extracting frames...</span>
            <span>Analyzing emotions...</span>
            <span>Processing timeline...</span>
          </div>
        </div>
      </div>
    );
  }

  if (emotions.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No emotion data available</p>
          <p className="text-sm text-gray-500 mt-1">Upload a video to analyze emotions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-600" />
            Emotion Timeline Analysis
          </h3>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">
                {emotions.filter(e => e.face_detected).length}/{emotions.length} faces
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">{formatTime(videoDuration)}</span>
            </div>
          </div>
        </div>

        {/* Emotion Graphs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Valence Graph */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Valence (Mood)</span>
              <span className="text-xs text-gray-500">Negative ← → Positive</span>
            </div>
            <svg viewBox="0 0 100 50" className="w-full h-20">
              <defs>
                <linearGradient id="valenceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d={generatePath(emotions, 'valence')}
                fill="none"
                stroke="#6366f1"
                strokeWidth="2"
              />
              <path
                d={generatePath(emotions, 'valence') + ` L 100,50 L 0,50 Z`}
                fill="url(#valenceGradient)"
              />
              {/* Center line */}
              <line x1="0" y1="25" x2="100" y2="25" stroke="#9ca3af" strokeWidth="0.5" strokeDasharray="2,2" />
            </svg>
          </div>

          {/* Arousal Graph */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Arousal (Energy)</span>
              <span className="text-xs text-gray-500">Calm ← → Energetic</span>
            </div>
            <svg viewBox="0 0 100 50" className="w-full h-20">
              <defs>
                <linearGradient id="arousalGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d={generatePath(emotions, 'arousal')}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
              />
              <path
                d={generatePath(emotions, 'arousal') + ` L 100,50 L 0,50 Z`}
                fill="url(#arousalGradient)"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Timeline Points */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <h4 className="font-medium text-gray-900 mb-3">Emotion Moments</h4>

        <div className="relative" ref={timelineRef}>
          {/* Timeline Track */}
          <div className="absolute top-8 left-0 right-0 h-1 bg-gray-200 rounded-full" />

          {/* Current Time Indicator */}
          {currentTime > 0 && (
            <div
              className="absolute top-6 w-1 h-8 bg-violet-600 rounded-full z-10"
              style={{ left: `${(currentTime / videoDuration) * 100}%` }}
            />
          )}

          {/* Emotion Points */}
          <div className="relative flex justify-between pb-2">
            {emotions.map((point, index) => {
              const isSelected = selectedPoint?.timestamp === point.timestamp;
              const isHovered = hoveredPoint?.timestamp === point.timestamp;
              const position = (point.timestamp / videoDuration) * 100;

              return (
                <div
                  key={index}
                  className="absolute transform -translate-x-1/2 cursor-pointer group"
                  style={{ left: `${position}%` }}
                  onClick={() => handlePointClick(point)}
                  onMouseEnter={() => setHoveredPoint(point)}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  {/* Emotion Dot */}
                  <div
                    className={`
                      w-12 h-12 rounded-full flex items-center justify-center
                      transition-all duration-200 transform
                      ${isSelected || isHovered ? 'scale-125 shadow-lg' : 'shadow-md'}
                    `}
                    style={{
                      backgroundColor: getEmotionColor(point.valence, point.arousal),
                      opacity: point.confidence
                    }}
                  >
                    <span className="text-xl">
                      {getEmotionEmoji(point.dominant_emotion)}
                    </span>
                  </div>

                  {/* Timestamp */}
                  <div className="text-xs text-gray-500 text-center mt-1">
                    {formatTime(point.timestamp)}
                  </div>

                  {/* Hover Card */}
                  {(isHovered || isSelected) && (
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 z-20">
                      <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-3 min-w-[200px]">
                        <div className="space-y-2">
                          <div className="font-semibold text-gray-900 capitalize">
                            {point.dominant_emotion}
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-gray-500">Valence:</span>
                              <span className="ml-1 font-medium">
                                {(point.valence * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Arousal:</span>
                              <span className="ml-1 font-medium">
                                {(point.arousal * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-gray-600">
                            {point.face_detected && (
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                <span>Face</span>
                              </div>
                            )}
                            {point.scene_mood && (
                              <div className="flex items-center gap-1">
                                <Camera className="w-3 h-3" />
                                <span>{point.scene_mood}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Palette className="w-3 h-3" />
                              <span>{(point.color_energy * 100).toFixed(0)}%</span>
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onEmotionSelect) {
                                onEmotionSelect({
                                  valence: point.valence,
                                  arousal: point.arousal
                                });
                              }
                            }}
                            className="w-full px-2 py-1 bg-violet-600 text-white rounded text-xs hover:bg-violet-700 transition"
                          >
                            Use This Emotion
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-600">Happy/Content</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-gray-600">Excited/Alert</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-gray-600">Angry/Tense</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-indigo-500" />
              <span className="text-gray-600">Sad/Calm</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-gray-500" />
              <span className="text-gray-600">Neutral</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmotionTimeline;