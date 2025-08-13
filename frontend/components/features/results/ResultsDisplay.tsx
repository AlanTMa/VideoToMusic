// components/features/results/ResultsDisplay.tsx

import React, { useState } from 'react';
import { Download, Share2, Play, Pause, BarChart3, Music, Video, Trophy, Sparkles, CheckCircle } from 'lucide-react';
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
      <div className="bg-white rounded-2xl shadow-xl p-8 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 animate-pulse"></div>

        <div className="relative text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full mb-4">
            <div className="animate-spin rounded-full h-10 w-10 border-3 border-white border-t-transparent"></div>
          </div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Generating Your Music
          </h3>
          <p className="text-gray-600 mb-6">
            Our AI is analyzing your video and creating the perfect soundtrack...
          </p>

          {/* Progress steps */}
          <div className="space-y-3 max-w-md mx-auto">
            <div className="flex items-center gap-3 text-left">
              <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-violet-500 rounded-full animate-pulse"></div>
              </div>
              <span className="text-sm text-gray-700">Analyzing video content...</span>
            </div>
            <div className="flex items-center gap-3 text-left">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
              </div>
              <span className="text-sm text-gray-700">Extracting emotional features...</span>
            </div>
            <div className="flex items-center gap-3 text-left">
              <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-pink-500 rounded-full animate-pulse"></div>
              </div>
              <span className="text-sm text-gray-700">Composing musical elements...</span>
            </div>
          </div>

          <div className="mt-6 bg-gray-100 rounded-full h-3 overflow-hidden max-w-md mx-auto">
            <div className="bg-gradient-to-r from-violet-500 to-purple-600 h-3 rounded-full animate-pulse w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Music className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-red-900 mb-2">Generation Failed</h3>
          <p className="text-red-700 mb-6">{error}</p>
          <button className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transform hover:scale-105 transition-all font-medium">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-slate-100 border-2 border-dashed border-gray-300 rounded-2xl p-12">
        <div className="text-center">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md">
            <Video className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Ready to Generate</h3>
          <p className="text-gray-600 max-w-sm mx-auto">Upload a video and configure your settings to create AI-powered music</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'audio', label: 'Audio Player', icon: Play, gradient: 'from-violet-500 to-purple-600' },
    { id: 'metrics', label: 'Analysis', icon: BarChart3, gradient: 'from-blue-500 to-indigo-600' },
    { id: 'download', label: 'Download', icon: Download, gradient: 'from-green-500 to-emerald-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Success Header - Enhanced */}
      <div className="relative overflow-hidden bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl transform translate-x-32 -translate-y-32"></div>

        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-1">Music Generated Successfully! 🎉</h3>
            <p className="text-green-100">
              Your personalized soundtrack is ready • Processing time: {result.processing_time}s
            </p>
          </div>
          <button className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-5 py-2.5 rounded-xl hover:bg-white/30 transition-all font-medium">
            <Share2 className="h-4 w-4" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Quick Stats - Enhanced */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <Trophy className="h-5 w-5 text-violet-500" />
            <span className="text-xs text-gray-500">Match</span>
          </div>
          <div className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
            {result.evaluation.emotion_alignment.toFixed(2)}
          </div>
          <div className="text-xs text-gray-600 mt-1">Emotion Alignment</div>
        </div>

        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <Sparkles className="h-5 w-5 text-green-500" />
            <span className="text-xs text-gray-500">Quality</span>
          </div>
          <div className="text-2xl font-bold text-green-600">
            {result.evaluation.musical_quality.overall_quality.toFixed(2)}
          </div>
          <div className="text-xs text-gray-600 mt-1">Overall Score</div>
        </div>

        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <Music className="h-5 w-5 text-blue-500" />
            <span className="text-xs text-gray-500">Count</span>
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {result.generated_music.instruments?.length || 1}
          </div>
          <div className="text-xs text-gray-600 mt-1">Instruments</div>
        </div>

        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <Video className="h-5 w-5 text-purple-500" />
            <span className="text-xs text-gray-500">Length</span>
          </div>
          <div className="text-2xl font-bold text-purple-600">
            {Math.floor(result.metadata.video_duration)}s
          </div>
          <div className="text-xs text-gray-600 mt-1">Duration</div>
        </div>
      </div>

      {/* Tab Navigation - Enhanced */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  relative flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium
                  transition-all duration-300
                  ${isActive
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                  }
                `}
              >
                {isActive && (
                  <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${tab.gradient}`}></div>
                )}
                <Icon className={`h-4 w-4 ${isActive ? 'text-violet-600' : ''}`} />
                <span>{tab.label}</span>
                {isActive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-violet-500 rounded-full animate-pulse"></span>
                )}
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

      {/* Instrument Breakdown - Enhanced */}
      {result.generated_music.instruments && result.generated_music.instruments.length > 1 && (
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-6 border border-violet-200">
          <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Music className="h-5 w-5 text-violet-600" />
            Multi-Instrument Composition
          </h4>
          <div className="space-y-3">
            {result.generated_music.instruments.map((instrument, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <h5 className="font-semibold text-gray-900">{instrument.instrument_name}</h5>
                    <p className="text-sm text-gray-600">
                      {instrument.chord_sequence.length} chords • {instrument.instrument_name?.length || 0} notes
                    </p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:shadow-md transition-all transform hover:scale-105">
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