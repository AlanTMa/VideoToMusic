// utils/types.ts

export interface VideoFeatures {
  semantic: number[][];
  emotion: number[][];
  motion: number[];
  scene_offset: number[];
  text_emotion: number[];
}

export interface EmotionCoordinates {
  valence: number; // 0-1, where 0 = negative, 1 = positive
  arousal: number;  // 0-1, where 0 = calm, 1 = energetic
}

export interface ChordProgression {
  chords: number[];
  duration: number[];
  timestamps: number[];
}

export interface NoteSequence {
  notes: number[];
  velocities: number[];
  durations: number[];
  timestamps: number[];
}

export interface GeneratedMusic {
  chord_sequence: number[];
  note_outputs: {
    notes: number[][];
    velocities: number[][];
    durations: number[][];
  };
  instruments?: InstrumentTrack[];
}

export interface InstrumentTrack {
  instrument_id: number;
  instrument_name: string;
  midi_program: number;
  chord_sequence: number[];
  note_outputs: {
    notes: number[][];
    velocities: number[][];
    durations: number[][];
  };
}

export interface MusicGenerationRequest {
  video_file: File;
  text_description: string;
  emotion_params: EmotionCoordinates;
  generation_params: GenerationParameters;
}

export interface GenerationParameters {
  tempo: number;
  key: string;
  genre: string;
  max_length: number;
  temperature: number;
  num_instruments: number;
  real_time: boolean;
}

export interface EvaluationMetrics {
  emotion_alignment: number;
  musical_quality: MusicalQualityMetrics;
  temporal_coherence: number;
  harmonic_consistency: number;
}

export interface MusicalQualityMetrics {
  pitch_diversity: number;
  pitch_range: number;
  rhythm_regularity: number;
  harmonic_consonance: number;
  overall_quality: number;
}

export interface GenerationResult {
  session_id: string;
  generated_music: GeneratedMusic;
  evaluation: EvaluationMetrics;
  output_files: {
    midi_url: string;
    audio_url: string;
    video_with_music_url?: string;
  };
  processing_time: number;
  metadata: {
    model_version: string;
    generation_timestamp: string;
    video_duration: number;
  };
}

export interface TrainingProgress {
  epoch: number;
  total_epochs: number;
  train_loss: number;
  val_loss: number;
  learning_rate: number;
  metrics: {
    chord_accuracy: number;
    emotion_alignment: number;
    musical_quality: number;
  };
}

export interface ModelInfo {
  name: string;
  version: string;
  parameters: number;
  training_status: 'not_started' | 'training' | 'completed' | 'failed';
  last_updated: string;
  performance: EvaluationMetrics;
}

export interface VisualizationData {
  emotion_space: {
    coordinates: EmotionCoordinates[];
    labels: string[];
    colors: string[];
  };
  music_timeline: {
    timestamps: number[];
    emotions: EmotionCoordinates[];
    chords: string[];
    notes: number[];
  };
  feature_analysis: {
    semantic_features: number[][];
    motion_intensity: number[];
    scene_changes: number[];
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  message: string;
  code: string;
  details?: any;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface RealTimeUpdate {
  type: 'progress' | 'chunk' | 'complete' | 'error';
  data: any;
  timestamp: number;
}

// Component Props Types
export interface VideoUploaderProps {
  onVideoSelect: (file: File) => void;
  maxSize?: number;
  acceptedFormats?: string[];
  isUploading?: boolean;
}

export interface EmotionControlsProps {
  emotion: EmotionCoordinates;
  onChange: (emotion: EmotionCoordinates) => void;
  disabled?: boolean;
}

export interface MusicGeneratorProps {
  videoFile: File | null;
  textDescription: string;
  emotionParams: EmotionCoordinates;
  generationParams: GenerationParameters;
  onGenerate: () => void;
  isGenerating: boolean;
}

export interface ResultsDisplayProps {
  result: GenerationResult | null;
  isLoading: boolean;
  error: string | null;
}

export interface AudioPlayerProps {
  audioUrl: string;
  title?: string;
  autoPlay?: boolean;
  showWaveform?: boolean;
}

export interface EmotionVisualizerProps {
  data: VisualizationData;
  width?: number;
  height?: number;
  interactive?: boolean;
}

// Custom Hook Types
export interface UseVideoUploadResult {
  uploadVideo: (file: File) => Promise<void>;
  progress: UploadProgress | null;
  isUploading: boolean;
  error: string | null;
  reset: () => void;
}

export interface UseMusicGenerationResult {
  generateMusic: (request: MusicGenerationRequest) => Promise<GenerationResult>;
  isGenerating: boolean;
  progress: number;
  error: string | null;
  result: GenerationResult | null;
  reset: () => void;
}

export interface UseEmotionControlsResult {
  emotion: EmotionCoordinates;
  setEmotion: (emotion: EmotionCoordinates) => void;
  setValence: (valence: number) => void;
  setArousal: (arousal: number) => void;
  reset: () => void;
}

// Environment Configuration Types
export interface EnvironmentConfig {
  apiUrl: string;
  wsUrl: string;
  isDevelopment: boolean;
  isProduction: boolean;
  features: {
    realTimeGeneration: boolean;
    multiInstrument: boolean;
    training: boolean;
    evaluation: boolean;
  };
}

// Music Theory Types
export interface ChordInfo {
  id: number;
  name: string;
  notes: number[];
  quality: 'major' | 'minor' | 'diminished' | 'augmented' | 'sus2' | 'sus4' | '7th' | 'maj7';
  emotion_mapping: EmotionCoordinates;
}

export interface ScaleInfo {
  name: string;
  notes: number[];
  mode: string;
  emotion_tendency: EmotionCoordinates;
}

export interface MusicalGenre {
  id: string;
  name: string;
  tempo_range: [number, number];
  common_chords: ChordInfo[];
  characteristic_rhythms: string[];
  emotion_space: EmotionCoordinates[];
}

export default {};