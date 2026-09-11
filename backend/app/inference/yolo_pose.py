"""YOLO pose extraction wrapper — ported from ~/pifr_lstm/live_ipcam.py FallDetector.extract_pose()."""

import logging
from typing import Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


class YoloPoseExtractor:
    """Extracts normalized keypoints (17, 2) for the highest-confidence person in a frame."""

    def __init__(self, model_path: str, conf_threshold: float = 0.3,
                 device: Optional[str] = None):
        import torch
        from ultralytics import YOLO

        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.conf_threshold = conf_threshold

        logger.info(f"Loading YOLO pose model from {model_path}")
        self.yolo = YOLO(model_path)
        logger.info("YOLO pose model loaded")

    def extract(self, frame: np.ndarray) -> Tuple[Optional[np.ndarray], Optional[tuple], Optional[np.ndarray]]:
        """
        Run YOLO pose on a BGR frame.

        Returns:
            (keypoints_17x2_normalized, bbox_xywh, keypoints_conf_17) for highest-confidence person.
            (None, None, None) if no person detected.
            keypoints_conf is per-keypoint detection confidence — used by closeup filter.
        """
        results = self.yolo(frame, verbose=False, conf=self.conf_threshold)
        if not results or results[0].keypoints is None:
            return None, None, None

        kpts = results[0].keypoints
        if kpts.xyn is None or len(kpts.xyn) == 0:
            return None, None, None

        boxes = results[0].boxes
        if boxes is None or len(boxes) == 0:
            return None, None, None

        confs = boxes.conf.cpu().numpy()
        best_idx = int(np.argmax(confs))

        keypoints_norm = kpts.xyn[best_idx].cpu().numpy()   # (17, 2)
        xywh = boxes.xywh[best_idx].cpu().numpy()            # (cx, cy, w, h)
        bbox = (
            float(xywh[0] - xywh[2] / 2),
            float(xywh[1] - xywh[3] / 2),
            float(xywh[2]),
            float(xywh[3]),
        )

        # Per-keypoint confidence: (N, 17) from kpts.conf
        kpts_conf = None
        if hasattr(kpts, "conf") and kpts.conf is not None:
            kpts_conf = kpts.conf[best_idx].cpu().numpy()    # (17,)

        return keypoints_norm, bbox, kpts_conf

    def extract_tracked(self, frame: np.ndarray) -> list:
        """Multi-person tracked extraction using ByteTrack.

        Returns:
            list of dicts: [{track_id, keypoints (17,2 normalized), bbox (xywh), conf}]
            Empty list if no persons detected.

        Tracker persists IDs across frames (so the same person keeps the same
        track_id frame-to-frame), enabling per-person pose buffer in STGCN.
        """
        results = self.yolo.track(frame, persist=True, verbose=False,
                                   conf=self.conf_threshold, tracker="bytetrack.yaml")
        if not results or results[0].keypoints is None:
            return []
        r = results[0]
        if r.boxes is None or r.boxes.id is None or len(r.boxes) == 0:
            return []
        if r.keypoints.xyn is None or len(r.keypoints.xyn) == 0:
            return []

        track_ids = r.boxes.id.cpu().numpy().astype(int)
        xywhs = r.boxes.xywh.cpu().numpy()
        confs = r.boxes.conf.cpu().numpy()
        kpts_xyn = r.keypoints.xyn.cpu().numpy()
        kpts_conf = r.keypoints.conf.cpu().numpy() if r.keypoints.conf is not None else None

        out = []
        for i, tid in enumerate(track_ids):
            xywh = xywhs[i]
            bbox = (
                float(xywh[0] - xywh[2] / 2),
                float(xywh[1] - xywh[3] / 2),
                float(xywh[2]),
                float(xywh[3]),
            )
            out.append({
                "track_id": int(tid),
                "keypoints": kpts_xyn[i],
                "bbox": bbox,
                "conf": float(confs[i]),
                "kpts_conf": kpts_conf[i] if kpts_conf is not None else None,
            })
        return out

    def extract_all_crops(self, frame: np.ndarray) -> list:
        """
        Return list of person crops (BGR) for triage inference.
        Used by TriageInference after fall detected.
        """
        results = self.yolo(frame, verbose=False, conf=self.conf_threshold)
        if not results or results[0].boxes is None:
            return []

        crops = []
        h, w = frame.shape[:2]
        for box in results[0].boxes:
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(w, x2), min(h, y2)
            if (x2 - x1) >= 20 and (y2 - y1) >= 20:
                crops.append(frame[y1:y2, x1:x2].copy())

        return crops
