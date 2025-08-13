// components/features/video/VideoUploader.tsx

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Video, X, FileVideo, AlertCircle, Film, Sparkles } from 'lucide-react';
import { VideoUploaderProps } from '../../../utils/types';

const VideoUploader: React.FC<VideoUploaderProps> = ({
  onVideoSelect,
  maxSize = 100 * 1024 * 1024, // 100MB
  acceptedFormats = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm'],
  isUploading = false,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setUploadError(null);

    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors.some((e: any) => e.code === 'file-too-large')) {
        setUploadError(`File is too large. Maximum size is ${Math.round(maxSize / (1024 * 1024))}MB`);
      } else if (rejection.errors.some((e: any) => e.code === 'file-invalid-type')) {
        setUploadError('Invalid file type. Please upload a video file.');
      } else {
        setUploadError('File upload failed. Please try again.');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      onVideoSelect(file);
    }
  }, [onVideoSelect, maxSize]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: acceptedFormats.reduce((acc, format) => ({ ...acc, [format]: [] }), {}),
    maxSize,
    multiple: false,
    disabled: isUploading,
  });

  const removeFile = () => {
    setSelectedFile(null);
    setUploadError(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.src = URL.createObjectURL(file);
    });
  };

  return (
    <div className="w-full">
      {!selectedFile ? (
        <div
          {...getRootProps()}
          className={`
            relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
            transition-all duration-300 transform hover:scale-[1.02]
            ${isDragActive && !isDragReject
              ? 'border-violet-500 bg-gradient-to-br from-violet-50 to-purple-50 shadow-lg scale-[1.02]'
              : ''
            }
            ${isDragReject
              ? 'border-red-500 bg-gradient-to-br from-red-50 to-pink-50 animate-pulse'
              : ''
            }
            ${!isDragActive
              ? 'border-gray-300 hover:border-violet-400 hover:bg-gradient-to-br hover:from-violet-50/50 hover:to-purple-50/50 hover:shadow-lg'
              : ''
            }
            ${isUploading
              ? 'pointer-events-none opacity-50'
              : ''
            }
          `}
        >
          <input {...getInputProps()} />

          <div className="flex flex-col items-center space-y-4">
            {/* Animated Icon Container */}
            <div className={`
              relative w-20 h-20 rounded-2xl flex items-center justify-center
              ${isDragActive
                ? 'bg-gradient-to-br from-violet-200 to-purple-200 animate-pulse'
                : 'bg-gradient-to-br from-gray-100 to-gray-200'
              }
              transition-all duration-300
            `}>
              {isUploading ? (
                <div className="animate-spin rounded-full h-10 w-10 border-3 border-violet-600 border-t-transparent"></div>
              ) : (
                <>
                  <Upload className={`
                    h-10 w-10 transition-all duration-300
                    ${isDragActive ? 'text-violet-600 scale-110' : 'text-gray-500'}
                  `} />
                  {/* Floating decoration */}
                  <div className="absolute -top-1 -right-1">
                    <Sparkles className="w-5 h-5 text-violet-500 animate-pulse" />
                  </div>
                </>
              )}
            </div>

            <div>
              <p className="text-xl font-semibold text-gray-900">
                {isDragActive ? '✨ Drop your video here' : 'Drop video file here'}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                or{' '}
                <span className="text-violet-600 font-semibold hover:text-violet-700 underline underline-offset-2">
                  browse files
                </span>
              </p>
            </div>

            {/* File Requirements */}
            <div className="flex flex-wrap gap-2 justify-center">
              <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-gray-600 shadow-sm border border-gray-200">
                📹 MP4, AVI, MOV, WMV, WebM
              </span>
              <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-gray-600 shadow-sm border border-gray-200">
                📦 Max {Math.round(maxSize / (1024 * 1024))}MB
              </span>
              <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-gray-600 shadow-sm border border-gray-200">
                ⏱️ 30s - 5min optimal
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-2 border-violet-200 rounded-2xl p-6 bg-gradient-to-br from-violet-50 to-purple-50 shadow-lg">
          <div className="flex items-start space-x-4">
            <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
              <FileVideo className="h-7 w-7 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {selectedFile.name}
              </h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-gray-600 font-medium">
                  {formatFileSize(selectedFile.size)}
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-sm text-gray-600">
                  {selectedFile.type.split('/')[1]?.toUpperCase()}
                </span>
              </div>

              {/* Video Duration */}
              <VideoDurationDisplay file={selectedFile} />

              {/* Success indicator */}
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-600 font-medium">Ready to process</span>
              </div>
            </div>

            {!isUploading && (
              <button
                onClick={removeFile}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
                title="Remove file"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {isUploading && (
            <div className="mt-4 p-3 bg-white/50 rounded-lg">
              <div className="flex items-center space-x-3 text-sm text-violet-700">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-violet-600 border-t-transparent"></div>
                <span className="font-medium">Processing video...</span>
              </div>
            </div>
          )}
        </div>
      )}

      {uploadError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 animate-shake">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-red-800">Upload Error</h4>
            <p className="text-sm text-red-700 mt-1">{uploadError}</p>
          </div>
        </div>
      )}

      {/* Pro Tips Card */}
      <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Film className="w-5 h-5 text-blue-600" />
          </div>
          <h4 className="text-sm font-semibold text-blue-900">Pro Tips for Best Results</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-700">
          <div className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">✓</span>
            <span>Use videos with clear visual content</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">✓</span>
            <span>30 seconds - 5 minutes works best</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">✓</span>
            <span>Varied scenes = dynamic music</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">✓</span>
            <span>Good lighting improves results</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper component for displaying video duration
const VideoDurationDisplay: React.FC<{ file: File }> = ({ file }) => {
  const [duration, setDuration] = useState<number | null>(null);

  React.useEffect(() => {
    const getDuration = async () => {
      try {
        const video = document.createElement('video');
        video.preload = 'metadata';

        const durationPromise = new Promise<number>((resolve) => {
          video.onloadedmetadata = () => {
            window.URL.revokeObjectURL(video.src);
            resolve(video.duration);
          };
        });

        video.src = URL.createObjectURL(file);
        const videoDuration = await durationPromise;
        setDuration(videoDuration);
      } catch (error) {
        console.error('Error getting video duration:', error);
      }
    };

    getDuration();
  }, [file]);

  if (duration === null) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <p className="text-sm text-gray-600 mt-1">
      <span className="font-medium">Duration:</span> {formatDuration(duration)}
    </p>
  );
};

export default VideoUploader;