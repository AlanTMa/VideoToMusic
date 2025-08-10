// components/features/music/MusicGenerator.tsx

import React, { useState } from 'react';
import { Play, Settings, Zap, Users, Clock, Thermometer } from 'lucide-react';
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Generate Music</h3>
        <p className="text-gray-600">
          Configure generation parameters and create your soundtrack
        </p>
      </div>

      {/* Generation Status */}
      <div className={`
        p-4 rounded-lg border-2 transition-all
        ${canGenerate ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}
      `}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`
              w-3 h-3 rounded-full
              ${canGenerate ? 'bg-green-500' : 'bg-gray-400'}
            `}></div>
            <span className="font-medium text-gray-900">
              {canGenerate ? 'Ready to Generate' : 'Upload Video to Continue'}
            </span>
          </div>
          {videoFile && (
            <span className="text-sm text-gray-600">
              {videoFile.name}
            </span>
          )}
        </div>
      </div>

      {/* Quick Settings */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tempo (BPM)
          </label>
          <select
            value={localParams.tempo}
            onChange={(e) => updateParam('tempo', parseInt(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value={60}>Slow (60 BPM)</option>
            <option value={80}>Relaxed (80 BPM)</option>
            <option value={100}>Moderate (100 BPM)</option>
            <option value={120}>Standard (120 BPM)</option>
            <option value={140}>Upbeat (140 BPM)</option>
            <option value={160}>Fast (160 BPM)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Musical Key
          </label>
          <select
            value={localParams.key}
            onChange={(e) => updateParam('key', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="C">C Major</option>
            <option value="G">G Major</option>
            <option value="D">D Major</option>
            <option value="A">A Major</option>
            <option value="E">E Major</option>
            <option value="Am">A Minor</option>
            <option value="Em">E Minor</option>
            <option value="Bm">B Minor</option>
            <option value="Dm">D Minor</option>
            <option value="Gm">G Minor</option>
          </select>
        </div>
      </div>

      {/* Genre Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Musical Genre
        </label>
        <div className="grid grid-cols-3 gap-2">
          {['electronic', 'classical', 'jazz', 'ambient', 'cinematic', 'pop'].map((genre) => (
            <button
              key={genre}
              onClick={() => updateParam('genre', genre)}
              className={`
                p-3 rounded-lg border-2 text-sm font-medium transition-all capitalize
                ${localParams.genre === genre
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:bg-primary-50'
                }
              `}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Settings Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 transition-colors"
      >
        <Settings className="h-4 w-4" />
        <span className="text-sm font-medium">
          {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
        </span>
      </button>

      {/* Advanced Settings */}
      {showAdvanced && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
          <h4 className="font-medium text-gray-900">Advanced Parameters</h4>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Thermometer className="h-4 w-4 inline mr-1" />
                Temperature: {localParams.temperature.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={localParams.temperature}
                onChange={(e) => updateParam('temperature', parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Conservative</span>
                <span>Creative</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="h-4 w-4 inline mr-1" />
                Max Length: {localParams.max_length}s
              </label>
              <input
                type="range"
                min="15"
                max="300"
                step="15"
                value={localParams.max_length}
                onChange={(e) => updateParam('max_length', parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>15s</span>
                <span>5min</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="h-4 w-4 inline mr-1" />
              Number of Instruments: {localParams.num_instruments}
            </label>
            <input
              type="range"
              min="1"
              max="8"
              step="1"
              value={localParams.num_instruments}
              onChange={(e) => updateParam('num_instruments', parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Solo</span>
              <span>Full Band</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="realtime"
              checked={localParams.real_time}
              onChange={(e) => updateParam('real_time', e.target.checked)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="realtime" className="text-sm font-medium text-gray-700 flex items-center">
              <Zap className="h-4 w-4 mr-1" />
              Enable Real-time Generation
            </label>
          </div>
        </div>
      )}

      {/* Text Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Creative Description (Optional)
        </label>
        <textarea
          value={textDescription}
          placeholder="Describe the mood, style, or feeling you want the music to convey..."
          rows={3}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
        />
        <p className="text-xs text-gray-500 mt-1">
          Example: "Upbeat electronic music with energetic rhythm and cheerful melody"
        </p>
      </div>

      {/* Generation Button */}
      <div className="flex items-center space-x-4">
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className={`
            flex-1 flex items-center justify-center space-x-2 py-4 px-6 rounded-lg font-medium transition-all
            ${canGenerate
              ? 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-4 focus:ring-primary-200'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Generating Music...</span>
            </>
          ) : (
            <>
              <Play className="h-5 w-5" />
              <span>Generate Music</span>
            </>
          )}
        </button>

        {canGenerate && (
          <div className="text-sm text-gray-600">
            <p>Estimated time: {Math.ceil(localParams.max_length / 10)}s</p>
          </div>
        )}
      </div>

      {/* Generation Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2">🎵 How It Works</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• AI analyzes your video's visual content and motion</li>
          <li>• Emotion parameters guide musical mood and energy</li>
          <li>• Hybrid neural networks generate chord progressions and melodies</li>
          <li>• Multi-instrument tracks create rich, dynamic soundtracks</li>
        </ul>
      </div>
    </div>
  );
};

export default MusicGenerator;
