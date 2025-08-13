// components/features/music/MusicGenerator.tsx

import React, { useState } from 'react';
import { Play, Settings, Zap, Users, Clock, Thermometer, Music, Sliders, FileText, Sparkles } from 'lucide-react';
import { MusicGeneratorProps, GenerationParameters } from '../../../utils/types';

const MusicGenerator: React.FC<MusicGeneratorProps> = ({
  videoFile,
  textDescription,
  emotionParams,
  generationParams,
  onGenerate,
  isGenerating,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localParams, setLocalParams] = useState<GenerationParameters>(generationParams);

  const handleGenerate = () => {
    onGenerate();
  };

  const updateParam = (key: keyof GenerationParameters, value: any) => {
    setLocalParams(prev => ({ ...prev, [key]: value }));
  };

  const canGenerate = videoFile && !isGenerating;

  const genres = [
    { id: 'electronic', emoji: '🎛️', gradient: 'from-cyan-400 to-blue-500' },
    { id: 'classical', emoji: '🎻', gradient: 'from-amber-400 to-orange-500' },
    { id: 'jazz', emoji: '🎷', gradient: 'from-purple-400 to-pink-500' },
    { id: 'ambient', emoji: '🌊', gradient: 'from-teal-400 to-green-500' },
    { id: 'cinematic', emoji: '🎬', gradient: 'from-red-400 to-rose-500' },
    { id: 'pop', emoji: '🎤', gradient: 'from-pink-400 to-violet-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Generation Status - Enhanced */}
      <div className={`
        relative overflow-hidden rounded-2xl p-5 border-2 transition-all duration-300
        ${canGenerate
          ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg'
          : 'border-gray-300 bg-gradient-to-br from-gray-50 to-slate-50'
        }
      `}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`
              relative w-4 h-4 rounded-full transition-all
              ${canGenerate ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}
            `}>
              {canGenerate && (
                <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"></div>
              )}
            </div>
            <div>
              <span className="font-semibold text-gray-900">
                {canGenerate ? '✅ Ready to Generate' : '⏳ Upload Video to Continue'}
              </span>
              {videoFile && (
                <p className="text-sm text-gray-600 mt-0.5">
                  {videoFile.name}
                </p>
              )}
            </div>
          </div>
          {canGenerate && (
            <Sparkles className="h-5 w-5 text-green-600 animate-pulse" />
          )}
        </div>
      </div>

      {/* Quick Settings - Enhanced */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
            <Clock className="h-4 w-4 text-violet-500" />
            Tempo (BPM)
          </label>
          <select
            value={localParams.tempo}
            onChange={(e) => updateParam('tempo', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
          >
            <option value={60}>🐢 Slow (60 BPM)</option>
            <option value={80}>😌 Relaxed (80 BPM)</option>
            <option value={100}>🚶 Moderate (100 BPM)</option>
            <option value={120}>🏃 Standard (120 BPM)</option>
            <option value={140}>💃 Upbeat (140 BPM)</option>
            <option value={160}>🚀 Fast (160 BPM)</option>
          </select>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
            <Music className="h-4 w-4 text-purple-500" />
            Musical Key
          </label>
          <select
            value={localParams.key}
            onChange={(e) => updateParam('key', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          >
            <option value="C">C Major ☀️</option>
            <option value="G">G Major 🌟</option>
            <option value="D">D Major ✨</option>
            <option value="A">A Major 🎵</option>
            <option value="E">E Major 🎶</option>
            <option value="Am">A Minor 🌙</option>
            <option value="Em">E Minor 🌃</option>
            <option value="Bm">B Minor 🌌</option>
            <option value="Dm">D Minor 🌑</option>
            <option value="Gm">G Minor 🌒</option>
          </select>
        </div>
      </div>

      {/* Genre Selection - Enhanced */}
      <div className="bg-white rounded-xl p-5 shadow-md border border-gray-100">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4">
          <Sliders className="h-4 w-4 text-indigo-500" />
          Musical Genre
        </label>
        <div className="grid grid-cols-3 gap-3">
          {genres.map((genre) => (
            <button
              key={genre.id}
              onClick={() => updateParam('genre', genre.id)}
              className={`
                relative p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-105
                ${localParams.genre === genre.id
                  ? 'border-violet-400 bg-gradient-to-br from-violet-50 to-purple-50 shadow-lg scale-105'
                  : 'border-gray-200 bg-white hover:border-violet-300 hover:shadow-md'
                }
              `}
            >
              {localParams.genre === genre.id && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              <div className="text-2xl mb-2">{genre.emoji}</div>
              <span className={`text-sm font-medium capitalize ${
                localParams.genre === genre.id ? 'text-violet-700' : 'text-gray-700'
              }`}>
                {genre.id}
              </span>
              <div className={`h-0.5 w-full bg-gradient-to-r ${genre.gradient} rounded-full mt-2 opacity-60`}></div>
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Settings Toggle - Enhanced */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-100 to-purple-100 text-violet-700 rounded-lg hover:from-violet-200 hover:to-purple-200 transition-all font-medium"
      >
        <Settings className={`h-4 w-4 transition-transform duration-300 ${showAdvanced ? 'rotate-180' : ''}`} />
        <span>
          {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
        </span>
      </button>

      {/* Advanced Settings - Enhanced */}
      {showAdvanced && (
        <div className="bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-6 space-y-5 shadow-inner">
          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
            <Sliders className="h-5 w-5 text-violet-600" />
            Advanced Parameters
          </h4>

          <div className="grid grid-cols-2 gap-5">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                <Thermometer className="h-4 w-4 text-orange-500" />
                Temperature:
                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                  {localParams.temperature.toFixed(2)}
                </span>
              </label>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={localParams.temperature}
                onChange={(e) => updateParam('temperature', parseFloat(e.target.value))}
                className="w-full h-2 bg-gradient-to-r from-blue-300 to-red-300 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>❄️ Conservative</span>
                <span>🔥 Creative</span>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                <Clock className="h-4 w-4 text-blue-500" />
                Max Length:
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                  {localParams.max_length}s
                </span>
              </label>
              <input
                type="range"
                min="15"
                max="300"
                step="15"
                value={localParams.max_length}
                onChange={(e) => updateParam('max_length', parseInt(e.target.value))}
                className="w-full h-2 bg-gradient-to-r from-gray-300 to-blue-400 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>15s</span>
                <span>5min</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              <Users className="h-4 w-4 text-purple-500" />
              Number of Instruments:
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                {localParams.num_instruments}
              </span>
            </label>
            <input
              type="range"
              min="1"
              max="8"
              step="1"
              value={localParams.num_instruments}
              onChange={(e) => updateParam('num_instruments', parseInt(e.target.value))}
              className="w-full h-2 bg-gradient-to-r from-purple-300 to-pink-300 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>🎸 Solo</span>
              <span>🎭 Full Band</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg">
            <input
              type="checkbox"
              id="realtime"
              checked={localParams.real_time}
              onChange={(e) => updateParam('real_time', e.target.checked)}
              className="w-5 h-5 text-violet-600 border-gray-300 rounded focus:ring-violet-500"
            />
            <label htmlFor="realtime" className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <Zap className="h-4 w-4 text-yellow-600" />
              Enable Real-time Generation
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">Beta</span>
            </label>
          </div>
        </div>
      )}

      {/* Text Description - Enhanced */}
      <div className="bg-white rounded-xl p-5 shadow-md border border-gray-100">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
          <FileText className="h-4 w-4 text-indigo-500" />
          Creative Description (Optional)
        </label>
        <textarea
          value={textDescription}
          readOnly
          placeholder="Describe the mood, style, or feeling you want the music to convey..."
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 resize-none cursor-not-allowed"
        />
        <p className="text-xs text-gray-500 mt-2 flex items-start gap-1">
          <span>💡</span>
          <span>Example: "Upbeat electronic music with energetic rhythm and cheerful melody"</span>
        </p>
      </div>

      {/* Generation Button - Enhanced */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className={`
            flex-1 flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-semibold transition-all duration-300
            ${canGenerate
              ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:shadow-xl transform hover:scale-105 hover:from-violet-700 hover:to-purple-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              <span>Generating Music...</span>
            </>
          ) : (
            <>
              <Play className="h-5 w-5" />
              <span>Generate Music</span>
              {canGenerate && <Sparkles className="h-4 w-4 animate-pulse" />}
            </>
          )}
        </button>

        {canGenerate && !isGenerating && (
          <div className="text-center px-4 py-2 bg-violet-50 rounded-lg">
            <p className="text-sm text-violet-700 font-medium">Estimated time</p>
            <p className="text-lg font-bold text-violet-900">{Math.ceil(localParams.max_length / 10)}s</p>
          </div>
        )}
      </div>

      {/* Generation Info - Enhanced */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <Music className="h-4 w-4" />
          How Our AI Works
        </h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">📹</span>
            <span className="text-blue-700">Analyzes video content & motion</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">❤️</span>
            <span className="text-blue-700">Maps emotions to musical mood</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">🧠</span>
            <span className="text-blue-700">Neural networks compose music</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">🎼</span>
            <span className="text-blue-700">Creates multi-instrument tracks</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicGenerator;