# backend/training/__init__.py

"""
Training Package

Contains training pipeline, dataset handling, and training scripts.
"""

from .trainer import SilentVideoSynthTrainer
from .dataset import VideoMusicDataset

__all__ = ["SilentVideoSynthTrainer", "VideoMusicDataset"]

