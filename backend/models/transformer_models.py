
# backend/models/transformer_models.py

import torch
import torch.nn as nn
import torch.nn.functional as F
import math
from typing import Optional


class PositionalEncoding(nn.Module):
    """Standard positional encoding for transformer models."""

    def __init__(self, d_model: int, dropout: float = 0.1, max_len: int = 5000):
        super().__init__()
        self.dropout = nn.Dropout(p=dropout)

        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() *
                           (-math.log(10000.0) / d_model))

        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        pe = pe.unsqueeze(0).transpose(0, 1)

        self.register_buffer('pe', pe)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = x + self.pe[:x.size(0), :].transpose(0, 1)
        return self.dropout(x)


class MultimodalTransformerEncoder(nn.Module):
    """
    Transformer encoder for processing multimodal video features.
    Handles semantic, emotion, motion, and scene features.
    """

    def __init__(
        self,
        feature_dim: int = 512,
        num_heads: int = 8,
        num_layers: int = 6,
        dropout: float = 0.1,
    ):
        super().__init__()

        self.feature_dim = feature_dim

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
            activation='gelu',
            batch_first=True
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers)

        # Feature fusion layer
        self.feature_fusion = nn.MultiheadAttention(
            embed_dim=feature_dim,
            num_heads=num_heads,
            dropout=dropout,
            batch_first=True
        )

        # Output projection
        self.output_proj = nn.Linear(feature_dim, feature_dim)
        self.layer_norm = nn.LayerNorm(feature_dim)

    def forward(
        self,
        semantic_features: torch.Tensor,
        emotion_features: torch.Tensor,
        motion_features: torch.Tensor,
        scene_features: torch.Tensor,
        text_emotion: torch.Tensor,
    ) -> torch.Tensor:
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

        # Combine all features using attention-based fusion
        all_features = torch.stack([
            semantic_emb, emotion_emb, motion_emb, scene_emb, text_emb
        ], dim=2)  # (batch_size, seq_len, 5, feature_dim)

        # Reshape for attention
        all_features_flat = all_features.view(batch_size * seq_len, 5, self.feature_dim)

        # Apply cross-attention for feature fusion
        fused_features, _ = self.feature_fusion(
            all_features_flat, all_features_flat, all_features_flat
        )

        # Take the first output (semantic as query) and reshape back
        combined_features = fused_features[:, 0, :].view(batch_size, seq_len, self.feature_dim)

        # Add positional encoding
        combined_features = self.pos_encoding(combined_features.transpose(0, 1)).transpose(0, 1)

        # Apply transformer encoder
        encoded_features = self.transformer(combined_features)

        # Final processing
        output = self.layer_norm(self.output_proj(encoded_features))

        return output


class ChordProgressionTransformer(nn.Module):
    """
    Transformer decoder for generating chord progressions.
    """

    def __init__(
        self,
        chord_vocab_size: int = 50,
        feature_dim: int = 512,
        num_heads: int = 8,
        num_layers: int = 6,
        dropout: float = 0.1,
    ):
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
            activation='gelu',
            batch_first=True
        )
        self.transformer_decoder = nn.TransformerDecoder(decoder_layer, num_layers)

        # Output projection
        self.output_proj = nn.Linear(feature_dim, chord_vocab_size)

        # Initialize embeddings
        nn.init.normal_(self.chord_embedding.weight, mean=0.0, std=0.02)

    def forward(
        self,
        chord_sequence: torch.Tensor,
        encoder_output: torch.Tensor,
        tgt_mask: Optional[torch.Tensor] = None,
    ) -> torch.Tensor:
        """
        Args:
            chord_sequence: (batch_size, seq_len) - previous chord tokens
            encoder_output: (batch_size, seq_len, feature_dim) - from video encoder
            tgt_mask: Causal mask for autoregressive generation
        """
        # Embed chords and add positional encoding
        chord_emb = self.chord_embedding(chord_sequence)
        chord_emb = self.pos_encoding(chord_emb.transpose(0, 1)).transpose(0, 1)

        # Generate causal mask if not provided
        if tgt_mask is None:
            seq_len = chord_sequence.size(1)
            tgt_mask = nn.Transformer.generate_square_subsequent_mask(seq_len).to(chord_sequence.device)

        # Apply transformer decoder
        decoded = self.transformer_decoder(
            tgt=chord_emb,
            memory=encoder_output,
            tgt_mask=tgt_mask
        )

        # Project to vocabulary
        chord_logits = self.output_proj(decoded)

        return chord_logits

    def generate(
        self,
        encoder_output: torch.Tensor,
        max_length: int = 32,
        temperature: float = 1.0,
        top_k: Optional[int] = None,
        top_p: Optional[float] = None,
    ) -> torch.Tensor:
        """
        Generate chord sequence autoregressively.
        """
        batch_size = encoder_output.shape[0]
        device = encoder_output.device

        # Start with beginning-of-sequence token
        generated = torch.zeros(batch_size, 1, dtype=torch.long, device=device)

        for _ in range(max_length):
            # Get predictions for current sequence
            logits = self.forward(generated, encoder_output)
            next_token_logits = logits[:, -1, :] / temperature

            # Apply top-k filtering
            if top_k is not None:
                top_k_logits, _ = torch.topk(next_token_logits, top_k)
                next_token_logits[next_token_logits < top_k_logits[:, -1:]] = float('-inf')

            # Apply top-p (nucleus) filtering
            if top_p is not None:
                sorted_logits, sorted_indices = torch.sort(next_token_logits, descending=True)
                cumulative_probs = torch.cumsum(F.softmax(sorted_logits, dim=-1), dim=-1)

                # Remove tokens with cumulative probability above the threshold
                sorted_indices_to_remove = cumulative_probs > top_p
                sorted_indices_to_remove[:, 1:] = sorted_indices_to_remove[:, :-1].clone()
                sorted_indices_to_remove[:, 0] = 0

                indices_to_remove = sorted_indices_to_remove.scatter(1, sorted_indices, sorted_indices_to_remove)
                next_token_logits[indices_to_remove] = float('-inf')

            # Sample next token
            probs = F.softmax(next_token_logits, dim=-1)
            next_token = torch.multinomial(probs, 1)

            # Append to sequence
            generated = torch.cat([generated, next_token], dim=1)

            # Check for end-of-sequence token
            if (next_token == 1).all():  # Assuming 1 is EOS token
                break

        return generated