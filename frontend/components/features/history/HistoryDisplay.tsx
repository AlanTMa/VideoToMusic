// components/features/history/HistoryDisplay.tsx

import React, { useState } from 'react';
import {
  Clock,
  Play,
  Download,
  Trash2,
  RotateCcw,
  Share2,
  Film,
  Music,
  Heart,
  FileVideo,
  HardDrive,
  Calendar,
  AlertCircle,
  Grid3X3,
  List
} from 'lucide-react';
import { HistoryItem } from '../../../types';
import { formatFileSize, formatDuration } from '../../../utils/helpers';

interface HistoryDisplayProps {
  historyItems: HistoryItem[];
  onPlayMusic: (item: HistoryItem) => void;
  onDownload: (item: HistoryItem, type: 'audio' | 'midi') => void;
  onDelete: (id: string) => void;
  onRerun: (item: HistoryItem) => void;
  onShare: (item: HistoryItem) => void;
  className?: string;
}

const HistoryDisplay: React.FC<HistoryDisplayProps> = ({
  historyItems,
  onPlayMusic,
  onDownload,
  onDelete,
  onRerun,
  onShare,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const formatTimestamp = (timestamp: Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const getEmotionLabel = (valence: number, arousal: number) => {
    if (valence > 0.7 && arousal > 0.7) return 'Excited';
    if (valence > 0.7 && arousal < 0.3) return 'Content';
    if (valence < 0.3 && arousal > 0.7) return 'Angry';
    if (valence < 0.3 && arousal < 0.3) return 'Sad';
    if (arousal > 0.7) return 'Energetic';
    if (arousal < 0.3) return 'Calm';
    return 'Neutral';
  };

  const getEmotionColor = (valence: number, arousal: number) => {
    if (valence > 0.7 && arousal > 0.7) return 'text-orange-600 bg-orange-100';
    if (valence > 0.7 && arousal < 0.3) return 'text-green-600 bg-green-100';
    if (valence < 0.3 && arousal > 0.7) return 'text-red-600 bg-red-100';
    if (valence < 0.3 && arousal < 0.3) return 'text-blue-600 bg-blue-100';
    if (arousal > 0.7) return 'text-purple-600 bg-purple-100';
    if (arousal < 0.3) return 'text-gray-600 bg-gray-100';
    return 'text-gray-600 bg-gray-100';
  };

  if (historyItems.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Clock className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No History Yet</h3>
        <p className="text-gray-600 mb-6">
          Your generated music will appear here for easy access and re-download
        </p>
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-200 max-w-md mx-auto">
          <div className="flex items-center justify-center space-x-2 text-violet-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Pro Tip</span>
          </div>
          <p className="text-sm text-violet-600 mt-1">
            Generate your first soundtrack to start building your music library!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Your Music History</h3>
          <p className="text-gray-600">{historyItems.length} generated soundtrack{historyItems.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="flex items-center space-x-3">
          {/* View mode toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-violet-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-violet-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Clear all button */}
          {historyItems.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to clear all history? This cannot be undone.')) {
                  historyItems.forEach(item => onDelete(item.id));
                }
              }}
              className="px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* History items */}
      <div className={
        viewMode === 'grid'
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
          : 'space-y-4'
      }>
        {historyItems.map((item) => (
          <div
            key={item.id}
            className={`bg-white rounded-xl border border-gray-200 hover:border-violet-300 hover:shadow-lg transition-all ${
              viewMode === 'list' ? 'p-4' : 'p-6'
            }`}
          >
            {/* Video thumbnail and basic info */}
            <div className={`flex ${viewMode === 'list' ? 'items-center space-x-4' : 'flex-col space-y-4'}`}>
              {/* Thumbnail placeholder */}
              <div className={`
                bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center
                ${viewMode === 'list' ? 'w-16 h-16 flex-shrink-0' : 'w-full h-32'}
              `}>
                {item.videoThumbnail ? (
                  <img
                    src={item.videoThumbnail}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <FileVideo className={`text-gray-400 ${viewMode === 'list' ? 'w-8 h-8' : 'w-12 h-12'}`} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* File name and timestamp */}
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-gray-900 truncate" title={item.videoFile.name}>
                    {item.videoFile.name}
                  </h4>
                  {viewMode === 'grid' && (
                    <button
                      onClick={() => onDelete(item.id)}
                      className="text-gray-400 hover:text-red-500 ml-2 flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center text-sm text-gray-500 mb-3">
                  <Calendar className="w-3 h-3 mr-1" />
                  {formatTimestamp(item.timestamp)}
                  <span className="mx-2">•</span>
                  <HardDrive className="w-3 h-3 mr-1" />
                  {formatFileSize(item.videoFile.size)}
                </div>

                {/* Generation details */}
                <div className="space-y-2 mb-4">
                  {/* Emotion */}
                  <div className="flex items-center space-x-2">
                    <Heart className="w-4 h-4 text-gray-400" />
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      getEmotionColor(item.emotionParams.valence, item.emotionParams.arousal)
                    }`}>
                      {getEmotionLabel(item.emotionParams.valence, item.emotionParams.arousal)}
                    </span>
                  </div>

                  {/* Music info */}
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Music className="w-4 h-4 text-gray-400" />
                    <span className="capitalize">{item.generationParams.genre}</span>
                    <span>•</span>
                    <span>{item.generationParams.tempo} BPM</span>
                    <span>•</span>
                    <span>{item.selectedInstruments.length} instrument{item.selectedInstruments.length !== 1 ? 's' : ''}</span>
                  </div>

                  {/* Quality score */}
                  {item.result.musical_quality && (
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="text-gray-500">Quality:</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-violet-500 to-purple-500 h-2 rounded-full"
                          style={{ width: `${item.result.musical_quality.overall_quality * 100}%` }}
                        />
                      </div>
                      <span className="text-gray-700 font-medium">
                        {Math.round(item.result.musical_quality.overall_quality * 100)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className={`flex ${viewMode === 'list' ? 'space-x-2' : 'grid grid-cols-2 gap-2'}`}>
                  <button
                    onClick={() => onPlayMusic(item)}
                    className="flex items-center justify-center px-3 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:shadow-md transition text-sm"
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Play
                  </button>

                  <div className="flex space-x-1">
                    <button
                      onClick={() => onDownload(item, 'audio')}
                      className="flex items-center justify-center px-2 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm flex-1"
                      title="Download Audio"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onRerun(item)}
                      className="flex items-center justify-center px-2 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
                      title="Re-run Generation"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    {viewMode === 'list' && (
                      <button
                        onClick={() => onDelete(item.id)}
                        className="flex items-center justify-center px-2 py-2 border border-gray-300 text-red-600 rounded-lg hover:bg-red-50 transition text-sm"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryDisplay;