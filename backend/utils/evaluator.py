
# backend/utils/evaluator.py

import torch
import torch.nn as nn
import numpy as np
import pretty_midi
from typing import Dict, List, Tuple, Optional, Any
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class SilentVideoSynthEvaluator:
    """
    Comprehensive evaluation metrics for video-to-music generation.
    """

    def __init__(self, model, emotion_encoder, midi_generator):
        self.model = model
        self.emotion_encoder = emotion_encoder
        self.midi_generator = midi_generator

    def evaluate_comprehensive(
        self,
        generated_output: Dict[str, Any],
        target_emotion: torch.Tensor,
        video_features: Dict[str, torch.Tensor],
        midi_path: Optional[str] = None,
    ) -> Dict[str, float]:
        """
        Comprehensive evaluation of generated music.

        Args:
            generated_output: Model output containing chord_sequence and note_outputs
            target_emotion: Target emotion coordinates [batch_size, 2]
            video_features: Original video features
            midi_path: Optional path to generated MIDI file

        Returns:
            Dictionary containing all evaluation metrics
        """
        metrics = {}

        # Emotion alignment evaluation
        metrics.update(self.evaluate_emotion_alignment(
            generated_output['chord_sequence'],
            target_emotion
        ))

        # Musical quality evaluation
        if midi_path:
            metrics.update(self.evaluate_musical_quality(midi_path))

        # Temporal coherence evaluation
        metrics.update(self.evaluate_temporal_coherence(
            generated_output,
            video_features
        ))

        # Harmonic consistency evaluation
        metrics.update(self.evaluate_harmonic_consistency(
            generated_output['chord_sequence']
        ))

        # Overall score
        metrics['overall_score'] = self._compute_overall_score(metrics)

        return metrics

    def evaluate_emotion_alignment(
        self,
        chord_sequence: torch.Tensor,
        target_emotion: torch.Tensor,
    ) -> Dict[str, float]:
        """
        Evaluate how well generated chords match target emotions.
        """
        batch_size = chord_sequence.shape[0]
        alignment_scores = []

        for batch_idx in range(batch_size):
            # Convert chord sequence to predicted emotion
            predicted_emotion = self._chords_to_emotion(chord_sequence[batch_idx])
            target_emotion_np = target_emotion[batch_idx].cpu().numpy()

            # Calculate distance in emotion space
            emotion_distance = np.linalg.norm(predicted_emotion - target_emotion_np)

            # Convert distance to similarity score (0-1, higher is better)
            alignment_score = 1.0 / (1.0 + emotion_distance)
            alignment_scores.append(alignment_score)

        return {
            'emotion_alignment': np.mean(alignment_scores),
            'emotion_alignment_std': np.std(alignment_scores),
        }

    def _chords_to_emotion(self, chord_sequence: torch.Tensor) -> np.ndarray:
        """Map chord sequence to emotion coordinates."""
        # Enhanced chord-to-emotion mapping
        chord_emotion_map = {
            # Major chords - generally positive valence
            0: (0.7, 0.5), 1: (0.8, 0.6), 2: (0.8, 0.7), 3: (0.7, 0.4),
            4: (0.8, 0.6), 5: (0.7, 0.5), 6: (0.8, 0.7),

            # Minor chords - generally negative valence
            10: (0.3, 0.4), 11: (0.2, 0.3), 12: (0.3, 0.5), 13: (0.2, 0.3),
            14: (0.3, 0.4), 15: (0.3, 0.3), 16: (0.2, 0.4),

            # Seventh chords - complex emotions
            20: (0.6, 0.7), 21: (0.8, 0.5), 22: (0.4, 0.6), 23: (0.6, 0.4),

            # Suspended chords - tension/release
            30: (0.5, 0.6), 31: (0.6, 0.4),

            # Diminished/augmented - high tension
            40: (0.2, 0.8), 41: (0.3, 0.9),
        }

        valence_sum = 0
        arousal_sum = 0
        valid_chords = 0

        for chord_id in chord_sequence:
            chord_id_int = chord_id.item() if hasattr(chord_id, 'item') else int(chord_id)
            if chord_id_int in chord_emotion_map:
                valence, arousal = chord_emotion_map[chord_id_int]
                valence_sum += valence
                arousal_sum += arousal
                valid_chords += 1

        if valid_chords > 0:
            return np.array([valence_sum / valid_chords, arousal_sum / valid_chords])
        else:
            return np.array([0.5, 0.5])  # Neutral if no valid chords

    def evaluate_musical_quality(self, midi_path: str) -> Dict[str, float]:
        """
        Evaluate musical quality using rule-based metrics.
        """
        try:
            midi = pretty_midi.PrettyMIDI(midi_path)
        except Exception as e:
            logger.error(f"Could not load MIDI file {midi_path}: {e}")
            return {'musical_quality_error': 1.0}

        metrics = {}

        # Extract all notes from non-drum instruments
        all_notes = []
        for instrument in midi.instruments:
            if not instrument.is_drum:
                all_notes.extend(instrument.notes)

        if not all_notes:
            return {'musical_quality_error': 1.0}

        # Pitch diversity
        pitches = [note.pitch for note in all_notes]
        unique_pitches = len(set(pitches))
        pitch_range = max(pitches) - min(pitches) if pitches else 0

        metrics['pitch_diversity'] = min(unique_pitches / 88, 1.0)  # Normalize by piano range
        metrics['pitch_range'] = min(pitch_range / 88, 1.0)

        # Rhythm regularity
        note_durations = [note.end - note.start for note in all_notes]
        if note_durations:
            duration_std = np.std(note_durations)
            metrics['rhythm_regularity'] = 1.0 / (1.0 + duration_std)
        else:
            metrics['rhythm_regularity'] = 0.0

        # Harmonic consonance
        metrics['harmonic_consonance'] = self._calculate_consonance(all_notes)

        # Melodic coherence
        metrics['melodic_coherence'] = self._calculate_melodic_coherence(all_notes)

        # Dynamic range
        velocities = [note.velocity for note in all_notes]
        if velocities:
            velocity_range = (max(velocities) - min(velocities)) / 127
            metrics['dynamic_range'] = velocity_range
        else:
            metrics['dynamic_range'] = 0.0

        # Overall musical quality
        quality_components = [
            metrics['pitch_diversity'],
            metrics['rhythm_regularity'],
            metrics['harmonic_consonance'],
            metrics['melodic_coherence'],
        ]
        metrics['overall_quality'] = np.mean(quality_components)

        return metrics

    def _calculate_consonance(self, notes: List[pretty_midi.Note]) -> float:
        """Calculate harmonic consonance score."""
        consonant_intervals = [0, 3, 4, 5, 7, 8, 9, 12]  # Unison, minor/major thirds, fourths, fifths, octave
        total_intervals = 0
        consonant_count = 0

        # Group notes by time
        time_groups = {}
        for note in notes:
            start_time = round(note.start, 1)  # Round to 100ms
            if start_time not in time_groups:
                time_groups[start_time] = []
            time_groups[start_time].append(note)

        # Check consonance for simultaneous notes
        for time_point, simultaneous_notes in time_groups.items():
            if len(simultaneous_notes) < 2:
                continue

            for i, note1 in enumerate(simultaneous_notes):
                for note2 in simultaneous_notes[i+1:]:
                    interval = abs(note1.pitch - note2.pitch) % 12
                    total_intervals += 1
                    if interval in consonant_intervals:
                        consonant_count += 1

        return consonant_count / total_intervals if total_intervals > 0 else 1.0

    def _calculate_melodic_coherence(self, notes: List[pretty_midi.Note]) -> float:
        """Calculate melodic coherence based on step-wise motion."""
        if len(notes) < 2:
            return 1.0

        # Sort notes by start time
        notes_sorted = sorted(notes, key=lambda n: n.start)

        step_wise_count = 0
        total_intervals = 0

        for i in range(len(notes_sorted) - 1):
            interval = abs(notes_sorted[i+1].pitch - notes_sorted[i].pitch)
            total_intervals += 1

            # Step-wise motion (1-2 semitones) is considered coherent
            if 1 <= interval <= 2:
                step_wise_count += 1
            # Small jumps (3-5 semitones) are partially coherent
            elif 3 <= interval <= 5:
                step_wise_count += 0.5

        return step_wise_count / total_intervals if total_intervals > 0 else 1.0

    def evaluate_temporal_coherence(
        self,
        generated_output: Dict[str, Any],
        video_features: Dict[str, torch.Tensor],
    ) -> Dict[str, float]:
        """
        Evaluate temporal coherence between video and music.
        """
        chord_sequence = generated_output['chord_sequence']

        # Calculate chord transition smoothness
        transition_scores = []
        for i in range(1, chord_sequence.shape[1]):
            prev_chord = chord_sequence[0, i-1].item()
            curr_chord = chord_sequence[0, i].item()

            # Score based on harmonic distance
            harmonic_distance = self._calculate_harmonic_distance(prev_chord, curr_chord)
            transition_score = 1.0 / (1.0 + harmonic_distance)
            transition_scores.append(transition_score)

        # Calculate alignment with video motion
        motion_features = video_features['motion'].cpu().numpy()
        motion_alignment = self._calculate_motion_alignment(chord_sequence, motion_features)

        return {
            'temporal_coherence': np.mean(transition_scores) if transition_scores else 1.0,
            'motion_alignment': motion_alignment,
        }

    def _calculate_harmonic_distance(self, chord1: int, chord2: int) -> float:
        """Calculate harmonic distance between two chords."""
        # Simple implementation based on chord types
        chord_types = {
            # Major chords
            **{i: 'major' for i in range(10)},
            # Minor chords
            **{i: 'minor' for i in range(10, 20)},
            # Seventh chords
            **{i: 'seventh' for i in range(20, 30)},
            # Suspended chords
            **{i: 'suspended' for i in range(30, 40)},
            # Diminished/augmented
            **{i: 'dissonant' for i in range(40, 50)},
        }

        type1 = chord_types.get(chord1, 'unknown')
        type2 = chord_types.get(chord2, 'unknown')

        # Distance based on chord type compatibility
        distances = {
            ('major', 'major'): 0.1,
            ('minor', 'minor'): 0.1,
            ('major', 'minor'): 0.3,
            ('major', 'seventh'): 0.2,
            ('minor', 'seventh'): 0.2,
            ('suspended', 'major'): 0.4,
            ('suspended', 'minor'): 0.4,
            ('dissonant', 'major'): 0.8,
            ('dissonant', 'minor'): 0.8,
        }

        return distances.get((type1, type2), 0.5)

    def _calculate_motion_alignment(
        self,
        chord_sequence: torch.Tensor,
        motion_features: np.ndarray,
    ) -> float:
        """Calculate alignment between chord changes and video motion."""
        # Detect chord changes
        chord_changes = []
        for i in range(1, chord_sequence.shape[1]):
            if chord_sequence[0, i] != chord_sequence[0, i-1]:
                chord_changes.append(i)

        if len(chord_changes) == 0:
            return 0.5  # No chord changes

        # Detect motion peaks
        motion_peaks = []
        threshold = np.mean(motion_features) + np.std(motion_features)
        for i in range(1, len(motion_features)-1):
            if (motion_features[i] > motion_features[i-1] and
                motion_features[i] > motion_features[i+1] and
                motion_features[i] > threshold):
                motion_peaks.append(i)

        if len(motion_peaks) == 0:
            return 0.5  # No motion peaks

        # Calculate alignment between chord changes and motion peaks
        alignment_scores = []
        for change in chord_changes:
            # Find closest motion peak
            distances = [abs(change - peak) for peak in motion_peaks]
            min_distance = min(distances) if distances else float('inf')

            # Convert distance to alignment score
            alignment_score = 1.0 / (1.0 + min_distance)
            alignment_scores.append(alignment_score)

        return np.mean(alignment_scores)

    def evaluate_harmonic_consistency(
        self,
        chord_sequence: torch.Tensor,
    ) -> Dict[str, float]:
        """
        Evaluate harmonic consistency of the chord progression.
        """
        # Convert to list of chord IDs
        chords = chord_sequence[0].cpu().numpy().tolist()

        # Check for common chord progressions
        progression_score = self._evaluate_chord_progressions(chords)

        # Check for harmonic rhythm consistency
        rhythm_consistency = self._evaluate_harmonic_rhythm(chords)

        return {
            'harmonic_consistency': (progression_score + rhythm_consistency) / 2,
            'progression_score': progression_score,
            'rhythm_consistency': rhythm_consistency,
        }

    def _evaluate_chord_progressions(self, chords: List[int]) -> float:
        """Evaluate chord progressions against common patterns."""
        # Common progression patterns (simplified)
        common_progressions = [
            [0, 5, 10, 4],  # I-vi-iv-V (in C major)
            [0, 4, 5, 0],   # I-V-vi-I
            [10, 4, 0, 5],  # vi-V-I-vi
        ]

        # Find longest matching subsequence
        max_match_length = 0
        for progression in common_progressions:
            for i in range(len(chords) - len(progression) + 1):
                if chords[i:i+len(progression)] == progression:
                    max_match_length = max(max_match_length, len(progression))

        return max_match_length / len(chords) if chords else 0.0

    def _evaluate_harmonic_rhythm(self, chords: List[int]) -> float:
        """Evaluate consistency of harmonic rhythm."""
        if len(chords) < 2:
            return 1.0

        # Simple measure: reward fewer random chord changes
        changes = sum(1 for i in range(1, len(chords)) if chords[i] != chords[i-1])
        change_rate = changes / (len(chords) - 1)

        # Optimal change rate is around 0.25-0.5 (changing every 2-4 beats)
        optimal_range = (0.25, 0.5)
        if optimal_range[0] <= change_rate <= optimal_range[1]:
            return 1.0
        elif change_rate < optimal_range[0]:
            return change_rate / optimal_range[0]
        else:
            return optimal_range[1] / change_rate

    def _compute_overall_score(self, metrics: Dict[str, float]) -> float:
        """Compute weighted overall score from individual metrics."""
        weights = {
            'emotion_alignment': 0.3,
            'overall_quality': 0.25,
            'temporal_coherence': 0.2,
            'harmonic_consistency': 0.15,
            'motion_alignment': 0.1,
        }

        score = 0.0
        total_weight = 0.0

        for metric, weight in weights.items():
            if metric in metrics:
                score += metrics[metric] * weight
                total_weight += weight

        return score / total_weight if total_weight > 0 else 0.0