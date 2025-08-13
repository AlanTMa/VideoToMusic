// utils/types.ts - Complete types file

// Core types for MusicPairer application

export interface EmotionParams {
  valence: number // 0-1, negative to positive
  arousal: number // 0-1, calm to energetic
}

export interface VideoFeatures {
  semantic: number[][]
  emotion: number[][]
  motion: number[]
  scene_offset: number[]
  text_emotion: number[]
}

export interface MusicalQuality {
  overall_quality: number
  pitch_diversity: number
  harmonic_consonance: number
  rhythm_regularity: number
  pitch_range?: number
}

export interface GenerationParameters {
  tempo: number
  key: string
  genre: string
  max_length: number
  temperature: number
  num_instruments: number
  real_time: boolean
}

export interface MusicGenerationRequest {
  video_file: File
  text_description: string
  emotion_params: EmotionParams
  generation_params: GenerationParameters
}

export interface GenerationResult {
  session_id: string
  emotion_alignment: number
  musical_quality: MusicalQuality
  audio_url: string
  midi_download_url: string
  audio_download_url: string
  processing_time?: number
  video_duration?: number
}

export interface GenerationResults {
  session_id: string
  emotion_alignment: number
  musical_quality: MusicalQuality
  audio_url: string
  midi_download_url: string
  audio_download_url: string
  processing_time?: number
  video_duration?: number
}

export interface UseMusicGenerationResult {
  generateMusic: (request: MusicGenerationRequest) => Promise<GenerationResult>
  isGenerating: boolean
  progress: number
  error: string | null
  result: GenerationResult | null
  reset: () => void
}

// History types
export interface HistoryItem {
  id: string
  timestamp: Date
  videoFile: {
    name: string
    size: number
    type: string
  }
  videoThumbnail?: string // base64 encoded thumbnail
  emotionParams: EmotionParams
  generationParams: GenerationParameters
  selectedInstruments: string[]
  textDescription: string
  result: GenerationResults
}

export interface UseHistoryResult {
  historyItems: HistoryItem[]
  addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void
  removeFromHistory: (id: string) => void
  clearHistory: () => void
  getHistoryItem: (id: string) => HistoryItem | undefined
}

export interface ProcessingStage {
  id: string
  name: string
  description: string
  progress: number
  completed: boolean
}

export interface APIError {
  error: string
  code?: string
  details?: any
}

export interface VideoFile {
  file: File
  url: string
  duration?: number
  size: number
  type: string
}

export interface AudioPlayerState {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  muted: boolean
}

export interface MIDIData {
  tracks: MIDITrack[]
  ticksPerQuarter: number
  tempo: number
}

export interface MIDITrack {
  name: string
  instrument: number
  notes: MIDINote[]
  isDrum: boolean
}

export interface MIDINote {
  pitch: number
  velocity: number
  startTime: number
  duration: number
}

export interface ChordProgression {
  chords: Chord[]
  key: string
  tempo: number
}

export interface Chord {
  root: string
  quality: string // 'major', 'minor', 'diminished', etc.
  notes: string[]
  startTime: number
  duration: number
}

export interface EmotionMapping {
  valence: number
  arousal: number
  label: string
  color: string
  chordTypes: string[]
}

// Russell's Circumplex Model emotions
export enum EmotionLabel {
  EXCITED = 'excited',
  HAPPY = 'happy',
  CONTENT = 'content',
  RELAXED = 'relaxed',
  CALM = 'calm',
  NEUTRAL = 'neutral',
  SAD = 'sad',
  DEPRESSED = 'depressed',
  ANGRY = 'angry',
  TENSE = 'tense',
  FEARFUL = 'fearful'
}

export interface UserPreferences {
  defaultGenre: string
  preferredTempo: number
  emotionSensitivity: number
  audioQuality: 'low' | 'medium' | 'high'
  autoPlay: boolean
  showAdvancedControls: boolean
}

export interface AnalysisMetrics {
  videoAnalysisTime: number
  musicGenerationTime: number
  totalProcessingTime: number
  videoFrameCount: number
  audioSampleRate: number
  midiEventCount: number
}

// API Response types
export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: APIError
  timestamp: string
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy'
  version: string
  modelLoaded: boolean
  uptime: number
}

// Form validation types
export interface ValidationError {
  field: string
  message: string
}

export interface FormState {
  isValid: boolean
  errors: ValidationError[]
  touched: Record<string, boolean>
}

// File upload types
export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface FileValidation {
  maxSize: number
  allowedTypes: string[]
  maxDuration?: number
}

// Theme and styling types
export interface ThemeMode {
  mode: 'light' | 'dark' | 'auto'
}

export interface ColorPalette {
  primary: string
  secondary: string
  success: string
  warning: string
  error: string
  info: string
}

// Component prop types
export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
  'data-testid'?: string
}

export interface LoadingProps extends BaseComponentProps {
  size?: 'small' | 'medium' | 'large'
  variant?: 'circular' | 'linear'
  message?: string
}

export interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: any
}

// Analytics and tracking types
export interface AnalyticsEvent {
  name: string
  properties: Record<string, any>
  timestamp: Date
  userId?: string
  sessionId: string
}

export interface UsageStats {
  totalGenerations: number
  averageProcessingTime: number
  successRate: number
  popularEmotions: EmotionParams[]
  userRetention: number
}

// Export utility type helpers
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredNonNull<T> = { [P in keyof T]-?: NonNullable<T[P]> }
export type DeepPartial<T> = { [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P] }