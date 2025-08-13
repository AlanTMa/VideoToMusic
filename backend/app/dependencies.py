# backend/app/dependencies.py

from functools import lru_cache
from typing import Optional
import torch
import logging

from fastapi import HTTPException
from .config  import get_settings
from models.silentvideosynth import SilentVideoSynth
from utils.feature_extractor import VideoFeatureExtractor
from utils.emotion_encoder import RussellCircumplexEncoder
from utils.midi_generator import MIDIGenerator
from utils.evaluator import SilentVideoSynthEvaluator

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