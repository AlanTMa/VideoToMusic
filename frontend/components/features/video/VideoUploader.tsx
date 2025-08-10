// components/features/video/VideoUploader.tsx

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Video, X, FileVideo, AlertCircle } from 'lucide-react';
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
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Video</h2>
        <p className="text-gray-600">
          Select or drag and drop a video file to generate emotionally-aligned music
        </p>
      </div>

      {!selectedFile ? (
        <div
          {...getRootProps()}
          className={`
            relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
            ${isDragActive && !isDragReject ? 'border-primary-500 bg-primary-50' : ''}
            ${isDragReject ? 'border-red-500 bg-red-50' : ''}
            ${!isDragActive ? 'border-gray-300 hover:border-primary-400 hover:bg-gray-50' : ''}
            ${isUploading ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          <input {...getInputProps()} />

          <div className="flex flex-col items-center space-y-4">
            <div className={`
              w-16 h-16 rounded-full flex items-center justify-center
              ${isDragActive ? 'bg-primary-100' : 'bg-gray-100'}
            `}>
              {isUploading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              ) : (
                <Upload className={`h-8 w-8 ${isDragActive ? 'text-primary-600' : 'text-gray-400'}`} />
              )}
            </div>

            <div>
              <p className="text-lg font-medium text-gray-900">
                {isDragActive ? 'Drop your video here' : 'Drop video file here'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                or <span className="text-primary-600 font-medium">browse files</span>
              </p>
            </div>

            <div className="text-xs text-gray-400 space-y-1">
              <p>Supported formats: MP4, AVI, MOV, WMV, WebM</p>
              <p>Maximum file size: {Math.round(maxSize / (1024 * 1024))}MB</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl p-6 bg-white">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileVideo className="h-6 w-6 text-primary-600" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-medium text-gray-900 truncate">
                {selectedFile.name}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {formatFileSize(selectedFile.size)} • {selectedFile.type}
              </p>

              {/* Video Duration */}
              <VideoDurationDisplay file={selectedFile} />
            </div>

            {!isUploading && (
              <button
                onClick={removeFile}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {isUploading && (
            <div className="mt-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                <span>Processing video...</span>
              </div>
            </div>
          )}
        </div>
      )}

      {uploadError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-red-800">Upload Error</h4>
            <p className="text-sm text-red-700 mt-1">{uploadError}</p>
          </div>
        </div>
      )}

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Tips for Best Results</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Use videos with clear visual content and good lighting</li>
          <li>• Shorter videos (30 seconds - 5 minutes) work best</li>
          <li>• Videos with varied scenes produce more dynamic music</li>
          <li>• Consider the emotional tone you want to convey</li>
        </ul>
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
    <p className="text-sm text-gray-500 mt-1">
      Duration: {formatDuration(duration)}
    </p>
  );
};

export default VideoUploader;
