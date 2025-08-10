
# backend/models/__init__.py

"""
SilentVideoSynth Models Package

Contains all the neural network models and architectures used in the system.
"""

from .silentvideosynth import SilentVideoSynth
from .transformer_models import MultimodalTransformerEncoder, ChordProgressionTransformer
from .lstm_models import ExpressiveLSTMDecoder, MultiInstrumentLSTMDecoder

__all__ = [
    "SilentVideoSynth",
    "MultimodalTransformerEncoder",
    "ChordProgressionTransformer",
    "ExpressiveLSTMDecoder",
    "MultiInstrumentLSTMDecoder"
]

