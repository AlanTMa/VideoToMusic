
# backend/api/__init__.py

"""
SilentVideoSynth API Package

This package contains the API routes and middleware for the SilentVideoSynth application.
"""

from .routes import generation, training, evaluation, models
from . import middleware

__all__ = ["generation", "training", "evaluation", "models", "middleware"]
