# backend/app/config.py

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List, Optional
import os
from pathlib import Path


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

# backend/app/dependencies.py

from functools import lru_cache
from typing import Optional
import torch
import logging

from .config import get_settings
from ..models.silentvideosynth import SilentVideoSynth
from ..utils.feature_extractor import VideoFeatureExtractor
from ..utils.emotion_encoder import RussellCircumplexEncoder
from ..utils.midi_generator import MIDIGenerator
from ..utils.evaluator import SilentVideoSynthEvaluator

logger = logging.getLogger(__name__)


class ModelManager:
    """Manages model loading, caching, and inference."""

    def __init__(self, settings):
        self.settings = settings
        self.device = self._get_device()
        self.models = {}
        self.feature_extractor = None
        self.emotion_encoder = None
        self.midi_generator = None
        self.evaluator = None
        self.models_loaded = False

    def _get_device(self) -> torch.device:
        """Determine the best device for model inference."""
        if self.settings.DEVICE == "cpu":
            return torch.device("cpu")
        elif self.settings.DEVICE == "cuda":
            if torch.cuda.is_available():
                return torch.device("cuda")
            else:
                logger.warning("CUDA requested but not available, falling back to CPU")
                return torch.device("cpu")
        else:  # auto
            return torch.device("cuda" if torch.cuda.is_available() else "cpu")

    async def load_models(self):
        """Load all required models."""
        try:
            logger.info(f"Loading models on device: {self.device}")

            # Load main model
            self.models['main'] = SilentVideoSynth(
                chord_vocab_size=50,
                note_vocab_size=128,
                feature_dim=512
            ).to(self.device)

            # Load pre-trained weights if available
            model_path = self.settings.get_model_path()
            if (model_path / "best_model.pth").exists():
                checkpoint = torch.load(
                    model_path / "best_model.pth",
                    map_location=self.device
                )
                self.models['main'].load_state_dict(checkpoint)
                logger.info("Loaded pre-trained model weights")
            else:
                logger.warning("No pre-trained weights found, using random initialization")

            # Initialize utility components
            self.feature_extractor = VideoFeatureExtractor(device=self.device)
            self.emotion_encoder = RussellCircumplexEncoder()
            self.midi_generator = MIDIGenerator()
            self.evaluator = SilentVideoSynthEvaluator(
                self.models['main'],
                self.emotion_encoder,
                self.midi_generator
            )

            # Set models to evaluation mode
            for model in self.models.values():
                model.eval()

            self.models_loaded = True
            logger.info("All models loaded successfully")

        except Exception as e:
            logger.error(f"Failed to load models: {e}")
            raise

    def get_model(self, model_name: str = "main"):
        """Get a loaded model by name."""
        if not self.models_loaded:
            raise RuntimeError("Models not loaded")

        if model_name not in self.models:
            raise ValueError(f"Model '{model_name}' not found")

        return self.models[model_name]

    @property
    def available_models(self) -> list:
        """Get list of available model names."""
        return list(self.models.keys())

    @property
    def current_model_name(self) -> str:
        """Get the name of the current primary model."""
        return "main" if "main" in self.models else None

    async def cleanup(self):
        """Cleanup models and free memory."""
        for model in self.models.values():
            del model

        self.models.clear()

        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        self.models_loaded = False
        logger.info("Models cleaned up")


class SessionManager:
    """Manages user sessions and temporary files."""

    def __init__(self, settings):
        self.settings = settings
        self.sessions = {}
        self.cleanup_tasks = {}

    def create_session(self, session_id: str) -> dict:
        """Create a new session."""
        session = {
            "id": session_id,
            "created_at": "2024-01-01T00:00:00Z",  # TODO: Use actual timestamp
            "status": "active",
            "files": [],
            "results": None
        }

        self.sessions[session_id] = session

        # Create session directory
        session_dir = self.settings.get_output_path(session_id)
        session_dir.mkdir(parents=True, exist_ok=True)

        return session

    def get_session(self, session_id: str) -> Optional[dict]:
        """Get session by ID."""
        return self.sessions.get(session_id)

    def update_session(self, session_id: str, data: dict):
        """Update session data."""
        if session_id in self.sessions:
            self.sessions[session_id].update(data)

    def delete_session(self, session_id: str):
        """Delete session and cleanup files."""
        if session_id in self.sessions:
            # Remove session directory
            import shutil
            session_dir = self.settings.get_output_path(session_id)
            if session_dir.exists():
                shutil.rmtree(session_dir)

            # Remove from sessions
            del self.sessions[session_id]

    async def cleanup_expired_sessions(self):
        """Clean up expired sessions."""
        # TODO: Implement actual cleanup logic
        pass

    @property
    def active_sessions(self) -> int:
        """Get number of active sessions."""
        return len(self.sessions)

    @property
    def total_sessions(self) -> int:
        """Get total number of sessions created."""
        return len(self.sessions)  # TODO: Implement persistent counter


# Dependency injection functions

@lru_cache()
def get_model_manager() -> ModelManager:
    """Get model manager instance."""
    settings = get_settings()
    return ModelManager(settings)


@lru_cache()
def get_session_manager() -> SessionManager:
    """Get session manager instance."""
    settings = get_settings()
    return SessionManager(settings)


def get_current_model():
    """Dependency to get the current model."""
    model_manager = get_model_manager()
    if not model_manager.models_loaded:
        raise HTTPException(status_code=503, detail="Models not loaded")
    return model_manager.get_model()


def get_feature_extractor():
    """Dependency to get the feature extractor."""
    model_manager = get_model_manager()
    if not model_manager.feature_extractor:
        raise HTTPException(status_code=503, detail="Feature extractor not available")
    return model_manager.feature_extractor


def get_midi_generator():
    """Dependency to get the MIDI generator."""
    model_manager = get_model_manager()
    if not model_manager.midi_generator:
        raise HTTPException(status_code=503, detail="MIDI generator not available")
    return model_manager.midi_generator


def get_evaluator():
    """Dependency to get the evaluator."""
    model_manager = get_model_manager()
    if not model_manager.evaluator:
        raise HTTPException(status_code=503, detail="Evaluator not available")
    return model_manager.evaluator
