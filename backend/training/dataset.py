
# backend/training/dataset.py

import torch
from torch.utils.data import Dataset
import numpy as np
import json
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
import logging

logger = logging.getLogger(__name__)


class VideoMusicDataset(Dataset):
    """
    Dataset class for video-music pairs with emotion annotations.
    Compatible with MuVi-Sync dataset format.
    """

    def __init__(
        self,
        data_path: str,
        max_video_length: int = 30,
        max_chord_length: int = 32,
        video_fps: int = 1,
        transform: Optional[Any] = None,
    ):
        self.data_path = Path(data_path)
        self.max_video_length = max_video_length
        self.max_chord_length = max_chord_length
        self.video_fps = video_fps
        self.transform = transform

        # Load dataset metadata
        self.metadata = self._load_metadata()
        self.samples = self.metadata.get('samples', [])

        # Vocabulary mappings
        self.chord_vocab = self._build_chord_vocab()
        self.note_vocab = self._build_note_vocab()

        logger.info(f"Dataset loaded with {len(self.samples)} samples")
        logger.info(f"Chord vocabulary size: {len(self.chord_vocab)}")
        logger.info(f"Note vocabulary size: {len(self.note_vocab)}")

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        """Get a single sample."""
        sample = self.samples[idx]

        try:
            # Load video features
            video_features = self._load_video_features(sample)

            # Load music targets
            music_targets = self._load_music_targets(sample)

            # Load emotion targets
            emotion_targets = self._load_emotion_targets(sample)

            return {
                'video_features': video_features,
                'text_emotion': emotion_targets,
                'chord_targets': music_targets['chords'],
                'note_targets': music_targets['notes'],
                'sample_id': sample['id'],
            }

        except Exception as e:
            logger.error(f"Failed to load sample {idx}: {e}")
            # Return a dummy sample to avoid training interruption
            return self._get_dummy_sample()

    def _load_metadata(self) -> Dict[str, Any]:
        """Load dataset metadata from JSON file."""
        metadata_path = self.data_path / "metadata.json"

        if metadata_path.exists():
            with open(metadata_path, 'r') as f:
                return json.load(f)
        else:
            # Create dummy metadata for testing
            logger.warning("No metadata.json found, creating dummy dataset")
            return self._create_dummy_metadata()

    def _create_dummy_metadata(self) -> Dict[str, Any]:
        """Create dummy metadata for testing."""
        dummy_samples = []

        for i in range(100):  # Create 100 dummy samples
            dummy_samples.append({
                'id': f'dummy_{i:03d}',
                'video_path': f'videos/dummy_{i:03d}.mp4',
                'audio_path': f'audio/dummy_{i:03d}.wav',
                'duration': np.random.uniform(10, 30),
                'genre': np.random.choice(['electronic', 'classical', 'jazz', 'pop']),
                'emotion_labels': {
                    'valence': np.random.uniform(0, 1),
                    'arousal': np.random.uniform(0, 1)
                },
                'description': f'Dummy sample {i} for testing'
            })

        return {'samples': dummy_samples}

    def _load_video_features(self, sample: Dict[str, Any]) -> Dict[str, torch.Tensor]:
        """Load video features for a sample."""
        # Try to load pre-extracted features
        features_path = self.data_path / "features" / f"{sample['id']}_video_features.npz"

        if features_path.exists():
            features = np.load(features_path)
            return {
                'semantic': torch.tensor(features['semantic']).float(),
                'emotion': torch.tensor(features['emotion']).float(),
                'motion': torch.tensor(features['motion']).float(),
                'scene_offset': torch.tensor(features['scene_offset']).float(),
            }
        else:
            # Generate dummy features
            seq_len = min(int(sample['duration']), self.max_video_length)
            return {
                'semantic': torch.randn(seq_len, 512),  # CLIP features
                'emotion': torch.softmax(torch.randn(seq_len, 6), dim=-1),  # Emotion probabilities
                'motion': torch.rand(seq_len),  # Motion intensity
                'scene_offset': torch.arange(seq_len).float(),  # Scene offsets
            }

    def _load_music_targets(self, sample: Dict[str, Any]) -> Dict[str, torch.Tensor]:
        """Load music targets for a sample."""
        # Try to load pre-processed music data
        music_path = self.data_path / "music" / f"{sample['id']}_music_targets.npz"

        if music_path.exists():
            music_data = np.load(music_path)
            chord_targets = torch.tensor(music_data['chords']).long()
            note_targets = {
                'notes': torch.tensor(music_data['notes']).long(),
                'velocities': torch.tensor(music_data['velocities']).float(),
                'durations': torch.tensor(music_data['durations']).long(),
            }
        else:
            # Generate dummy music targets
            chord_length = min(self.max_chord_length, int(sample['duration'] // 2))

            # Dummy chord progression
            chord_targets = torch.randint(0, len(self.chord_vocab), (chord_length,))

            # Dummy note sequences
            note_targets = {
                'notes': torch.randint(21, 109, (chord_length, 4)),  # MIDI note range
                'velocities': torch.rand(chord_length, 4),  # Normalized velocities
                'durations': torch.randint(0, 8, (chord_length, 4)),  # Duration classes
            }

        # Pad sequences to max length
        chord_targets = self._pad_sequence(chord_targets, self.max_chord_length, 0)
        for key in note_targets:
            if note_targets[key].dim() == 1:
                note_targets[key] = self._pad_sequence(note_targets[key], self.max_chord_length, 0)
            else:
                note_targets[key] = self._pad_sequence_2d(note_targets[key], self.max_chord_length, 0)

        return {
            'chords': chord_targets,
            'notes': note_targets,
        }

    def _load_emotion_targets(self, sample: Dict[str, Any]) -> torch.Tensor:
        """Load emotion targets for a sample."""
        emotion_labels = sample['emotion_labels']
        valence = emotion_labels['valence']
        arousal = emotion_labels['arousal']

        return torch.tensor([valence, arousal]).float()

    def _build_chord_vocab(self) -> Dict[str, int]:
        """Build chord vocabulary."""
        # Basic chord vocabulary - could be expanded
        chords = [
            # Special tokens
            '<PAD>', '<BOS>', '<EOS>',

            # Major chords
            'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',

            # Minor chords
            'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm',

            # Seventh chords
            'C7', 'Cm7', 'Cmaj7', 'D7', 'Dm7', 'Dmaj7',
            'E7', 'Em7', 'Emaj7', 'F7', 'Fm7', 'Fmaj7',
            'G7', 'Gm7', 'Gmaj7', 'A7', 'Am7', 'Amaj7',
            'B7', 'Bm7', 'Bmaj7',
        ]

        return {chord: idx for idx, chord in enumerate(chords)}

    def _build_note_vocab(self) -> Dict[str, int]:
        """Build note vocabulary."""
        # MIDI note numbers (21-108 for piano range)
        notes = {}
        for midi_note in range(21, 109):
            notes[str(midi_note)] = midi_note - 21

        # Add special tokens
        notes['<PAD>'] = len(notes)
        notes['<REST>'] = len(notes)

        return notes

    def _pad_sequence(self, sequence: torch.Tensor, max_length: int, pad_value: int) -> torch.Tensor:
        """Pad sequence to max length."""
        if len(sequence) >= max_length:
            return sequence[:max_length]
        else:
            pad_length = max_length - len(sequence)
            padding = torch.full((pad_length,), pad_value, dtype=sequence.dtype)
            return torch.cat([sequence, padding])

    def _pad_sequence_2d(self, sequence: torch.Tensor, max_length: int, pad_value: int) -> torch.Tensor:
        """Pad 2D sequence to max length."""
        if sequence.shape[0] >= max_length:
            return sequence[:max_length]
        else:
            pad_length = max_length - sequence.shape[0]
            padding = torch.full((pad_length, sequence.shape[1]), pad_value, dtype=sequence.dtype)
            return torch.cat([sequence, padding])

    def _get_dummy_sample(self) -> Dict[str, torch.Tensor]:
        """Get a dummy sample for error recovery."""
        seq_len = 16

        return {
            'video_features': {
                'semantic': torch.randn(seq_len, 512),
                'emotion': torch.softmax(torch.randn(seq_len, 6), dim=-1),
                'motion': torch.rand(seq_len),
                'scene_offset': torch.arange(seq_len).float(),
            },
            'text_emotion': torch.tensor([0.5, 0.5]).float(),
            'chord_targets': torch.randint(0, len(self.chord_vocab), (self.max_chord_length,)),
            'note_targets': {
                'notes': torch.randint(21, 109, (self.max_chord_length, 4)),
                'velocities': torch.rand(self.max_chord_length, 4),
                'durations': torch.randint(0, 8, (self.max_chord_length, 4)),
            },
            'sample_id': 'dummy_error_recovery',
        }

