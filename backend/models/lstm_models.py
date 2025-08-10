# backend/models/lstm_models.py

import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Dict, Optional, Tuple


class ExpressiveLSTMDecoder(nn.Module):
    """
    LSTM decoder for generating expressive note-level details.
    Takes chord progressions and adds rhythm, dynamics, articulation.
    """

    def __init__(
        self,
        chord_vocab_size: int = 50,
        note_vocab_size: int = 128,
        hidden_dim: int = 512,
        num_layers: int = 3,
        dropout: float = 0.1,
    ):
        super().__init__()

        self.chord_vocab_size = chord_vocab_size
        self.note_vocab_size = note_vocab_size
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers

        # Input embeddings
        self.chord_embedding = nn.Embedding(chord_vocab_size, hidden_dim)
        self.note_embedding = nn.Embedding(note_vocab_size, hidden_dim // 2)

        # LSTM layers for different musical aspects
        self.rhythm_lstm = nn.LSTM(
            hidden_dim, hidden_dim, num_layers,
            dropout=dropout, batch_first=True
        )

        self.melody_lstm = nn.LSTM(
            hidden_dim, hidden_dim, num_layers,
            dropout=dropout, batch_first=True
        )

        self.dynamics_lstm = nn.LSTM(
            hidden_dim, hidden_dim // 2, num_layers,
            dropout=dropout, batch_first=True
        )

        # Attention mechanism for chord-note alignment
        self.attention = nn.MultiheadAttention(
            hidden_dim, 8, dropout=dropout, batch_first=True
        )

        # Output heads
        self.note_head = nn.Linear(hidden_dim, note_vocab_size)
        self.velocity_head = nn.Linear(hidden_dim // 2, 128)  # MIDI velocity range
        self.duration_head = nn.Linear(hidden_dim, 32)  # Duration quantization

        # Dropout layers
        self.dropout = nn.Dropout(dropout)

        # Initialize weights
        self._init_weights()

    def _init_weights(self):
        """Initialize model weights."""
        nn.init.normal_(self.chord_embedding.weight, 0.0, 0.02)
        nn.init.normal_(self.note_embedding.weight, 0.0, 0.02)

        for lstm in [self.rhythm_lstm, self.melody_lstm, self.dynamics_lstm]:
            for name, param in lstm.named_parameters():
                if 'weight' in name:
                    nn.init.orthogonal_(param)
                elif 'bias' in name:
                    nn.init.zeros_(param)

    def forward(
        self,
        chord_sequence: torch.Tensor,
        video_features: torch.Tensor,
        target_notes: Optional[Dict[str, torch.Tensor]] = None,
    ) -> Dict[str, torch.Tensor]:
        """
        Args:
            chord_sequence: (batch_size, seq_len) - chord progression
            video_features: (batch_size, seq_len, feature_dim) - video context
            target_notes: (batch_size, seq_len, note_seq_len) - for training
        """
        batch_size, chord_seq_len = chord_sequence.shape

        # Embed chords
        chord_emb = self.chord_embedding(chord_sequence)  # (batch, seq, hidden)

        # Combine with video features
        if video_features.size(1) != chord_seq_len:
            # Interpolate video features to match chord sequence length
            video_features = F.interpolate(
                video_features.transpose(1, 2),
                size=chord_seq_len,
                mode='linear',
                align_corners=False
            ).transpose(1, 2)

        combined_input = chord_emb + video_features

        # Generate rhythm patterns
        rhythm_out, rhythm_states = self.rhythm_lstm(combined_input)
        rhythm_out = self.dropout(rhythm_out)

        # Generate melodic content with attention to video
        melody_input = combined_input
        melody_out, melody_states = self.melody_lstm(melody_input)
        melody_out = self.dropout(melody_out)

        # Apply attention between melody and rhythm
        attended_melody, attention_weights = self.attention(
            query=melody_out,
            key=rhythm_out,
            value=rhythm_out
        )

        # Generate dynamics
        dynamics_input = torch.cat([rhythm_out, melody_out], dim=-1)
        dynamics_out, dynamics_states = self.dynamics_lstm(dynamics_input)
        dynamics_out = self.dropout(dynamics_out)

        # Generate outputs
        note_logits = self.note_head(attended_melody)
        velocity_logits = self.velocity_head(dynamics_out)
        duration_logits = self.duration_head(rhythm_out)

        # Apply sigmoid to velocity for 0-1 range (will be scaled to 0-127)
        velocity_logits = torch.sigmoid(velocity_logits)

        return {
            'notes': note_logits,
            'velocities': velocity_logits,
            'durations': duration_logits,
            'attention_weights': attention_weights,
            'rhythm_features': rhythm_out,
            'melody_features': attended_melody,
            'dynamics_features': dynamics_out,
        }

    def generate_sequence(
        self,
        chord_sequence: torch.Tensor,
        video_features: torch.Tensor,
        temperature: float = 1.0,
        notes_per_chord: int = 4,
    ) -> Dict[str, torch.Tensor]:
        """
        Generate a complete note sequence for the given chord progression.
        """
        batch_size, chord_seq_len = chord_sequence.shape
        device = chord_sequence.device

        # Get base predictions
        outputs = self.forward(chord_sequence, video_features)

        # Generate notes for each chord
        generated_notes = []
        generated_velocities = []
        generated_durations = []

        for chord_idx in range(chord_seq_len):
            chord_notes = []
            chord_velocities = []
            chord_durations = []

            for note_idx in range(notes_per_chord):
                # Sample note
                note_logits = outputs['notes'][:, chord_idx, :] / temperature
                note_probs = F.softmax(note_logits, dim=-1)
                note = torch.multinomial(note_probs, 1)

                # Get velocity (deterministic from model)
                velocity = outputs['velocities'][:, chord_idx, note_idx % outputs['velocities'].size(-1)]

                # Sample duration
                duration_logits = outputs['durations'][:, chord_idx, :] / temperature
                duration_probs = F.softmax(duration_logits, dim=-1)
                duration = torch.multinomial(duration_probs, 1)

                chord_notes.append(note)
                chord_velocities.append(velocity.unsqueeze(1))
                chord_durations.append(duration)

            generated_notes.append(torch.cat(chord_notes, dim=1))
            generated_velocities.append(torch.cat(chord_velocities, dim=1))
            generated_durations.append(torch.cat(chord_durations, dim=1))

        return {
            'notes': torch.stack(generated_notes, dim=1),
            'velocities': torch.stack(generated_velocities, dim=1),
            'durations': torch.stack(generated_durations, dim=1),
        }


class MultiInstrumentLSTMDecoder(nn.Module):
    """
    Extended LSTM decoder for generating multiple instrument tracks.
    """

    def __init__(
        self,
        num_instruments: int = 4,
        chord_vocab_size: int = 50,
        note_vocab_size: int = 128,
        hidden_dim: int = 512,
        num_layers: int = 3,
        dropout: float = 0.1,
    ):
        super().__init__()

        self.num_instruments = num_instruments
        self.chord_vocab_size = chord_vocab_size
        self.note_vocab_size = note_vocab_size
        self.hidden_dim = hidden_dim

        # Instrument-specific embeddings
        self.instrument_embeddings = nn.Embedding(num_instruments, hidden_dim)

        # Shared components
        self.chord_embedding = nn.Embedding(chord_vocab_size, hidden_dim)

        # Instrument-specific decoders
        self.instrument_decoders = nn.ModuleList([
            ExpressiveLSTMDecoder(
                chord_vocab_size=chord_vocab_size,
                note_vocab_size=note_vocab_size,
                hidden_dim=hidden_dim,
                num_layers=num_layers,
                dropout=dropout,
            )
            for _ in range(num_instruments)
        ])

        # Cross-instrument attention for ensemble coordination
        self.ensemble_attention = nn.MultiheadAttention(
            hidden_dim, 8, dropout=dropout, batch_first=True
        )

        # Instrument coordination layer
        self.coordination_layer = nn.Linear(hidden_dim * num_instruments, hidden_dim)

    def forward(
        self,
        chord_sequence: torch.Tensor,
        video_features: torch.Tensor,
        instrument_ids: Optional[torch.Tensor] = None,
    ) -> Dict[str, torch.Tensor]:
        """
        Generate music for multiple instruments.

        Args:
            chord_sequence: (batch_size, seq_len)
            video_features: (batch_size, seq_len, feature_dim)
            instrument_ids: (num_instruments,) - which instruments to use
        """
        batch_size, seq_len = chord_sequence.shape
        device = chord_sequence.device

        if instrument_ids is None:
            instrument_ids = torch.arange(self.num_instruments, device=device)

        # Generate for each instrument
        instrument_outputs = {}
        instrument_features = []

        for i, inst_id in enumerate(instrument_ids):
            # Add instrument conditioning
            inst_embedding = self.instrument_embeddings(inst_id)
            inst_embedding = inst_embedding.unsqueeze(0).unsqueeze(0).expand(batch_size, seq_len, -1)

            # Modify video features with instrument conditioning
            conditioned_features = video_features + inst_embedding

            # Generate for this instrument
            inst_output = self.instrument_decoders[inst_id](
                chord_sequence, conditioned_features
            )

            instrument_outputs[f'instrument_{inst_id.item()}'] = inst_output
            instrument_features.append(inst_output['melody_features'])

        # Apply ensemble coordination
        if len(instrument_features) > 1:
            # Stack instrument features
            stacked_features = torch.stack(instrument_features, dim=2)  # (batch, seq, num_inst, hidden)
            batch_size, seq_len, num_inst, hidden_dim = stacked_features.shape

            # Reshape for attention
            stacked_features_flat = stacked_features.view(batch_size * seq_len, num_inst, hidden_dim)

            # Apply cross-instrument attention
            coordinated_features, _ = self.ensemble_attention(
                stacked_features_flat, stacked_features_flat, stacked_features_flat
            )

            # Reshape back and coordinate
            coordinated_features = coordinated_features.view(batch_size, seq_len, num_inst, hidden_dim)

            # Update instrument outputs with coordinated features
            for i, inst_id in enumerate(instrument_ids):
                coord_feature = coordinated_features[:, :, i, :]
                # Re-generate outputs with coordinated features
                updated_output = self._update_output_with_coordination(
                    instrument_outputs[f'instrument_{inst_id.item()}'],
                    coord_feature
                )
                instrument_outputs[f'instrument_{inst_id.item()}'] = updated_output

        return instrument_outputs

    def _update_output_with_coordination(
        self,
        original_output: Dict[str, torch.Tensor],
        coordinated_feature: torch.Tensor,
    ) -> Dict[str, torch.Tensor]:
        """Update instrument output with coordinated features."""
        # Simple coordination - could be more sophisticated
        coordination_weight = torch.sigmoid(self.coordination_layer(coordinated_feature))

        updated_output = original_output.copy()

        # Apply coordination to note predictions
        if 'notes' in updated_output:
            updated_output['notes'] = updated_output['notes'] * coordination_weight.unsqueeze(-1)

        return updated_output

