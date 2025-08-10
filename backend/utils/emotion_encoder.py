
# backend/utils/emotion_encoder.py

import numpy as np
import torch
from typing import Dict, List, Tuple, Optional


class RussellCircumplexEncoder:
    """
    Implementation of Russell's Circumplex Model for emotion encoding.
    Maps emotions to 2D space: Valence (pleasantness) × Arousal (energy).
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

        # Tempo mappings based on arousal
        self.arousal_tempo_mapping = {
            0.0: 60,    # Very slow
            0.2: 80,    # Slow
            0.4: 100,   # Moderate
            0.6: 120,   # Standard
            0.8: 140,   # Fast
            1.0: 160,   # Very fast
        }

    def encode_video_emotion(self, emotion_probs: np.ndarray) -> np.ndarray:
        """
        Convert CLIP emotion probabilities to valence-arousal coordinates.

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

    def combine_emotions(
        self,
        video_emotion: np.ndarray,
        text_emotion: np.ndarray,
        video_weight: float = 0.7,
    ) -> np.ndarray:
        """
        Combine video and text emotions with weighting.
        """
        combined = video_weight * video_emotion + (1 - video_weight) * text_emotion
        return combined

    def emotion_to_musical_parameters(
        self,
        valence: float,
        arousal: float,
    ) -> Dict[str, any]:
        """
        Map emotion coordinates to musical parameters.
        """
        # Get appropriate chords
        chords = self.emotion_to_chords(valence, arousal)

        # Get tempo based on arousal
        tempo = self._arousal_to_tempo(arousal)

        # Get key based on valence (major for positive, minor for negative)
        key_mode = 'major' if valence > 0.5 else 'minor'

        # Get dynamics based on arousal
        dynamics = 'forte' if arousal > 0.7 else 'piano' if arousal < 0.3 else 'mezzo'

        # Get articulation based on emotion quadrant
        if valence > 0.5 and arousal > 0.5:
            articulation = 'staccato'  # Excited
        elif valence > 0.5 and arousal < 0.5:
            articulation = 'legato'    # Peaceful
        elif valence < 0.5 and arousal > 0.5:
            articulation = 'marcato'   # Angry
        else:
            articulation = 'tenuto'    # Sad

        return {
            'chords': chords,
            'tempo': tempo,
            'key_mode': key_mode,
            'dynamics': dynamics,
            'articulation': articulation,
            'valence': valence,
            'arousal': arousal,
        }

    def emotion_to_chords(self, valence: float, arousal: float) -> List[str]:
        """
        Map emotion coordinates to appropriate chord types.
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

    def _arousal_to_tempo(self, arousal: float) -> int:
        """Convert arousal level to appropriate tempo."""
        # Find closest arousal level
        closest_arousal = min(self.arousal_tempo_mapping.keys(),
                            key=lambda x: abs(x - arousal))
        base_tempo = self.arousal_tempo_mapping[closest_arousal]

        # Add some variation based on exact arousal value
        variation = int((arousal - closest_arousal) * 20)

        return max(60, min(180, base_tempo + variation))

    def get_emotion_trajectory(
        self,
        video_emotions: np.ndarray,
        smoothing_window: int = 3,
    ) -> np.ndarray:
        """
        Smooth emotion trajectory over time for coherent musical flow.
        """
        if len(video_emotions) < smoothing_window:
            return video_emotions

        # Apply moving average smoothing
        smoothed = np.zeros_like(video_emotions)

        for i in range(len(video_emotions)):
            start_idx = max(0, i - smoothing_window // 2)
            end_idx = min(len(video_emotions), i + smoothing_window // 2 + 1)

            smoothed[i] = np.mean(video_emotions[start_idx:end_idx], axis=0)

        return smoothed

    def detect_emotion_changes(
        self,
        emotion_trajectory: np.ndarray,
        threshold: float = 0.3,
    ) -> List[int]:
        """
        Detect significant emotion changes for musical section boundaries.
        """
        changes = [0]  # Always start at beginning

        for i in range(1, len(emotion_trajectory)):
            # Calculate emotion distance
            distance = np.linalg.norm(emotion_trajectory[i] - emotion_trajectory[i-1])

            if distance > threshold:
                changes.append(i)

        return changes