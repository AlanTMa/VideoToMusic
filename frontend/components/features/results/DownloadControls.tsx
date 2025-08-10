
// components/features/results/DownloadControls.tsx

import React, { useState } from 'react';
import { Download, FileAudio, FileVideo, Music, Share2, Copy, Check } from 'lucide-react';
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

  const downloadOptions = [
    {
      type: 'audio' as const,
      title: 'Audio File (WAV)',
      description: 'High-quality audio file compatible with all players',
      icon: FileAudio,
      size: '~2-8 MB',
      color: 'text-blue-600 bg-blue-50 border-blue-200',
    },
    {
      type: 'midi' as const,
      title: 'MIDI File',
      description: 'Musical notation data for editing in DAWs',
      icon: Music,
      size: '~1-5 KB',
      color: 'text-green-600 bg-green-50 border-green-200',
    },
  ];

  if (result.output_files.video_with_music_url) {
    downloadOptions.push({
      type: 'video' as const,
      title: 'Video with Music',
      description: 'Your original video with the generated soundtrack',
      icon: FileVideo,
      size: '~5-50 MB',
      color: 'text-purple-600 bg-purple-50 border-purple-200',
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Download Your Music</h3>
        <p className="text-gray-600">
          Choose from multiple formats and share your creation
        </p>
      </div>

      {/* Download Options */}
      <div className="space-y-4">
        {downloadOptions.map((option) => {
          const Icon = option.icon;
          const isDownloading = downloadingFile === option.type;

          return (
            <div
              key={option.type}
              className={`border rounded-lg p-4 transition-all ${option.color}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white bg-opacity-50 rounded-lg flex items-center justify-center">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-medium">{option.title}</h4>
                    <p className="text-sm opacity-80">{option.description}</p>
                    <p className="text-xs opacity-60 mt-1">
                      Estimated size: {option.size}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDownload(option.type)}
                  disabled={isDownloading}
                  className="flex items-center space-x-2 bg-white bg-opacity-80 hover:bg-opacity-100 px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                >
                  {isDownloading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
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

      {/* Bulk Download */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Download All Files</h4>
            <p className="text-sm text-gray-600">Get all formats in a single ZIP file</p>
          </div>
          <button className="flex items-center space-x-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
            <Download className="h-4 w-4" />
            <span>Download ZIP</span>
          </button>
        </div>
      </div>

      {/* Sharing */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Share2 className="h-5 w-5 mr-2" />
          Share Your Creation
        </h4>

        {!shareLink ? (
          <button
            onClick={generateShareLink}
            className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Generate Share Link
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-mono text-sm"
              />
              <button
                onClick={copyShareLink}
                className={`p-3 rounded-lg transition-colors ${
                  linkCopied
                    ? 'bg-green-100 text-green-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Share this link to let others listen to your generated music (expires in 30 days)
            </p>
          </div>
        )}
      </div>

      {/* Usage Rights */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2">📄 Usage Rights</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• You own full rights to the generated music</li>
          <li>• Free to use for personal and commercial projects</li>
          <li>• No attribution required (but appreciated!)</li>
          <li>• Cannot be used to train competing AI models</li>
        </ul>
      </div>
    </div>
  );
};

export default DownloadControls;