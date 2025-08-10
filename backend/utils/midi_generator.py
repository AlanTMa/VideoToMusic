# backend/utils/midi_generator.py

import pretty_midi
import numpy as np
import torch
import librosa
import soundfile as sf
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Union
import logging

logger = logging.getLogger(__name__)


class MIDIGenerator:
    """
    Convert model outputs to MIDI files and synthesize audio.
    """

    def __init__(self, sample_rate: int = 44100):
        self.sample_rate = sample_rate

        # Comprehensive chord mappings for different chord types
        self.chord_to_notes = {
            # Major chords
            0: [60, 64, 67],      # C major
            1: [62, 66, 69],      # D major
            2: [64, 68, 71],      # E major
            3: [65, 69, 72],      # F major
            4: [67, 71, 74],      # G major
            5: [69, 73, 76],      # A major
            6: [71, 75, 78],      # B major

            # Minor chords
            10: [60, 63, 67],     # C minor
            11: [62, 65, 69],     # D minor
            12: [64, 67, 71],     # E minor
            13: [65, 68, 72],     # F minor
            14: [67, 70, 74],     # G minor
            15: [69, 72, 76],     # A minor
            16: [71, 74, 78],     # B minor

            # Seventh chords
            20: [60, 64, 67, 70], # C7
            21: [60, 64, 67, 71], # Cmaj7
            22: [60, 63, 67, 70], # Cm7
            23: [60, 63, 67, 71], # CmMaj7

            # Suspended chords
            30: [60, 65, 67],     # Csus4
            31: [60, 62, 67],     # Csus2

            # Diminished and augmented
            40: [60, 63, 66],     # Cdim
            41: [60, 64, 68],     # Caug

            # Extended chords
            50: [60, 64, 67, 70, 74], # C9
        }

        # Duration mappings (in quarter notes)
        self.duration_map = {
            0: 0.125,  # Thirty-second note
            1: 0.25,   # Sixteenth note
            2: 0.5,    # Eighth note
            3: 1.0,    # Quarter note
            4: 2.0,    # Half note
            5: 4.0,    # Whole note
            6: 1.5,    # Dotted quarter
            7: 0.75,   # Dotted eighth
            8: 3.0,    # Dotted half
        }

        # Instrument program mappings
        self.instrument_programs = {
            'piano': 0,
            'guitar': 24,
            'bass': 32,
            'violin': 40,
            'flute': 73,
            'drums': 0,  # Drum kit (channel 9)
            'synth': 80,
            'cello': 42,
        }

    def generate_midi(
        self,
        chord_sequence: Union[torch.Tensor, np.ndarray],
        note_outputs: Dict[str, Union[torch.Tensor, np.ndarray]],
        tempo: int = 120,
        time_signature: Tuple[int, int] = (4, 4),
    ) -> pretty_midi.PrettyMIDI:
        """
        Convert model outputs to MIDI file.

        Args:
            chord_sequence: Sequence of chord IDs
            note_outputs: Dictionary containing note predictions
            tempo: BPM tempo
            time_signature: Time signature tuple (numerator, denominator)

        Returns:
            PrettyMIDI object
        """
        # Convert tensors to numpy if needed
        if isinstance(chord_sequence, torch.Tensor):
            chord_sequence = chord_sequence.cpu().numpy()

        for key, value in note_outputs.items():
            if isinstance(value, torch.Tensor):
                note_outputs[key] = value.cpu().numpy()

        # Create MIDI file
        midi = pretty_midi.PrettyMIDI(initial_tempo=tempo)

        # Create piano track for main melody and chords
        piano = pretty_midi.Instrument(program=self.instrument_programs['piano'])

        current_time = 0.0
        beat_duration = 60.0 / tempo  # Duration of one beat in seconds

        # Process each chord in sequence
        for i, chord_id in enumerate(chord_sequence):
            if i >= len(note_outputs.get('notes', [])):
                break

            # Get chord notes
            chord_notes = self.chord_to_notes.get(int(chord_id), [60, 64, 67])

            # Get predicted note info
            if note_outputs['notes'].ndim == 3:  # Multiple notes per chord
                note_preds = note_outputs['notes'][i]
                velocity_preds = note_outputs['velocities'][i] if 'velocities' in note_outputs else [0.7] * len(note_preds)
                duration_preds = note_outputs['durations'][i] if 'durations' in note_outputs else [3] * len(note_preds)
            else:  # Single note per chord
                note_preds = [note_outputs['notes'][i]]
                velocity_preds = [note_outputs['velocities'][i]] if 'velocities' in note_outputs else [0.7]
                duration_preds = [note_outputs['durations'][i]] if 'durations' in note_outputs else [3]

            # Add chord as background harmony
            chord_duration = self.duration_map.get(3, 1.0) * beat_duration  # Default quarter note
            chord_velocity = int(min(max(velocity_preds[0] * 127, 20), 100))  # Lower velocity for chords

            for note_pitch in chord_notes:
                if 21 <= note_pitch <= 108:  # Valid MIDI range
                    note = pretty_midi.Note(
                        velocity=chord_velocity,
                        pitch=note_pitch,
                        start=current_time,
                        end=current_time + chord_duration
                    )
                    piano.notes.append(note)

            # Add melody notes
            melody_start_time = current_time
            for j, (note_pred, velocity_pred, duration_pred) in enumerate(zip(note_preds, velocity_preds, duration_preds)):
                # Convert predictions to actual values
                if hasattr(note_pred, 'item'):  # If it's a tensor/scalar
                    melody_pitch = int(note_pred.item() if hasattr(note_pred, 'item') else note_pred)
                else:
                    melody_pitch = int(np.argmax(note_pred) if len(note_pred.shape) > 0 else note_pred)

                velocity = int(np.clip(velocity_pred * 127, 30, 127))

                if hasattr(duration_pred, 'item'):
                    duration_id = int(duration_pred.item() if hasattr(duration_pred, 'item') else duration_pred)
                else:
                    duration_id = int(np.argmax(duration_pred) if len(duration_pred.shape) > 0 else duration_pred)

                note_duration = self.duration_map.get(duration_id, 0.5) * beat_duration

                # Ensure valid MIDI note range
                if 21 <= melody_pitch <= 108:
                    melody_note = pretty_midi.Note(
                        velocity=velocity,
                        pitch=melody_pitch,
                        start=melody_start_time,
                        end=melody_start_time + note_duration
                    )
                    piano.notes.append(melody_note)

                melody_start_time += note_duration * 0.5  # Slight overlap

            current_time += chord_duration

        midi.instruments.append(piano)
        return midi

    def add_rhythm_track(
        self,
        midi: pretty_midi.PrettyMIDI,
        chord_sequence: Union[torch.Tensor, np.ndarray],
        note_outputs: Dict[str, Union[torch.Tensor, np.ndarray]],
        drum_pattern: str = "basic",
    ) -> pretty_midi.PrettyMIDI:
        """Add percussion/rhythm track to MIDI."""
        # Create drum track (channel 9)
        drums = pretty_midi.Instrument(program=0, is_drum=True)

        current_time = 0.0
        beat_duration = 60.0 / midi.initial_tempo

        # Drum patterns
        patterns = {
            "basic": {
                "kick": [0, 2],      # On beats 1 and 3
                "snare": [1, 3],     # On beats 2 and 4
                "hihat": [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5],  # Eighth notes
            },
            "rock": {
                "kick": [0, 2, 2.5],
                "snare": [1, 3],
                "hihat": [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5],
            },
            "jazz": {
                "kick": [0, 2.5],
                "snare": [1, 3],
                "hihat": [0, 1, 2, 3],  # Quarter notes with swing
            }
        }

        pattern = patterns.get(drum_pattern, patterns["basic"])

        for i, chord_id in enumerate(chord_sequence):
            if i >= len(note_outputs.get('durations', [])):
                break

            # Get chord duration
            duration_pred = note_outputs['durations'][i] if 'durations' in note_outputs else 3
            if hasattr(duration_pred, 'item'):
                duration_id = int(duration_pred.item())
            else:
                duration_id = int(np.argmax(duration_pred) if len(duration_pred.shape) > 0 else duration_pred)

            chord_duration = self.duration_map.get(duration_id, 1.0) * beat_duration

            # Add drum hits for this measure
            for beat_offset in pattern["kick"]:
                if beat_offset * beat_duration < chord_duration:
                    kick = pretty_midi.Note(
                        velocity=90,
                        pitch=36,  # Kick drum
                        start=current_time + beat_offset * beat_duration,
                        end=current_time + beat_offset * beat_duration + 0.1
                    )
                    drums.notes.append(kick)

            for beat_offset in pattern["snare"]:
                if beat_offset * beat_duration < chord_duration:
                    snare = pretty_midi.Note(
                        velocity=80,
                        pitch=38,  # Snare drum
                        start=current_time + beat_offset * beat_duration,
                        end=current_time + beat_offset * beat_duration + 0.1
                    )
                    drums.notes.append(snare)

            for beat_offset in pattern["hihat"]:
                if beat_offset * beat_duration < chord_duration:
                    hihat = pretty_midi.Note(
                        velocity=60,
                        pitch=42,  # Closed hi-hat
                        start=current_time + beat_offset * beat_duration,
                        end=current_time + beat_offset * beat_duration + 0.05
                    )
                    drums.notes.append(hihat)

            current_time += chord_duration

        midi.instruments.append(drums)
        return midi

    def add_multi_instrument_tracks(
        self,
        midi: pretty_midi.PrettyMIDI,
        instrument_outputs: Dict[str, Dict],
        instrument_names: List[str],
    ) -> pretty_midi.PrettyMIDI:
        """Add multiple instrument tracks to MIDI."""
        for inst_name in instrument_names:
            if inst_name in instrument_outputs and inst_name in self.instrument_programs:
                # Create instrument track
                program = self.instrument_programs[inst_name]
                instrument = pretty_midi.Instrument(program=program)

                # Get instrument-specific outputs
                inst_data = instrument_outputs[inst_name]
                chord_seq = inst_data.get('chord_sequence', [])
                note_outs = inst_data.get('note_outputs', {})

                # Generate notes for this instrument
                current_time = 0.0
                beat_duration = 60.0 / midi.initial_tempo

                for i, chord_id in enumerate(chord_seq):
                    if i >= len(note_outs.get('notes', [])):
                        break

                    # Instrument-specific note generation logic
                    if inst_name == 'bass':
                        # Bass plays root notes
                        chord_notes = self.chord_to_notes.get(int(chord_id), [60, 64, 67])
                        bass_note = chord_notes[0] - 12  # Octave lower

                        note = pretty_midi.Note(
                            velocity=80,
                            pitch=max(21, bass_note),
                            start=current_time,
                            end=current_time + beat_duration
                        )
                        instrument.notes.append(note)

                    elif inst_name == 'guitar':
                        # Guitar plays chord voicings
                        chord_notes = self.chord_to_notes.get(int(chord_id), [60, 64, 67])
                        for note_pitch in chord_notes:
                            note = pretty_midi.Note(
                                velocity=70,
                                pitch=note_pitch + 12,  # Higher octave
                                start=current_time,
                                end=current_time + beat_duration * 0.8
                            )
                            instrument.notes.append(note)

                    current_time += beat_duration

                midi.instruments.append(instrument)

        return midi

    def midi_to_audio(
        self,
        midi: pretty_midi.PrettyMIDI,
        sample_rate: int = None,
        soundfont_path: Optional[str] = None,
    ) -> np.ndarray:
        """
        Convert MIDI to audio using synthesis.

        Args:
            midi: PrettyMIDI object
            sample_rate: Audio sample rate
            soundfont_path: Optional path to soundfont file

        Returns:
            Audio waveform as numpy array
        """
        if sample_rate is None:
            sample_rate = self.sample_rate

        try:
            if soundfont_path and Path(soundfont_path).exists():
                # Use custom soundfont if available
                audio = midi.fluidsynth(fs=sample_rate, sf2_path=soundfont_path)
            else:
                # Use built-in synthesis
                audio = midi.synthesize(fs=sample_rate)

            # Normalize audio
            if len(audio) > 0:
                audio = audio / np.max(np.abs(audio) + 1e-7)

            return audio

        except Exception as e:
            logger.error(f"MIDI to audio conversion failed: {e}")
            # Return silence as fallback
            return np.zeros(int(sample_rate * 10))  # 10 seconds of silence

    def save_output(
        self,
        midi: pretty_midi.PrettyMIDI,
        audio: Optional[np.ndarray],
        output_path: Union[str, Path],
    ) -> Tuple[Path, Optional[Path]]:
        """
        Save MIDI and audio files.

        Returns:
            Tuple of (midi_path, audio_path)
        """
        output_path = Path(output_path)
        output_path.mkdir(parents=True, exist_ok=True)

        # Save MIDI
        midi_path = output_path / 'generated_music.mid'
        midi.write(str(midi_path))

        # Save audio if provided
        audio_path = None
        if audio is not None:
            audio_path = output_path / 'generated_music.wav'
            sf.write(str(audio_path), audio, self.sample_rate)

        logger.info(f"Saved MIDI to: {midi_path}")
        if audio_path:
            logger.info(f"Saved audio to: {audio_path}")

        return midi_path, audio_path

    def create_video_with_music(
        self,
        video_path: str,
        audio_path: str,
        output_path: str,
    ) -> Path:
        """
        Combine original video with generated music.
        """
        try:
            import subprocess

            output_path = Path(output_path)

            # Use ffmpeg to combine video and audio
            cmd = [
                'ffmpeg', '-y',  # -y to overwrite output file
                '-i', str(video_path),
                '-i', str(audio_path),
                '-c:v', 'copy',  # Copy video stream
                '-c:a', 'aac',   # Encode audio as AAC
                '-shortest',     # End when shortest stream ends
                str(output_path)
            ]

            subprocess.run(cmd, check=True, capture_output=True)
            logger.info(f"Created video with music: {output_path}")

            return output_path

        except Exception as e:
            logger.error(f"Failed to create video with music: {e}")
            raise

