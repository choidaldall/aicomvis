"""
Inference orchestration pipeline.

Frame → YOLO pose → ST-GCN++ ensemble → hybrid decision → (on fall) triage → event.
Designed to run in a background thread; push results via asyncio Queue.
"""

import asyncio
import logging
import threading
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime
from typing import Callable, Deque, List, Optional

import numpy as np

from app.config import settings
from app.inference.stgcn_fall import STGCNFallClassifier
from app.inference.triage import TriageInference
from app.inference.yolo_pose import YoloPoseExtractor
from app.schemas.clip import TriageInfo

logger = logging.getLogger(__name__)


@dataclass
class FrameData:
    frame: np.ndarray
    timestamp: datetime
    frame_id: int


@dataclass
class PersonResult:
    track_id: int
    probability: float
    velocity: float
    is_fall: bool
    warmup_progress: float
    bbox: Optional[tuple] = None    # (x, y, w, h) in pixels


@dataclass
class InferenceResult:
    timestamp: datetime
    probability: float                  # max prob across all tracked persons
    velocity: float                     # velocity of the "leading" person (highest prob)
    is_fall: bool                       # True if ANY tracked person fell
    person_detected: bool               # True if at least 1 person tracked
    warmed_up: bool
    warmup_progress: float
    triage: Optional[TriageInfo] = None
    persons: list = field(default_factory=list)   # list[PersonResult]
    n_persons: int = 0


class VelocityTracker:
    """Tracks vertical hip velocity + bbox aspect ratio change (ported from live_ipcam.py)."""

    def __init__(self, velocity_threshold: float = 0.15,
                 ratio_change_threshold: float = 0.3,
                 history_seconds: float = 1.0,
                 max_gap_seconds: float = 1.0):
        self.velocity_threshold = velocity_threshold
        self.ratio_change_threshold = ratio_change_threshold
        self.history_seconds = history_seconds
        self.max_gap_seconds = max_gap_seconds
        self.position_history: Deque = deque(maxlen=30)
        self.bbox_history: Deque = deque(maxlen=30)

    def reset(self) -> None:
        self.position_history.clear()
        self.bbox_history.clear()

    def _gap_reset(self, history: deque, timestamp: datetime, label: str) -> None:
        if not history:
            return
        gap = (timestamp - history[-1][-1]).total_seconds()
        if gap > self.max_gap_seconds:
            history.clear()
            logger.debug(f"VelocityTracker {label} gap {gap:.1f}s, reset")

    def update(self, keypoints: Optional[np.ndarray], bbox: Optional[tuple],
               frame_h: int, timestamp: datetime) -> None:
        self._gap_reset(self.position_history, timestamp, "pos")
        self._gap_reset(self.bbox_history, timestamp, "bbox")

        if keypoints is not None and keypoints.shape == (17, 2):
            left_hip_y = keypoints[11][1]
            right_hip_y = keypoints[12][1]
            y_center = (left_hip_y + right_hip_y) / 2
            if y_center < 1.0 and bbox:
                y_center = (bbox[1] + bbox[3] / 2) / frame_h
            elif y_center >= 1.0:
                y_center = y_center / frame_h
            self.position_history.append((y_center, timestamp))

        if bbox:
            self.bbox_history.append((bbox[2], bbox[3], timestamp))

    @property
    def vertical_velocity(self) -> float:
        if len(self.position_history) < 2:
            return 0.0
        now = self.position_history[-1][1]
        samples = [p for p in self.position_history
                   if (now - p[1]).total_seconds() <= self.history_seconds]
        if len(samples) < 2:
            return 0.0
        if len(samples) < 3:
            y_old, t_old = samples[0]
            y_new, t_new = samples[-1]
            dt = (t_new - t_old).total_seconds()
            return (y_new - y_old) / dt if dt > 0 else 0.0

        velocities = []
        for i in range(len(samples) - 1):
            y_a, t_a = samples[i]
            y_b, t_b = samples[i + 1]
            dt = (t_b - t_a).total_seconds()
            if dt > 0:
                velocities.append((y_b - y_a) / dt)
        return float(np.median(velocities)) if velocities else 0.0

    @property
    def bbox_ratio_change(self) -> float:
        if len(self.bbox_history) < 2:
            return 0.0
        now = self.bbox_history[-1][2]
        samples = [b for b in self.bbox_history
                   if (now - b[2]).total_seconds() <= self.history_seconds]
        if len(samples) < 2:
            return 0.0
        w_old, h_old, _ = samples[0]
        w_new, h_new, _ = samples[-1]
        if h_old <= 0 or h_new <= 0:
            return 0.0
        return abs(w_new / h_new - w_old / h_old)

    @property
    def is_falling_motion(self) -> bool:
        return (self.vertical_velocity > self.velocity_threshold
                or self.bbox_ratio_change > self.ratio_change_threshold)

    @property
    def current_aspect_ratio(self) -> float:
        """Latest bbox height/width ratio. >1 = vertical (standing), <1 = horizontal (lying).
        Used by P2 Lying Confirmation filter."""
        if not self.bbox_history:
            return 0.0
        w, h, _ = self.bbox_history[-1]
        if w <= 0:
            return 0.0
        return float(h / w)

    @property
    def peak_instantaneous_velocity(self) -> float:
        """Max |Δy/Δt| over recent history (NO median smoothing).

        Captures impulse moments (impact = high instantaneous velocity).
        Use this for impact-detecting filters where the smoothed median
        underestimates the peak of a brief fall event.
        """
        if len(self.position_history) < 2:
            return 0.0
        now = self.position_history[-1][1]
        samples = [p for p in self.position_history
                   if (now - p[1]).total_seconds() <= self.history_seconds]
        if len(samples) < 2:
            return 0.0
        peak = 0.0
        for i in range(len(samples) - 1):
            y_a, t_a = samples[i]
            y_b, t_b = samples[i + 1]
            dt = (t_b - t_a).total_seconds()
            if dt > 0:
                v = abs((y_b - y_a) / dt)
                if v > peak:
                    peak = v
        return float(peak)


class InferencePipeline:
    """
    Main inference orchestration.

    Usage:
        pipeline = InferencePipeline(yolo, fall_clf, triage)
        pipeline.start(on_result_callback)
        pipeline.push_frame(frame_data)
        pipeline.stop()
    """

    def __init__(self, yolo: YoloPoseExtractor,
                 fall_clf: STGCNFallClassifier,
                 triage: TriageInference):
        self.yolo = yolo
        self.fall_clf = fall_clf
        self.triage = triage

        self.velocity_tracker = VelocityTracker(
            velocity_threshold=settings.velocity_threshold,
        )
        # Per-track velocity trackers (multi-person)
        self._vel_trackers_by_id: dict[int, VelocityTracker] = {}
        self._last_seen_by_id: dict[int, datetime] = {}
        self._stale_track_seconds: float = 5.0

        self._frame_queue: deque = deque(maxlen=4)   # drop-old policy
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._on_result: Optional[Callable[[InferenceResult], None]] = None

        self.latest_result: Optional[InferenceResult] = None

    def start(self, on_result: Callable[[InferenceResult], None]) -> None:
        self._on_result = on_result
        self._running = True
        self._thread = threading.Thread(target=self._loop, daemon=True,
                                        name="inference-pipeline")
        self._thread.start()
        logger.info("InferencePipeline started")

    def push_frame(self, fd: FrameData) -> None:
        """Non-blocking. Drops oldest if queue full (always real-time)."""
        if len(self._frame_queue) >= 4:
            self._frame_queue.popleft()
        self._frame_queue.append(fd)

    def stop(self) -> None:
        self._running = False
        if self._thread:
            self._thread.join(timeout=5)

    def reset_buffers(self) -> None:
        self.fall_clf.reset_buffer()
        self.velocity_tracker.reset()

    def _loop(self) -> None:
        import time
        while self._running:
            if not self._frame_queue:
                time.sleep(0.01)
                continue

            fd: FrameData = self._frame_queue.popleft()
            try:
                result = self._process(fd)
                self.latest_result = result
                if self._on_result:
                    self._on_result(result)
            except Exception as exc:
                logger.error(f"InferencePipeline error: {exc}", exc_info=True)

    def _prune_stale_velocity_trackers(self, now: datetime) -> None:
        stale = [tid for tid, ts in self._last_seen_by_id.items()
                 if (now - ts).total_seconds() > self._stale_track_seconds]
        for tid in stale:
            self._vel_trackers_by_id.pop(tid, None)
            self._last_seen_by_id.pop(tid, None)

    def _process(self, fd: FrameData) -> InferenceResult:
        persons_raw = self.yolo.extract_tracked(fd.frame)
        person_detected = len(persons_raw) > 0

        # Per-track STGCN forward
        probs_by_id = self.fall_clf.predict_multi(persons_raw, fd.timestamp)

        # Per-track velocity + decision
        self._prune_stale_velocity_trackers(fd.timestamp)
        person_results: list[PersonResult] = []
        for p in persons_raw:
            tid = int(p["track_id"])
            kp = p["keypoints"]
            bbox = p["bbox"]

            vt = self._vel_trackers_by_id.setdefault(
                tid, VelocityTracker(velocity_threshold=settings.velocity_threshold)
            )
            vt.update(kp, bbox, fd.frame.shape[0], fd.timestamp)
            self._last_seen_by_id[tid] = fd.timestamp

            prob = float(probs_by_id.get(tid, 0.0))
            warmup = self.fall_clf.warmup_progress_for(tid)
            warmed_up_tid = warmup >= 1.0

            if not warmed_up_tid:
                is_fall_tid = False
            elif prob >= settings.high_confidence_threshold:
                is_fall_tid = True
            else:
                is_fall_tid = prob > settings.fall_threshold

            person_results.append(PersonResult(
                track_id=tid,
                probability=prob,
                velocity=vt.vertical_velocity,
                is_fall=is_fall_tid,
                warmup_progress=warmup,
                bbox=bbox,
            ))

        # Aggregate for backward-compatible fields
        if person_results:
            leader = max(person_results, key=lambda r: r.probability)
            agg_prob = leader.probability
            agg_vel = leader.velocity
            agg_warmup = leader.warmup_progress
            agg_warmed_up = agg_warmup >= 1.0
        else:
            agg_prob = 0.0
            agg_vel = 0.0
            agg_warmup = 0.0
            agg_warmed_up = False

        any_fall = any(r.is_fall for r in person_results)

        triage_info: Optional[TriageInfo] = None
        if any_fall:
            try:
                triage_info = self.triage.run(fd.frame)
            except Exception as exc:
                logger.warning(f"Triage failed: {exc}")
                triage_info = TriageInfo()

        return InferenceResult(
            timestamp=fd.timestamp,
            probability=agg_prob,
            velocity=agg_vel,
            is_fall=any_fall,
            person_detected=person_detected,
            warmed_up=agg_warmed_up,
            warmup_progress=agg_warmup,
            triage=triage_info,
            persons=person_results,
            n_persons=len(person_results),
        )
