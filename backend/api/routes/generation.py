# backend/app/api/routes/generation.py

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Depends
from fastapi.responses import FileResponse, StreamingResponse
import torch
import numpy as np
import uuid
import asyncio
import json
from pathlib import Path
from typing import Optional, Dict, Any
import logging

from ...dependencies import (
    get_model_manager, get_session_manager, get_feature_extractor,
    get_midi_generator, get_evaluator
)
from ...config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()


@router.post("/generate-music")
async def generate_music(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    text_description: str = Form(""),
    valence: float = Form(0.5),
    arousal: float = Form(0.5),
    generation_params: str = Form("{}"),
    model_manager = Depends(get_model_manager),
    session_manager = Depends(get_session_manager),
    feature_extractor = Depends(get_feature_extractor),
    midi_generator = Depends(get_midi_generator),
    evaluator = Depends(get_evaluator),
):
    """
    Generate music from uploaded video with emotion parameters.
    """
    # Validate file
    if not video.content_type.startswith('video/'):
        raise HTTPException(status_code=400, detail="File must be a video")

    if video.size > settings.MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large")

    # Create session
    session_id = str(uuid.uuid4())
    session = session_manager.create_session(session_id)

    try:
        # Parse generation parameters
        try:
            gen_params = json.loads(generation_params)
        except json.JSONDecodeError:
            gen_params = {}

        # Default parameters
        default_params = {
            "tempo": 120,
            "key": "C",
            "genre": "electronic",
            "max_length": 60,
            "temperature": 0.8,
            "num_instruments": 1,
            "real_time": False,
        }
        gen_params = {**default_params, **gen_params}

        # Save uploaded video
        video_path = settings.get_upload_path(f"{session_id}_{video.filename}")
        video_path.parent.mkdir(parents=True, exist_ok=True)

        with open(video_path, "wb") as buffer:
            content = await video.read()
            buffer.write(content)

        session['files'].append(str(video_path))
        session_manager.update_session(session_id, session)

        # Process video and generate music
        result = await _process_video_and_generate(
            session_id=session_id,
            video_path=video_path,
            text_description=text_description,
            valence=valence,
            arousal=arousal,
            gen_params=gen_params,
            model_manager=model_manager,
            feature_extractor=feature_extractor,
            midi_generator=midi_generator,
            evaluator=evaluator,
        )

        # Update session with results
        session['results'] = result
        session['status'] = 'completed'
        session_manager.update_session(session_id, session)

        # Schedule cleanup
        background_tasks.add_task(_cleanup_session_files, session_id, delay=86400)  # 24 hours

        return result

    except Exception as e:
        logger.error(f"Music generation failed for session {session_id}: {e}")
        session['status'] = 'failed'
        session['error'] = str(e)
        session_manager.update_session(session_id, session)
        raise HTTPException(status_code=500, detail=f"Music generation failed: {str(e)}")


@router.post("/generate-music-stream")
async def generate_music_stream(
    video: UploadFile = File(...),
    text_description: str = Form(""),
    valence: float = Form(0.5),
    arousal: float = Form(0.5),
    generation_params: str = Form("{}"),
    model_manager = Depends(get_model_manager),
    feature_extractor = Depends(get_feature_extractor),
    midi_generator = Depends(get_midi_generator),
):
    """
    Generate music with real-time streaming.
    """
    # Validate file
    if not video.content_type.startswith('video/'):
        raise HTTPException(status_code=400, detail="File must be a video")

    # Create temporary session
    session_id = str(uuid.uuid4())
    video_path = settings.get_upload_path(f"{session_id}_{video.filename}")
    video_path.parent.mkdir(parents=True, exist_ok=True)

    # Save video
    with open(video_path, "wb") as buffer:
        content = await video.read()
        buffer.write(content)

    try:
        # Parse parameters
        try:
            gen_params = json.loads(generation_params)
        except json.JSONDecodeError:
            gen_params = {}

        # Stream generation
        return StreamingResponse(
            _stream_music_generation(
                video_path=video_path,
                text_description=text_description,
                valence=valence,
                arousal=arousal,
                gen_params=gen_params,
                model_manager=model_manager,
                feature_extractor=feature_extractor,
                midi_generator=midi_generator,
            ),
            media_type="application/json"
        )

    finally:
        # Cleanup temporary files
        if video_path.exists():
            video_path.unlink()


@router.post("/generate-multi-instrument")
async def generate_multi_instrument(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    text_description: str = Form(""),
    valence: float = Form(0.5),
    arousal: float = Form(0.5),
    instruments: str = Form("[]"),
    generation_params: str = Form("{}"),
    model_manager = Depends(get_model_manager),
    session_manager = Depends(get_session_manager),
    feature_extractor = Depends(get_feature_extractor),
    midi_generator = Depends(get_midi_generator),
    evaluator = Depends(get_evaluator),
):
    """
    Generate multi-instrument music arrangement.
    """
    # Validate file
    if not video.content_type.startswith('video/'):
        raise HTTPException(status_code=400, detail="File must be a video")

    # Parse instruments list
    try:
        instrument_list = json.loads(instruments)
    except json.JSONDecodeError:
        instrument_list = ["piano"]

    if len(instrument_list) > 8:
        raise HTTPException(status_code=400, detail="Maximum 8 instruments allowed")

    # Create session
    session_id = str(uuid.uuid4())
    session = session_manager.create_session(session_id)

    try:
        # Parse generation parameters
        try:
            gen_params = json.loads(generation_params)
        except json.JSONDecodeError:
            gen_params = {}

        gen_params['num_instruments'] = len(instrument_list)
        gen_params['instruments'] = instrument_list

        # Save uploaded video
        video_path = settings.get_upload_path(f"{session_id}_{video.filename}")
        video_path.parent.mkdir(parents=True, exist_ok=True)

        with open(video_path, "wb") as buffer:
            content = await video.read()
            buffer.write(content)

        # Generate multi-instrument music
        result = await _process_multi_instrument_generation(
            session_id=session_id,
            video_path=video_path,
            text_description=text_description,
            valence=valence,
            arousal=arousal,
            instruments=instrument_list,
            gen_params=gen_params,
            model_manager=model_manager,
            feature_extractor=feature_extractor,
            midi_generator=midi_generator,
            evaluator=evaluator,
        )

        # Update session
        session['results'] = result
        session['status'] = 'completed'
        session_manager.update_session(session_id, session)

        # Schedule cleanup
        background_tasks.add_task(_cleanup_session_files, session_id, delay=86400)

        return result

    except Exception as e:
        logger.error(f"Multi-instrument generation failed: {e}")
        session['status'] = 'failed'
        session['error'] = str(e)
        session_manager.update_session(session_id, session)
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


@router.get("/download/{session_id}/{file_type}")
async def download_file(
    session_id: str,
    file_type: str,
    session_manager = Depends(get_session_manager),
):
    """
    Download generated files (midi, audio, video).
    """
    # Validate session
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.get('status') != 'completed':
        raise HTTPException(status_code=400, detail="Generation not completed")

    # Get file path
    output_dir = settings.get_output_path(session_id)

    if file_type == "midi":
        file_path = output_dir / "generated_music.mid"
        media_type = "audio/midi"
        filename = f"silentvideosynth_{session_id}.mid"
    elif file_type == "audio":
        file_path = output_dir / "generated_music.wav"
        media_type = "audio/wav"
        filename = f"silentvideosynth_{session_id}.wav"
    elif file_type == "video":
        file_path = output_dir / "video_with_music.mp4"
        media_type = "video/mp4"
        filename = f"silentvideosynth_{session_id}.mp4"
    else:
        raise HTTPException(status_code=400, detail="Invalid file type")

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=filename
    )


# Helper functions

async def _process_video_and_generate(
    session_id: str,
    video_path: Path,
    text_description: str,
    valence: float,
    arousal: float,
    gen_params: Dict[str, Any],
    model_manager,
    feature_extractor,
    midi_generator,
    evaluator,
) -> Dict[str, Any]:
    """Process video and generate music."""
    import time
    start_time = time.time()

    # Extract video features
    logger.info(f"Extracting features for session {session_id}")
    video_features = feature_extractor.extract_all_features(
        str(video_path),
        text_description,
        max_duration=gen_params.get('max_length', 60)
    )

    # Override text emotion with user parameters
    video_features['text_emotion'] = np.array([valence, arousal])

    # Prepare input tensors
    device = next(model_manager.get_model().parameters()).device
    input_features = {
        'semantic': torch.tensor(video_features['semantic']).unsqueeze(0).float().to(device),
        'emotion': torch.tensor(video_features['emotion']).unsqueeze(0).float().to(device),
        'motion': torch.tensor(video_features['motion']).unsqueeze(0).unsqueeze(-1).float().to(device),
        'scene_offset': torch.tensor(video_features['scene_offset']).unsqueeze(0).unsqueeze(-1).float().to(device)
    }

    text_emotion = torch.tensor(video_features['text_emotion']).unsqueeze(0).float().to(device)

    # Generate music
    logger.info(f"Generating music for session {session_id}")
    model = model_manager.get_model()
    model.eval()

    with torch.no_grad():
        outputs = model(
            video_features=input_features,
            text_emotion=text_emotion,
            temperature=gen_params.get('temperature', 0.8),
            max_length=gen_params.get('max_length', 32)
        )

    # Convert to MIDI and audio
    chord_sequence = outputs['chord_sequence'][0]  # Remove batch dimension
    note_outputs = {k: v[0] for k, v in outputs['note_outputs'].items()}

    midi = midi_generator.generate_midi(
        chord_sequence,
        note_outputs,
        tempo=gen_params.get('tempo', 120)
    )

    # Add rhythm track
    midi = midi_generator.add_rhythm_track(midi, chord_sequence, note_outputs)

    # Synthesize audio
    audio = midi_generator.midi_to_audio(midi)

    # Save outputs
    output_dir = settings.get_output_path(session_id)
    midi_path, audio_path = midi_generator.save_output(midi, audio, output_dir)

    # Create video with music
    try:
        video_with_music_path = midi_generator.create_video_with_music(
            str(video_path),
            str(audio_path),
            str(output_dir / "video_with_music.mp4")
        )
    except Exception as e:
        logger.warning(f"Could not create video with music: {e}")
        video_with_music_path = None

    # Evaluate results
    evaluation = evaluator.evaluate_comprehensive(
        outputs,
        text_emotion,
        input_features,
        str(midi_path)
    )

    processing_time = time.time() - start_time

    # Prepare response
    result = {
        "session_id": session_id,
        "generated_music": {
            "chord_sequence": chord_sequence.cpu().numpy().tolist(),
            "note_outputs": {k: v.cpu().numpy().tolist() for k, v in note_outputs.items()},
        },
        "evaluation": evaluation,
        "output_files": {
            "midi_url": f"/api/download/{session_id}/midi",
            "audio_url": f"/api/download/{session_id}/audio",
            "video_with_music_url": f"/api/download/{session_id}/video" if video_with_music_path else None,
        },
        "processing_time": processing_time,
        "metadata": {
            "model_version": "silentvideosynth-v1",
            "generation_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "video_duration": video_features['metadata']['duration'],
        }
    }

    return result


async def _process_multi_instrument_generation(
    session_id: str,
    video_path: Path,
    text_description: str,
    valence: float,
    arousal: float,
    instruments: list,
    gen_params: Dict[str, Any],
    model_manager,
    feature_extractor,
    midi_generator,
    evaluator,
) -> Dict[str, Any]:
    """Process multi-instrument generation."""
    # Extract video features (same as single instrument)
    video_features = feature_extractor.extract_all_features(
        str(video_path),
        text_description,
        max_duration=gen_params.get('max_length', 60)
    )

    video_features['text_emotion'] = np.array([valence, arousal])

    # Prepare input tensors
    device = next(model_manager.get_model().parameters()).device
    input_features = {
        'semantic': torch.tensor(video_features['semantic']).unsqueeze(0).float().to(device),
        'emotion': torch.tensor(video_features['emotion']).unsqueeze(0).float().to(device),
        'motion': torch.tensor(video_features['motion']).unsqueeze(0).unsqueeze(-1).float().to(device),
        'scene_offset': torch.tensor(video_features['scene_offset']).unsqueeze(0).unsqueeze(-1).float().to(device)
    }

    text_emotion = torch.tensor(video_features['text_emotion']).unsqueeze(0).float().to(device)

    # Generate for each instrument
    instrument_outputs = {}
    for instrument in instruments:
        # Generate music for this instrument
        model = model_manager.get_model()
        with torch.no_grad():
            outputs = model(
                video_features=input_features,
                text_emotion=text_emotion,
                temperature=gen_params.get('temperature', 0.8),
                max_length=gen_params.get('max_length', 32)
            )

        instrument_outputs[instrument] = {
            'chord_sequence': outputs['chord_sequence'][0],
            'note_outputs': {k: v[0] for k, v in outputs['note_outputs'].items()}
        }

    # Create MIDI with multiple instruments
    midi = pretty_midi.PrettyMIDI(initial_tempo=gen_params.get('tempo', 120))

    # Add each instrument track
    midi = midi_generator.add_multi_instrument_tracks(
        midi, instrument_outputs, instruments
    )

    # Synthesize audio
    audio = midi_generator.midi_to_audio(midi)

    # Save outputs
    output_dir = settings.get_output_path(session_id)
    midi_path, audio_path = midi_generator.save_output(midi, audio, output_dir)

    # Create result
    result = {
        "session_id": session_id,
        "generated_music": {
            "instruments": [
                {
                    "instrument_id": i,
                    "instrument_name": instrument,
                    "chord_sequence": instrument_outputs[instrument]['chord_sequence'].cpu().numpy().tolist(),
                    "note_outputs": {k: v.cpu().numpy().tolist() for k, v in instrument_outputs[instrument]['note_outputs'].items()}
                }
                for i, instrument in enumerate(instruments)
            ]
        },
        "output_files": {
            "midi_url": f"/api/download/{session_id}/midi",
            "audio_url": f"/api/download/{session_id}/audio",
        },
        "metadata": {
            "instruments": instruments,
            "num_instruments": len(instruments),
        }
    }

    return result


async def _stream_music_generation(
    video_path: Path,
    text_description: str,
    valence: float,
    arousal: float,
    gen_params: Dict[str, Any],
    model_manager,
    feature_extractor,
    midi_generator,
):
    """Stream music generation in real-time."""
    import json

    try:
        # Extract features
        yield json.dumps({"type": "progress", "message": "Extracting video features", "progress": 10}) + "\n"

        video_features = feature_extractor.extract_all_features(str(video_path), text_description)
        video_features['text_emotion'] = np.array([valence, arousal])

        yield json.dumps({"type": "progress", "message": "Features extracted", "progress": 30}) + "\n"

        # Prepare tensors
        device = next(model_manager.get_model().parameters()).device
        input_features = {
            'semantic': torch.tensor(video_features['semantic']).unsqueeze(0).float().to(device),
            'emotion': torch.tensor(video_features['emotion']).unsqueeze(0).float().to(device),
            'motion': torch.tensor(video_features['motion']).unsqueeze(0).unsqueeze(-1).float().to(device),
            'scene_offset': torch.tensor(video_features['scene_offset']).unsqueeze(0).unsqueeze(-1).float().to(device)
        }
        text_emotion = torch.tensor(video_features['text_emotion']).unsqueeze(0).float().to(device)

        yield json.dumps({"type": "progress", "message": "Starting generation", "progress": 40}) + "\n"

        # Stream generation
        model = model_manager.get_model()
        chunk_count = 0

        for chunk in model.generate_with_streaming(
            input_features,
            text_emotion,
            chunk_size=gen_params.get('chunk_size', 8),
            temperature=gen_params.get('temperature', 0.8),
            max_length=gen_params.get('max_length', 32)
        ):
            chunk_count += 1
            yield json.dumps({
                "type": "chunk",
                "chunk_id": chunk_count,
                "data": {
                    "chord_sequence": chunk['chord_sequence'].cpu().numpy().tolist(),
                    "progress": chunk['progress']
                }
            }) + "\n"

        yield json.dumps({"type": "complete", "message": "Generation complete"}) + "\n"

    except Exception as e:
        yield json.dumps({"type": "error", "message": str(e)}) + "\n"


async def _cleanup_session_files(session_id: str, delay: int = 0):
    """Cleanup session files after delay."""
    if delay > 0:
        await asyncio.sleep(delay)

    try:
        # Remove upload files
        upload_dir = settings.get_upload_path("")
        for file_path in upload_dir.glob(f"{session_id}_*"):
            if file_path.exists():
                file_path.unlink()

        # Remove output files
        output_dir = settings.get_output_path(session_id)
        if output_dir.exists():
            import shutil
            shutil.rmtree(output_dir)

        logger.info(f"Cleaned up files for session {session_id}")

    except Exception as e:
        logger.error(f"Failed to cleanup session {session_id}: {e}")

