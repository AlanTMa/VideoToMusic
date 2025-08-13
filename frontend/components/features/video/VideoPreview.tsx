// components/features/video/VideoPreview.tsx

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Video, Film, Maximize2 } from 'lucide-react';

interface VideoPreviewProps {
  file: File | null;
  className?: string;
}

const VideoPreview: React.FC<VideoPreviewProps> = ({ file, className }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const videoUrl = file ? URL.createObjectURL(file) : null;
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  // Auto-hide controls after 3 seconds of no mouse movement
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoaded(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleRestart = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
      if (!isPlaying) {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!file || !videoUrl) {
    return (
      <div className={`
        bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl
        flex items-center justify-center border-2 border-dashed border-gray-300
        ${className}
      `}>
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-md">
            <Film className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium">No video selected</p>
          <p className="text-gray-400 text-sm mt-1">Your preview will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative bg-black rounded-2xl overflow-hidden shadow-2xl group ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        muted={isMuted}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        className="w-full h-full object-contain"
      />

      {/* Center Play Button (shown when paused) */}
      {!isPlaying && isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity">
          <button
            onClick={handlePlayPause}
            className="w-20 h-20 bg-white/90 hover:bg-white rounded-full flex items-center justify-center transform hover:scale-110 transition-all shadow-2xl"
          >
            <Play className="h-10 w-10 text-gray-900 ml-1" />
          </button>
        </div>
      )}

      {/* Controls Overlay */}
      <div className={`
        absolute bottom-0 left-0 right-0
        bg-gradient-to-t from-black/90 via-black/50 to-transparent
        p-4 transition-all duration-300
        ${showControls || !isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}>
        {/* Progress Bar */}
        <div className="mb-4 group/progress">
          <div className="relative">
            {/* Progress track */}
            <div className="relative h-1 bg-white/20 rounded-full overflow-hidden group-hover/progress:h-2 transition-all">
              {/* Buffered progress (you could add buffering logic here) */}
              <div className="absolute inset-0 bg-white/10"></div>

              {/* Played progress */}
              <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                style={{ width: `${progressPercentage}%` }}
              />

              {/* Seek slider */}
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={!isLoaded}
              />

              {/* Hover indicator */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity"
                style={{ left: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Play/Pause Button */}
            <button
              onClick={handlePlayPause}
              disabled={!isLoaded}
              className="group/btn relative w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-600/20 to-purple-600/20 group-hover/btn:from-violet-600/30 group-hover/btn:to-purple-600/30 transition-all"></div>
              {isPlaying ? (
                <Pause className="h-5 w-5 text-white relative z-10" />
              ) : (
                <Play className="h-5 w-5 text-white ml-0.5 relative z-10" />
              )}
            </button>

            {/* Restart Button */}
            <button
              onClick={handleRestart}
              disabled={!isLoaded}
              className="group/btn relative w-8 h-8 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="h-4 w-4 text-white/90 group-hover/btn:text-white transition-colors" />
            </button>

            {/* Volume Button */}
            <button
              onClick={toggleMute}
              disabled={!isLoaded}
              className="group/btn relative w-8 h-8 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4 text-white/90 group-hover/btn:text-white transition-colors" />
              ) : (
                <Volume2 className="h-4 w-4 text-white/90 group-hover/btn:text-white transition-colors" />
              )}
            </button>

            {/* Volume Slider (shown when unmuted) */}
            {!isMuted && isLoaded && (
              <div className="w-20 h-8 flex items-center">
                <input
                  type="range"
                  min="0"
                  max="100"
                  defaultValue="100"
                  className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                  onChange={(e) => {
                    if (videoRef.current) {
                      videoRef.current.volume = parseInt(e.target.value) / 100;
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* Time Display */}
          <div className="flex items-center gap-3">
            <div className="text-white text-sm font-mono bg-black/30 backdrop-blur-sm px-3 py-1 rounded-lg">
              <span className="text-white/90">{formatTime(currentTime)}</span>
              <span className="text-white/50 mx-1">/</span>
              <span className="text-white/70">{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Gradient (for better visibility) */}
      <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/50 to-transparent pointer-events-none"></div>

      {/* Loading Overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-3 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-white/80 text-sm mt-3 font-medium">Loading video...</p>
          </div>
        </div>
      )}

      {/* File Info Badge */}
      {file && isLoaded && (
        <div className={`
          absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-2 rounded-lg
          transition-all duration-300
          ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}
        `}>
          <p className="text-white/90 text-xs font-medium truncate max-w-[200px]">
            {file.name}
          </p>
        </div>
      )}
    </div>
  );
};

export default VideoPreview;