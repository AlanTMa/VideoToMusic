# backend/training/trainer.py

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
import numpy as np
import asyncio
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import time
import json

from ..models.silentvideosynth import SilentVideoSynth
from ..config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class SilentVideoSynthTrainer:
    """
    Training pipeline for the SilentVideoSynth model.
    """

    def __init__(
        self,
        model: SilentVideoSynth,
        train_loader: DataLoader,
        val_loader: DataLoader,
        learning_rate: float = 1e-4,
        weight_decay: float = 0.01,
        loss_weights: Optional[Dict[str, float]] = None,
        training_id: Optional[str] = None,
        training_state: Optional[Dict[str, Any]] = None,
    ):
        self.model = model
        self.train_loader = train_loader
        self.val_loader = val_loader
        self.training_id = training_id
        self.training_state = training_state

        # Device setup
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model.to(self.device)

        # Optimizer and scheduler
        self.optimizer = optim.AdamW(
            model.parameters(),
            lr=learning_rate,
            weight_decay=weight_decay
        )

        self.scheduler = optim.lr_scheduler.CosineAnnealingWarmRestarts(
            self.optimizer,
            T_0=10,
            T_mult=2,
            eta_min=1e-6
        )

        # Loss weights
        self.loss_weights = loss_weights or {
            'chord': 1.0,
            'note': 0.8,
            'velocity': 0.5,
            'duration': 0.7,
            'emotion': 0.3,
        }

        # Training state
        self.epoch = 0
        self.global_step = 0
        self.best_val_loss = float('inf')
        self.patience_counter = 0

        # Metrics tracking
        self.train_losses = []
        self.val_losses = []
        self.learning_rates = []

        # Checkpointing
        self.checkpoint_dir = Path(settings.CHECKPOINT_DIR)
        self.checkpoint_dir.mkdir(parents=True, exist_ok=True)

        logger.info(f"Trainer initialized on device: {self.device}")
        logger.info(f"Model parameters: {sum(p.numel() for p in model.parameters()):,}")

    def train_epoch(self) -> Dict[str, float]:
        """Train for one epoch."""
        self.model.train()
        epoch_losses = []
        epoch_metrics = {
            'chord_loss': [],
            'note_loss': [],
            'velocity_loss': [],
            'duration_loss': [],
            'emotion_loss': [],
        }

        num_batches = len(self.train_loader)

        for batch_idx, batch in enumerate(self.train_loader):
            # Move batch to device
            batch = self._move_batch_to_device(batch)

            # Forward pass
            self.optimizer.zero_grad()

            outputs = self.model(
                video_features=batch['video_features'],
                text_emotion=batch['text_emotion'],
                chord_targets=batch['chord_targets'],
                note_targets=batch['note_targets']
            )

            # Compute losses
            losses = self.model.compute_loss(outputs, batch, self.loss_weights)
            total_loss = losses['total']

            # Backward pass
            total_loss.backward()
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), 1.0)
            self.optimizer.step()

            # Update metrics
            epoch_losses.append(total_loss.item())
            for key, loss in losses.items():
                if key in epoch_metrics and key != 'total':
                    epoch_metrics[key].append(loss.item())

            self.global_step += 1

            # Update training state
            if self.training_state:
                self.training_state['train_loss'] = total_loss.item()
                self.training_state['learning_rate'] = self.optimizer.param_groups[0]['lr']

                if batch_idx % 10 == 0:  # Log every 10 batches
                    log_msg = f"Epoch {self.epoch}, Batch {batch_idx}/{num_batches}, Loss: {total_loss.item():.4f}"
                    self.training_state['logs'].append(log_msg)
                    logger.info(log_msg)

            # Early termination check
            if self.training_state and self.training_state['status'] == 'stopped':
                logger.info("Training stopped by user")
                break

        # Compute epoch averages
        epoch_metrics = {key: np.mean(values) for key, values in epoch_metrics.items() if values}
        epoch_metrics['total_loss'] = np.mean(epoch_losses)

        return epoch_metrics

    def validate_epoch(self) -> Dict[str, float]:
        """Validate for one epoch."""
        self.model.eval()
        epoch_losses = []
        epoch_metrics = {
            'chord_accuracy': [],
            'emotion_alignment': [],
        }

        with torch.no_grad():
            for batch in self.val_loader:
                batch = self._move_batch_to_device(batch)

                # Forward pass
                outputs = self.model(
                    video_features=batch['video_features'],
                    text_emotion=batch['text_emotion'],
                    chord_targets=batch['chord_targets'],
                    note_targets=batch['note_targets']
                )

                # Compute losses
                losses = self.model.compute_loss(outputs, batch, self.loss_weights)
                epoch_losses.append(losses['total'].item())

                # Compute metrics
                chord_accuracy = self._compute_chord_accuracy(
                    outputs['chord_logits'], batch['chord_targets']
                )
                epoch_metrics['chord_accuracy'].append(chord_accuracy)

                emotion_alignment = self._compute_emotion_alignment(
                    outputs.get('chord_sequence', batch['chord_targets']),
                    batch['text_emotion']
                )
                epoch_metrics['emotion_alignment'].append(emotion_alignment)

        # Compute averages
        val_loss = np.mean(epoch_losses)
        epoch_metrics = {key: np.mean(values) for key, values in epoch_metrics.items() if values}
        epoch_metrics['val_loss'] = val_loss

        return epoch_metrics

    def _compute_chord_accuracy(self, chord_logits: torch.Tensor, chord_targets: torch.Tensor) -> float:
        """Compute chord prediction accuracy."""
        predictions = torch.argmax(chord_logits, dim=-1)
        targets = chord_targets[:, 1:]  # Remove BOS token

        # Flatten and compute accuracy
        predictions_flat = predictions.reshape(-1)
        targets_flat = targets.reshape(-1)

        # Ignore padding tokens (assuming -1 is padding)
        mask = targets_flat != -1
        if mask.sum() == 0:
            return 0.0

        correct = (predictions_flat == targets_flat) & mask
        accuracy = correct.sum().float() / mask.sum().float()

        return accuracy.item()

    def _compute_emotion_alignment(
        self,
        chord_sequence: torch.Tensor,
        target_emotion: torch.Tensor
    ) -> float:
        """Compute emotion alignment score."""
        # Simple implementation - could be enhanced
        batch_size = chord_sequence.shape[0]
        alignment_scores = []

        for batch_idx in range(batch_size):
            # Convert chords to emotion (simplified)
            chords = chord_sequence[batch_idx]
            valence = torch.mean((chords.float() / 50).clamp(0, 1))  # Normalize by vocab size
            arousal = torch.std(chords.float() / 50).clamp(0, 1)

            predicted_emotion = torch.stack([valence, arousal])
            target = target_emotion[batch_idx]

            # Calculate distance
            distance = torch.norm(predicted_emotion - target)
            alignment = 1.0 / (1.0 + distance)
            alignment_scores.append(alignment.item())

        return np.mean(alignment_scores)

    def _move_batch_to_device(self, batch: Dict[str, Any]) -> Dict[str, Any]:
        """Move batch tensors to device."""
        device_batch = {}

        for key, value in batch.items():
            if isinstance(value, torch.Tensor):
                device_batch[key] = value.to(self.device)
            elif isinstance(value, dict):
                device_batch[key] = {k: v.to(self.device) if isinstance(v, torch.Tensor) else v
                                   for k, v in value.items()}
            else:
                device_batch[key] = value

        return device_batch

    def save_checkpoint(
        self,
        epoch: int,
        val_loss: float,
        model_name: str = "checkpoint",
        is_best: bool = False,
    ):
        """Save model checkpoint."""
        checkpoint = {
            'epoch': epoch,
            'model_state_dict': self.model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'scheduler_state_dict': self.scheduler.state_dict(),
            'val_loss': val_loss,
            'train_losses': self.train_losses,
            'val_losses': self.val_losses,
            'learning_rates': self.learning_rates,
            'loss_weights': self.loss_weights,
        }

        # Save regular checkpoint
        checkpoint_path = self.checkpoint_dir / f"{model_name}_epoch_{epoch}.pth"
        torch.save(checkpoint, checkpoint_path)

        # Save best model
        if is_best:
            best_path = self.checkpoint_dir / f"{model_name}_best.pth"
            torch.save(checkpoint, best_path)
            logger.info(f"Best model saved to {best_path}")

        logger.info(f"Checkpoint saved to {checkpoint_path}")

    def load_checkpoint(self, checkpoint_path: str):
        """Load model checkpoint."""
        checkpoint = torch.load(checkpoint_path, map_location=self.device)

        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
        self.scheduler.load_state_dict(checkpoint['scheduler_state_dict'])

        self.epoch = checkpoint['epoch']
        self.train_losses = checkpoint.get('train_losses', [])
        self.val_losses = checkpoint.get('val_losses', [])
        self.learning_rates = checkpoint.get('learning_rates', [])

        logger.info(f"Checkpoint loaded from {checkpoint_path}")

    async def train_async(
        self,
        num_epochs: int,
        save_every: int = 5,
        early_stopping_patience: int = 10,
        model_name: str = "silentvideosynth",
    ):
        """Asynchronous training loop."""
        logger.info(f"Starting training for {num_epochs} epochs")

        start_time = time.time()

        for epoch in range(num_epochs):
            self.epoch = epoch

            # Update training state
            if self.training_state:
                self.training_state['current_epoch'] = epoch
                self.training_state['total_epochs'] = num_epochs

            # Check if training was stopped
            if self.training_state and self.training_state['status'] == 'stopped':
                logger.info("Training stopped by user")
                break

            # Train epoch
            train_metrics = self.train_epoch()

            # Validate epoch
            val_metrics = self.validate_epoch()

            # Update learning rate
            self.scheduler.step()

            # Track metrics
            train_loss = train_metrics['total_loss']
            val_loss = val_metrics['val_loss']
            lr = self.optimizer.param_groups[0]['lr']

            self.train_losses.append(train_loss)
            self.val_losses.append(val_loss)
            self.learning_rates.append(lr)

            # Update training state
            if self.training_state:
                self.training_state['train_loss'] = train_loss
                self.training_state['val_loss'] = val_loss
                self.training_state['learning_rate'] = lr
                self.training_state['metrics'] = {**train_metrics, **val_metrics}

                # Estimate remaining time
                elapsed_time = time.time() - start_time
                avg_time_per_epoch = elapsed_time / (epoch + 1)
                remaining_epochs = num_epochs - epoch - 1
                eta_minutes = int((remaining_epochs * avg_time_per_epoch) / 60)
                self.training_state['eta_minutes'] = eta_minutes

            # Logging
            log_msg = (f"Epoch {epoch+1}/{num_epochs} - "
                      f"Train Loss: {train_loss:.4f}, "
                      f"Val Loss: {val_loss:.4f}, "
                      f"LR: {lr:.2e}")

            if self.training_state:
                self.training_state['logs'].append(log_msg)

            logger.info(log_msg)

            # Early stopping check
            if val_loss < self.best_val_loss:
                self.best_val_loss = val_loss
                self.patience_counter = 0

                # Save best model
                self.save_checkpoint(epoch, val_loss, model_name, is_best=True)
            else:
                self.patience_counter += 1

                if self.patience_counter >= early_stopping_patience:
                    logger.info(f"Early stopping after {epoch+1} epochs")
                    if self.training_state:
                        self.training_state['logs'].append("Training stopped due to early stopping")
                    break

            # Regular checkpoint saving
            if (epoch + 1) % save_every == 0:
                self.save_checkpoint(epoch, val_loss, model_name)

            # Allow other coroutines to run
            await asyncio.sleep(0.01)

        logger.info("Training completed")
        if self.training_state:
            self.training_state['status'] = 'completed'
            self.training_state['logs'].append("Training completed successfully")

