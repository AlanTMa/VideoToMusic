# backend/api/routes/analysis.py

from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import List, Dict, Optional
import cv2
import numpy as np
import tempfile
import os
from pydantic import BaseModel
import torch
from transformers import pipeline
import mediapipe as mp
from collections import defaultdict
import colorsys

router = APIRouter()

# Initialize models (do this once at startup)
face_emotion_pipeline = None
scene_classifier = None
mp_face_mesh = None

def init_models():
    """Initialize ML models for emotion detection"""
    global face_emotion_pipeline, scene_classifier, mp_face_mesh

    # Facial emotion detection
    face_emotion_pipeline = pipeline(
        "image-classification",
        model="dima806/facial_emotions_image_detection"
    )

    # Scene understanding for mood
    scene_classifier = pipeline(
        "image-classification",
        model="google/vit-base-patch16-224"
    )

    # MediaPipe for face detection
    mp_face_mesh = mp.solutions.face_mesh.FaceMesh(
        static_image_mode=True,
        max_num_faces=5,
        min_detection_confidence=0.5
    )

class EmotionPoint(BaseModel):
    timestamp: float
    valence: float  # -1 to 1 (negative to positive)
    arousal: float  # 0 to 1 (calm to excited)
    dominant_emotion: str
    confidence: float
    face_detected: bool
    scene_mood: Optional[str] = None
    color_energy: float

class EmotionTimeline(BaseModel):
    emotions: List[EmotionPoint]
    average_valence: float
    average_arousal: float
    dominant_emotion: str
    video_duration: float
    analysis_interval: float

class AnalysisProgress(BaseModel):
    status: str
    progress: int
    current_timestamp: float
    message: str

# Emotion to valence/arousal mapping
EMOTION_MAPPING = {
    # Facial emotions
    "happy": {"valence": 0.8, "arousal": 0.7},
    "sad": {"valence": -0.7, "arousal": 0.3},
    "angry": {"valence": -0.8, "arousal": 0.9},
    "fearful": {"valence": -0.6, "arousal": 0.8},
    "disgusted": {"valence": -0.7, "arousal": 0.6},
    "surprised": {"valence": 0.1, "arousal": 0.9},
    "neutral": {"valence": 0.0, "arousal": 0.4},

    # Scene moods (from scene analysis)
    "bright": {"valence": 0.5, "arousal": 0.6},
    "dark": {"valence": -0.3, "arousal": 0.3},
    "nature": {"valence": 0.6, "arousal": 0.3},
    "urban": {"valence": 0.0, "arousal": 0.6},
    "crowd": {"valence": 0.2, "arousal": 0.8},
    "calm": {"valence": 0.4, "arousal": 0.2},
}

def analyze_frame_emotions(frame: np.ndarray) -> Dict:
    """Analyze emotions from a single frame using multiple methods"""
    results = {
        "face_emotion": None,
        "face_confidence": 0.0,
        "face_detected": False,
        "scene_mood": None,
        "color_energy": 0.0,
        "color_warmth": 0.0
    }

    # 1. Facial Emotion Detection
    try:
        # Detect faces first
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        face_results = mp_face_mesh.process(rgb_frame)

        if face_results.multi_face_landmarks:
            results["face_detected"] = True

            # Get face region for emotion analysis
            h, w = frame.shape[:2]
            face_landmarks = face_results.multi_face_landmarks[0]

            # Extract face bounding box
            x_coords = [int(lm.x * w) for lm in face_landmarks.landmark]
            y_coords = [int(lm.y * h) for lm in face_landmarks.landmark]
            x_min, x_max = max(0, min(x_coords)), min(w, max(x_coords))
            y_min, y_max = max(0, min(y_coords)), min(h, max(y_coords))

            # Crop face region
            face_roi = frame[y_min:y_max, x_min:x_max]

            if face_roi.size > 0:
                # Run emotion detection on face
                emotions = face_emotion_pipeline(face_roi)
                if emotions:
                    top_emotion = emotions[0]
                    results["face_emotion"] = top_emotion["label"].lower()
                    results["face_confidence"] = top_emotion["score"]
    except Exception as e:
        print(f"Face emotion detection error: {e}")

    # 2. Scene Analysis for Mood
    try:
        # Resize for scene classification
        scene_frame = cv2.resize(frame, (224, 224))
        scene_results = scene_classifier(scene_frame)

        if scene_results:
            # Map scene to mood
            scene_label = scene_results[0]["label"].lower()

            # Simple scene-to-mood mapping
            if any(word in scene_label for word in ["sunset", "sunrise", "beach", "mountain"]):
                results["scene_mood"] = "nature"
            elif any(word in scene_label for word in ["city", "street", "building"]):
                results["scene_mood"] = "urban"
            elif any(word in scene_label for word in ["crowd", "people", "party"]):
                results["scene_mood"] = "crowd"
            elif any(word in scene_label for word in ["dark", "night"]):
                results["scene_mood"] = "dark"
            elif any(word in scene_label for word in ["bright", "sunny", "light"]):
                results["scene_mood"] = "bright"
            else:
                results["scene_mood"] = "neutral"
    except Exception as e:
        print(f"Scene analysis error: {e}")

    # 3. Color Analysis for Energy and Warmth
    try:
        # Convert to HSV for color analysis
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)

        # Calculate average saturation (color intensity) as energy
        saturation = hsv[:, :, 1].mean() / 255.0
        brightness = hsv[:, :, 2].mean() / 255.0

        # Calculate color warmth (reds/yellows vs blues/greens)
        hue = hsv[:, :, 0].mean()
        if hue < 30 or hue > 150:  # Reds, yellows
            warmth = 0.7
        elif 30 <= hue <= 90:  # Greens
            warmth = 0.0
        else:  # Blues
            warmth = -0.5

        results["color_energy"] = saturation * brightness
        results["color_warmth"] = warmth

    except Exception as e:
        print(f"Color analysis error: {e}")

    return results

def calculate_valence_arousal(frame_analysis: Dict) -> tuple:
    """Calculate valence and arousal from multi-modal analysis"""
    valence = 0.0
    arousal = 0.4
    weights_sum = 0.0

    # Face emotion (highest weight if detected)
    if frame_analysis["face_detected"] and frame_analysis["face_emotion"]:
        emotion = frame_analysis["face_emotion"]
        if emotion in EMOTION_MAPPING:
            face_weight = frame_analysis["face_confidence"] * 0.6
            valence += EMOTION_MAPPING[emotion]["valence"] * face_weight
            arousal += EMOTION_MAPPING[emotion]["arousal"] * face_weight
            weights_sum += face_weight

    # Scene mood
    if frame_analysis["scene_mood"] and frame_analysis["scene_mood"] in EMOTION_MAPPING:
        scene_weight = 0.3
        valence += EMOTION_MAPPING[frame_analysis["scene_mood"]]["valence"] * scene_weight
        arousal += EMOTION_MAPPING[frame_analysis["scene_mood"]]["arousal"] * scene_weight
        weights_sum += scene_weight

    # Color analysis
    color_weight = 0.2
    valence += frame_analysis["color_warmth"] * color_weight
    arousal += frame_analysis["color_energy"] * color_weight
    weights_sum += color_weight

    # Normalize
    if weights_sum > 0:
        valence = max(-1, min(1, valence / weights_sum))
        arousal = max(0, min(1, arousal / weights_sum))

    return valence, arousal

def get_emotion_label(valence: float, arousal: float) -> str:
    """Map valence/arousal to emotion label"""
    if valence > 0.5:
        if arousal > 0.5:
            return "excited"
        else:
            return "happy"
    elif valence > 0:
        if arousal > 0.5:
            return "alert"
        else:
            return "content"
    elif valence > -0.5:
        if arousal > 0.5:
            return "tense"
        else:
            return "neutral"
    else:
        if arousal > 0.5:
            return "angry"
        else:
            return "sad"

@router.post("/analyze-emotion", response_model=EmotionTimeline)
async def analyze_video_emotion(
    file: UploadFile = File(...),
    interval: int = 5,
    background_tasks: BackgroundTasks = None
):
    """
    Analyze emotion throughout a video at specified intervals.
    Returns emotion timeline with valence/arousal values.
    """
    print("🎯 EMOTION ANALYSIS ENDPOINT HIT!")
    print(f"File: {file.filename}")
    print(f"Interval: {interval}")
    # Initialize models if needed
    if face_emotion_pipeline is None:
        init_models()

    # Validate file
    if not file.content_type.startswith("video/"):
        raise HTTPException(400, "File must be a video")

    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp_file:
        content = await file.read()
        tmp_file.write(content)
        tmp_path = tmp_file.name

    try:
        # Open video
        cap = cv2.VideoCapture(tmp_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = frame_count / fps if fps > 0 else 0

        if duration == 0:
            raise HTTPException(400, "Could not read video duration")

        # Calculate frames to analyze
        emotions_timeline = []
        frame_interval = int(fps * interval)

        current_frame = 0
        while current_frame < frame_count:
            # Set frame position
            cap.set(cv2.CAP_PROP_POS_FRAMES, current_frame)
            ret, frame = cap.read()

            if not ret:
                break

            # Analyze frame
            timestamp = current_frame / fps
            frame_analysis = analyze_frame_emotions(frame)
            valence, arousal = calculate_valence_arousal(frame_analysis)

            emotion_point = EmotionPoint(
                timestamp=round(timestamp, 2),
                valence=round(valence, 3),
                arousal=round(arousal, 3),
                dominant_emotion=get_emotion_label(valence, arousal),
                confidence=frame_analysis.get("face_confidence", 0.5),
                face_detected=frame_analysis["face_detected"],
                scene_mood=frame_analysis.get("scene_mood"),
                color_energy=round(frame_analysis.get("color_energy", 0.5), 3)
            )

            emotions_timeline.append(emotion_point)
            current_frame += frame_interval

        cap.release()

        # Calculate averages
        if emotions_timeline:
            avg_valence = sum(e.valence for e in emotions_timeline) / len(emotions_timeline)
            avg_arousal = sum(e.arousal for e in emotions_timeline) / len(emotions_timeline)

            # Find most common emotion
            emotion_counts = defaultdict(int)
            for e in emotions_timeline:
                emotion_counts[e.dominant_emotion] += 1
            dominant_emotion = max(emotion_counts, key=emotion_counts.get)
        else:
            avg_valence = 0.0
            avg_arousal = 0.5
            dominant_emotion = "neutral"

        result = EmotionTimeline(
            emotions=emotions_timeline,
            average_valence=round(avg_valence, 3),
            average_arousal=round(avg_arousal, 3),
            dominant_emotion=dominant_emotion,
            video_duration=round(duration, 2),
            analysis_interval=interval
        )

        return result

    except Exception as e:
        raise HTTPException(500, f"Error analyzing video: {str(e)}")
    finally:
        # Clean up temp file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

@router.get("/analysis-status/{task_id}")
async def get_analysis_status(task_id: str):
    """Get the status of an ongoing emotion analysis"""
    # This would connect to a task queue (like Celery) in production
    # For now, returning mock data
    return AnalysisProgress(
        status="processing",
        progress=45,
        current_timestamp=15.5,
        message="Analyzing facial expressions and scene mood..."
    )