# 🎬🎵 SilentVideoSynth: Multimodal Emotion-Driven Music Generation for General Videos

**A Complete End-to-End Implementation Guide**

---

## 🎯 **Project Overview**

**SilentVideoSynth** is an advanced AI system that generates emotionally-aligned background music for silent videos by combining visual analysis with user-provided text descriptions. The system uses a hybrid Transformer-LSTM architecture to create dynamic soundtracks that adapt to video content in real-time.

### **Key Innovation Points:**
- **Multimodal Emotion Encoding**: Maps both video features and text to Russell's Circumplex Model (Valence × Arousal)
- **Hybrid Architecture**: Transformer for macro-structure + LSTM for micro-expressiveness
- **Real-time Generation**: Web-based interface for instant music generation
- **MIDI + Audio Pipeline**: Complete synthesis from features to playable audio

### **System Architecture Flow:**
```
Input Video + User Text → Feature Extraction & Emotion Encoding →
Hybrid Model (Transformer + LSTM) → Generated Music (MIDI) → Audio Synthesis → Output
```

---

## 📋 **SECTION 1: SETUP & DEPENDENCIES**

### **Core Requirements**
```bash
# Deep Learning Framework
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Computer Vision & Video Processing
pip install opencv-python
pip install moviepy
pip install pillow
pip install scikit-image

# Audio & Music Processing
pip install librosa
pip install pretty_midi
pip install mido
pip install soundfile
pip install pydub

# Multimodal & NLP
pip install transformers
pip install clip-by-openai
pip install sentence-transformers

# Scientific Computing
pip install numpy
pip install pandas
pip install matplotlib
pip install seaborn
pip install scipy

# Web Interface (for deployment section)
npm install next react react-dom
npm install @emotion/react @emotion/styled
npm install axios
```

### **Import Configuration**
```python
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
import numpy as np
import cv2
import librosa
import pretty_midi
from transformers import CLIPProcessor, CLIPModel, AutoTokenizer, AutoModel
import matplotlib.pyplot as plt
import pandas as pd
from pathlib import Path
import json
import warnings
warnings.filterwarnings('ignore')

# Set device
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Using device: {device}")
```

---

## 📊 **SECTION 2: DATASET LOADING & PREPROCESSING**

### **2.1 Multimodal Dataset Structure**

Following the MuVi-Sync dataset structure, our dataset contains paired video-music samples with rich annotations:

```python
class VideoMusicDataset:
    """
    Multimodal dataset class inspired by MuVi-Sync
    Contains video features, music features, and emotional annotations
    """

    def __init__(self, data_path, video_fps=1, max_duration=30):
        self.data_path = Path(data_path)
        self.video_fps = video_fps  # Extract 1 frame per second
        self.max_duration = max_duration

        # Load dataset metadata
        self.metadata = self._load_metadata()

        # Initialize feature extractors
        self.clip_model, self.clip_processor = self._load_clip()

    def _load_metadata(self):
        """Load dataset metadata with video-music pairs"""
        # Sample dataset structure
        metadata = {
            'samples': [
                {
                    'id': 'sample_001',
                    'video_path': 'videos/sample_001.mp4',
                    'audio_path': 'audio/sample_001.wav',
                    'duration': 25.3,
                    'genre': 'electronic',
                    'emotion_labels': {'valence': 0.7, 'arousal': 0.6},
                    'description': 'Upbeat electronic music with energetic visuals'
                },
                # ... more samples
            ]
        }
        return metadata

    def _load_clip(self):
        """Initialize CLIP model for multimodal feature extraction"""
        model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        model.to(device)
        return model, processor

# Initialize dataset
dataset = VideoMusicDataset('data/muvi_sync_style')
```

### **2.2 Video Feature Extraction**

We extract four key features from video frames following the Video2Music methodology:

```python
class VideoFeatureExtractor:
    """
    Extract semantic, emotion, motion, and scene features from video
    """

    def __init__(self, clip_model, clip_processor):
        self.clip_model = clip_model
        self.clip_processor = clip_processor

        # Emotion categories for CLIP-based emotion detection
        self.emotion_categories = [
            'exciting', 'fearful', 'tense', 'sad', 'relaxing', 'neutral'
        ]

    def extract_all_features(self, video_path, text_description=""):
        """Extract all video features for the hybrid model"""

        # Load video
        cap = cv2.VideoCapture(str(video_path))
        fps = cap.get(cv2.CAP_PROP_FPS)
        frames = self._extract_frames(cap, target_fps=1)  # 1 FPS sampling

        features = {
            'semantic': self._extract_semantic_features(frames),
            'emotion': self._extract_emotion_features(frames),
            'motion': self._extract_motion_features(frames),
            'scene_offset': self._extract_scene_offset(frames),
            'text_emotion': self._extract_text_emotion(text_description)
        }

        return features

    def _extract_frames(self, cap, target_fps=1):
        """Extract frames at target FPS"""
        frames = []
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_interval = int(fps / target_fps)

        frame_count = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_count % frame_interval == 0:
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frames.append(frame_rgb)

            frame_count += 1

        cap.release()
        return frames

    def _extract_semantic_features(self, frames):
        """Extract high-level semantic features using CLIP"""
        semantic_features = []

        for frame in frames:
            # Process frame with CLIP
            inputs = self.clip_processor(images=frame, return_tensors="pt").to(device)

            with torch.no_grad():
                image_features = self.clip_model.get_image_features(**inputs)
                semantic_features.append(image_features.cpu().numpy())

        return np.array(semantic_features).squeeze()

    def _extract_emotion_features(self, frames):
        """Extract emotion probabilities using CLIP"""
        emotion_features = []

        # Create emotion prompts for CLIP
        emotion_prompts = [f"a {emotion} scene" for emotion in self.emotion_categories]

        for frame in frames:
            inputs = self.clip_processor(
                text=emotion_prompts,
                images=frame,
                return_tensors="pt",
                padding=True
            ).to(device)

            with torch.no_grad():
                outputs = self.clip_model(**inputs)
                probs = outputs.logits_per_image.softmax(dim=-1)
                emotion_features.append(probs.cpu().numpy())

        return np.array(emotion_features).squeeze()

    def _extract_motion_features(self, frames):
        """Calculate motion intensity between consecutive frames"""
        motion_features = []

        for i in range(len(frames)):
            if i == 0:
                motion_features.append(0.0)  # No motion for first frame
            else:
                # Calculate RGB difference between consecutive frames
                prev_frame = cv2.cvtColor(frames[i-1], cv2.COLOR_RGB2GRAY)
                curr_frame = cv2.cvtColor(frames[i], cv2.COLOR_RGB2GRAY)

                diff = np.abs(curr_frame.astype(float) - prev_frame.astype(float))
                motion_intensity = np.mean(diff)
                motion_features.append(motion_intensity)

        return np.array(motion_features)

    def _extract_scene_offset(self, frames):
        """Calculate scene offset based on visual transitions"""
        scene_offsets = []
        scene_id = 0
        offset = 0

        # Simple scene detection based on frame differences
        threshold = 30.0  # Adjust based on dataset

        for i in range(len(frames)):
            if i > 0:
                # Calculate frame difference for scene detection
                prev_gray = cv2.cvtColor(frames[i-1], cv2.COLOR_RGB2GRAY)
                curr_gray = cv2.cvtColor(frames[i], cv2.COLOR_RGB2GRAY)
                diff = np.mean(np.abs(curr_gray.astype(float) - prev_gray.astype(float)))

                if diff > threshold:  # Scene change detected
                    scene_id += 1
                    offset = 0
                else:
                    offset += 1

            scene_offsets.append(offset)

        return np.array(scene_offsets)

    def _extract_text_emotion(self, text_description):
        """Extract emotion from user text using sentiment analysis"""
        if not text_description:
            return np.array([0.5, 0.5])  # Neutral valence and arousal

        # Simple keyword-based emotion mapping (can be enhanced with BERT)
        emotion_keywords = {
            'happy': (0.8, 0.6), 'sad': (0.2, 0.3), 'exciting': (0.7, 0.9),
            'calm': (0.6, 0.2), 'intense': (0.5, 0.9), 'peaceful': (0.7, 0.1),
            'energetic': (0.8, 0.8), 'melancholy': (0.3, 0.4)
        }

        text_lower = text_description.lower()
        valence, arousal = 0.5, 0.5  # Default neutral

        for keyword, (v, a) in emotion_keywords.items():
            if keyword in text_lower:
                valence = v
                arousal = a
                break

        return np.array([valence, arousal])

# Initialize feature extractor
clip_model, clip_processor = dataset._load_clip()
feature_extractor = VideoFeatureExtractor(clip_model, clip_processor)
```

### **2.3 Multimodal Emotion Encoding with Russell's Circumplex Model**

```python
class RussellCircumplexEncoder:
    """
    Implementation of Russell's Circumplex Model for emotion encoding
    Maps emotions to 2D space: Valence (pleasantness) × Arousal (energy)
    """

    def __init__(self):
        # Emotion-to-coordinate mapping based on psychological research
        self.emotion_coords = {
            'excited': (0.8, 0.8),    # High valence, high arousal
            'happy': (0.8, 0.6),      # High valence, medium arousal
            'content': (0.7, 0.3),    # High valence, low arousal
            'relaxed': (0.6, 0.2),    # Medium valence, low arousal
            'calm': (0.5, 0.1),       # Neutral valence, very low arousal
            'sad': (0.2, 0.3),        # Low valence, low arousal
            'depressed': (0.1, 0.2),  # Very low valence, low arousal
            'angry': (0.2, 0.8),      # Low valence, high arousal
            'tense': (0.3, 0.7),      # Low valence, high arousal
            'neutral': (0.5, 0.5)     # Neutral point
        }

        # Enhanced emotion-to-chord mapping based on music theory
        self.emotion_chord_mapping = {
            # High valence emotions (happy/positive)
            (0.8, 0.8): ['M', 'M7', 'sus4', '7'],        # Excited: Major, bright chords
            (0.8, 0.6): ['M', 'M6', 'M7'],               # Happy: Major variations
            (0.7, 0.3): ['M', 'M7', 'sus2'],             # Content: Relaxed major

            # Low valence emotions (sad/negative)
            (0.2, 0.3): ['m', 'm7', 'sus2'],             # Sad: Minor, darker
            (0.1, 0.2): ['m', 'dim', 'm7'],              # Depressed: Very dark
            (0.2, 0.8): ['dim', 'dim7', 'm'],            # Angry: Dissonant

            # Neutral/Balanced
            (0.5, 0.5): ['M', 'm', 'sus4'],              # Neutral: Mixed
            (0.6, 0.2): ['M', 'M7', 'm'],                # Relaxed: Gentle mix
        }

    def encode_video_emotion(self, emotion_probs):
        """
        Convert CLIP emotion probabilities to valence-arousal coordinates

        Args:
            emotion_probs: Array of probabilities for [exciting, fearful, tense, sad, relaxing, neutral]
        """
        # Map emotion categories to valence-arousal
        emotion_mappings = {
            0: (0.8, 0.8),  # exciting
            1: (0.2, 0.8),  # fearful
            2: (0.3, 0.7),  # tense
            3: (0.2, 0.3),  # sad
            4: (0.7, 0.2),  # relaxing
            5: (0.5, 0.5)   # neutral
        }

        # Weight by probabilities
        valence = sum(prob * emotion_mappings[i][0] for i, prob in enumerate(emotion_probs))
        arousal = sum(prob * emotion_mappings[i][1] for i, prob in enumerate(emotion_probs))

        return np.array([valence, arousal])

    def combine_emotions(self, video_emotion, text_emotion, video_weight=0.7):
        """
        Combine video and text emotions with weighting
        """
        combined = video_weight * video_emotion + (1 - video_weight) * text_emotion
        return combined

    def emotion_to_chords(self, valence, arousal):
        """
        Map emotion coordinates to appropriate chord types
        """
        # Find closest emotion coordinate
        min_dist = float('inf')
        best_chords = ['M']  # Default major

        for coords, chords in self.emotion_chord_mapping.items():
            dist = np.sqrt((valence - coords[0])**2 + (arousal - coords[1])**2)
            if dist < min_dist:
                min_dist = dist
                best_chords = chords

        return best_chords

    def visualize_emotion_space(self, emotions_list):
        """Visualize emotions in the circumplex model"""
        fig, ax = plt.subplots(figsize=(10, 8))

        # Plot emotion space
        circle = plt.Circle((0.5, 0.5), 0.4, fill=False, linestyle='--', alpha=0.5)
        ax.add_patch(circle)

        # Plot emotions
        for emotion, (v, a) in emotions_list:
            ax.scatter(v, a, s=100, alpha=0.7, label=emotion)
            ax.annotate(emotion, (v, a), xytext=(5, 5), textcoords='offset points')

        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.set_xlabel('Valence (Pleasantness)')
        ax.set_ylabel('Arousal (Energy)')
        ax.set_title('Russell\'s Circumplex Model of Emotion')
        ax.grid(True, alpha=0.3)
        ax.legend()

        plt.tight_layout()
        plt.show()

# Initialize emotion encoder
emotion_encoder = RussellCircumplexEncoder()
```

---

## 🧠 **SECTION 3: MODEL ARCHITECTURE**

### **3.1 Hybrid Transformer-LSTM Architecture**

```python
class MultimodalTransformerEncoder(nn.Module):
    """
    Transformer encoder for processing multimodal video features
    Handles semantic, emotion, motion, and scene features
    """

    def __init__(self, feature_dim=512, num_heads=8, num_layers=6, dropout=0.1):
        super().__init__()

        # Feature projection layers
        self.semantic_proj = nn.Linear(512, feature_dim)  # CLIP features are 512-dim
        self.emotion_proj = nn.Linear(6, feature_dim)     # 6 emotion categories
        self.motion_proj = nn.Linear(1, feature_dim)      # Single motion value
        self.scene_proj = nn.Linear(1, feature_dim)       # Single scene offset
        self.text_emotion_proj = nn.Linear(2, feature_dim)  # Valence-arousal pair

        # Positional encoding
        self.pos_encoding = PositionalEncoding(feature_dim, dropout)

        # Transformer encoder layers
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=feature_dim,
            nhead=num_heads,
            dim_feedforward=2048,
            dropout=dropout,
            activation='gelu'
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers)

        # Output projection
        self.output_proj = nn.Linear(feature_dim, feature_dim)

    def forward(self, semantic_features, emotion_features, motion_features,
                scene_features, text_emotion):
        """
        Args:
            semantic_features: (batch_size, seq_len, 512)
            emotion_features: (batch_size, seq_len, 6)
            motion_features: (batch_size, seq_len, 1)
            scene_features: (batch_size, seq_len, 1)
            text_emotion: (batch_size, 2)
        """
        batch_size, seq_len = semantic_features.shape[:2]

        # Project all features to same dimension
        semantic_emb = self.semantic_proj(semantic_features)
        emotion_emb = self.emotion_proj(emotion_features)
        motion_emb = self.motion_proj(motion_features)
        scene_emb = self.scene_proj(scene_features)

        # Expand text emotion for all time steps
        text_emotion_expanded = text_emotion.unsqueeze(1).expand(-1, seq_len, -1)
        text_emb = self.text_emotion_proj(text_emotion_expanded)

        # Combine all features
        combined_features = semantic_emb + emotion_emb + motion_emb + scene_emb + text_emb

        # Add positional encoding
        combined_features = self.pos_encoding(combined_features)

        # Apply transformer (seq_len, batch_size, feature_dim)
        combined_features = combined_features.transpose(0, 1)
        encoded_features = self.transformer(combined_features)
        encoded_features = encoded_features.transpose(0, 1)

        return self.output_proj(encoded_features)


class ChordProgressionTransformer(nn.Module):
    """
    Transformer decoder for generating chord progressions
    """

    def __init__(self, chord_vocab_size=50, feature_dim=512, num_heads=8,
                 num_layers=6, dropout=0.1):
        super().__init__()

        self.chord_vocab_size = chord_vocab_size
        self.feature_dim = feature_dim

        # Chord embedding
        self.chord_embedding = nn.Embedding(chord_vocab_size, feature_dim)
        self.pos_encoding = PositionalEncoding(feature_dim, dropout)

        # Transformer decoder
        decoder_layer = nn.TransformerDecoderLayer(
            d_model=feature_dim,
            nhead=num_heads,
            dim_feedforward=2048,
            dropout=dropout,
            activation='gelu'
        )
        self.transformer_decoder = nn.TransformerDecoder(decoder_layer, num_layers)

        # Output projection
        self.output_proj = nn.Linear(feature_dim, chord_vocab_size)

    def forward(self, chord_sequence, encoder_output, tgt_mask=None):
        """
        Args:
            chord_sequence: (batch_size, seq_len) - previous chord tokens
            encoder_output: (batch_size, seq_len, feature_dim) - from video encoder
            tgt_mask: Causal mask for autoregressive generation
        """
        # Embed chords and add positional encoding
        chord_emb = self.chord_embedding(chord_sequence)
        chord_emb = self.pos_encoding(chord_emb)

        # Transpose for transformer (seq_len, batch_size, feature_dim)
        chord_emb = chord_emb.transpose(0, 1)
        encoder_output = encoder_output.transpose(0, 1)

        # Apply transformer decoder
        decoded = self.transformer_decoder(
            chord_emb, encoder_output, tgt_mask=tgt_mask
        )

        # Transpose back and project to vocabulary
        decoded = decoded.transpose(0, 1)
        chord_logits = self.output_proj(decoded)

        return chord_logits


class ExpressiveLSTMDecoder(nn.Module):
    """
    LSTM decoder for generating expressive note-level details
    Takes chord progressions and adds rhythm, dynamics, articulation
    """

    def __init__(self, chord_vocab_size=50, note_vocab_size=128,
                 hidden_dim=512, num_layers=3, dropout=0.1):
        super().__init__()

        self.chord_vocab_size = chord_vocab_size
        self.note_vocab_size = note_vocab_size
        self.hidden_dim = hidden_dim

        # Input embeddings
        self.chord_embedding = nn.Embedding(chord_vocab_size, hidden_dim)
        self.note_embedding = nn.Embedding(note_vocab_size, hidden_dim // 2)

        # LSTM layers for different musical aspects
        self.rhythm_lstm = nn.LSTM(hidden_dim, hidden_dim, num_layers,
                                   dropout=dropout, batch_first=True)
        self.melody_lstm = nn.LSTM(hidden_dim, hidden_dim, num_layers,
                                   dropout=dropout, batch_first=True)
        self.dynamics_lstm = nn.LSTM(hidden_dim, hidden_dim // 2, num_layers,
                                     dropout=dropout, batch_first=True)

        # Output heads
        self.note_head = nn.Linear(hidden_dim, note_vocab_size)
        self.velocity_head = nn.Linear(hidden_dim // 2, 128)  # MIDI velocity range
        self.duration_head = nn.Linear(hidden_dim, 32)  # Duration quantization

        # Attention mechanism for chord-note alignment
        self.attention = nn.MultiheadAttention(hidden_dim, 8, dropout=dropout)

    def forward(self, chord_sequence, video_features, target_notes=None):
        """
        Args:
            chord_sequence: (batch_size, seq_len) - chord progression
            video_features: (batch_size, seq_len, feature_dim) - video context
            target_notes: (batch_size, seq_len, note_seq_len) - for training
        """
        batch_size, chord_seq_len = chord_sequence.shape

        # Embed chords
        chord_emb = self.chord_embedding(chord_sequence)

        # Generate rhythm patterns
        rhythm_out, _ = self.rhythm_lstm(chord_emb)

        # Generate melodic content with attention to video
        melody_input = chord_emb + video_features
        melody_out, _ = self.melody_lstm(melody_input)

        # Apply attention between melody and rhythm
        attended_melody, _ = self.attention(
            melody_out.transpose(0, 1),
            rhythm_out.transpose(0, 1),
            rhythm_out.transpose(0, 1)
        )
        attended_melody = attended_melody.transpose(0, 1)

        # Generate dynamics
        dynamics_input = torch.cat([rhythm_out, melody_out], dim=-1)
        dynamics_out, _ = self.dynamics_lstm(dynamics_input)

        # Output predictions
        note_logits = self.note_head(attended_melody)
        velocity_logits = self.velocity_head(dynamics_out)
        duration_logits = self.duration_head(rhythm_out)

        return {
            'notes': note_logits,
            'velocities': velocity_logits,
            'durations': duration_logits
        }


class PositionalEncoding(nn.Module):
    """Standard positional encoding for transformer"""

    def __init__(self, d_model, dropout=0.1, max_len=5000):
        super().__init__()
        self.dropout = nn.Dropout(p=dropout)

        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() *
                            (-np.log(10000.0) / d_model))

        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        pe = pe.unsqueeze(0).transpose(0, 1)

        self.register_buffer('pe', pe)

    def forward(self, x):
        x = x + self.pe[:x.size(0), :].transpose(0, 1)
        return self.dropout(x)


class SilentVideoSynth(nn.Module):
    """
    Complete SilentVideoSynth model combining all components
    """

    def __init__(self, chord_vocab_size=50, note_vocab_size=128, feature_dim=512):
        super().__init__()

        # Core components
        self.video_encoder = MultimodalTransformerEncoder(feature_dim)
        self.chord_decoder = ChordProgressionTransformer(chord_vocab_size, feature_dim)
        self.note_decoder = ExpressiveLSTMDecoder(chord_vocab_size, note_vocab_size)

        # Loss functions
        self.chord_loss_fn = nn.CrossEntropyLoss()
        self.note_loss_fn = nn.CrossEntropyLoss()
        self.velocity_loss_fn = nn.MSELoss()
        self.duration_loss_fn = nn.CrossEntropyLoss()

    def forward(self, video_features, text_emotion, chord_targets=None, note_targets=None):
        """
        Full forward pass through the model
        """
        # Encode video features
        encoded_video = self.video_encoder(
            video_features['semantic'],
            video_features['emotion'],
            video_features['motion'],
            video_features['scene_offset'],
            text_emotion
        )

        if self.training and chord_targets is not None:
            # Training mode: use teacher forcing
            chord_logits = self.chord_decoder(chord_targets[:, :-1], encoded_video)
            note_outputs = self.note_decoder(chord_targets, encoded_video, note_targets)

            return {
                'chord_logits': chord_logits,
                'note_outputs': note_outputs,
                'encoded_video': encoded_video
            }
        else:
            # Inference mode: autoregressive generation
            return self.generate(encoded_video)

    def generate(self, encoded_video, max_length=32, temperature=1.0):
        """
        Generate chord progression and notes autoregressively
        """
        batch_size = encoded_video.shape[0]
        device = encoded_video.device

        # Generate chord progression
        chord_sequence = torch.zeros(batch_size, 1, dtype=torch.long, device=device)

        for i in range(max_length):
            chord_logits = self.chord_decoder(chord_sequence, encoded_video)
            next_chord_logits = chord_logits[:, -1, :] / temperature
            next_chord = torch.multinomial(F.softmax(next_chord_logits, dim=-1), 1)
            chord_sequence = torch.cat([chord_sequence, next_chord], dim=1)

        # Generate expressive notes
        note_outputs = self.note_decoder(chord_sequence, encoded_video)

        return {
            'chord_sequence': chord_sequence,
            'note_outputs': note_outputs
        }

# Initialize the complete model
model = SilentVideoSynth(chord_vocab_size=50, note_vocab_size=128, feature_dim=512)
model.to(device)

print(f"Model initialized with {sum(p.numel() for p in model.parameters()):,} parameters")
```

### **3.2 MIDI Generation and Post-Processing**

```python
class MIDIGenerator:
    """
    Convert model outputs to MIDI files and synthesize audio
    """

    def __init__(self):
        # Chord mappings
        self.chord_to_notes = {
            0: [60, 64, 67],      # C major
            1: [60, 63, 67],      # C minor
            2: [62, 66, 69],      # D major
            3: [62, 65, 69],      # D minor
            4: [64, 68, 71],      # E major
            5: [64, 67, 71],      # E minor
            # ... expand for full vocabulary
        }

        # Duration mappings (in quarter notes)
        self.duration_map = {
            0: 0.25,   # Sixteenth note
            1: 0.5,    # Eighth note
            2: 1.0,    # Quarter note
            3: 2.0,    # Half note
            4: 4.0,    # Whole note
            # ... more durations
        }

    def generate_midi(self, chord_sequence, note_outputs, tempo=120):
        """
        Convert model outputs to MIDI file
        """
        # Create MIDI file
        midi = pretty_midi.PrettyMIDI(initial_tempo=tempo)

        # Create piano track
        piano = pretty_midi.Instrument(program=0)  # Acoustic Grand Piano

        current_time = 0.0
        beat_duration = 60.0 / tempo  # Duration of one beat in seconds

        # Process chord sequence and notes
        for i, chord_id in enumerate(chord_sequence):
            if i >= len(note_outputs['notes']):
                break

            # Get chord notes
            chord_notes = self.chord_to_notes.get(chord_id.item(), [60, 64, 67])

            # Get predicted note info
            note_pred = torch.argmax(note_outputs['notes'][i], dim=-1)
            velocity_pred = torch.clamp(note_outputs['velocities'][i] * 127, 0, 127)
            duration_pred = torch.argmax(note_outputs['durations'][i], dim=-1)

            # Add chord as background
            chord_duration = self.duration_map.get(duration_pred.item(), 1.0) * beat_duration
            for note_pitch in chord_notes:
                note = pretty_midi.Note(
                    velocity=int(velocity_pred.item() * 0.7),  # Lower volume for chords
                    pitch=note_pitch,
                    start=current_time,
                    end=current_time + chord_duration
                )
                piano.notes.append(note)

            # Add melody note
            melody_pitch = note_pred.item()
            if 21 <= melody_pitch <= 108:  # Valid MIDI range
                melody_note = pretty_midi.Note(
                    velocity=int(velocity_pred.item()),
                    pitch=melody_pitch,
                    start=current_time,
                    end=current_time + chord_duration * 0.5  # Shorter melody notes
                )
                piano.notes.append(melody_note)

            current_time += chord_duration

        midi.instruments.append(piano)
        return midi

    def add_rhythm_track(self, midi, chord_sequence, note_outputs):
        """Add percussion/rhythm track"""
        drums = pretty_midi.Instrument(program=0, is_drum=True)

        current_time = 0.0
        beat_duration = 60.0 / 120  # Assume 120 BPM

        for i, _ in enumerate(chord_sequence):
            if i >= len(note_outputs['durations']):
                break

            duration_pred = torch.argmax(note_outputs['durations'][i], dim=-1)
            note_duration = self.duration_map.get(duration_pred.item(), 1.0) * beat_duration

            # Add kick drum on strong beats
            if i % 4 == 0:  # Downbeat
                kick = pretty_midi.Note(
                    velocity=100,
                    pitch=36,  # Kick drum
                    start=current_time,
                    end=current_time + 0.1
                )
                drums.notes.append(kick)

            # Add hi-hat on off-beats
            if i % 2 == 1:
                hihat = pretty_midi.Note(
                    velocity=60,
                    pitch=42,  # Closed hi-hat
                    start=current_time,
                    end=current_time + 0.05
                )
                drums.notes.append(hihat)

            current_time += note_duration

        midi.instruments.append(drums)
        return midi

    def midi_to_audio(self, midi, sample_rate=44100):
        """
        Convert MIDI to audio using FluidSynth
        """
        try:
            # Synthesize audio
            audio = midi.fluidsynth(sample_rate=sample_rate)
            return audio
        except:
            # Fallback: synthesize using pretty_midi's built-in synthesizer
            audio = midi.synthesize(sample_rate=sample_rate)
            return audio

    def save_output(self, midi, audio, output_path):
        """Save MIDI and audio files"""
        output_path = Path(output_path)

        # Save MIDI
        midi_path = output_path / 'generated_music.mid'
        midi.write(str(midi_path))

        # Save audio
        audio_path = output_path / 'generated_music.wav'
        librosa.output.write_wav(str(audio_path), audio, 44100)

        return midi_path, audio_path

# Initialize MIDI generator
midi_generator = MIDIGenerator()
```

---

## 🎯 **SECTION 4: TRAINING & EVALUATION**

### **4.1 Training Pipeline**

```python
class SilentVideoSynthTrainer:
    """
    Training pipeline for the SilentVideoSynth model
    """

    def __init__(self, model, train_loader, val_loader, device):
        self.model = model
        self.train_loader = train_loader
        self.val_loader = val_loader
        self.device = device

        # Optimizers
        self.optimizer = torch.optim.AdamW(
            model.parameters(),
            lr=1e-4,
            weight_decay=0.01
        )

        # Learning rate scheduler
        self.scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
            self.optimizer,
            T_max=100
        )

        # Loss weights
        self.loss_weights = {
            'chord': 1.0,
            'note': 0.8,
            'velocity': 0.5,
            'duration': 0.7,
            'affective': 0.3  # Emotion alignment loss
        }

    def compute_affective_loss(self, generated_chords, target_emotion):
        """
        Compute emotion alignment loss between generated chords and target emotion
        """
        # Map chords to emotion using our emotion encoder
        chord_emotions = []
        for chord_batch in generated_chords:
            batch_emotions = []
            for chord_seq in chord_batch:
                # Simple mapping: could be enhanced with learned embeddings
                avg_valence = 0.5  # Compute based on chord progressions
                avg_arousal = 0.5
                batch_emotions.append([avg_valence, avg_arousal])
            chord_emotions.append(batch_emotions)

        chord_emotions = torch.tensor(chord_emotions, device=self.device)
        emotion_loss = F.mse_loss(chord_emotions, target_emotion)
        return emotion_loss

    def train_epoch(self):
        """Train for one epoch"""
        self.model.train()
        total_loss = 0
        num_batches = len(self.train_loader)

        for batch_idx, batch in enumerate(self.train_loader):
            self.optimizer.zero_grad()

            # Move data to device
            video_features = {k: v.to(self.device) for k, v in batch['video_features'].items()}
            text_emotion = batch['text_emotion'].to(self.device)
            chord_targets = batch['chord_targets'].to(self.device)
            note_targets = batch['note_targets'].to(self.device)

            # Forward pass
            outputs = self.model(
                video_features,
                text_emotion,
                chord_targets,
                note_targets
            )

            # Compute losses
            chord_loss = self.model.chord_loss_fn(
                outputs['chord_logits'].reshape(-1, outputs['chord_logits'].size(-1)),
                chord_targets[:, 1:].reshape(-1)
            )

            note_loss = self.model.note_loss_fn(
                outputs['note_outputs']['notes'].reshape(-1, outputs['note_outputs']['notes'].size(-1)),
                note_targets['notes'].reshape(-1)
            )

            velocity_loss = self.model.velocity_loss_fn(
                outputs['note_outputs']['velocities'],
                note_targets['velocities']
            )

            duration_loss = self.model.duration_loss_fn(
                outputs['note_outputs']['durations'].reshape(-1, outputs['note_outputs']['durations'].size(-1)),
                note_targets['durations'].reshape(-1)
            )

            affective_loss = self.compute_affective_loss(
                torch.argmax(outputs['chord_logits'], dim=-1),
                text_emotion
            )

            # Total loss
            total_batch_loss = (
                self.loss_weights['chord'] * chord_loss +
                self.loss_weights['note'] * note_loss +
                self.loss_weights['velocity'] * velocity_loss +
                self.loss_weights['duration'] * duration_loss +
                self.loss_weights['affective'] * affective_loss
            )

            # Backward pass
            total_batch_loss.backward()
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), 1.0)
            self.optimizer.step()

            total_loss += total_batch_loss.item()

            if batch_idx % 10 == 0:
                print(f'Batch {batch_idx}/{num_batches}, Loss: {total_batch_loss.item():.4f}')

        return total_loss / num_batches

    def validate(self):
        """Validate the model"""
        self.model.eval()
        total_loss = 0

        with torch.no_grad():
            for batch in self.val_loader:
                video_features = {k: v.to(self.device) for k, v in batch['video_features'].items()}
                text_emotion = batch['text_emotion'].to(self.device)
                chord_targets = batch['chord_targets'].to(self.device)
                note_targets = batch['note_targets'].to(self.device)

                outputs = self.model(video_features, text_emotion, chord_targets, note_targets)

                # Compute validation loss (simplified)
                chord_loss = self.model.chord_loss_fn(
                    outputs['chord_logits'].reshape(-1, outputs['chord_logits'].size(-1)),
                    chord_targets[:, 1:].reshape(-1)
                )

                total_loss += chord_loss.item()

        return total_loss / len(self.val_loader)

    def train(self, num_epochs=50):
        """Full training loop"""
        best_val_loss = float('inf')

        for epoch in range(num_epochs):
            print(f'Epoch {epoch+1}/{num_epochs}')

            # Train
            train_loss = self.train_epoch()

            # Validate
            val_loss = self.validate()

            # Update learning rate
            self.scheduler.step()

            print(f'Train Loss: {train_loss:.4f}, Val Loss: {val_loss:.4f}')

            # Save best model
            if val_loss < best_val_loss:
                best_val_loss = val_loss
                torch.save(self.model.state_dict(), 'best_model.pth')
                print('New best model saved!')

            print('-' * 50)

# Example training setup (would need actual data loaders)
# trainer = SilentVideoSynthTrainer(model, train_loader, val_loader, device)
# trainer.train(num_epochs=50)
```

### **4.2 Evaluation Metrics**

```python
class SilentVideoSynthEvaluator:
    """
    Comprehensive evaluation metrics for video-to-music generation
    """

    def __init__(self, model, emotion_encoder, midi_generator):
        self.model = model
        self.emotion_encoder = emotion_encoder
        self.midi_generator = midi_generator

    def evaluate_chord_accuracy(self, predictions, targets):
        """Evaluate chord prediction accuracy"""
        correct = (predictions == targets).float()
        accuracy = correct.mean().item()
        return accuracy

    def evaluate_emotion_alignment(self, generated_chords, target_emotions):
        """
        Evaluate how well generated chords match target emotions
        """
        alignment_scores = []

        for chord_seq, target_emotion in zip(generated_chords, target_emotions):
            # Convert chords to predicted emotion
            predicted_emotion = self._chords_to_emotion(chord_seq)

            # Calculate distance in emotion space
            emotion_distance = np.linalg.norm(predicted_emotion - target_emotion.cpu().numpy())
            alignment_score = 1.0 / (1.0 + emotion_distance)  # Convert to similarity
            alignment_scores.append(alignment_score)

        return np.mean(alignment_scores)

    def _chords_to_emotion(self, chord_sequence):
        """Map chord sequence to emotion coordinates"""
        # Simplified mapping - could be enhanced with learned embeddings
        valence_sum = 0
        arousal_sum = 0

        for chord_id in chord_sequence:
            # Map chord types to emotions (simplified)
            if chord_id in [0, 2, 4]:  # Major chords
                valence_sum += 0.7
                arousal_sum += 0.5
            elif chord_id in [1, 3, 5]:  # Minor chords
                valence_sum += 0.3
                arousal_sum += 0.4
            else:  # Other chord types
                valence_sum += 0.5
                arousal_sum += 0.5

        length = len(chord_sequence)
        return np.array([valence_sum / length, arousal_sum / length])

    def evaluate_musical_quality(self, midi_file):
        """
        Evaluate musical quality using rule-based metrics
        """
        metrics = {}

        # Load MIDI
        try:
            midi = pretty_midi.PrettyMIDI(midi_file)
        except:
            return {'error': 'Could not load MIDI file'}

        # Extract notes
        all_notes = []
        for instrument in midi.instruments:
            if not instrument.is_drum:
                all_notes.extend(instrument.notes)

        if not all_notes:
            return {'error': 'No notes found'}

        # Pitch diversity
        pitches = [note.pitch for note in all_notes]
        pitch_range = max(pitches) - min(pitches)
        unique_pitches = len(set(pitches))
        metrics['pitch_diversity'] = unique_pitches / 88  # Piano range
        metrics['pitch_range'] = pitch_range / 88

        # Rhythm regularity
        note_durations = [note.end - note.start for note in all_notes]
        duration_std = np.std(note_durations)
        metrics['rhythm_regularity'] = 1.0 / (1.0 + duration_std)

        # Harmonic consonance (simplified)
        # Count perfect fifths and octaves
        consonant_intervals = 0
        total_intervals = 0

        for i, note1 in enumerate(all_notes):
            for note2 in all_notes[i+1:]:
                if abs(note1.start - note2.start) < 0.1:  # Simultaneous notes
                    interval = abs(note1.pitch - note2.pitch) % 12
                    if interval in [0, 5, 7]:  # Unison, perfect fifth, perfect fourth
                        consonant_intervals += 1
                    total_intervals += 1

        if total_intervals > 0:
            metrics['harmonic_consonance'] = consonant_intervals / total_intervals
        else:
            metrics['harmonic_consonance'] = 0.5

        # Overall quality score
        metrics['overall_quality'] = np.mean([
            metrics['pitch_diversity'],
            metrics['rhythm_regularity'],
            metrics['harmonic_consonance']
        ])

        return metrics

    def evaluate_sample(self, video_path, text_description, output_dir):
        """
        Comprehensive evaluation of a single sample
        """
        # Extract video features
        video_features = feature_extractor.extract_all_features(video_path, text_description)

        # Prepare input tensors
        input_features = {
            'semantic': torch.tensor(video_features['semantic']).unsqueeze(0).to(device),
            'emotion': torch.tensor(video_features['emotion']).unsqueeze(0).to(device),
            'motion': torch.tensor(video_features['motion']).unsqueeze(0).unsqueeze(-1).to(device),
            'scene_offset': torch.tensor(video_features['scene_offset']).unsqueeze(0).unsqueeze(-1).to(device)
        }

        text_emotion = torch.tensor(video_features['text_emotion']).unsqueeze(0).to(device)

        # Generate music
        self.model.eval()
        with torch.no_grad():
            outputs = self.model(input_features, text_emotion)

        # Convert to MIDI
        chord_sequence = outputs['chord_sequence'][0]  # Remove batch dimension
        note_outputs = {k: v[0] for k, v in outputs['note_outputs'].items()}

        midi = self.midi_generator.generate_midi(chord_sequence, note_outputs)
        midi = self.midi_generator.add_rhythm_track(midi, chord_sequence, note_outputs)

        # Save outputs
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)

        midi_path, audio_path = self.midi_generator.save_output(midi, None, output_path)

        # Evaluate
        emotion_alignment = self.evaluate_emotion_alignment([chord_sequence], [text_emotion])
        musical_quality = self.evaluate_musical_quality(str(midi_path))

        results = {
            'emotion_alignment': emotion_alignment,
            'musical_quality': musical_quality,
            'output_files': {
                'midi': str(midi_path),
                'audio': str(audio_path)
            }
        }

        return results

# Initialize evaluator
evaluator = SilentVideoSynthEvaluator(model, emotion_encoder, midi_generator)
```

---

## 🚀 **SECTION 5: DEPLOYMENT & INTERFACE**

### **5.1 React.js Frontend Interface**

Create a new Next.js project:

```bash
npx create-next-app@latest silentvideosynth-frontend
cd silentvideosynth-frontend
npm install axios @emotion/react @emotion/styled @mui/material
```

**`pages/index.js`** - Main Interface:

```jsx
import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  LinearProgress,
  Alert,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import axios from 'axios';

export default function SilentVideoSynthInterface() {
  const [videoFile, setVideoFile] = useState(null);
  const [textDescription, setTextDescription] = useState('');
  const [emotionParams, setEmotionParams] = useState({ valence: 0.5, arousal: 0.5 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const videoRef = useRef(null);
  const audioRef = useRef(null);

  const handleVideoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setVideoFile(file);
      // Preview video
      const videoURL = URL.createObjectURL(file);
      if (videoRef.current) {
        videoRef.current.src = videoURL;
      }
    }
  };

  const handleEmotionChange = (dimension, value) => {
    setEmotionParams(prev => ({
      ...prev,
      [dimension]: value
    }));
  };

  const generateMusic = async () => {
    if (!videoFile) {
      setError('Please upload a video file');
      return;
    }

    setIsProcessing(true);
    setError(null);

    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('text_description', textDescription);
    formData.append('valence', emotionParams.valence);
    formData.append('arousal', emotionParams.arousal);

    try {
      const response = await axios.post('http://localhost:8000/api/generate-music', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5 minutes timeout
      });

      setResults(response.data);

      // Load generated audio
      if (response.data.audio_url && audioRef.current) {
        audioRef.current.src = response.data.audio_url;
      }

    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred during music generation');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, margin: 'auto', padding: 3 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center">
        🎬🎵 SilentVideoSynth
      </Typography>
      <Typography variant="h6" align="center" color="textSecondary" sx={{ mb: 4 }}>
        Generate emotionally-aligned music for your silent videos
      </Typography>

      <Paper elevation={3} sx={{ padding: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          1. Upload Video
        </Typography>

        <Box sx={{ mb: 3 }}>
          <input
            accept="video/*"
            style={{ display: 'none' }}
            id="video-upload"
            type="file"
            onChange={handleVideoUpload}
          />
          <label htmlFor="video-upload">
            <Button variant="contained" component="span" size="large">
              Choose Video File
            </Button>
          </label>
          {videoFile && (
            <Typography sx={{ mt: 1 }}>
              Selected: {videoFile.name}
            </Typography>
          )}
        </Box>

        {videoFile && (
          <Box sx={{ mb: 3 }}>
            <video
              ref={videoRef}
              width="100%"
              height="300"
              controls
              style={{ borderRadius: 8 }}
            />
          </Box>
        )}
      </Paper>

      <Paper elevation={3} sx={{ padding: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          2. Describe Your Vision (Optional)
        </Typography>

        <TextField
          fullWidth
          multiline
          rows={3}
          variant="outlined"
          placeholder="Describe the mood, style, or feeling you want the music to convey..."
          value={textDescription}
          onChange={(e) => setTextDescription(e.target.value)}
          sx={{ mb: 3 }}
        />

        <Typography variant="h6" gutterBottom>
          Emotion Parameters (Russell's Circumplex Model)
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography gutterBottom>
            Valence (Pleasantness): {emotionParams.valence.toFixed(2)}
          </Typography>
          <Slider
            value={emotionParams.valence}
            onChange={(e, value) => handleEmotionChange('valence', value)}
            min={0}
            max={1}
            step={0.01}
            marks={[
              { value: 0, label: 'Negative' },
              { value: 0.5, label: 'Neutral' },
              { value: 1, label: 'Positive' }
            ]}
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography gutterBottom>
            Arousal (Energy): {emotionParams.arousal.toFixed(2)}
          </Typography>
          <Slider
            value={emotionParams.arousal}
            onChange={(e, value) => handleEmotionChange('arousal', value)}
            min={0}
            max={1}
            step={0.01}
            marks={[
              { value: 0, label: 'Calm' },
              { value: 0.5, label: 'Moderate' },
              { value: 1, label: 'Energetic' }
            ]}
          />
        </Box>
      </Paper>

      <Paper elevation={3} sx={{ padding: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          3. Generate Music
        </Typography>

        <Button
          variant="contained"
          size="large"
          onClick={generateMusic}
          disabled={isProcessing || !videoFile}
          sx={{ mb: 2 }}
        >
          {isProcessing ? 'Generating Music...' : 'Generate Music'}
        </Button>

        {isProcessing && (
          <Box sx={{ width: '100%', mb: 2 }}>
            <LinearProgress />
            <Typography variant="body2" align="center" sx={{ mt: 1 }}>
              Processing video and generating music... This may take a few minutes.
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      {results && (
        <Paper elevation={3} sx={{ padding: 3 }}>
          <Typography variant="h5" gutterBottom>
            🎉 Generated Music
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Audio Preview:
            </Typography>
            <audio
              ref={audioRef}
              controls
              style={{ width: '100%' }}
            />
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Analysis Results:
            </Typography>
            <Typography>
              <strong>Emotion Alignment Score:</strong> {results.emotion_alignment?.toFixed(3)}
            </Typography>
            <Typography>
              <strong>Musical Quality Score:</strong> {results.musical_quality?.overall_quality?.toFixed(3)}
            </Typography>
            <Typography>
              <strong>Pitch Diversity:</strong> {results.musical_quality?.pitch_diversity?.toFixed(3)}
            </Typography>
            <Typography>
              <strong>Harmonic Consonance:</strong> {results.musical_quality?.harmonic_consonance?.toFixed(3)}
            </Typography>
          </Box>

          <Box>
            <Button
              variant="outlined"
              href={results.midi_download_url}
              download
              sx={{ mr: 2 }}
            >
              Download MIDI
            </Button>
            <Button
              variant="outlined"
              href={results.audio_download_url}
              download
            >
              Download Audio
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
```

### **5.2 FastAPI Backend Server**

Create the backend server:

**`app/main.py`**:

```python
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pathlib import Path
import torch
import numpy as np
import tempfile
import uuid
import shutil
import json
from typing import Optional

# Import our model components
from models.silentvideosynth import SilentVideoSynth
from utils.feature_extractor import VideoFeatureExtractor
from utils.midi_generator import MIDIGenerator
from utils.evaluator import SilentVideoSynthEvaluator

app = FastAPI(title="SilentVideoSynth API", version="1.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model instances
MODEL = None
FEATURE_EXTRACTOR = None
MIDI_GENERATOR = None
EVALUATOR = None

# Output directory for generated files
OUTPUT_DIR = Path("generated_outputs")
OUTPUT_DIR.mkdir(exist_ok=True)

@app.on_event("startup")
async def load_model():
    """Load the trained model and components on startup"""
    global MODEL, FEATURE_EXTRACTOR, MIDI_GENERATOR, EVALUATOR

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

    # Load model
    MODEL = SilentVideoSynth(chord_vocab_size=50, note_vocab_size=128, feature_dim=512)

    # Load trained weights if available
    try:
        MODEL.load_state_dict(torch.load('best_model.pth', map_location=device))
        print("Loaded trained model weights")
    except FileNotFoundError:
        print("No trained weights found, using randomly initialized model")

    MODEL.to(device)
    MODEL.eval()

    # Initialize components
    from transformers import CLIPProcessor, CLIPModel
    clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
    clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
    clip_model.to(device)

    FEATURE_EXTRACTOR = VideoFeatureExtractor(clip_model, clip_processor)
    MIDI_GENERATOR = MIDIGenerator()
    EVALUATOR = SilentVideoSynthEvaluator(MODEL, None, MIDI_GENERATOR)

    print("Model and components loaded successfully")

@app.post("/api/generate-music")
async def generate_music(
    video: UploadFile = File(...),
    text_description: str = Form(""),
    valence: float = Form(0.5),
    arousal: float = Form(0.5)
):
    """
    Generate music for uploaded video with text description and emotion parameters
    """
    if not video.content_type.startswith('video/'):
        raise HTTPException(status_code=400, detail="File must be a video")

    # Create unique session ID
    session_id = str(uuid.uuid4())
    session_dir = OUTPUT_DIR / session_id
    session_dir.mkdir(exist_ok=True)

    try:
        # Save uploaded video
        video_path = session_dir / f"input_video{Path(video.filename).suffix}"
        with open(video_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)

        # Extract video features
        video_features = FEATURE_EXTRACTOR.extract_all_features(
            video_path,
            text_description
        )

        # Override text emotion with user parameters
        video_features['text_emotion'] = np.array([valence, arousal])

        # Prepare input tensors
        device = next(MODEL.parameters()).device
        input_features = {
            'semantic': torch.tensor(video_features['semantic']).unsqueeze(0).to(device),
            'emotion': torch.tensor(video_features['emotion']).unsqueeze(0).to(device),
            'motion': torch.tensor(video_features['motion']).unsqueeze(0).unsqueeze(-1).to(device),
            'scene_offset': torch.tensor(video_features['scene_offset']).unsqueeze(0).unsqueeze(-1).to(device)
        }

        text_emotion = torch.tensor(video_features['text_emotion']).unsqueeze(0).to(device)

        # Generate music
        with torch.no_grad():
            outputs = MODEL(input_features, text_emotion)

        # Convert to MIDI and audio
        chord_sequence = outputs['chord_sequence'][0]  # Remove batch dimension
        note_outputs = {k: v[0] for k, v in outputs['note_outputs'].items()}

        midi = MIDI_GENERATOR.generate_midi(chord_sequence, note_outputs)
        midi = MIDI_GENERATOR.add_rhythm_track(midi, chord_sequence, note_outputs)

        # Synthesize audio
        audio = MIDI_GENERATOR.midi_to_audio(midi)

        # Save outputs
        midi_path, audio_path = MIDI_GENERATOR.save_output(
            midi, audio, session_dir
        )

        # Evaluate results
        emotion_alignment = EVALUATOR.evaluate_emotion_alignment(
            [chord_sequence], [text_emotion]
        )
        musical_quality = EVALUATOR.evaluate_musical_quality(str(midi_path))

        # Prepare response
        response = {
            "session_id": session_id,
            "emotion_alignment": emotion_alignment,
            "musical_quality": musical_quality,
            "audio_url": f"/api/download/{session_id}/audio",
            "midi_download_url": f"/api/download/{session_id}/midi",
            "audio_download_url": f"/api/download/{session_id}/audio"
        }

        return response

    except Exception as e:
        # Clean up on error
        if session_dir.exists():
            shutil.rmtree(session_dir)
        raise HTTPException(status_code=500, detail=f"Error generating music: {str(e)}")

@app.get("/api/download/{session_id}/{file_type}")
async def download_file(session_id: str, file_type: str):
    """Download generated files"""
    session_dir = OUTPUT_DIR / session_id

    if not session_dir.exists():
        raise HTTPException(status_code=404, detail="Session not found")

    if file_type == "midi":
        file_path = session_dir / "generated_music.mid"
        media_type = "audio/midi"
    elif file_type == "audio":
        file_path = session_dir / "generated_music.wav"
        media_type = "audio/wav"
    else:
        raise HTTPException(status_code=400, detail="Invalid file type")

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=file_path.name
    )

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "model_loaded": MODEL is not None}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### **5.3 Deployment Configuration**

**`docker-compose.yml`**:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "8000:8000"
    volumes:
      - ./models:/app/models
      - ./generated_outputs:/app/generated_outputs
    environment:
      - CUDA_VISIBLE_DEVICES=0
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    depends_on:
      - backend
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - frontend
      - backend
```

**`Dockerfile.backend`**:

```dockerfile
FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 🎯 **SECTION 6: SAMPLE USAGE & EXAMPLES**

### **6.1 Example Usage Script**

```python
def demo_silentvideosynth():
    """
    Demonstration of the complete SilentVideoSynth pipeline
    """
    # Sample video path (you would provide actual video)
    sample_video = "sample_videos/dancing_clip.mp4"
    sample_text = "Upbeat electronic dance music with energetic rhythm"

    print("🎬 SilentVideoSynth Demo")
    print("=" * 50)

    # 1. Extract video features
    print("1. Extracting video features...")
    video_features = feature_extractor.extract_all_features(sample_video, sample_text)

    print(f"   - Semantic features shape: {video_features['semantic'].shape}")
    print(f"   - Emotion features shape: {video_features['emotion'].shape}")
    print(f"   - Motion features shape: {video_features['motion'].shape}")
    print(f"   - Scene features shape: {video_features['scene_offset'].shape}")
    print(f"   - Text emotion: {video_features['text_emotion']}")

    # 2. Encode emotions
    print("\n2. Encoding emotions with Russell's Circumplex Model...")

    # Process video emotions
    video_emotions = []
    for emotion_frame in video_features['emotion']:
        frame_emotion = emotion_encoder.encode_video_emotion(emotion_frame)
        video_emotions.append(frame_emotion)

    combined_emotion = emotion_encoder.combine_emotions(
        np.mean(video_emotions, axis=0),
        video_features['text_emotion']
    )

    print(f"   - Combined emotion (valence, arousal): {combined_emotion}")

    # Get appropriate chords for this emotion
    suitable_chords = emotion_encoder.emotion_to_chords(
        combined_emotion[0], combined_emotion[1]
    )
    print(f"   - Suitable chord types: {suitable_chords}")

    # 3. Generate music
    print("\n3. Generating music with hybrid model...")

    # Prepare input tensors
    input_features = {
        'semantic': torch.tensor(video_features['semantic']).unsqueeze(0).to(device),
        'emotion': torch.tensor(video_features['emotion']).unsqueeze(0).to(device),
        'motion': torch.tensor(video_features['motion']).unsqueeze(0).unsqueeze(-1).to(device),
        'scene_offset': torch.tensor(video_features['scene_offset']).unsqueeze(0).unsqueeze(-1).to(device)
    }

    text_emotion = torch.tensor(video_features['text_emotion']).unsqueeze(0).to(device)

    # Generate
    model.eval()
    with torch.no_grad():
        outputs = model(input_features, text_emotion)

    chord_sequence = outputs['chord_sequence'][0]
    note_outputs = {k: v[0] for k, v in outputs['note_outputs'].items()}

    print(f"   - Generated chord sequence length: {len(chord_sequence)}")
    print(f"   - Chord sequence preview: {chord_sequence[:10].tolist()}")

    # 4. Convert to MIDI and audio
    print("\n4. Converting to MIDI and audio...")

    midi = midi_generator.generate_midi(chord_sequence, note_outputs)
    midi = midi_generator.add_rhythm_track(midi, chord_sequence, note_outputs)

    # Save outputs
    output_dir = Path("demo_output")
    output_dir.mkdir(exist_ok=True)

    midi_path, audio_path = midi_generator.save_output(midi, None, output_dir)

    print(f"   - MIDI saved to: {midi_path}")
    print(f"   - Audio saved to: {audio_path}")

    # 5. Evaluate results
    print("\n5. Evaluating generated music...")

    emotion_alignment = evaluator.evaluate_emotion_alignment([chord_sequence], [text_emotion])
    musical_quality = evaluator.evaluate_musical_quality(str(midi_path))

    print(f"   - Emotion alignment score: {emotion_alignment:.3f}")
    print(f"   - Musical quality metrics:")
    for metric, value in musical_quality.items():
        if isinstance(value, (int, float)):
            print(f"     - {metric}: {value:.3f}")

    print("\n🎉 Demo completed successfully!")
    print(f"Check the output files in: {output_dir}")

    return {
        'video_features': video_features,
        'generated_music': {
            'chord_sequence': chord_sequence,
            'note_outputs': note_outputs
        },
        'evaluation': {
            'emotion_alignment': emotion_alignment,
            'musical_quality': musical_quality
        },
        'output_files': {
            'midi': str(midi_path),
            'audio': str(audio_path)
        }
    }

# Run the demo
if __name__ == "__main__":
    demo_results = demo_silentvideosynth()

    # Visualize emotion space
    sample_emotions = [
        ("Generated", demo_results['evaluation']['combined_emotion']),
        ("Happy", (0.8, 0.6)),
        ("Sad", (0.2, 0.3)),
        ("Excited", (0.8, 0.8)),
        ("Calm", (0.6, 0.2))
    ]

    emotion_encoder.visualize_emotion_space(sample_emotions)
```

### **6.2 Advanced Configuration Examples**

```python
# Example 1: Custom emotion mapping for specific genres
class GenreSpecificEmotionEncoder(RussellCircumplexEncoder):
    """Extended encoder with genre-specific emotion mappings"""

    def __init__(self, genre="general"):
        super().__init__()
        self.genre = genre

        # Genre-specific chord mappings
        self.genre_chord_mappings = {
            "electronic": {
                (0.8, 0.8): ['M', 'sus4', 'add9', 'M7'],
                (0.2, 0.3): ['m', 'dim', 'm7b5']
            },
            "classical": {
                (0.8, 0.8): ['M', 'M7', 'dim7'],
                (0.2, 0.3): ['m', 'dim', 'hdim7']
            },
            "jazz": {
                (0.8, 0.8): ['M7', '9', '13'],
                (0.2, 0.3): ['m7', 'm9', 'm11']
            }
        }

    def emotion_to_chords(self, valence, arousal):
        """Genre-aware chord selection"""
        if self.genre in self.genre_chord_mappings:
            genre_mapping = self.genre_chord_mappings[self.genre]
            # Use genre-specific mapping if available
            min_dist = float('inf')
            best_chords = ['M']

            for coords, chords in genre_mapping.items():
                dist = np.sqrt((valence - coords[0])**2 + (arousal - coords[1])**2)
                if dist < min_dist:
                    min_dist = dist
                    best_chords = chords

            return best_chords
        else:
            # Fall back to general mapping
            return super().emotion_to_chords(valence, arousal)

# Example 2: Real-time inference optimization
class OptimizedSilentVideoSynth(SilentVideoSynth):
    """Optimized version for real-time inference"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # Enable optimizations
        self.video_encoder = torch.jit.script(self.video_encoder)
        self.chord_decoder = torch.jit.script(self.chord_decoder)

    def generate_streaming(self, encoded_video, chunk_size=8):
        """Generate music in chunks for streaming"""
        batch_size = encoded_video.shape[0]
        seq_len = encoded_video.shape[1]

        for start_idx in range(0, seq_len, chunk_size):
            end_idx = min(start_idx + chunk_size, seq_len)

            # Process chunk
            chunk_video = encoded_video[:, start_idx:end_idx]
            chunk_output = self.generate(chunk_video)

            yield chunk_output

# Example 3: Multi-instrument generation
class MultiInstrumentSilentVideoSynth(nn.Module):
    """Extended model for generating multiple instrument tracks"""

    def __init__(self, num_instruments=4, **kwargs):
        super().__init__()
        self.num_instruments = num_instruments

        # Shared video encoder
        self.video_encoder = MultimodalTransformerEncoder(**kwargs)

        # Separate decoders for each instrument
        self.instrument_decoders = nn.ModuleList([
            ChordProgressionTransformer(**kwargs)
            for _ in range(num_instruments)
        ])

        self.note_decoders = nn.ModuleList([
            ExpressiveLSTMDecoder(**kwargs)
            for _ in range(num_instruments)
        ])

        # Instrument-specific embeddings
        self.instrument_embeddings = nn.Embedding(num_instruments, kwargs.get('feature_dim', 512))

    def forward(self, video_features, text_emotion, instrument_id=0):
        """Generate music for specific instrument"""
        # Encode video
        encoded_video = self.video_encoder(
            video_features['semantic'],
            video_features['emotion'],
            video_features['motion'],
            video_features['scene_offset'],
            text_emotion
        )

        # Add instrument-specific conditioning
        instrument_emb = self.instrument_embeddings(
            torch.tensor([instrument_id], device=encoded_video.device)
        )
        conditioned_video = encoded_video + instrument_emb.unsqueeze(0).unsqueeze(0)

        # Generate for this instrument
        chord_output = self.instrument_decoders[instrument_id].generate(conditioned_video)
        note_output = self.note_decoders[instrument_id](chord_output, conditioned_video)

        return {
            'instrument_id': instrument_id,
            'chord_sequence': chord_output,
            'note_outputs': note_output
        }
```

---

## 🔮 **Future Enhancements & Research Directions**

### **Potential Improvements:**

1. **Advanced Emotion Models**: Integration with state-of-the-art emotion recognition models (FER2013, AffectNet)

2. **Style Transfer**: Allow users to specify musical styles (classical, jazz, electronic) for genre-aware generation

3. **Multi-modal Attention**: Cross-attention mechanisms between video frames and musical beats for tighter synchronization

4. **Personalization**: User preference learning for customized music generation

5. **Real-time Processing**: Optimized models for live video streaming applications

6. **Advanced Evaluation**: Perceptual metrics using trained audio quality assessment models

7. **Interactive Editing**: Web interface for fine-tuning generated music with visual feedback

---

This comprehensive guide provides a complete implementation of the SilentVideoSynth system, from data preprocessing to deployment. The hybrid Transformer-LSTM architecture effectively captures both high-level musical structure and expressive details, while the emotion encoding system ensures semantic alignment between video content and generated music.

The system is designed to be modular and extensible, allowing for easy integration of new features and improvements as research in multimodal AI continues to advance.