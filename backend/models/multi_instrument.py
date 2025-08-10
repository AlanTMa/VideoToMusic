# backend/models/multi_instrument.py

import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Dict, List, Optional, Tuple, Any
import numpy as np

from .silentvideosynth import SilentVideoSynth
from .transformer_models import MultimodalTransformerEncoder
from .lstm_models import ExpressiveLSTMDecoder


class MultiInstrumentSilentVideoSynth(nn.Module):
    """
    Extended SilentVideoSynth model for generating multiple instrument tracks.
    Each instrument gets its own specialized decoder while sharing the video encoder.
    """

    def __init__(
        self,
        num_instruments: int = 8,
        chord_vocab_size: int = 50,
        note_vocab_size: int = 128,
        feature_dim: int = 512,
        num_heads: int = 8,
        num_layers: int = 6,
        dropout: float = 0.1,
    ):
        super().__init__()

        self.num_instruments = num_instruments
        self.chord_vocab_size = chord_vocab_size
        self.note_vocab_size = note_vocab_size
        self.feature_dim = feature_dim

        # Shared video encoder
        self.video_encoder = MultimodalTransformerEncoder(
            feature_dim=feature_dim,
            num_heads=num_heads,
            num_layers=num_layers,
            dropout=dropout
        )

        # Instrument-specific embeddings
        self.instrument_embeddings = nn.Embedding(num_instruments, feature_dim)

        # Instrument role embeddings (melody, harmony, rhythm, bass)
        self.role_embeddings = nn.Embedding(4, feature_dim)

        # Separate decoders for each instrument
        self.instrument_decoders = nn.ModuleList([
            ExpressiveLSTMDecoder(
                chord_vocab_size=chord_vocab_size,
                note_vocab_size=note_vocab_size,
                hidden_dim=feature_dim,
                num_layers=3,
                dropout=dropout,
            )
            for _ in range(num_instruments)
        ])

        # Cross-instrument attention for ensemble coordination
        self.ensemble_attention = nn.MultiheadAttention(
            feature_dim, num_heads, dropout=dropout, batch_first=True
        )

        # Instrument coordination layers
        self.coordination_layer = nn.Linear(feature_dim * num_instruments, feature_dim)
        self.harmony_coordinator = nn.TransformerEncoderLayer(
            d_model=feature_dim,
            nhead=num_heads,
            dim_feedforward=feature_dim * 2,
            dropout=dropout,
            batch_first=True
        )

        # Instrument role assignments
        self.default_roles = {
            0: 0,  # Piano - Melody
            1: 1,  # Guitar - Harmony
            2: 2,  # Drums - Rhythm
            3: 3,  # Bass - Bass
            4: 1,  # Violin - Harmony
            5: 0,  # Flute - Melody
            6: 1,  # Synth - Harmony
            7: 1,  # Cello - Harmony
        }

        # Loss functions
        self.mse_loss = nn.MSELoss()
        self.ce_loss = nn.CrossEntropyLoss()

        # Initialize weights
        self.apply(self._init_weights)

    def _init_weights(self, module):
        """Initialize model weights."""
        if isinstance(module, nn.Linear):
            torch.nn.init.normal_(module.weight, mean=0.0, std=0.02)
            if module.bias is not None:
                torch.nn.init.zeros_(module.bias)
        elif isinstance(module, nn.Embedding):
            torch.nn.init.normal_(module.weight, mean=0.0, std=0.02)

    def forward(
        self,
        video_features: Dict[str, torch.Tensor],
        text_emotion: torch.Tensor,
        active_instruments: Optional[List[int]] = None,
        chord_targets: Optional[torch.Tensor] = None,
        note_targets: Optional[Dict[str, torch.Tensor]] = None,
        temperature: float = 1.0,
        max_length: int = 32,
    ) -> Dict[str, Any]:
        """
        Forward pass for multi-instrument generation.

        Args:
            video_features: Dictionary containing video feature tensors
            text_emotion: Emotion coordinates tensor [batch_size, 2]
            active_instruments: List of instrument IDs to generate for
            chord_targets: Target chord sequences for training
            note_targets: Target note sequences for training
            temperature: Sampling temperature for generation
            max_length: Maximum sequence length for generation

        Returns:
            Dictionary containing outputs for each instrument
        """
        batch_size = video_features['semantic'].shape[0]
        device = video_features['semantic'].device

        if active_instruments is None:
            active_instruments = list(range(min(4, self.num_instruments)))  # Default to 4 instruments

        # Encode video features (shared across all instruments)
        encoded_video = self.video_encoder(
            semantic_features=video_features['semantic'],
            emotion_features=video_features['emotion'],
            motion_features=video_features['motion'],
            scene_features=video_features['scene_offset'],
            text_emotion=text_emotion
        )

        # Generate for each active instrument
        instrument_outputs = {}
        instrument_features_list = []

        for inst_id in active_instruments:
            # Get instrument and role embeddings
            inst_embedding = self.instrument_embeddings(
                torch.tensor([inst_id], device=device)
            )
            role_id = self.default_roles.get(inst_id, 0)
            role_embedding = self.role_embeddings(
                torch.tensor([role_id], device=device)
            )

            # Combine embeddings
            combined_embedding = inst_embedding + role_embedding

            # Expand for sequence length
            seq_len = encoded_video.shape[1]
            combined_embedding = combined_embedding.unsqueeze(0).unsqueeze(0).expand(
                batch_size, seq_len, -1
            )

            # Condition video features with instrument/role information
            conditioned_features = encoded_video + combined_embedding

            # Generate chord progression (simplified - could be instrument-specific)
            if self.training and chord_targets is not None:
                # Use provided chord targets during training
                chord_sequence = chord_targets
            else:
                # Generate chord sequence (for now, use a simple approach)
                chord_sequence = self._generate_chord_sequence(
                    conditioned_features, max_length, temperature
                )

            # Generate expressive notes for this instrument
            inst_output = self.instrument_decoders[inst_id](
                chord_sequence=chord_sequence,
                video_features=conditioned_features,
                target_notes=note_targets if self.training else None
            )

            # Store outputs
            instrument_outputs[f'instrument_{inst_id}'] = {
                'chord_sequence': chord_sequence,
                'note_outputs': inst_output,
                'instrument_id': inst_id,
                'role_id': role_id,
                'features': conditioned_features,
            }

            # Collect features for ensemble coordination
            instrument_features_list.append(inst_output['melody_features'])

        # Apply ensemble coordination if multiple instruments
        if len(instrument_features_list) > 1:
            coordinated_outputs = self._coordinate_ensemble(
                instrument_outputs, instrument_features_list, active_instruments
            )
            instrument_outputs.update(coordinated_outputs)

        return {
            'instrument_outputs': instrument_outputs,
            'encoded_video': encoded_video,
            'active_instruments': active_instruments,
        }

    def _generate_chord_sequence(
        self,
        conditioned_features: torch.Tensor,
        max_length: int,
        temperature: float,
    ) -> torch.Tensor:
        """Generate a chord sequence (simplified implementation)."""
        batch_size = conditioned_features.shape[0]
        device = conditioned_features.device

        # Simple chord progression generation
        # In a full implementation, this would use a dedicated chord decoder
        chord_sequence = torch.randint(
            0, self.chord_vocab_size,
            (batch_size, max_length),
            device=device
        )

        return chord_sequence

    def _coordinate_ensemble(
        self,
        instrument_outputs: Dict[str, Any],
        instrument_features_list: List[torch.Tensor],
        active_instruments: List[int],
    ) -> Dict[str, Any]:
        """Coordinate ensemble playing using cross-attention."""
        device = instrument_features_list[0].device
        batch_size, seq_len, feature_dim = instrument_features_list[0].shape

        # Stack instrument features
        stacked_features = torch.stack(instrument_features_list, dim=2)  # (batch, seq, num_inst, hidden)
        num_instruments = len(instrument_features_list)

        # Reshape for attention
        stacked_features_flat = stacked_features.view(
            batch_size * seq_len, num_instruments, feature_dim
        )

        # Apply cross-instrument attention
        coordinated_features, attention_weights = self.ensemble_attention(
            stacked_features_flat, stacked_features_flat, stacked_features_flat
        )

        # Reshape back
        coordinated_features = coordinated_features.view(
            batch_size, seq_len, num_instruments, feature_dim
        )

        # Apply harmony coordination
        coordinated_features_reshaped = coordinated_features.view(
            batch_size * seq_len, num_instruments, feature_dim
        )
        harmony_coordinated = self.harmony_coordinator(coordinated_features_reshaped)
        harmony_coordinated = harmony_coordinated.view(
            batch_size, seq_len, num_instruments, feature_dim
        )

        # Update instrument outputs with coordinated features
        coordinated_outputs = {}
        for i, inst_id in enumerate(active_instruments):
            coord_feature = harmony_coordinated[:, :, i, :]

            # Update the instrument output
            updated_output = self._update_instrument_output(
                instrument_outputs[f'instrument_{inst_id}'],
                coord_feature
            )
            coordinated_outputs[f'instrument_{inst_id}_coordinated'] = updated_output

        return {
            'coordinated_outputs': coordinated_outputs,
            'attention_weights': attention_weights,
        }

    def _update_instrument_output(
        self,
        original_output: Dict[str, Any],
        coordinated_feature: torch.Tensor,
    ) -> Dict[str, Any]:
        """Update instrument output with coordinated features."""
        # Apply coordination weighting
        coordination_weight = torch.sigmoid(
            self.coordination_layer(
                torch.cat([
                    coordinated_feature,
                    original_output['features']
                ], dim=-1)
            )
        )

        updated_output = original_output.copy()

        # Apply coordination to note predictions
        if 'note_outputs' in updated_output:
            note_outputs = updated_output['note_outputs']
            if 'notes' in note_outputs:
                # Apply soft coordination to note probabilities
                coordinated_notes = note_outputs['notes'] * coordination_weight.unsqueeze(-1)
                note_outputs['notes'] = coordinated_notes

            updated_output['note_outputs'] = note_outputs

        return updated_output

    def compute_ensemble_loss(
        self,
        outputs: Dict[str, Any],
        targets: Dict[str, Any],
        loss_weights: Optional[Dict[str, float]] = None,
    ) -> Dict[str, torch.Tensor]:
        """
        Compute ensemble training losses.
        """
        if loss_weights is None:
            loss_weights = {
                'individual': 0.7,  # Individual instrument losses
                'coordination': 0.2,  # Ensemble coordination loss
                'harmony': 0.1,     # Harmonic consistency loss
            }

        losses = {}
        total_loss = 0.0

        instrument_outputs = outputs['instrument_outputs']

        # Individual instrument losses
        individual_losses = []
        for inst_key, inst_output in instrument_outputs.items():
            if 'instrument_' in inst_key and 'coordinated' not in inst_key:
                # Compute standard loss for this instrument
                inst_targets = targets.get(inst_key, targets)  # Use shared targets if specific not available

                # Note prediction loss
                if 'note_outputs' in inst_output and 'note_targets' in inst_targets:
                    note_loss = self.ce_loss(
                        inst_output['note_outputs']['notes'].reshape(-1, self.note_vocab_size),
                        inst_targets['note_targets']['notes'].reshape(-1)
                    )
                    individual_losses.append(note_loss)

        if individual_losses:
            losses['individual'] = torch.stack(individual_losses).mean()
            total_loss += loss_weights['individual'] * losses['individual']

        # Coordination loss - encourage instruments to work together
        if 'coordinated_outputs' in outputs:
            coordination_loss = self._compute_coordination_loss(outputs)
            losses['coordination'] = coordination_loss
            total_loss += loss_weights['coordination'] * coordination_loss

        # Harmony loss - ensure harmonic consistency
        harmony_loss = self._compute_harmony_loss(instrument_outputs)
        losses['harmony'] = harmony_loss
        total_loss += loss_weights['harmony'] * harmony_loss

        losses['total'] = total_loss
        return losses

    def _compute_coordination_loss(self, outputs: Dict[str, Any]) -> torch.Tensor:
        """Compute coordination loss to encourage ensemble playing."""
        # Simple implementation - encourage attention weights to be balanced
        if 'attention_weights' in outputs:
            attention_weights = outputs['attention_weights']
            # Encourage balanced attention (not too concentrated on one instrument)
            attention_entropy = -torch.sum(
                attention_weights * torch.log(attention_weights + 1e-8),
                dim=-1
            ).mean()
            # We want high entropy (balanced attention)
            return -attention_entropy

        return torch.tensor(0.0)

    def _compute_harmony_loss(self, instrument_outputs: Dict[str, Any]) -> torch.Tensor:
        """Compute harmony loss to ensure harmonic consistency."""
        # Extract note predictions from different instruments
        note_predictions = []

        for inst_key, inst_output in instrument_outputs.items():
            if 'instrument_' in inst_key and 'coordinated' not in inst_key:
                if 'note_outputs' in inst_output and 'notes' in inst_output['note_outputs']:
                    notes = inst_output['note_outputs']['notes']
                    # Take argmax to get predicted notes
                    predicted_notes = torch.argmax(notes, dim=-1)
                    note_predictions.append(predicted_notes)

        if len(note_predictions) < 2:
            return torch.tensor(0.0)

        # Simple harmony loss - penalize highly dissonant intervals
        harmony_loss = torch.tensor(0.0)
        for i in range(len(note_predictions)):
            for j in range(i + 1, len(note_predictions)):
                # Calculate interval between instruments
                interval = torch.abs(note_predictions[i] - note_predictions[j]) % 12

                # Penalize highly dissonant intervals (1, 6, 10, 11 semitones)
                dissonant_mask = (interval == 1) | (interval == 6) | (interval == 10) | (interval == 11)
                dissonance_penalty = dissonant_mask.float().mean()
                harmony_loss += dissonance_penalty

        return harmony_loss / (len(note_predictions) * (len(note_predictions) - 1) / 2)

    def generate_full_arrangement(
        self,
        video_features: Dict[str, torch.Tensor],
        text_emotion: torch.Tensor,
        instruments: List[str] = None,
        arrangement_style: str = "balanced",
        temperature: float = 1.0,
        max_length: int = 32,
    ) -> Dict[str, Any]:
        """
        Generate a full musical arrangement with multiple instruments.

        Args:
            video_features: Video feature tensors
            text_emotion: Emotion coordinates
            instruments: List of instrument names
            arrangement_style: Style of arrangement ("balanced", "solo_focus", "ensemble")
            temperature: Generation temperature
            max_length: Maximum sequence length

        Returns:
            Complete arrangement with all instrument tracks
        """
        if instruments is None:
            instruments = ["piano", "guitar", "bass", "drums"]

        # Map instrument names to IDs
        instrument_name_to_id = {
            "piano": 0, "guitar": 1, "drums": 2, "bass": 3,
            "violin": 4, "flute": 5, "synth": 6, "cello": 7
        }

        active_instrument_ids = [
            instrument_name_to_id.get(inst, 0) for inst in instruments
        ]

        # Generate arrangement
        with torch.no_grad():
            outputs = self.forward(
                video_features=video_features,
                text_emotion=text_emotion,
                active_instruments=active_instrument_ids,
                temperature=temperature,
                max_length=max_length,
            )

        # Process outputs by arrangement style
        if arrangement_style == "solo_focus":
            # Emphasize one lead instrument
            outputs = self._apply_solo_focus(outputs, active_instrument_ids[0])
        elif arrangement_style == "ensemble":
            # Balance all instruments equally
            outputs = self._apply_ensemble_balance(outputs)

        return outputs

    def _apply_solo_focus(self, outputs: Dict[str, Any], lead_instrument: int) -> Dict[str, Any]:
        """Apply solo focus arrangement style."""
        # Reduce volume/prominence of non-lead instruments
        for inst_key, inst_output in outputs['instrument_outputs'].items():
            if f'instrument_{lead_instrument}' not in inst_key:
                # Reduce velocity for background instruments
                if 'note_outputs' in inst_output and 'velocities' in inst_output['note_outputs']:
                    inst_output['note_outputs']['velocities'] *= 0.6

        return outputs

    def _apply_ensemble_balance(self, outputs: Dict[str, Any]) -> Dict[str, Any]:
        """Apply ensemble balance arrangement style."""
        # Ensure all instruments have balanced prominence
        num_instruments = len([k for k in outputs['instrument_outputs'].keys() if 'coordinated' not in k])

        for inst_key, inst_output in outputs['instrument_outputs'].items():
            if 'coordinated' not in inst_key:
                # Normalize velocities for balance
                if 'note_outputs' in inst_output and 'velocities' in inst_output['note_outputs']:
                    inst_output['note_outputs']['velocities'] *= (0.8 / num_instruments + 0.4)

        return outputs

