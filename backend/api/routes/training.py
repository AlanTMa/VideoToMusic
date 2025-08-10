
# backend/app/api/routes/training.py

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import uuid
import asyncio
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class TrainingConfig(BaseModel):
    """Training configuration parameters."""
    dataset_path: str
    model_name: str = "silentvideosynth-custom"
    epochs: int = 50
    batch_size: int = 4
    learning_rate: float = 1e-4
    validation_split: float = 0.2
    save_every: int = 5
    early_stopping_patience: int = 10
    loss_weights: Dict[str, float] = {
        'chord': 1.0,
        'note': 0.8,
        'velocity': 0.5,
        'duration': 0.7,
        'emotion': 0.3,
    }


class TrainingStatus(BaseModel):
    """Training status response."""
    training_id: str
    status: str  # 'started', 'running', 'completed', 'failed'
    current_epoch: int
    total_epochs: int
    train_loss: float
    val_loss: float
    learning_rate: float
    eta_minutes: Optional[int]
    metrics: Dict[str, float]


# Global training state
active_trainings: Dict[str, Dict[str, Any]] = {}


@router.post("/start", response_model=Dict[str, str])
async def start_training(
    config: TrainingConfig,
    background_tasks: BackgroundTasks,
):
    """
    Start model training with given configuration.
    """
    # Validate dataset path
    from pathlib import Path
    dataset_path = Path(config.dataset_path)
    if not dataset_path.exists():
        raise HTTPException(status_code=400, detail="Dataset path does not exist")

    # Create training ID
    training_id = str(uuid.uuid4())

    # Initialize training state
    active_trainings[training_id] = {
        'status': 'started',
        'config': config.dict(),
        'current_epoch': 0,
        'total_epochs': config.epochs,
        'train_loss': 0.0,
        'val_loss': 0.0,
        'learning_rate': config.learning_rate,
        'eta_minutes': None,
        'metrics': {},
        'logs': [],
    }

    # Start training in background
    background_tasks.add_task(_run_training, training_id, config)

    return {"training_id": training_id, "status": "started"}


@router.get("/progress/{training_id}", response_model=TrainingStatus)
async def get_training_progress(training_id: str):
    """
    Get training progress for a specific training job.
    """
    if training_id not in active_trainings:
        raise HTTPException(status_code=404, detail="Training job not found")

    training_state = active_trainings[training_id]

    return TrainingStatus(
        training_id=training_id,
        status=training_state['status'],
        current_epoch=training_state['current_epoch'],
        total_epochs=training_state['total_epochs'],
        train_loss=training_state['train_loss'],
        val_loss=training_state['val_loss'],
        learning_rate=training_state['learning_rate'],
        eta_minutes=training_state['eta_minutes'],
        metrics=training_state['metrics'],
    )


@router.get("/list")
async def list_training_jobs():
    """
    List all training jobs and their status.
    """
    return {
        training_id: {
            'status': state['status'],
            'current_epoch': state['current_epoch'],
            'total_epochs': state['total_epochs'],
        }
        for training_id, state in active_trainings.items()
    }


@router.post("/stop/{training_id}")
async def stop_training(training_id: str):
    """
    Stop a running training job.
    """
    if training_id not in active_trainings:
        raise HTTPException(status_code=404, detail="Training job not found")

    training_state = active_trainings[training_id]

    if training_state['status'] == 'running':
        training_state['status'] = 'stopped'
        return {"message": "Training stopped"}
    else:
        raise HTTPException(status_code=400, detail="Training is not running")


@router.delete("/delete/{training_id}")
async def delete_training(training_id: str):
    """
    Delete a training job and its associated files.
    """
    if training_id not in active_trainings:
        raise HTTPException(status_code=404, detail="Training job not found")

    # Remove from active trainings
    del active_trainings[training_id]

    # TODO: Cleanup model checkpoints and logs

    return {"message": "Training job deleted"}


@router.get("/logs/{training_id}")
async def get_training_logs(training_id: str, last_n: int = 100):
    """
    Get training logs for a specific job.
    """
    if training_id not in active_trainings:
        raise HTTPException(status_code=404, detail="Training job not found")

    logs = active_trainings[training_id]['logs']
    return {"logs": logs[-last_n:] if last_n else logs}


# Training implementation

async def _run_training(training_id: str, config: TrainingConfig):
    """
    Run training in background task.
    """
    training_state = active_trainings[training_id]

    try:
        training_state['status'] = 'running'

        # Import training components
        from ...training.trainer import SilentVideoSynthTrainer
        from ...training.dataset import VideoMusicDataset
        from ...models.silentvideosynth import SilentVideoSynth
        from torch.utils.data import DataLoader
        import torch

        # Create model
        model = SilentVideoSynth(
            chord_vocab_size=50,
            note_vocab_size=128,
            feature_dim=512
        )

        # Create dataset and data loaders
        dataset = VideoMusicDataset(config.dataset_path)

        # Split dataset
        train_size = int((1 - config.validation_split) * len(dataset))
        val_size = len(dataset) - train_size
        train_dataset, val_dataset = torch.utils.data.random_split(
            dataset, [train_size, val_size]
        )

        train_loader = DataLoader(
            train_dataset,
            batch_size=config.batch_size,
            shuffle=True,
            num_workers=2
        )

        val_loader = DataLoader(
            val_dataset,
            batch_size=config.batch_size,
            shuffle=False,
            num_workers=2
        )

        # Create trainer
        trainer = SilentVideoSynthTrainer(
            model=model,
            train_loader=train_loader,
            val_loader=val_loader,
            learning_rate=config.learning_rate,
            loss_weights=config.loss_weights,
            training_id=training_id,
            training_state=training_state
        )

        # Run training
        await trainer.train_async(
            num_epochs=config.epochs,
            save_every=config.save_every,
            early_stopping_patience=config.early_stopping_patience,
            model_name=config.model_name,
        )

        training_state['status'] = 'completed'
        training_state['logs'].append("Training completed successfully")

    except Exception as e:
        logger.error(f"Training {training_id} failed: {e}")
        training_state['status'] = 'failed'
        training_state['logs'].append(f"Training failed: {str(e)}")


