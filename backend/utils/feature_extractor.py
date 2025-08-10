
# backend/utils/feature_extractor.py

import cv2
import torch
import torch.nn as nn
import numpy as np
from transformers import CLIPProcessor, CLIPModel
import librosa
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import logging

logger = logging.getLogger(__name__)


class VideoFeatureExtractor:
    """
    Extract semantic, emotion, motion, and scene features from video.
    """

    def __init__(
        self,
        clip_model_name: str = "openai/clip-vit-base-patch32",
        device: torch.device = None,
        target_fps: int = 1,
    ):
        self.device = device or torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.target_fps = target_fps

        # Load CLIP model
        self.clip_model = CLIPModel.from_pretrained(clip_model_name)
        self.clip_processor = CLIPProcessor.from_pretrained(clip_model_name)
        self.clip_model.to(self.device)
        self.clip_model.eval()

        # Emotion categories for CLIP-based emotion detection
        self.emotion_categories = [
            'exciting', 'fearful', 'tense', 'sad', 'relaxing', 'neutral'
        ]

        # Scene change detection threshold
        self.scene_change_threshold = 30.0

        logger.info(f"VideoFeatureExtractor initialized on {self.device}")

    def extract_all_features(
        self,
        video_path: str,
        text_description: str = "",
        max_duration: Optional[float] = None,
    ) -> Dict[str, np.ndarray]:
        """
        Extract all video features for the hybrid model.

        Args:
            video_path: Path to video file
            text_description: Optional text description
            max_duration: Maximum duration to process (seconds)

        Returns:
            Dictionary containing all extracted features
        """
        logger.info(f"Extracting features from video: {video_path}")

        # Load and preprocess video
        frames, fps = self._load_video(video_path, max_duration)

        if len(frames) == 0:
            raise ValueError("No frames extracted from video")

        # Extract different types of features
        features = {
            'semantic': self._extract_semantic_features(frames),
            'emotion': self._extract_emotion_features(frames),
            'motion': self._extract_motion_features(frames),
            'scene_offset': self._extract_scene_offset(frames),
            'text_emotion': self._extract_text_emotion(text_description),
        }

        # Add metadata
        features['metadata'] = {
            'num_frames': len(frames),
            'original_fps': fps,
            'target_fps': self.target_fps,
            'duration': len(frames) / self.target_fps,
        }

        logger.info(f"Feature extraction complete. Shape summary:")
        for key, value in features.items():
            if isinstance(value, np.ndarray):
                logger.info(f"  {key}: {value.shape}")

        return features

    def _load_video(
        self,
        video_path: str,
        max_duration: Optional[float] = None,
    ) -> Tuple[List[np.ndarray], float]:
        """Load video and extract frames at target FPS."""
        cap = cv2.VideoCapture(str(video_path))

        if not cap.isOpened():
            raise ValueError(f"Could not open video: {video_path}")

        # Get video properties
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps

        if max_duration and duration > max_duration:
            total_frames = int(max_duration * fps)

        # Calculate frame interval for target FPS
        frame_interval = max(1, int(fps / self.target_fps))

        frames = []
        frame_count = 0

        while True:
            ret, frame = cap.read()
            if not ret or (max_duration and frame_count >= max_duration * fps):
                break

            if frame_count % frame_interval == 0:
                # Convert BGR to RGB
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frames.append(frame_rgb)

            frame_count += 1

        cap.release()

        logger.info(f"Loaded {len(frames)} frames from video (original FPS: {fps:.2f})")
        return frames, fps

    def _extract_semantic_features(self, frames: List[np.ndarray]) -> np.ndarray:
        """Extract high-level semantic features using CLIP."""
        semantic_features = []

        batch_size = 8  # Process in batches to manage memory

        for i in range(0, len(frames), batch_size):
            batch_frames = frames[i:i + batch_size]

            # Process batch with CLIP
            inputs = self.clip_processor(
                images=batch_frames,
                return_tensors="pt",
                padding=True
            )

            # Move to device
            inputs = {k: v.to(self.device) for k, v in inputs.items()}

            with torch.no_grad():
                image_features = self.clip_model.get_image_features(**inputs)
                semantic_features.append(image_features.cpu().numpy())

        return np.concatenate(semantic_features, axis=0)

    def _extract_emotion_features(self, frames: List[np.ndarray]) -> np.ndarray:
        """Extract emotion probabilities using CLIP."""
        emotion_features = []

        # Create emotion prompts for CLIP
        emotion_prompts = [f"a {emotion} scene" for emotion in self.emotion_categories]

        batch_size = 8

        for i in range(0, len(frames), batch_size):
            batch_frames = frames[i:i + batch_size]

            # Process with CLIP
            inputs = self.clip_processor(
                text=emotion_prompts,
                images=batch_frames,
                return_tensors="pt",
                padding=True
            )

            inputs = {k: v.to(self.device) for k, v in inputs.items()}

            with torch.no_grad():
                outputs = self.clip_model(**inputs)
                # Get probabilities for each image
                logits_per_image = outputs.logits_per_image
                probs = torch.softmax(logits_per_image, dim=-1)
                emotion_features.append(probs.cpu().numpy())

        return np.concatenate(emotion_features, axis=0)

    def _extract_motion_features(self, frames: List[np.ndarray]) -> np.ndarray:
        """Calculate motion intensity between consecutive frames."""
        motion_features = []

        for i in range(len(frames)):
            if i == 0:
                motion_features.append(0.0)  # No motion for first frame
            else:
                # Calculate optical flow magnitude
                prev_gray = cv2.cvtColor(frames[i-1], cv2.COLOR_RGB2GRAY)
                curr_gray = cv2.cvtColor(frames[i], cv2.COLOR_RGB2GRAY)

                # Use Farneback optical flow
                flow = cv2.calcOpticalFlowPyrLK(
                    prev_gray, curr_gray, None, None
                )[0] if len(prev_gray.shape) == 2 else None

                if flow is not None:
                    motion_intensity = np.mean(np.sqrt(flow[..., 0]**2 + flow[..., 1]**2))
                else:
                    # Fallback: simple frame difference
                    diff = np.abs(curr_gray.astype(float) - prev_gray.astype(float))
                    motion_intensity = np.mean(diff)

                motion_features.append(motion_intensity)

        # Normalize motion features
        motion_array = np.array(motion_features)
        if np.max(motion_array) > 0:
            motion_array = motion_array / np.max(motion_array)

        return motion_array

    def _extract_scene_offset(self, frames: List[np.ndarray]) -> np.ndarray:
        """Calculate scene offset based on visual transitions."""
        scene_offsets = []
        scene_id = 0
        offset = 0

        for i in range(len(frames)):
            if i > 0:
                # Calculate frame difference for scene detection
                prev_gray = cv2.cvtColor(frames[i-1], cv2.COLOR_RGB2GRAY)
                curr_gray = cv2.cvtColor(frames[i], cv2.COLOR_RGB2GRAY)

                # Calculate histogram difference
                hist_prev = cv2.calcHist([prev_gray], [0], None, [256], [0, 256])
                hist_curr = cv2.calcHist([curr_gray], [0], None, [256], [0, 256])
                hist_diff = cv2.compareHist(hist_prev, hist_curr, cv2.HISTCMP_CHISQR)

                if hist_diff > self.scene_change_threshold:  # Scene change detected
                    scene_id += 1
                    offset = 0
                else:
                    offset += 1

            scene_offsets.append(offset)

        return np.array(scene_offsets)

    def _extract_text_emotion(self, text_description: str) -> np.ndarray:
        """Extract emotion from user text using keyword matching."""
        if not text_description:
            return np.array([0.5, 0.5])  # Neutral valence and arousal

        # Enhanced keyword-based emotion mapping
        emotion_keywords = {
            # High valence, high arousal
            'excited': (0.9, 0.9), 'energetic': (0.8, 0.8), 'joyful': (0.9, 0.7),
            'thrilling': (0.8, 0.9), 'enthusiastic': (0.8, 0.8),

            # High valence, low arousal
            'happy': (0.8, 0.6), 'peaceful': (0.7, 0.1), 'serene': (0.8, 0.2),
            'content': (0.7, 0.3), 'pleasant': (0.7, 0.4),

            # Low valence, high arousal
            'angry': (0.2, 0.8), 'intense': (0.3, 0.9), 'aggressive': (0.1, 0.8),
            'dramatic': (0.4, 0.8), 'tense': (0.3, 0.7),

            # Low valence, low arousal
            'sad': (0.2, 0.3), 'melancholy': (0.3, 0.4), 'somber': (0.2, 0.2),
            'depressed': (0.1, 0.2), 'gloomy': (0.2, 0.3),

            # Neutral
            'calm': (0.6, 0.2), 'relaxing': (0.6, 0.2), 'neutral': (0.5, 0.5),
        }

        text_lower = text_description.lower()

        # Find best matching emotion
        best_match = None
        best_score = 0

        for keyword, emotion in emotion_keywords.items():
            if keyword in text_lower:
                # Simple scoring based on keyword length (longer = more specific)
                score = len(keyword)
                if score > best_score:
                    best_score = score
                    best_match = emotion

        if best_match:
            return np.array(best_match)
        else:
            # Default to neutral
            return np.array([0.5, 0.5])

