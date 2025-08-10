
// pages/index.tsx

import React, { useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import toast from 'react-hot-toast';
import VideoUploader from '../components/features/video/VideoUploader';
import VideoPreview from '../components/features/video/VideoPreview';
import EmotionControls from '../components/features/emotion/EmotionControls';
import MusicGenerator from '../components/features/music/MusicGenerator';
import InstrumentSelector from '../components/features/music/InstrumentSelector';
import ResultsDisplay from '../components/features/results/ResultsDisplay';
import { useVideoUpload, useMusicGeneration, useEmotionControls } from '../hooks';
import { GenerationParameters, MusicGenerationRequest } from '../utils/types';

const HomePage: NextPage = () => {
  // State management
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [textDescription, setTextDescription] = useState('');
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>(['piano']);
  const [generationParams, setGenerationParams] = useState<GenerationParameters>({
    tempo: 120,
    key: 'C',
    genre: 'electronic',
    max_length: 60,
    temperature: 0.8,
    num_instruments: 1,
    real_time: false,
  });

  // Custom hooks
  const { emotion, setEmotion } = useEmotionControls();
  const { generateMusic, isGenerating, progress, error, result, reset } = useMusicGeneration();

  // Handlers
  const handleVideoSelect = (file: File) => {
    setVideoFile(file);
    reset(); // Clear previous results
    toast.success('Video uploaded successfully!');
  };

  const handleInstrumentToggle = (instrument: string) => {
    setSelectedInstruments(prev => {
      if (prev.includes(instrument)) {
        return prev.filter(i => i !== instrument);
      } else {
        return [...prev, instrument];
      }
    });
  };

  const handleGenerate = async () => {
    if (!videoFile) {
      toast.error('Please upload a video first');
      return;
    }

    const request: MusicGenerationRequest = {
      video_file: videoFile,
      text_description: textDescription,
      emotion_params: emotion,
      generation_params: {
        ...generationParams,
        num_instruments: selectedInstruments.length,
      },
    };

    try {
      await generateMusic(request);
      toast.success('Music generated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate music');
    }
  };

  return (
    <>
      <Head>
        <title>SilentVideoSynth - AI Music Generation for Videos</title>
        <meta
          name="description"
          content="Transform your silent videos into captivating content with AI-generated music that perfectly matches the emotion and mood of your footage."
        />
        <meta name="keywords" content="AI music generation, video soundtrack, emotion-driven music, artificial intelligence, video editing" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                🎬🎵 SilentVideoSynth
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
                Transform your silent videos into captivating content with AI-generated music
                that perfectly matches the emotion and mood of your footage
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full">
                  🧠 Advanced AI
                </span>
                <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full">
                  🎯 Emotion-Driven
                </span>
                <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full">
                  🎵 Multi-Instrument
                </span>
                <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full">
                  ⚡ Real-Time
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left Column - Inputs */}
            <div className="lg:col-span-2 space-y-8">

              {/* Step 1: Video Upload */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center mb-6">
                  <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
                    1
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Upload Your Video</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <VideoUploader
                    onVideoSelect={handleVideoSelect}
                    isUploading={isGenerating}
                  />
                  <VideoPreview
                    file={videoFile}
                    className="h-64 md:h-auto"
                  />
                </div>
              </div>

              {/* Step 2: Emotion Controls */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center mb-6">
                  <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
                    2
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Set Emotional Tone</h2>
                </div>

                <EmotionControls
                  emotion={emotion}
                  onChange={setEmotion}
                  disabled={isGenerating}
                />
              </div>

              {/* Step 3: Music Configuration */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center mb-6">
                  <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
                    3
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Configure Music</h2>
                </div>

                <div className="space-y-6">
                  <InstrumentSelector
                    selectedInstruments={selectedInstruments}
                    onInstrumentToggle={handleInstrumentToggle}
                    maxInstruments={generationParams.num_instruments}
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Creative Description (Optional)
                    </label>
                    <textarea
                      value={textDescription}
                      onChange={(e) => setTextDescription(e.target.value)}
                      placeholder="Describe the mood, style, or feeling you want the music to convey..."
                      rows={3}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      disabled={isGenerating}
                    />
                  </div>
                </div>
              </div>

              {/* Step 4: Generate */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center mb-6">
                  <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
                    4
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Generate Music</h2>
                </div>

                <MusicGenerator
                  videoFile={videoFile}
                  textDescription={textDescription}
                  emotionParams={emotion}
                  generationParams={generationParams}
                  onGenerate={handleGenerate}
                  isGenerating={isGenerating}
                />
              </div>
            </div>

            {/* Right Column - Results */}
            <div className="space-y-8">

              {/* Real-time Progress */}
              {isGenerating && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Generation Progress</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Processing...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {progress < 30 && "Analyzing video content..."}
                      {progress >= 30 && progress < 60 && "Extracting emotional features..."}
                      {progress >= 60 && progress < 90 && "Generating musical composition..."}
                      {progress >= 90 && "Finalizing audio output..."}
                    </div>
                  </div>
                </div>
              )}

              {/* Results */}
              <ResultsDisplay
                result={result}
                isLoading={isGenerating}
                error={error}
              />

              {/* Quick Tips */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Pro Tips</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    Videos with varied scenes create more dynamic music
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    Clear emotional intent helps guide better compositions
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    Try different instrument combinations for unique sounds
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    Descriptive text enhances AI understanding
                  </li>
                </ul>
              </div>

              {/* System Status */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🔧 System Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">AI Model</span>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-sm font-medium text-green-600">Online</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Processing Queue</span>
                    <span className="text-sm font-medium text-gray-900">2 jobs</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Avg. Generation Time</span>
                    <span className="text-sm font-medium text-gray-900">~45s</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HomePage;