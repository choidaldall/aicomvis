"""Najla cascaded triage inference (age/gender + glasses) with lazy loading."""

import logging
import threading
from typing import Optional

import numpy as np

from app.schemas.clip import TriageInfo

logger = logging.getLogger(__name__)

# Map YOLO classify class name → (age_group, gender)
_CLASS_INFO = {
    "Child":         {"age_group": "child",   "gender": "unknown"},
    "Adult_Male":    {"age_group": "adult",   "gender": "male"},
    "Adult_Female":  {"age_group": "adult",   "gender": "female"},
    "Elderly_Male":  {"age_group": "elderly", "gender": "male"},
    "Elderly_Female":{"age_group": "elderly", "gender": "female"},
}


class TriageInference:
    """
    Lazy-loads Najla age/gender + glasses models only on first use (after fall detected).
    Thread-safe: uses a lock so parallel calls wait rather than double-load.
    """

    def __init__(self, age_gender_model_path: str, glasses_model_path: str,
                 device: Optional[str] = None, enable_glasses: bool = True):
        import torch
        self.age_gender_path = age_gender_model_path
        self.glasses_path = glasses_model_path
        self.enable_glasses = enable_glasses
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")

        self._age_model = None
        self._glasses_model = None
        self._glasses_task: Optional[str] = None
        self._lock = threading.Lock()
        self._loaded = False

    def _ensure_loaded(self) -> None:
        if self._loaded:
            return
        with self._lock:
            if self._loaded:
                return
            from ultralytics import YOLO
            logger.info("Lazy-loading Najla triage models...")
            self._age_model = YOLO(self.age_gender_path)
            if self.enable_glasses:
                self._glasses_model = YOLO(self.glasses_path)
                self._glasses_task = self._glasses_model.task
                logger.info(f"Triage models loaded | glasses_task={self._glasses_task}")
            else:
                logger.info("Triage: glasses model disabled via config")
            self._loaded = True

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def _classify_age_gender(self, crop: np.ndarray) -> Optional[dict]:
        h, w = crop.shape[:2]
        if h < 20 or w < 10:
            return None

        results = self._age_model(crop, device=self.device, verbose=False)
        if not results or results[0].probs is None:
            return None

        probs = results[0].probs
        top1_idx = int(probs.top1)
        top1_conf = float(probs.top1conf)
        class_name = self._age_model.names[top1_idx]

        info = _CLASS_INFO.get(class_name, {"age_group": "unknown", "gender": "unknown"})
        return {**info, "class_name": class_name, "confidence": round(top1_conf, 3)}

    def _classify_glasses(self, crop: np.ndarray) -> bool:
        h, w = crop.shape[:2]
        if h < 20 or w < 10:
            return False

        # Use top 50% of crop (head area)
        head_crop = crop[0:max(int(h * 0.5), 20), :]

        if self._glasses_task == "classify":
            results = self._glasses_model(head_crop, device=self.device, verbose=False)
            if not results or results[0].probs is None:
                return False
            probs = results[0].probs
            names = self._glasses_model.names
            for idx, name in names.items():
                if name.lower() == "glasses":
                    return float(probs.data[idx]) > 0.5
            # fallback: top1
            top1_name = names[int(probs.top1)]
            return "glasses" in top1_name.lower() and "no" not in top1_name.lower()
        else:
            import cv2
            scale = 320 / max(head_crop.shape[:2])
            resized = cv2.resize(head_crop, None, fx=scale, fy=scale)
            results = self._glasses_model(resized, conf=0.45,
                                          device=self.device, verbose=False)
            if results and results[0].boxes is not None:
                for box in results[0].boxes:
                    name = results[0].names.get(int(box.cls[0]), "")
                    if name.lower() == "glasses":
                        return True
            return False

    def run(self, frame: np.ndarray) -> TriageInfo:
        """
        Run triage on full BGR frame.
        Finds the largest person crop and classifies age/gender + glasses.
        Returns TriageInfo (defaults to unknown if no person found).
        """
        self._ensure_loaded()

        # Get person crops via a quick YOLO detect pass
        crops = self._get_person_crops(frame)

        if not crops:
            return TriageInfo()

        # Use the largest crop (most visible person)
        crop = max(crops, key=lambda c: c.shape[0] * c.shape[1])

        age_result = self._classify_age_gender(crop)
        has_glasses = self._classify_glasses(crop) if self.enable_glasses else False

        return TriageInfo(
            age_group=age_result["age_group"] if age_result else "unknown",
            gender=age_result["gender"] if age_result else "unknown",
            glasses=has_glasses,
        )

    def _get_person_crops(self, frame: np.ndarray) -> list:
        """Reuse age_gender model (YOLO classify) for person crops — it's a classifier
        applied to crops, not a detector. Use glasses_model (detect) or a lightweight
        YOLO detect to find person bboxes. Since we only have classify models here,
        we run classify on the full frame as a single "crop"."""
        # Simplification: run on whole frame as single crop.
        # The age/gender YOLO classify model was trained on full-body crops.
        # For single-person scenarios (typical fall detection), this works fine.
        return [frame]
