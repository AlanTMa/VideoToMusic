// components/features/results/EvaluationMetrics.tsx

import React from 'react';
import { BarChart3, Target, Music, Clock, TrendingUp } from 'lucide-react';
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
    if (score >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 0.9) return 'Excellent';
    if (score >= 0.8) return 'Very Good';
    if (score >= 0.7) return 'Good';
    if (score >= 0.6) return 'Fair';
    return 'Needs Improvement';
  };

  const metrics = [
    {
      name: 'Emotion Alignment',
      value: evaluation.emotion_alignment,
      icon: Target,
      description: 'How well the music matches the intended emotion',
    },
    {
      name: 'Musical Quality',
      value: evaluation.musical_quality.overall_quality,
      icon: Music,
      description: 'Overall compositional and harmonic quality',
    },
    {
      name: 'Temporal Coherence',
      value: evaluation.temporal_coherence,
      icon: Clock,
      description: 'Consistency of musical flow over time',
    },
    {
      name: 'Harmonic Consistency',
      value: evaluation.harmonic_consistency,
      icon: TrendingUp,
      description: 'Consistency of chord progressions and harmonies',
    },
  ];

  const detailedMetrics = [
    {
      name: 'Pitch Diversity',
      value: evaluation.musical_quality.pitch_diversity,
      description: 'Variety of musical notes used',
    },
    {
      name: 'Pitch Range',
      value: evaluation.musical_quality.pitch_range,
      description: 'Span of high to low notes',
    },
    {
      name: 'Rhythm Regularity',
      value: evaluation.musical_quality.rhythm_regularity,
      description: 'Consistency of rhythmic patterns',
    },
    {
      name: 'Harmonic Consonance',
      value: evaluation.musical_quality.harmonic_consonance,
      description: 'Pleasant-sounding chord combinations',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Performance Analysis</h3>
        <p className="text-gray-600">
          Detailed metrics evaluating the quality and alignment of your generated music
        </p>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const colorClass = getScoreColor(metric.value);

          return (
            <div
              key={metric.name}
              className={`border rounded-lg p-4 ${colorClass}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Icon className="h-5 w-5" />
                  <h4 className="font-medium">{metric.name}</h4>
                </div>
                <span className="text-2xl font-bold">
                  {metric.value.toFixed(2)}
                </span>
              </div>
              <div className="mb-3">
                <div className="bg-white bg-opacity-50 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${metric.value * 100}%`,
                      backgroundColor: 'currentColor',
                    }}
                  ></div>
                </div>
              </div>
              <p className="text-sm opacity-80">{metric.description}</p>
              <p className="text-xs font-medium mt-1">
                {getScoreLabel(metric.value)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Detailed Breakdown */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          Detailed Musical Analysis
        </h4>

        <div className="grid grid-cols-2 gap-4">
          {detailedMetrics.map((metric) => (
            <div key={metric.name} className="bg-white rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium text-gray-900">{metric.name}</h5>
                <span className="text-lg font-semibold text-primary-600">
                  {metric.value.toFixed(3)}
                </span>
              </div>
              <div className="mb-2">
                <div className="bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-primary-600 h-1.5 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${metric.value * 100}%` }}
                  ></div>
                </div>
              </div>
              <p className="text-xs text-gray-600">{metric.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Generation Info */}
      {metadata && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-lg font-medium text-blue-900 mb-3">Generation Details</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-800">Model Version:</span>
              <br />
              <span className="text-blue-700">{metadata.model_version}</span>
            </div>
            <div>
              <span className="font-medium text-blue-800">Video Duration:</span>
              <br />
              <span className="text-blue-700">{metadata.video_duration.toFixed(1)}s</span>
            </div>
            <div>
              <span className="font-medium text-blue-800">Generated:</span>
              <br />
              <span className="text-blue-700">
                {new Date(metadata.generation_timestamp).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="text-lg font-medium text-yellow-900 mb-3">💡 Improvement Suggestions</h4>
        <ul className="text-sm text-yellow-800 space-y-1">
          {evaluation.emotion_alignment < 0.7 && (
            <li>• Try adjusting the emotion parameters to better match your video content</li>
          )}
          {evaluation.musical_quality.overall_quality < 0.7 && (
            <li>• Consider experimenting with different musical genres or styles</li>
          )}
          {evaluation.temporal_coherence < 0.7 && (
            <li>• A longer or more varied video might produce better temporal flow</li>
          )}
          {evaluation.harmonic_consistency < 0.7 && (
            <li>• Try a more specific text description to guide harmonic choices</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default EvaluationMetrics;
