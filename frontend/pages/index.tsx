// pages/index.tsx

import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import toast from 'react-hot-toast';
import VideoUploader from '../components/features/video/VideoUploader';
import VideoPreview from '../components/features/video/VideoPreview';
import EmotionControls from '../components/features/emotion/EmotionControls';
import MusicGenerator from '../components/features/music/MusicGenerator';
import InstrumentSelector from '../components/features/music/InstrumentSelector';
import ResultsDisplay from '../components/features/results/ResultsDisplay';
import HistoryDisplay from '../components/features/history/HistoryDisplay';
import { useVideoUpload } from '../hooks/useVideoUpload';
import { useMusicGeneration } from '../hooks/useMusicGeneration';
import { useEmotionControls } from '../hooks/useEmotionControls';
import { useHistory } from '../hooks/useHistory';
import { GenerationParameters, MusicGenerationRequest, HistoryItem } from '../utils/types';
import { downloadFile, generateShareableData } from '../utils/helpers';
import {
  Upload,
  Heart,
  Music,
  Sparkles,
  PlayCircle,
  CheckCircle,
  Circle,
  ChevronRight,
  Zap,
  Film,
  Palette,
  Settings,
  Download,
  Clock
} from 'lucide-react';

const HomePage: NextPage = () => {
  // State management
  const [activeTab, setActiveTab] = useState(0);
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
  const [completedSteps, setCompletedSteps] = useState({
    video: false,
    emotion: false,
    music: false,
    generate: false,
  });

  // Custom hooks
  const { emotion, setEmotion } = useEmotionControls();
  const { historyItems, addToHistory, removeFromHistory, clearHistory } = useHistory();
  const { generateMusic, isGenerating, progress, error, result, reset } = useMusicGeneration({
    onSaveToHistory: addToHistory
  });

  // Update completed steps when states change
  useEffect(() => {
    setCompletedSteps({
      video: !!videoFile,
      emotion: emotion.valence !== 0.5 || emotion.arousal !== 0.5,
      music: selectedInstruments.length > 0 || textDescription.length > 0,
      generate: !!result,
    });
  }, [videoFile, emotion, selectedInstruments, textDescription, result]);

  // Handlers
  const handleVideoSelect = (file: File) => {
    setVideoFile(file);
    reset();
    toast.success('Video uploaded successfully! 🎬');
    // Auto-advance to next tab
    setTimeout(() => setActiveTab(1), 500);
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
      setActiveTab(0);
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
      toast.success('Music generated successfully! 🎵');
      // Auto-advance to results tab
      setTimeout(() => setActiveTab(5), 500);
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate music');
    }
  };

  // History handlers
  const handlePlayMusic = (item: HistoryItem) => {
    if (item.result.audio_url) {
      const audio = new Audio(item.result.audio_url);
      audio.play().catch(() => {
        toast.error('Failed to play audio');
      });
    }
  };

  const handleDownload = (item: HistoryItem, type: 'audio' | 'midi') => {
    const url = type === 'audio' ? item.result.audio_download_url : item.result.midi_download_url;
    const extension = type === 'audio' ? 'mp3' : 'mid';
    const filename = `${item.videoFile.name.split('.')[0]}_generated.${extension}`;

    if (url) {
      downloadFile(url, filename);
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} download started!`);
    } else {
      toast.error(`${type.charAt(0).toUpperCase() + type.slice(1)} file not available`);
    }
  };

  const handleRerun = (item: HistoryItem) => {
    // Restore the parameters from history
    setTextDescription(item.textDescription);
    setEmotion(item.emotionParams);
    setSelectedInstruments(item.selectedInstruments);
    setGenerationParams(item.generationParams);

    // Switch to generate tab
    setActiveTab(3);
    toast('Parameters restored from history. Ready to regenerate!', {
      icon: '🔄',
    });
  };

  const handleShare = async (item: HistoryItem) => {
    try {
      const shareData = generateShareableData(item);

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(`${shareData.title}\n\n${shareData.text}\n\n${shareData.url}`);
        toast.success('Share link copied to clipboard!');
      }
    } catch (error) {
      toast.error('Failed to share');
    }
  };

  const handleDeleteHistory = (id: string) => {
    if (confirm('Are you sure you want to delete this item from history?')) {
      removeFromHistory(id);
      toast.success('Item removed from history');
    }
  };

  const tabs = [
    {
      id: 0,
      name: 'Upload',
      icon: Upload,
      description: 'Choose your video',
      completed: completedSteps.video
    },
    {
      id: 1,
      name: 'Emotion',
      icon: Heart,
      description: 'Set the mood',
      completed: completedSteps.emotion
    },
    {
      id: 2,
      name: 'Music',
      icon: Music,
      description: 'Configure sound',
      completed: completedSteps.music
    },
    {
      id: 3,
      name: 'Generate',
      icon: Sparkles,
      description: 'Create magic',
      completed: false
    },

    {
      id: 4,
      name: 'Results',
      icon: Download,
      description: 'Your soundtrack',
      completed: completedSteps.generate
    },
    {
      id: 5,
      name: 'History',
      icon: Clock,
      description: 'Past creations',
      completed: historyItems.length > 0
    },
  ];

  const canProceed = (tabId: number) => {
    switch (tabId) {
      case 1: return completedSteps.video;
      case 2: return completedSteps.video && completedSteps.emotion;
      case 3: return completedSteps.video && completedSteps.emotion && completedSteps.music;
      case 4: return completedSteps.generate;
      case 5: return true; // History is always accessible
      default: return true;
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
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50">
        {/* Animated Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-40 right-20 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        {/* Modern Header */}
        <header className="relative bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Film className="w-6 h-6 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-br from-pink-500 to-orange-500 rounded-full flex items-center justify-center">
                    <Music className="w-2.5 h-2.5 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                    SilentVideoSynth
                  </h1>
                  <p className="text-xs text-gray-500">AI-Powered Music Generation</p>
                </div>
              </div>

              <nav className="hidden md:flex items-center space-x-1">
                <button className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition">
                  Features
                </button>
                <button className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition">
                  Pricing
                </button>
                <button className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition">
                  Docs
                </button>
                <div className="w-px h-6 bg-gray-200 mx-2"></div>
                <button className="px-4 py-2 text-sm bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:shadow-lg hover:scale-105 transition">
                  Sign In
                </button>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Compact Hero */}
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">
              Transform Videos into
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-purple-600"> Musical Stories</span>
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Upload your video, set the emotional tone, and let AI compose the perfect soundtrack in seconds
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 mb-6 p-2">
            <div className="flex space-x-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isAccessible = canProceed(tab.id);
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => isAccessible && setActiveTab(tab.id)}
                    disabled={!isAccessible}
                    className={`
                      flex-1 flex items-center justify-center px-4 py-3 rounded-xl text-sm font-medium transition-all
                      ${isActive
                        ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg'
                        : isAccessible
                          ? 'hover:bg-gray-50 text-gray-700'
                          : 'text-gray-400 cursor-not-allowed opacity-50'
                      }
                    `}
                  >
                    <div className="flex items-center space-x-2">
                      {tab.completed ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">{tab.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="mb-6">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-600 to-purple-600 transition-all duration-500 ease-out"
                style={{ width: `${((activeTab + (completedSteps.generate ? 1 : 0)) / 6) * 100}%` }}
              />
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
            <div className="p-8">

              {/* Upload Tab */}
              {activeTab === 0 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Upload className="w-8 h-8 text-violet-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Video</h3>
                    <p className="text-gray-600">Select or drag and drop a video file to get started</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <VideoUploader
                        onVideoSelect={handleVideoSelect}
                        isUploading={isGenerating}
                      />

                      <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-200">
                        <h4 className="font-semibold text-violet-900 mb-2 flex items-center">
                          <Zap className="w-4 h-4 mr-2" />
                          Quick Tips
                        </h4>
                        <ul className="text-sm text-violet-700 space-y-1">
                          <li>• Best results with 30s - 5min videos</li>
                          <li>• Clear visuals improve music quality</li>
                          <li>• Varied scenes create dynamic soundtracks</li>
                        </ul>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
                      <VideoPreview
                        file={videoFile}
                        className="h-full min-h-[300px]"
                      />
                    </div>
                  </div>

                  {videoFile && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => setActiveTab(1)}
                        className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transform hover:scale-105 transition flex items-center space-x-2"
                      >
                        <span>Continue to Emotion</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Emotion Tab */}
              {activeTab === 1 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-pink-100 to-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Heart className="w-8 h-8 text-rose-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Set Emotional Tone</h3>
                    <p className="text-gray-600">Define the mood and energy of your soundtrack</p>
                  </div>

                  <EmotionControls
                    emotion={emotion}
                    onChange={setEmotion}
                    disabled={isGenerating}
                  />

                  <div className="flex justify-between">
                    <button
                      onClick={() => setActiveTab(0)}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition flex items-center space-x-2"
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" />
                      <span>Back</span>
                    </button>
                    <button
                      onClick={() => setActiveTab(2)}
                      className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transform hover:scale-105 transition flex items-center space-x-2"
                    >
                      <span>Continue to Music</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Music Configuration Tab */}
              {activeTab === 2 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Music className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Configure Music</h3>
                    <p className="text-gray-600">Customize instruments, genre, and style</p>
                  </div>

                  <div className="space-y-6">
                    {/* Genre Selection */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Musical Genre
                      </label>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                        {['electronic', 'classical', 'jazz', 'ambient', 'cinematic', 'pop'].map((genre) => (
                          <button
                            key={genre}
                            onClick={() => setGenerationParams({ ...generationParams, genre })}
                            className={`
                              px-4 py-2 rounded-lg border-2 font-medium text-sm capitalize transition-all
                              ${generationParams.genre === genre
                                ? 'border-violet-500 bg-violet-50 text-violet-700'
                                : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50'
                              }
                            `}
                          >
                            {genre}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Instruments */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Select Instruments
                      </label>
                      <InstrumentSelector
                        selectedInstruments={selectedInstruments}
                        onInstrumentToggle={handleInstrumentToggle}
                        maxInstruments={8}
                      />
                    </div>

                    {/* Settings Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Tempo
                        </label>
                        <select
                          value={generationParams.tempo}
                          onChange={(e) => setGenerationParams({ ...generationParams, tempo: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
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
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Key
                        </label>
                        <select
                          value={generationParams.key}
                          onChange={(e) => setGenerationParams({ ...generationParams, key: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        >
                          <option value="C">C Major</option>
                          <option value="G">G Major</option>
                          <option value="D">D Major</option>
                          <option value="Am">A Minor</option>
                          <option value="Em">E Minor</option>
                        </select>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Creative Direction (Optional)
                      </label>
                      <textarea
                        value={textDescription}
                        onChange={(e) => setTextDescription(e.target.value)}
                        placeholder="Describe the mood or style you envision..."
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <button
                      onClick={() => setActiveTab(1)}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition flex items-center space-x-2"
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" />
                      <span>Back</span>
                    </button>
                    <button
                      onClick={() => setActiveTab(3)}
                      className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transform hover:scale-105 transition flex items-center space-x-2"
                    >
                      <span>Continue to Generate</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Generate Tab */}
              {activeTab === 3 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="w-8 h-8 text-orange-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Generate</h3>
                    <p className="text-gray-600">Review your settings and create your AI soundtrack</p>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-200">
                      <div className="flex items-center space-x-3 mb-2">
                        <Film className="w-5 h-5 text-violet-600" />
                        <span className="font-semibold text-gray-900">Video</span>
                      </div>
                      <p className="text-sm text-gray-600">{videoFile?.name || 'No video selected'}</p>
                    </div>

                    <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-4 border border-pink-200">
                      <div className="flex items-center space-x-3 mb-2">
                        <Heart className="w-5 h-5 text-rose-600" />
                        <span className="font-semibold text-gray-900">Emotion</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Valence: {emotion.valence.toFixed(1)}, Arousal: {emotion.arousal.toFixed(1)}
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                      <div className="flex items-center space-x-3 mb-2">
                        <Music className="w-5 h-5 text-indigo-600" />
                        <span className="font-semibold text-gray-900">Music</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {generationParams.genre}, {generationParams.tempo} BPM
                      </p>
                    </div>
                  </div>

                  {/* Generate Button */}
                  <div className="text-center">
                    <button
                      onClick={handleGenerate}
                      disabled={!videoFile || isGenerating}
                      className={`
                        px-12 py-4 rounded-xl font-bold text-lg transition-all transform
                        ${videoFile && !isGenerating
                          ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:shadow-2xl hover:scale-105'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }
                      `}
                    >
                      {isGenerating ? (
                        <div className="flex items-center justify-center space-x-3">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>Generating Magic...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-3">
                          <PlayCircle className="w-6 h-6" />
                          <span>Generate Soundtrack</span>
                        </div>
                      )}
                    </button>

                    {videoFile && !isGenerating && (
                      <p className="text-sm text-gray-500 mt-3">
                        Estimated time: ~{Math.ceil(generationParams.max_length / 1.5)} seconds
                      </p>
                    )}
                  </div>

                  {/* Progress Display */}
                  {isGenerating && (
                    <div className="bg-gray-50 rounded-xl p-6">
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">Processing your video...</span>
                          <span className="font-bold text-violet-600">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="h-full bg-gradient-to-r from-violet-600 to-purple-600 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-600 text-center">
                          {progress < 30 && "🎬 Analyzing video content..."}
                          {progress >= 30 && progress < 60 && "🎨 Extracting emotional features..."}
                          {progress >= 60 && progress < 90 && "🎵 Composing your soundtrack..."}
                          {progress >= 90 && "✨ Finalizing audio output..."}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <button
                      onClick={() => setActiveTab(2)}
                      disabled={isGenerating}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition flex items-center space-x-2 disabled:opacity-50"
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" />
                      <span>Back</span>
                    </button>
                  </div>
                </div>
              )}

              {/* History Tab */}
              {activeTab === 4 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Clock className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Your Creation History</h3>
                    <p className="text-gray-600">Browse, replay, and download your previous generations</p>
                  </div>

                  <HistoryDisplay
                    historyItems={historyItems}
                    onPlayMusic={handlePlayMusic}
                    onDownload={handleDownload}
                    onDelete={handleDeleteHistory}
                    onRerun={handleRerun}
                    onShare={handleShare}
                  />

                  {historyItems.length > 0 && (
                    <div className="flex justify-center">
                      <button
                        onClick={() => setActiveTab(0)}
                        className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transform hover:scale-105 transition flex items-center space-x-2"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Create New Generation</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Results Tab */}
              {activeTab === 5 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Your Soundtrack is Ready!</h3>
                    <p className="text-gray-600">Download your AI-generated music or generate another version</p>
                  </div>

                  <ResultsDisplay
                    result={result}
                    isLoading={isGenerating}
                    error={error}
                  />

                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={() => {
                        reset();
                        setVideoFile(null);
                        setActiveTab(0);
                      }}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition"
                    >
                      Start New Project
                    </button>
                    <button
                      onClick={() => setActiveTab(3)}
                      className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transform hover:scale-105 transition"
                    >
                      Generate Another Version
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Floating Help Button */}
          <button className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center group">
            <span className="text-xl">💬</span>
            <span className="absolute right-full mr-3 bg-gray-900 text-white text-sm px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Need help?
            </span>
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </>
  );
};

export default HomePage;