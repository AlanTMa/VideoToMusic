// components/features/results/ResultsDisplay.tsx

import React, { useState } from 'react';
import { Download, Share2, Play, Pause, BarChart3, Music, Video } from 'lucide-react';
import { ResultsDisplayProps } from '../../../utils/types';
import AudioPlayer from '../music/AudioPlayer';
import EvaluationMetrics from './EvaluationMetrics';
import DownloadControls from './DownloadControls';

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  result,
  isLoading,
  error,
}) => {
  const [activeTab, setActiveTab] = useState<'audio' | 'metrics' | 'download'>('audio');

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Generating Your Music</h3>
          <p className="text-gray-600">
            Our AI is analyzing your video and creating the perfect soundtrack...
          </p>
          <div className="mt-4 bg-gray-100 rounded-full h-2 overflow-hidden">
            <div className="bg-primary-600 h-2 rounded-full animate-pulse w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Music className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-red-900 mb-2">Generation Failed</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8">
        <div className="text-center text-gray-500">
          <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">Ready to Generate</h3>
          <p>Upload a video and configure your settings to create music</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'audio', label: 'Audio Player', icon: Play },
    { id: 'metrics', label: 'Analysis', icon: BarChart3 },
    { id: 'download', label: 'Download', icon: Download },
  ];

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <Music className="h-6 w-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-green-900">Music Generated Successfully!</h3>
            <p className="text-green-700">
              Your personalized soundtrack is ready. Processing time: {result.processing_time}s
            </p>
          </div>
          <button className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
            <Share2 className="h-4 w-4" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-primary-600">
            {result.evaluation.emotion_alignment.toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">Emotion Match</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {result.evaluation.musical_quality.overall_quality.toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">Quality Score</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {result.generated_music.instruments?.length || 1}
          </div>
          <div className="text-sm text-gray-600">Instruments</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {Math.floor(result.metadata.video_duration)}s
          </div>
          <div className="text-sm text-gray-600">Duration</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex-1 flex items-center justify-center space-x-2 px-6 py-4 text-sm font-medium transition-colors
                  ${activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-500'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'audio' && (
            <AudioPlayer
              audioUrl={result.output_files.audio_url}
              title="Generated Music"
              showWaveform={true}
            />
          )}

          {activeTab === 'metrics' && (
            <EvaluationMetrics
              evaluation={result.evaluation}
              metadata={result.metadata}
            />
          )}

          {activeTab === 'download' && (
            <DownloadControls
              result={result}
            />
          )}
        </div>
      </div>

      {/* Instrument Breakdown */}
      {result.generated_music.instruments && result.generated_music.instruments.length > 1 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Multi-Instrument Breakdown</h4>
          <div className="space-y-3">
            {result.generated_music.instruments.map((instrument, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <Music className="h-4 w-4 text-primary-600" />
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-900">{instrument.instrument_name}</h5>
                    <p className="text-sm text-gray-600">
                      {instrument.chord_sequence.length} chords generated
                    </p>
                  </div>
                </div>
                <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                  Preview Solo
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsDisplay;

