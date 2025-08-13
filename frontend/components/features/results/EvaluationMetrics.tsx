// components/features/results/EvaluationMetrics.tsx

import React from 'react';
import { BarChart3, Target, Music, Clock, TrendingUp, Award, Sparkles, Info, ChevronRight } from 'lucide-react';
import { EvaluationMetrics as EvaluationMetricsType, GenerationResult } from '../../../utils/types';

interface EvaluationMetricsProps {
  evaluation: EvaluationMetricsType;
  metadata?: GenerationResult['metadata'];
}

const EvaluationMetrics: React.FC<EvaluationMetricsProps> = ({
  evaluation,
  metadata,
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return {
      bg: 'from-green-50 to-emerald-50',
      border: 'border-green-300',
      text: 'text-green-700',
      badge: 'bg-green-100 text-green-700',
      gradient: 'from-green-400 to-emerald-500',
    };
    if (score >= 0.6) return {
      bg: 'from-yellow-50 to-amber-50',
      border: 'border-yellow-300',
      text: 'text-yellow-700',
      badge: 'bg-yellow-100 text-yellow-700',
      gradient: 'from-yellow-400 to-amber-500',
    };
    return {
      bg: 'from-red-50 to-pink-50',
      border: 'border-red-300',
      text: 'text-red-700',
      badge: 'bg-red-100 text-red-700',
      gradient: 'from-red-400 to-pink-500',
    };
  };

  const getScoreLabel = (score: number) => {
    if (score >= 0.9) return '🏆 Excellent';
    if (score >= 0.8) return '⭐ Very Good';
    if (score >= 0.7) return '👍 Good';
    if (score >= 0.6) return '👌 Fair';
    return '💡 Needs Improvement';
  };

  const metrics = [
    {
      name: 'Emotion Alignment',
      value: evaluation.emotion_alignment,
      icon: Target,
      description: 'How well the music matches the intended emotion',
      emoji: '🎯',
    },
    {
      name: 'Musical Quality',
      value: evaluation.musical_quality.overall_quality,
      icon: Music,
      description: 'Overall compositional and harmonic quality',
      emoji: '🎵',
    },
    {
      name: 'Temporal Coherence',
      value: evaluation.temporal_coherence,
      icon: Clock,
      description: 'Consistency of musical flow over time',
      emoji: '⏱️',
    },
    {
      name: 'Harmonic Consistency',
      value: evaluation.harmonic_consistency,
      icon: TrendingUp,
      description: 'Consistency of chord progressions and harmonies',
      emoji: '📈',
    },
  ];

  const detailedMetrics = [
    {
      name: 'Pitch Diversity',
      value: evaluation.musical_quality.pitch_diversity,
      description: 'Variety of musical notes used',
      emoji: '🎹',
    },
    {
      name: 'Pitch Range',
      value: evaluation.musical_quality.pitch_range,
      description: 'Span of high to low notes',
      emoji: '📊',
    },
    {
      name: 'Rhythm Regularity',
      value: evaluation.musical_quality.rhythm_regularity,
      description: 'Consistency of rhythmic patterns',
      emoji: '🥁',
    },
    {
      name: 'Harmonic Consonance',
      value: evaluation.musical_quality.harmonic_consonance,
      description: 'Pleasant-sounding chord combinations',
      emoji: '🎶',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Performance Analysis
        </h3>
        <p className="text-gray-600">
          Detailed metrics evaluating the quality and alignment of your generated music
        </p>
      </div>

      {/* Main Metrics - Enhanced */}
      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const colors = getScoreColor(metric.value);

          return (
            <div
              key={metric.name}
              className={`
                relative overflow-hidden bg-gradient-to-br ${colors.bg}
                border-2 ${colors.border} rounded-xl p-5
                hover:shadow-lg transition-all duration-300
              `}
            >
              {/* Background decoration */}
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${colors.gradient} opacity-10 rounded-full blur-2xl`}></div>

              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{metric.emoji}</span>
                    <div>
                      <h4 className="font-semibold text-gray-900">{metric.name}</h4>
                      <span className={`text-xs font-medium ${colors.badge} px-2 py-0.5 rounded-full`}>
                        {getScoreLabel(metric.value)}
                      </span>
                    </div>
                  </div>
                  <span className="text-3xl font-bold bg-gradient-to-br ${colors.gradient} bg-clip-text text-transparent">
                    {metric.value.toFixed(2)}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="bg-white/50 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 bg-gradient-to-r ${colors.gradient} rounded-full transition-all duration-1000 ease-out`}
                      style={{ width: `${metric.value * 100}%` }}
                    />
                  </div>
                </div>

                <p className="text-sm text-gray-700">{metric.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Breakdown - Enhanced */}
      <div className="bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-violet-600" />
          Detailed Musical Analysis
        </h4>

        <div className="grid grid-cols-2 gap-4">
          {detailedMetrics.map((metric) => (
            <div key={metric.name} className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{metric.emoji}</span>
                  <h5 className="font-medium text-gray-900">{metric.name}</h5>
                </div>
                <span className="text-lg font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                  {metric.value.toFixed(3)}
                </span>
              </div>
              <div className="mb-2">
                <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-violet-500 to-purple-600 h-2 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${metric.value * 100}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-600">{metric.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Generation Info - Enhanced */}
      {metadata && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
          <h4 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
            <Info className="h-5 w-5" />
            Generation Details
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3">
              <span className="text-xs font-medium text-blue-700">Model Version</span>
              <p className="text-sm font-semibold text-blue-900 mt-1">{metadata.model_version}</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3">
              <span className="text-xs font-medium text-blue-700">Video Duration</span>
              <p className="text-sm font-semibold text-blue-900 mt-1">{metadata.video_duration.toFixed(1)}s</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3">
              <span className="text-xs font-medium text-blue-700">Generated</span>
              <p className="text-sm font-semibold text-blue-900 mt-1">
                {new Date(metadata.generation_timestamp).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations - Enhanced */}
      <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-5">
        <h4 className="text-lg font-semibold text-yellow-900 mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-600" />
          Improvement Suggestions
        </h4>
        <div className="space-y-3">
          {evaluation.emotion_alignment < 0.7 && (
            <div className="flex items-start gap-3 bg-white/80 backdrop-blur-sm rounded-lg p-3">
              <ChevronRight className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900">Emotion Alignment</p>
                <p className="text-xs text-yellow-700 mt-0.5">
                  Try adjusting the emotion parameters to better match your video content
                </p>
              </div>
            </div>
          )}
          {evaluation.musical_quality.overall_quality < 0.7 && (
            <div className="flex items-start gap-3 bg-white/80 backdrop-blur-sm rounded-lg p-3">
              <ChevronRight className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900">Musical Quality</p>
                <p className="text-xs text-yellow-700 mt-0.5">
                  Consider experimenting with different musical genres or styles
                </p>
              </div>
            </div>
          )}
          {evaluation.temporal_coherence < 0.7 && (
            <div className="flex items-start gap-3 bg-white/80 backdrop-blur-sm rounded-lg p-3">
              <ChevronRight className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900">Temporal Flow</p>
                <p className="text-xs text-yellow-700 mt-0.5">
                  A longer or more varied video might produce better temporal flow
                </p>
              </div>
            </div>
          )}
          {evaluation.harmonic_consistency < 0.7 && (
            <div className="flex items-start gap-3 bg-white/80 backdrop-blur-sm rounded-lg p-3">
              <ChevronRight className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900">Harmonic Structure</p>
                <p className="text-xs text-yellow-700 mt-0.5">
                  Try a more specific text description to guide harmonic choices
                </p>
              </div>
            </div>
          )}
          {evaluation.emotion_alignment >= 0.7 &&
           evaluation.musical_quality.overall_quality >= 0.7 &&
           evaluation.temporal_coherence >= 0.7 &&
           evaluation.harmonic_consistency >= 0.7 && (
            <div className="flex items-center gap-3 bg-green-100 rounded-lg p-3">
              <Award className="h-5 w-5 text-green-600" />
              <p className="text-sm font-medium text-green-800">
                Excellent work! Your music scores are above average in all categories 🎉
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EvaluationMetrics;