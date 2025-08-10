
# backend/training/train_script.py

"""
Training script for SilentVideoSynth models.
This script handles both single and multi-instrument model training.
"""

import argparse
import logging
import yaml
import asyncio
from pathlib import Path
import torch
from torch.utils.data import DataLoader, random_split

from .trainer import SilentVideoSynthTrainer
from .dataset import VideoMusicDataset
from ..models.silentvideosynth import SilentVideoSynth
from ..models.multi_instrument import MultiInstrumentSilentVideoSynth
from ..config import get_settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def load_config(config_path: str) -> dict:
    """Load training configuration from YAML file."""
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    return config


def create_model(config: dict) -> torch.nn.Module:
    """Create model based on configuration."""
    model_type = config.get('model_type', 'single')

    if model_type == 'multi_instrument':
        model = MultiInstrumentSilentVideoSynth(
            num_instruments=config.get('num_instruments', 4),
            chord_vocab_size=config.get('chord_vocab_size', 50),
            note_vocab_size=config.get('note_vocab_size', 128),
            feature_dim=config.get('feature_dim', 512),
            num_heads=config.get('num_heads', 8),
            num_layers=config.get('num_layers', 6),
            dropout=config.get('dropout', 0.1),
        )
    else:
        model = SilentVideoSynth(
            chord_vocab_size=config.get('chord_vocab_size', 50),
            note_vocab_size=config.get('note_vocab_size', 128),
            feature_dim=config.get('feature_dim', 512),
        )

    return model


def create_datasets(config: dict):
    """Create training and validation datasets."""
    dataset_path = config['dataset']['path']
    validation_split = config['dataset'].get('validation_split', 0.2)

    # Create full dataset
    full_dataset = VideoMusicDataset(
        data_path=dataset_path,
        max_video_length=config['dataset'].get('max_video_length', 30),
        max_chord_length=config['dataset'].get('max_chord_length', 32),
        video_fps=config['dataset'].get('video_fps', 1),
    )

    # Split into train and validation
    total_size = len(full_dataset)
    val_size = int(total_size * validation_split)
    train_size = total_size - val_size

    train_dataset, val_dataset = random_split(
        full_dataset, [train_size, val_size],
        generator=torch.Generator().manual_seed(42)
    )

    return train_dataset, val_dataset


def create_data_loaders(train_dataset, val_dataset, config: dict):
    """Create data loaders for training and validation."""
    batch_size = config['training'].get('batch_size', 4)
    num_workers = config['training'].get('num_workers', 2)

    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=torch.cuda.is_available(),
        drop_last=True,
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=torch.cuda.is_available(),
        drop_last=False,
    )

    return train_loader, val_loader


async def main():
    """Main training function."""
    parser = argparse.ArgumentParser(description='Train SilentVideoSynth model')
    parser.add_argument('--config', type=str, required=True,
                       help='Path to training configuration file')
    parser.add_argument('--resume', type=str, default=None,
                       help='Path to checkpoint to resume from')
    parser.add_argument('--output-dir', type=str, default='checkpoints',
                       help='Output directory for checkpoints')

    args = parser.parse_args()

    # Load configuration
    logger.info(f"Loading configuration from {args.config}")
    config = load_config(args.config)

    # Create output directory
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Create model
    logger.info("Creating model...")
    model = create_model(config)
    logger.info(f"Model created with {sum(p.numel() for p in model.parameters()):,} parameters")

    # Create datasets
    logger.info("Loading datasets...")
    train_dataset, val_dataset = create_datasets(config)
    logger.info(f"Training samples: {len(train_dataset)}, Validation samples: {len(val_dataset)}")

    # Create data loaders
    train_loader, val_loader = create_data_loaders(train_dataset, val_dataset, config)

    # Create trainer
    trainer = SilentVideoSynthTrainer(
        model=model,
        train_loader=train_loader,
        val_loader=val_loader,
        learning_rate=config['training'].get('learning_rate', 1e-4),
        weight_decay=config['training'].get('weight_decay', 0.01),
        loss_weights=config['training'].get('loss_weights'),
    )

    # Resume from checkpoint if specified
    if args.resume:
        logger.info(f"Resuming from checkpoint: {args.resume}")
        trainer.load_checkpoint(args.resume)

    # Training parameters
    num_epochs = config['training'].get('epochs', 50)
    save_every = config['training'].get('save_every', 5)
    early_stopping_patience = config['training'].get('early_stopping_patience', 10)
    model_name = config.get('model_name', 'silentvideosynth')

    # Start training
    logger.info(f"Starting training for {num_epochs} epochs...")

    try:
        await trainer.train_async(
            num_epochs=num_epochs,
            save_every=save_every,
            early_stopping_patience=early_stopping_patience,
            model_name=model_name,
        )

        logger.info("Training completed successfully!")

    except KeyboardInterrupt:
        logger.info("Training interrupted by user")

        # Save current state
        checkpoint_path = output_dir / f"{model_name}_interrupted.pth"
        trainer.save_checkpoint(
            epoch=trainer.epoch,
            val_loss=trainer.best_val_loss,
            model_name=str(checkpoint_path.stem),
            is_best=False
        )
        logger.info(f"Saved interrupted training state to {checkpoint_path}")

    except Exception as e:
        logger.error(f"Training failed with error: {e}")
        raise


def run_training():
    """Run training with asyncio."""
    asyncio.run(main())


if __name__ == "__main__":
    run_training()

