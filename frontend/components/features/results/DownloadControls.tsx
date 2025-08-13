// components/features/results/DownloadControls.tsx

import React, { useState } from 'react';
import { Download, FileAudio, FileVideo, Music, Share2, Copy, Check, Package, Shield, Link } from 'lucide-react';
import { GenerationResult } from '../../../utils/types';
import { downloadFile } from '../../../utils/api';

interface DownloadControlsProps {
  result: GenerationResult;
}

const DownloadControls: React.FC<DownloadControlsProps> = ({ result }) => {
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string>('');
  const [linkCopied, setLinkCopied] = useState(false);

  const handleDownload = async (fileType: 'midi' | 'audio' | 'video') => {
    setDownloadingFile(fileType);

    try {
      const blob = await downloadFile(result.session_id, fileType);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const extension = fileType === 'midi' ? 'mid' : fileType === 'audio' ? 'wav' : 'mp4';
      link.download = `silentvideosynth_${fileType}_${result.session_id}.${extension}`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Failed to download ${fileType}:`, error);
    } finally {
      setDownloadingFile(null);
    }
  };

  const generateShareLink = () => {
    const link = `${window.location.origin}/shared/${result.session_id}`;
    setShareLink(link);
  };

  const copyShareLink = async () => {
    if (shareLink) {
      await navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const downloadOptions: Array<{
    type: 'audio' | 'midi' | 'video';
    title: string;
    description: string;
    icon: React.ComponentType<any>;
    size: string;
    emoji: string;
    gradient: string;
  }> = [
    {
      type: 'audio' as const,
      title: 'Audio File (WAV)',
      description: 'High-quality audio file compatible with all players',
      icon: FileAudio,
      size: '~2-8 MB',
      emoji: '🎵',
      gradient: 'from-blue-400 to-indigo-500',
    },
    {
      type: 'midi' as const,
      title: 'MIDI File',
      description: 'Musical notation data for editing in DAWs',
      icon: Music,
      size: '~1-5 KB',
      emoji: '🎹',
      gradient: 'from-green-400 to-emerald-500',
    },
  ];

  if (result.output_files.video_with_music_url) {
    downloadOptions.push({
      type: 'video' as const,
      title: 'Video with Music',
      description: 'Your original video with the generated soundtrack',
      icon: FileVideo,
      size: '~5-50 MB',
      emoji: '🎬',
      gradient: 'from-purple-400 to-pink-500',
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Download Your Creation
        </h3>
        <p className="text-gray-600">
          Choose from multiple formats and share your AI-generated music
        </p>
      </div>

      {/* Download Options - Enhanced */}
      <div className="space-y-4">
        {downloadOptions.map((option) => {
          const Icon = option.icon;
          const isDownloading = downloadingFile === option.type;

          return (
            <div
              key={option.type}
              className={`
                relative overflow-hidden border-2 rounded-xl p-5 transition-all duration-300 hover:shadow-lg
                ${isDownloading
                  ? 'border-violet-400 bg-gradient-to-br from-violet-50 to-purple-50'
                  : 'border-gray-200 bg-white hover:border-violet-300'
                }
              `}
            >
              {/* Background gradient decoration */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${option.gradient} opacity-10 rounded-full blur-3xl`}></div>

              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 bg-gradient-to-br ${option.gradient} rounded-xl flex items-center justify-center shadow-md`}>
                    <span className="text-2xl">{option.emoji}</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{option.title}</h4>
                    <p className="text-sm text-gray-600 mt-0.5">{option.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        📦 {option.size}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDownload(option.type)}
                  disabled={isDownloading}
                  className={`
                    flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all transform
                    ${isDownloading
                      ? 'bg-violet-600 text-white'
                      : 'bg-gradient-to-r ' + option.gradient + ' text-white hover:shadow-md hover:scale-105'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                  `}
                >
                  {isDownloading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Downloading...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>Download</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bulk Download - Enhanced */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-5 rounded-full blur-3xl"></div>

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-semibold text-lg">Download All Files</h4>
              <p className="text-sm text-gray-300">Get all formats in a single ZIP file</p>
            </div>
          </div>
          <button className="flex items-center gap-2 bg-white text-gray-900 px-5 py-2.5 rounded-lg hover:bg-gray-100 transition-all font-medium">
            <Download className="h-4 w-4" />
            <span>Download ZIP</span>
          </button>
        </div>
      </div>

      {/* Sharing - Enhanced */}
      <div className="bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-200 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Share2 className="h-5 w-5 text-violet-600" />
          Share Your Creation
        </h4>

        {!shareLink ? (
          <button
            onClick={generateShareLink}
            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:shadow-lg transform hover:scale-[1.02] transition-all font-medium"
          >
            <div className="flex items-center justify-center gap-2">
              <Link className="h-4 w-4" />
              <span>Generate Share Link</span>
            </div>
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 px-4 py-3 border border-violet-300 rounded-lg bg-white text-gray-700 font-mono text-sm"
              />
              <button
                onClick={copyShareLink}
                className={`
                  p-3 rounded-lg transition-all transform
                  ${linkCopied
                    ? 'bg-green-100 text-green-600 scale-110'
                    : 'bg-violet-100 text-violet-600 hover:bg-violet-200 hover:scale-105'
                  }
                `}
              >
                {linkCopied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-violet-700 bg-violet-100 px-3 py-2 rounded-lg">
              <Shield className="h-3 w-3" />
              <span>Share link expires in 30 days • Your music is private by default</span>
            </div>
          </div>
        )}
      </div>

      {/* Usage Rights - Enhanced */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Usage Rights & License
        </h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">✓</span>
            <span className="text-blue-800">Full ownership rights</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">✓</span>
            <span className="text-blue-800">Commercial use allowed</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">✓</span>
            <span className="text-blue-800">No attribution required</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-orange-600 mt-0.5">⚠</span>
            <span className="text-blue-800">Can't train AI models</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadControls;