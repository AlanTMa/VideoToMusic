
# backend/api/routes/__init__.py

"""
API Routes Package

Contains all the API route definitions for different functionalities.
"""

from . import generation, training, evaluation, models

__all__ = ["generation", "training", "evaluation", "models"]
