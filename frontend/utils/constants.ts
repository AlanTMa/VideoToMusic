// frontend/utils/constants.ts

// Application constants
export const APP_NAME = 'SilentVideoSynth';
export const APP_DESCRIPTION = 'Generate emotionally-aligned music for your silent videos';
export const APP_VERSION = '1.0.0';

// File upload constraints
export const FILE_CONSTRAINTS = {
  VIDEO: {
    MAX_SIZE: 100 * 1024 * 1024, // 100MB
    ACCEPTED_TYPES: [
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/webm',
      'video/mkv'
    ],
    MAX_DURATION: 300, // 5 minutes in seconds
    MIN_DURATION: 5 // 5 seconds
  }
} as const;

// Russell's Circumplex Model emotions
export const EMOTIONS = {
  CATEGORIES: [
    'exciting',
    'fearful',
    'tense',
    'sad',
    'relaxing',
    'neutral'
  ],
  COORDINATES: {
    excited: { valence: 0.8, arousal: 0.8 },
    happy: { valence: 0.8, arousal: 0.6 },
    content: { valence: 0.7, arousal: 0.3 },
    relaxed: { valence: 0.6, arousal: 0.2 },
    calm: { valence: 0.5, arousal: 0.1 },
    sad: { valence: 0.2, arousal: 0.3 },
    depressed: { valence: 0.1, arousal: 0.2 },
    angry: { valence: 0.2, arousal: 0.8 },
    tense: { valence: 0.3, arousal: 0.7 },
    neutral: { valence: 0.5, arousal: 0.5 }
  }
} as const;

// Musical parameters
export const MUSIC = {
  GENRES: [
    'electronic',
    'classical',
    'jazz',
    'ambient',
    'cinematic',
    'pop',
    'rock'
  ],
  INSTRUMENTS: [
    { id: 0, name: 'Piano', program: 0 },
    { id: 1, name: 'Electric Piano', program: 4 },
    { id: 2, name: 'Strings', program: 48 },
    { id: 3, name: 'Synthesizer', program: 80 },
    { id: 4, name: 'Percussion', program: 0, isDrum: true }
  ],
  CHORD_TYPES: [
    'M',    // Major
    'm',    // Minor
    'M7',   // Major 7th
    'm7',   // Minor 7th
    'sus4', // Suspended 4th
    'sus2', // Suspended 2nd
    'dim',  // Diminished
    'aug',  // Augmented
    'add9', // Add 9th
    '7'     // Dominant 7th
  ],
  TEMPO: {
    MIN: 60,
    MAX: 180,
    DEFAULT: 120
  },
  DURATION: {
    MIN: 10,
    MAX: 300,
    DEFAULT: 30
  }
} as const;

// UI constants
export const UI = {
  BREAKPOINTS: {
    XS: 320,
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280,
    '2XL': 1536
  },
  ANIMATION: {
    DURATION: {
      FAST: 150,
      NORMAL: 300,
      SLOW: 500
    },
    EASING: {
      DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
      IN: 'cubic-bezier(0.4, 0, 1, 1)',
      OUT: 'cubic-bezier(0, 0, 0.2, 1)',
      IN_OUT: 'cubic-bezier(0.4, 0, 0.2, 1)'
    }
  },
  COLORS: {
    PRIMARY: '#3B82F6',
    SECONDARY: '#8B5CF6',
    SUCCESS: '#10B981',
    WARNING: '#F59E0B',
    ERROR: '#EF4444',
    INFO: '#06B6D4'
  }
} as const;

// Generation states
export const GENERATION_STATES = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  EXTRACTING_FEATURES: 'extracting_features',
  ENCODING_EMOTIONS: 'encoding_emotions',
  GENERATING_MUSIC: 'generating_music',
  SYNTHESIZING_AUDIO: 'synthesizing_audio',
  COMPLETED: 'completed',
  ERROR: 'error'
} as const;

// WebSocket events
export const WS_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  GENERATION_START: 'generation_start',
  GENERATION_PROGRESS: 'generation_progress',
  GENERATION_COMPLETE: 'generation_complete',
  GENERATION_ERROR: 'generation_error',
  FEATURE_EXTRACTION_COMPLETE: 'feature_extraction_complete',
  EMOTION_ENCODING_COMPLETE: 'emotion_encoding_complete'
} as const;

// Error messages
export const ERROR_MESSAGES = {
  FILE_TOO_LARGE: 'File size exceeds the maximum limit',
  INVALID_FILE_TYPE: 'Invalid file type. Please upload a video file',
  NETWORK_ERROR: 'Network error. Please check your connection',
  SERVER_ERROR: 'Server error. Please try again later',
  GENERATION_FAILED: 'Music generation failed. Please try again',
  UPLOAD_FAILED: 'File upload failed. Please try again'
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  UPLOAD_COMPLETE: 'Video uploaded successfully'
} as const;