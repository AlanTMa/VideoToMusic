# backend/app/main.py

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn
import asyncio
import logging
import os
from pathlib import Path

from .config import get_settings
from .dependencies import get_model_manager, get_session_manager
from api.routes import generation, training, evaluation, models
from api.middleware import RequestLoggingMiddleware, ErrorHandlingMiddleware


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

settings = get_settings()
settings.DEBUG = True

# Global managers that will be initialized on startup
model_manager = None
session_manager = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown events."""
    global model_manager, session_manager

    # Startup
    logger.info("🚀 Starting SilentVideoSynth API...")

    # Initialize managers
    model_manager = get_model_manager()
    session_manager = get_session_manager()

    # Load models
    try:
        await model_manager.load_models()
        logger.info("✅ Models loaded successfully")
    except Exception as e:
        logger.error(f"❌ Failed to load models: {e}")
        # Continue without models for now

    # Create output directories
    os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.MODEL_DIR, exist_ok=True)

    logger.info("🎵 SilentVideoSynth API is ready!")

    yield

    # Shutdown
    logger.info("🛑 Shutting down SilentVideoSynth API...")

    # Cleanup tasks
    if session_manager:
        await session_manager.cleanup_expired_sessions()

    if model_manager:
        await model_manager.cleanup()

    logger.info("👋 Shutdown complete")


# Create FastAPI application
app = FastAPI(
    title="SilentVideoSynth API",
    description="""
    Advanced AI system for generating emotionally-aligned background music for silent videos.

    ## Features

    * **Multimodal Analysis**: Combines video content analysis with text descriptions
    * **Emotion-Driven**: Uses Russell's Circumplex Model for precise emotional mapping
    * **Hybrid Architecture**: Transformer + LSTM for both structure and expressiveness
    * **Multi-Instrument**: Generate complete orchestral arrangements
    * **Real-Time**: Stream generation for immediate feedback
    * **Evaluation**: Comprehensive quality and alignment metrics

    ## Model Architecture

    The system uses a hybrid Transformer-LSTM architecture:
    - **Transformer Encoder**: Processes multimodal video features
    - **Chord Decoder**: Generates harmonic progressions
    - **LSTM Decoder**: Adds expressive note-level details

    ## Supported Formats

    * **Input**: MP4, AVI, MOV, WMV, WebM video files
    * **Output**: MIDI, WAV audio files, Video with soundtrack
    """,
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(ErrorHandlingMiddleware)

# Mount static files
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

# Include API routes
app.include_router(
    generation.router,
    prefix="/api",
    tags=["Music Generation"]
)

app.include_router(
    training.router,
    prefix="/api/train",
    tags=["Model Training"]
)

app.include_router(
    evaluation.router,
    prefix="/api/evaluate",
    tags=["Evaluation"]
)

app.include_router(
    models.router,
    prefix="/api/models",
    tags=["Model Management"]
)


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "🎬🎵 SilentVideoSynth API",
        "version": "1.0.0",
        "status": "online",
        "documentation": "/docs",
        "features": [
            "Multimodal video analysis",
            "Emotion-driven music generation",
            "Multi-instrument support",
            "Real-time streaming",
            "Comprehensive evaluation"
        ]
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint for monitoring."""
    try:
        # Check model status
        model_status = "unknown"
        if model_manager:
            model_status = "loaded" if model_manager.models_loaded else "loading"

        # Check GPU availability
        import torch
        gpu_available = torch.cuda.is_available()
        gpu_count = torch.cuda.device_count() if gpu_available else 0

        # Check disk space
        import shutil
        disk_usage = shutil.disk_usage(settings.OUTPUT_DIR)
        disk_free_gb = disk_usage.free / (1024**3)

        return {
            "status": "healthy",
            "timestamp": "2024-01-01T00:00:00Z",
            "model_status": model_status,
            "gpu_available": gpu_available,
            "gpu_count": gpu_count,
            "disk_free_gb": round(disk_free_gb, 2),
            "active_sessions": session_manager.active_sessions if session_manager else 0,
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unhealthy")


@app.get("/api/status")
async def system_status():
    """Detailed system status for admin dashboard."""
    try:
        status = {
            "system": {
                "uptime": "0:00:00",  # TODO: Calculate actual uptime
                "cpu_usage": 0.0,
                "memory_usage": 0.0,
                "disk_usage": 0.0,
            },
            "models": {
                "loaded": model_manager.models_loaded if model_manager else False,
                "count": len(model_manager.available_models) if model_manager else 0,
                "active_model": model_manager.current_model_name if model_manager else None,
            },
            "processing": {
                "queue_size": 0,  # TODO: Implement queue monitoring
                "active_jobs": 0,
                "completed_today": 0,
                "average_processing_time": 0.0,
            },
            "storage": {
                "total_sessions": session_manager.total_sessions if session_manager else 0,
                "active_sessions": session_manager.active_sessions if session_manager else 0,
                "storage_used_gb": 0.0,
            }
        }

        return status
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to get system status")


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom HTTP exception handler."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "timestamp": "2024-01-01T00:00:00Z"
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """General exception handler for unhandled errors."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "status_code": 500,
            "timestamp": "2024-01-01T00:00:00Z"
        }
    )


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        workers=1 if settings.DEBUG else settings.WORKERS,
        log_level="info" if settings.DEBUG else "warning"
    )

