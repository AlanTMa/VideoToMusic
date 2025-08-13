# backend/app/config.py

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List, Optional
import os
from pathlib import Path
from fastapi import HTTPException

class Settings(BaseSettings):
    """Application configuration settings."""

    # Basic settings
    APP_NAME: str = "SilentVideoSynth"
    VERSION: str = "1.0.0"
    DEBUG: bool = Field(default=False, env="DEBUG")

    # Server settings
    HOST: str = Field(default="0.0.0.0", env="HOST")
    PORT: int = Field(default=8000, env="PORT")
    WORKERS: int = Field(default=4, env="WORKERS")

    # CORS settings
    ALLOWED_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"],
        env="ALLOWED_ORIGINS"
    )

    # File handling
    MAX_FILE_SIZE: int = Field(default=100 * 1024 * 1024, env="MAX_FILE_SIZE")  # 100MB
    UPLOAD_DIR: str = Field(default="uploads", env="UPLOAD_DIR")
    OUTPUT_DIR: str = Field(default="outputs", env="OUTPUT_DIR")
    STATIC_DIR: str = Field(default="static", env="STATIC_DIR")

    # Model settings
    MODEL_DIR: str = Field(default="models", env="MODEL_DIR")
    MODEL_NAME: str = Field(default="silentvideosynth-v1", env="MODEL_NAME")
    DEVICE: str = Field(default="auto", env="DEVICE")  # auto, cpu, cuda
    MODEL_CACHE_SIZE: int = Field(default=2, env="MODEL_CACHE_SIZE")

    # Generation settings
    DEFAULT_TIMEOUT: int = Field(default=300, env="DEFAULT_TIMEOUT")  # 5 minutes
    MAX_QUEUE_SIZE: int = Field(default=100, env="MAX_QUEUE_SIZE")
    CLEANUP_INTERVAL: int = Field(default=3600, env="CLEANUP_INTERVAL")  # 1 hour
    SESSION_EXPIRY: int = Field(default=86400, env="SESSION_EXPIRY")  # 24 hours

    # External services
    REDIS_URL: Optional[str] = Field(default=None, env="REDIS_URL")
    DATABASE_URL: Optional[str] = Field(default=None, env="DATABASE_URL")

    # Monitoring
    SENTRY_DSN: Optional[str] = Field(default=None, env="SENTRY_DSN")
    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")

    # Security
    API_KEY: Optional[str] = Field(default=None, env="API_KEY")
    RATE_LIMIT: str = Field(default="100/hour", env="RATE_LIMIT")

    # Audio processing
    SAMPLE_RATE: int = Field(default=44100, env="SAMPLE_RATE")
    AUDIO_FORMAT: str = Field(default="wav", env="AUDIO_FORMAT")
    MIDI_RESOLUTION: int = Field(default=480, env="MIDI_RESOLUTION")

    # Video processing
    VIDEO_FPS: int = Field(default=1, env="VIDEO_FPS")  # Frame extraction rate
    MAX_VIDEO_DURATION: int = Field(default=300, env="MAX_VIDEO_DURATION")  # 5 minutes

    # Feature extraction
    CLIP_MODEL: str = Field(default="openai/clip-vit-base-patch32", env="CLIP_MODEL")
    EMOTION_CATEGORIES: List[str] = Field(
        default=["exciting", "fearful", "tense", "sad", "relaxing", "neutral"],
        env="EMOTION_CATEGORIES"
    )

    # Training settings
    TRAINING_DATA_DIR: str = Field(default="training_data", env="TRAINING_DATA_DIR")
    CHECKPOINT_DIR: str = Field(default="checkpoints", env="CHECKPOINT_DIR")
    TENSORBOARD_DIR: str = Field(default="tensorboard", env="TENSORBOARD_DIR")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

    @property
    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.DEBUG

    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return not self.DEBUG

    def get_model_path(self, model_name: str = None) -> Path:
        """Get path to model directory."""
        model_name = model_name or self.MODEL_NAME
        return Path(self.MODEL_DIR) / model_name

    def get_upload_path(self, filename: str) -> Path:
        """Get path for uploaded file."""
        return Path(self.UPLOAD_DIR) / filename

    def get_output_path(self, session_id: str) -> Path:
        """Get path for session output."""
        return Path(self.OUTPUT_DIR) / session_id


# Global settings instance
_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """Get application settings (singleton)."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
