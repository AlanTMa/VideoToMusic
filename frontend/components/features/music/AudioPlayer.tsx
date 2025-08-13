// components/features/music/AudioPlayer.tsx

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Download, Music, Disc, Activity } from 'lucide-react';
import { AudioPlayerProps } from '../../../utils/types';

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  title = 'Generated Music',
  autoPlay = false,
  showWaveform = true,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isHoveringWaveform, setIsHoveringWaveform] = useState(false);
  const [hoverPosition, setHoverPosition] = useState(0);

  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (audioUrl) {
      setIsLoading(true);
      if (audioRef.current) {
        audioRef.current.load();
      }
    }
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
      if (showWaveform) {
        generateWaveform();
      }
      if (autoPlay) {
        handlePlay();
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setIsLoading(false);
      console.error('Audio loading error');
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl, autoPlay, showWaveform]);

  const generateWaveform = async () => {
    if (!audioRef.current) return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const channelData = audioBuffer.getChannelData(0);
      const samples = 200;
      const blockSize = Math.floor(channelData.length / samples);
      const waveform = [];

      for (let i = 0; i < samples; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(channelData[i * blockSize + j]);
        }
        waveform.push(sum / blockSize);
      }

      setWaveformData(waveform);
      drawWaveform(waveform);
    } catch (error) {
      console.error('Error generating waveform:', error);
    }
  };

  const drawWaveform = (data: number[]) => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const barWidth = width / data.length;

    // Clear canvas with gradient background
    ctx.clearRect(0, 0, width, height);

    // Create gradient background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, 'rgba(139, 92, 246, 0.02)');
    bgGradient.addColorStop(1, 'rgba(139, 92, 246, 0.05)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Draw waveform bars
    data.forEach((value, index) => {
      const barHeight = value * height * 0.7;
      const x = index * barWidth;
      const y = (height - barHeight) / 2;

      const progress = currentTime / duration;
      const isPlayed = index < progress * data.length;

      // Create gradient for bars
      const barGradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
      if (isPlayed) {
        barGradient.addColorStop(0, '#a78bfa');
        barGradient.addColorStop(1, '#7c3aed');
      } else {
        barGradient.addColorStop(0, '#e5e7eb');
        barGradient.addColorStop(1, '#d1d5db');
      }

      ctx.fillStyle = barGradient;
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    });

    // Draw progress line
    if (duration > 0) {
      const progressX = (currentTime / duration) * width;

      // Glow effect
      ctx.shadowColor = '#8b5cf6';
      ctx.shadowBlur = 10;

      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(progressX, 0);
      ctx.lineTo(progressX, height);
      ctx.stroke();

      ctx.shadowBlur = 0;
    }

    // Draw hover indicator
    if (isHoveringWaveform) {
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(hoverPosition, 0);
      ctx.lineTo(hoverPosition, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  useEffect(() => {
    if (waveformData.length > 0) {
      drawWaveform(waveformData);
    }
  }, [currentTime, duration, waveformData, isHoveringWaveform, hoverPosition]);

  const handlePlay = async () => {
    if (!audioRef.current) return;

    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('Play failed:', error);
    }
  };

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!audioRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / canvas.width;
    const newTime = percentage * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setHoverPosition(x);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `${title}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <Music className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="text-sm text-violet-100">
                Duration: {duration > 0 ? formatTime(duration) : '--:--'}
              </p>
            </div>
          </div>
          <button
            onClick={handleDownload}
            className="p-2.5 bg-white/20 backdrop-blur-sm rounded-lg text-white hover:bg-white/30 transition-all"
            title="Download audio"
          >
            <Download className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Waveform */}
        {showWaveform && (
          <div className="mb-6 relative">
            <div className="absolute -top-2 -right-2 flex items-center gap-1.5 text-xs">
              <Activity className="w-3 h-3 text-violet-500" />
              <span className="text-violet-600 font-medium">Waveform</span>
            </div>
            <canvas
              ref={canvasRef}
              width={600}
              height={100}
              onClick={handleSeek}
              onMouseMove={handleMouseMove}
              onMouseEnter={() => setIsHoveringWaveform(true)}
              onMouseLeave={() => setIsHoveringWaveform(false)}
              className="w-full h-24 rounded-xl cursor-pointer border border-violet-200 shadow-inner hover:shadow-md transition-shadow"
            />
            {/* Time indicator on hover */}
            {isHoveringWaveform && canvasRef.current && (
              <div
                className="absolute -top-8 bg-gray-900 text-white text-xs px-2 py-1 rounded pointer-events-none"
                style={{
                  left: `${hoverPosition}px`,
                  transform: 'translateX(-50%)'
                }}
              >
                {formatTime((hoverPosition / canvasRef.current.width) * duration)}
              </div>
            )}
          </div>
        )}

        {/* Progress Bar (fallback if no waveform) */}
        {!showWaveform && (
          <div className="mb-6">
            <div className="relative">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={(e) => {
                  const time = parseFloat(e.target.value);
                  if (audioRef.current) {
                    audioRef.current.currentTime = time;
                    setCurrentTime(time);
                  }
                }}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Play/Pause Button */}
            <button
              onClick={isPlaying ? handlePause : handlePlay}
              disabled={isLoading}
              className="group relative w-14 h-14 bg-gradient-to-br from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-full flex items-center justify-center transition-all transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 shadow-lg"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
              ) : isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 ml-0.5" />
              )}

              {/* Pulse effect when playing */}
              {isPlaying && !isLoading && (
                <div className="absolute inset-0 rounded-full bg-violet-600 animate-ping opacity-20"></div>
              )}
            </button>

            {/* Time Display */}
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg px-4 py-2 border border-violet-200">
              <div className="flex items-center gap-2 text-sm font-mono">
                <span className="text-violet-700 font-semibold">{formatTime(currentTime)}</span>
                <span className="text-violet-400">/</span>
                <span className="text-violet-600">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Playing indicator */}
            {isPlaying && (
              <div className="flex items-center gap-2">
                <Disc className="w-5 h-5 text-violet-600 animate-spin" />
                <span className="text-sm text-violet-600 font-medium">Playing</span>
              </div>
            )}
          </div>

          {/* Volume Controls */}
          <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2">
            <button
              onClick={toggleMute}
              className="p-1.5 text-gray-500 hover:text-violet-600 transition-colors"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </button>

            <div className="relative w-24">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-full h-1.5 bg-gray-300 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${(isMuted ? 0 : volume) * 100}%, #d1d5db ${(isMuted ? 0 : volume) * 100}%, #d1d5db 100%)`
                }}
              />
            </div>

            <span className="text-xs text-gray-500 font-medium w-10 text-right">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;