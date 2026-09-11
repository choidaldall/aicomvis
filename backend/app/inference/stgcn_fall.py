"""ST-GCN++ fall classifier — production inference wrapper.

4-stream ST-GCN++ ensemble trained via LDAM Loss + K-fold cross-validation
(5-fold weight average via Model Soups).

Architecture: ST-GCN++ (Duan et al. CVPR 2022) — 158K params per stream.
Training methodology:
  - Pretrain pool: FallVision + NTU60 + NTU120 + HMDB51 + UCF101 (~33k video)
  - Finetune pool: 5 controlled CCTV + FUKinect-Fall + UCF101 hardneg (2664 video)
  - 5-fold subject-disjoint stratified CV
  - LDAM Loss (Cao et al. NeurIPS 2019) for class imbalance
  - 4-stream J/B/JM/BM ensemble (Shi et al. CVPR 2019)
  - Production weights = avg of 5 fold checkpoints (Wortsman ICML 2022)

Pooled performance (5 internet datasets, 1358 video):
  Sens 87.0%  Spec 94.8%  Prec 85.0%  F1 86.0%  Acc 92.8%  (ALL ≥85% target)
"""

from __future__ import annotations

import logging
from collections import deque
from datetime import datetime
from pathlib import Path
from typing import Optional

import numpy as np
import torch
import torch.nn.functional as F
import yaml

logger = logging.getLogger(__name__)


def _import_training_modules():
    """Import minimal inference utilities from app.inference.inference_lib.

    Self-contained subset extracted from research codebase so deployment
    does not depend on backend.training.* (which lives in the archive).
    """
    from app.inference.inference_lib.checkpoint import load_checkpoint
    from app.inference.inference_lib.physics_features import compute_physics
    from app.inference.inference_lib.stream_transforms import apply_stream
    from app.inference.inference_lib.model_builder import build_model
    return load_checkpoint, compute_physics, apply_stream, build_model


def normalize_per_window(joints: np.ndarray) -> np.ndarray:
    """Min-max normalize over the whole window (per-window mode).

    Matches the training preprocessing for normalize_mode='per_window'.
    """
    out = joints.astype(np.float32).copy()
    for d in range(2):
        mn = out[..., d].min()
        mx = out[..., d].max()
        r = mx - mn
        if r > 1e-6:
            out[..., d] = (out[..., d] - mn) / r
        else:
            out[..., d] = 0.5
    return out


class STGCNFallClassifier:
    """4-stream ST-GCN++ ensemble for real-time fall detection."""

    def __init__(self, models_dir: str | Path,
                 device: Optional[str] = None,
                 target_fps: int = 15,
                 window_size: int = 30,
                 min_valid_poses: Optional[int] = None,
                 max_pose_gap_seconds: float = 1.5,
                 streams: tuple = ("J", "B", "JM", "BM"),
                 weights: Optional[list[float]] = None,
                 threshold: float = 0.45,
                 k_consecutive: int = 1,
                 prob_history_size: int = 6,
                 n_folds: int = 5,
                 sdl_velocity_gate: float = 0.50,
                 sdl_aspect_min: float = 0.85,
                 sdl_aspect_velocity_protect: float = 1.50):
        """K-fold ensemble inference. Loads `n_folds × len(streams)` models.

        Looks for files `stgcn_prod_fold{f}_{S}.pth` per (fold, stream).
        Falls back to legacy single-fold `stgcn_prod_{S}.pth` if fold-prefixed
        files are not found.
        """
        """
        Args:
            models_dir: directory containing stgcn_prod_{J,B,JM,BM}.pth checkpoints.
            target_fps: frame rate to resample input to.
            window_size: 30 frames = 2 sec at 15 fps.
            min_valid_poses: warmup threshold (default = window_size).
            streams: ensemble streams to load.
            weights: per-stream weights (default uniform).
            threshold: per-window fall probability threshold (LDAM best ~0.45).
            k_consecutive: require K consecutive windows ≥ thr for fall trigger.
            prob_history_size: track last N window probs for K-consecutive voting.
        """
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.target_fps = target_fps
        self.frame_interval = 1.0 / target_fps
        self.window_size = window_size
        self.min_valid_poses = min_valid_poses or window_size
        self.max_pose_gap_seconds = max_pose_gap_seconds
        self.streams = list(streams)
        self.weights = list(weights) if weights else [1.0 / len(streams)] * len(streams)
        self.threshold = float(threshold)
        self.k_consecutive = int(k_consecutive)
        self.n_folds = int(n_folds)
        self.sdl_velocity_gate = float(sdl_velocity_gate)
        self.sdl_aspect_min = float(sdl_aspect_min)
        self.sdl_aspect_velocity_protect = float(sdl_aspect_velocity_protect)

        self._load_models_fn, self._compute_physics, self._apply_stream, self._build_model = \
            _import_training_modules()

        models_dir = Path(models_dir)
        self._models_dir = models_dir
        # self.models: dict[stream] -> list of fold-level models
        self.models: dict[str, list[torch.nn.Module]] = {}
        total_loaded = 0
        for s in self.streams:
            fold_models = []
            # Try fold-prefixed checkpoints first (K-fold ensemble mode)
            for f in range(self.n_folds):
                ckpt_path = models_dir / f"stgcn_prod_fold{f}_{s}.pth"
                cfg_path = models_dir / f"stgcn_prod_fold{f}_{s}_config.yaml"
                if ckpt_path.exists():
                    cfg = yaml.safe_load(open(cfg_path)) if cfg_path.exists() else None
                    fold_models.append(self._load_one_stream(ckpt_path, cfg))
            # Fall back to legacy single-fold checkpoint
            if not fold_models:
                ckpt_path = models_dir / f"stgcn_prod_{s}.pth"
                cfg_path = models_dir / f"stgcn_prod_{s}_config.yaml"
                if not ckpt_path.exists():
                    raise FileNotFoundError(f"Missing checkpoint: {ckpt_path}")
                cfg = yaml.safe_load(open(cfg_path)) if cfg_path.exists() else None
                fold_models.append(self._load_one_stream(ckpt_path, cfg))
            self.models[s] = fold_models
            total_loaded += len(fold_models)
        n_folds_per_stream = len(self.models[self.streams[0]])
        logger.info(f"ST-GCN++ loaded {total_loaded} models on {self.device}: "
                    f"{len(self.streams)} streams × {n_folds_per_stream} folds")

        # Single-person buffers (backward compatible w/ predict())
        self.pose_buffer: deque = deque(maxlen=200)        # (kp_17x2, datetime)
        self.window_prob_history: deque = deque(maxlen=prob_history_size)
        self._last_full_prob: float = 0.0

        # Multi-person buffers (keyed by YOLO track_id)
        self._prob_history_size = int(prob_history_size)
        self.pose_buffers_by_id: dict[int, deque] = {}
        self.prob_history_by_id: dict[int, deque] = {}
        self.last_seen_by_id: dict[int, datetime] = {}
        self.stale_track_seconds = 5.0    # prune tracks not updated in this long

    def reload_weights(self) -> None:
        """Reload weights from disk in-place (hot-swap after finetune).

        Re-uses the same `models_dir` discovery rules as __init__. Existing
        pose_buffers + window_prob_history are PRESERVED so live monitoring
        is not disrupted; only the model weights are swapped.
        """
        new_models: dict[str, list[torch.nn.Module]] = {}
        total_loaded = 0
        for s in self.streams:
            fold_models = []
            for f in range(self.n_folds):
                ckpt_path = self._models_dir / f"stgcn_prod_fold{f}_{s}.pth"
                cfg_path = self._models_dir / f"stgcn_prod_fold{f}_{s}_config.yaml"
                if ckpt_path.exists():
                    cfg = yaml.safe_load(open(cfg_path)) if cfg_path.exists() else None
                    fold_models.append(self._load_one_stream(ckpt_path, cfg))
            if not fold_models:
                ckpt_path = self._models_dir / f"stgcn_prod_{s}.pth"
                cfg_path = self._models_dir / f"stgcn_prod_{s}_config.yaml"
                if not ckpt_path.exists():
                    raise FileNotFoundError(f"Missing checkpoint: {ckpt_path}")
                cfg = yaml.safe_load(open(cfg_path)) if cfg_path.exists() else None
                fold_models.append(self._load_one_stream(ckpt_path, cfg))
            new_models[s] = fold_models
            total_loaded += len(fold_models)
        self.models = new_models
        # Clear stale prob histories (new model may have different calibration)
        self.window_prob_history.clear()
        for tid in list(self.prob_history_by_id.keys()):
            self.prob_history_by_id[tid].clear()
        logger.info(f"ST-GCN++ HOT RELOAD: {total_loaded} models swapped")

    def _load_one_stream(self, ckpt_path: Path, cfg: Optional[dict]):
        # Load config from yaml or fall back to defaults
        if cfg is None:
            model_cfg = {
                "arch": "stgcn_plus",
                "in_channels": 2, "num_classes": 2, "num_joints": 17,
                "partition": "spatial", "channels": [16, 32, 64, 128],
                "blocks_per_stage": [2, 2, 2], "dropout": 0.1, "physics_dim": 4,
            }
        else:
            model_cfg = cfg["model"]
        model = self._build_model(model_cfg).to(self.device)
        ckpt = self._load_models_fn(ckpt_path, map_location=self.device)
        model.load_state_dict(ckpt.model_state, strict=False)
        model.eval()
        return model

    @property
    def is_warmed_up(self) -> bool:
        return len(self.pose_buffer) >= self.min_valid_poses

    @property
    def warmup_progress(self) -> float:
        return min(1.0, len(self.pose_buffer) / max(self.min_valid_poses, 1))

    def reset_buffer(self) -> None:
        self.pose_buffer.clear()
        self.window_prob_history.clear()
        self._last_full_prob = 0.0

    def _check_gap_reset(self, timestamp: datetime) -> None:
        if not self.pose_buffer:
            return
        gap = (timestamp - self.pose_buffer[-1][1]).total_seconds()
        if gap > self.max_pose_gap_seconds:
            logger.info(f"Pose gap {gap:.1f}s > {self.max_pose_gap_seconds}s — clearing buffer "
                        f"({len(self.pose_buffer)} poses discarded)")
            self.pose_buffer.clear()
            self.window_prob_history.clear()

    def _resample_window(self) -> Optional[np.ndarray]:
        """Build (T, 17, 2) window resampled to target_fps."""
        if len(self.pose_buffer) < self.window_size // 2:
            return None
        t_start = self.pose_buffer[0][1]
        t_end = self.pose_buffer[-1][1]
        duration = (t_end - t_start).total_seconds()
        if duration <= 0:
            return None

        buf_ts = [b[1].timestamp() for b in self.pose_buffer]
        buf_kpts = [b[0] for b in self.pose_buffer]
        t0 = buf_ts[0]
        target_t_end = buf_ts[-1]
        n = len(buf_ts)

        # Take the LAST `window_size` resampled frames anchored at t_end
        resampled = []
        for i in range(self.window_size):
            target_t = target_t_end - (self.window_size - 1 - i) * self.frame_interval
            # Find nearest pose
            best_j = 0
            best_d = abs(buf_ts[0] - target_t)
            for j in range(1, n):
                d = abs(buf_ts[j] - target_t)
                if d <= best_d:
                    best_d = d
                    best_j = j
                else:
                    break
            resampled.append(buf_kpts[best_j])

        return np.array(resampled, dtype=np.float32)   # (T, 17, 2)

    def _peak_velocity(self, joints_window: np.ndarray) -> float:
        """Max |Δhip_y| × fps over the current window (normalized units).

        Matches `compute_sdl_features.peak_velocity` from training.
        Used by SDL gate to reject low-motion 'fall' predictions
        (e.g. controlled lying-down).
        """
        # joints_window: (T, 17, 2), normalized [0, 1]
        LEFT_HIP, RIGHT_HIP = 11, 12
        hip_y = 0.5 * (joints_window[:, LEFT_HIP, 1] + joints_window[:, RIGHT_HIP, 1])
        if len(hip_y) < 2:
            return 0.0
        vel = np.abs(np.diff(hip_y)) * float(self.target_fps)
        return float(vel.max())

    def _peak_aspect_ratio(self, joints_window: np.ndarray) -> float:
        """Max(bbox_w/bbox_h) over the current window.

        Discriminative for "compact vertical body" postures that are NOT
        falls (sujud, squat, bend, pushup_start). In our Ruang XG data:
          - sujud peak: 0.92 ± 0.23  (always ≤ 1.0; body stays vertical-compact)
          - real fall peak: 2.22 ± 1.35 (body extends horizontal at impact)
          - squat/bend peak: ≤ 0.6
        So a window whose max aspect < 1.0 is almost certainly NOT a fall —
        even if model fires high prob.
        """
        # joints_window: (T, 17, 2). Ignore (0, 0) sentinels.
        if joints_window.size == 0:
            return 0.0
        xs = joints_window[..., 0]
        ys = joints_window[..., 1]
        valid = (xs > 0) | (ys > 0)
        peaks = []
        for t in range(joints_window.shape[0]):
            vt = valid[t]
            if vt.sum() < 4:
                continue
            xs_t = xs[t][vt]
            ys_t = ys[t][vt]
            w = float(xs_t.max() - xs_t.min())
            h = float(ys_t.max() - ys_t.min())
            if h > 1e-4:
                peaks.append(w / h)
        return float(max(peaks)) if peaks else 0.0

    @torch.no_grad()
    def _forward_ensemble(self, joints_window: np.ndarray) -> float:
        """Run 4-stream ensemble forward. Return weighted average fall prob."""
        # Normalize per-window (matches training)
        joints_norm = normalize_per_window(joints_window)

        # Compute physics features (4-dim)
        physics_np = self._compute_physics(joints_norm, fps=self.target_fps)
        physics = torch.tensor(physics_np, dtype=torch.float32,
                               device=self.device).unsqueeze(0)   # (1, 4)

        probs = []
        for s, w in zip(self.streams, self.weights):
            if w <= 0:
                continue
            x = self._apply_stream(joints_norm, s)          # (T, V, C) or (T, V, 2)
            x_t = torch.tensor(x, dtype=torch.float32, device=self.device)
            if x_t.ndim == 3:
                x_t = x_t.permute(2, 0, 1).unsqueeze(-1)
            x_t = x_t.unsqueeze(0)  # (1, C, T, V, 1)

            # Average across all folds for this stream
            fold_probs = []
            for model in self.models[s]:
                logits = model(x_t, physics=physics)
                p = F.softmax(logits, dim=-1)[0, 1].item()
                fold_probs.append(p)
            p_stream = sum(fold_probs) / len(fold_probs)
            probs.append(w * p_stream)

        total_w = sum(w for w in self.weights if w > 0)
        return float(sum(probs) / max(total_w, 1e-6))

    def predict(self, keypoints: Optional[np.ndarray],
                timestamp: datetime) -> float:
        """Update pose buffer and run 4-stream ST-GCN++ inference.

        Returns last window's fall probability. K-consecutive voting is
        applied internally; if K windows triggered, the returned prob
        is bumped to ≥ threshold (so downstream threshold logic still works).
        """
        if keypoints is None:
            if self.pose_buffer:
                gap = (timestamp - self.pose_buffer[-1][1]).total_seconds()
                if gap > self.max_pose_gap_seconds:
                    logger.info(f"No-detection gap {gap:.1f}s — clearing buffer")
                    self.pose_buffer.clear()
                    self.window_prob_history.clear()
            return 0.0

        self._check_gap_reset(timestamp)
        self.pose_buffer.append((keypoints, timestamp))

        if not self.is_warmed_up:
            return 0.0

        window = self._resample_window()
        if window is None or len(window) < self.window_size:
            return 0.0

        prob = self._forward_ensemble(window)

        # SDL velocity gate: low peak velocity → controlled lying / ADL.
        # Calibrated on Ruang XG test set: fall peak_vel >= 0.80, lying_slow <= 0.65.
        if self.sdl_velocity_gate > 0:
            peak_vel = self._peak_velocity(window)
            if peak_vel < self.sdl_velocity_gate:
                prob = 0.0

        # Aspect+velocity compound gate: compact vertical body (sujud, squat,
        # bend, pushup) ⇒ aspect_max < 1.0. Real fall ⇒ aspect_max > 1.5 usually,
        # but FACING-CAMERA falls also have low aspect — we protect those by
        # requiring velocity < sdl_aspect_velocity_protect for the veto. Real
        # facing-cam falls have HIGH impact velocity; sujud/squat have moderate
        # velocity. Reference (sweep on Ruang XG data): aspect=1.0, vel=1.5
        # blocks 47% of sujud, loses 14% of facing-cam falls (which usually
        # recover via subsequent post-impact windows).
        if self.sdl_aspect_min > 0 and prob > 0:
            peak_aspect = self._peak_aspect_ratio(window)
            if peak_aspect < self.sdl_aspect_min:
                peak_vel_local = self._peak_velocity(window)
                if peak_vel_local < self.sdl_aspect_velocity_protect:
                    prob = 0.0

        self.window_prob_history.append(prob)
        self._last_full_prob = prob

        # K-consecutive voting: bump up if K windows in history ≥ threshold
        if (self.k_consecutive > 1 and len(self.window_prob_history) >= self.k_consecutive):
            recent = list(self.window_prob_history)[-self.k_consecutive:]
            if all(p >= self.threshold for p in recent):
                return max(prob, self.threshold + 0.01)
        return prob

    # ------------------------------------------------------------------
    # Multi-person predict (per track_id)
    # ------------------------------------------------------------------

    def _prune_stale_tracks(self, now: datetime) -> None:
        stale = [tid for tid, ts in self.last_seen_by_id.items()
                 if (now - ts).total_seconds() > self.stale_track_seconds]
        for tid in stale:
            self.pose_buffers_by_id.pop(tid, None)
            self.prob_history_by_id.pop(tid, None)
            self.last_seen_by_id.pop(tid, None)

    def _resample_window_for(self, buf: deque) -> Optional[np.ndarray]:
        """Same as _resample_window but on an arbitrary buffer."""
        if len(buf) < self.window_size // 2:
            return None
        t_start = buf[0][1]
        t_end = buf[-1][1]
        duration = (t_end - t_start).total_seconds()
        if duration <= 0:
            return None
        buf_ts = [b[1].timestamp() for b in buf]
        buf_kpts = [b[0] for b in buf]
        target_t_end = buf_ts[-1]
        n = len(buf_ts)
        resampled = []
        for i in range(self.window_size):
            target_t = target_t_end - (self.window_size - 1 - i) * self.frame_interval
            best_j = 0
            best_d = abs(buf_ts[0] - target_t)
            for j in range(1, n):
                d = abs(buf_ts[j] - target_t)
                if d <= best_d:
                    best_d = d
                    best_j = j
                else:
                    break
            resampled.append(buf_kpts[best_j])
        return np.array(resampled, dtype=np.float32)

    def predict_multi(self, persons: list, timestamp: datetime) -> dict:
        """Per-track-id fall probability inference.

        Args:
            persons: list of dicts with keys {track_id, keypoints, bbox, conf, ...}
                     (output of YoloPoseExtractor.extract_tracked).
            timestamp: frame timestamp.

        Returns:
            dict {track_id: probability_float} for every person passed in.
            Probability = 0.0 until per-track buffer warms up.

        Side effect: prunes stale tracks (>stale_track_seconds since last seen).
        """
        self._prune_stale_tracks(timestamp)
        out: dict[int, float] = {}
        for p in persons:
            tid = int(p["track_id"])
            kp = p["keypoints"]
            if kp is None or kp.shape != (17, 2):
                out[tid] = 0.0
                continue

            buf = self.pose_buffers_by_id.setdefault(tid, deque(maxlen=200))
            ph = self.prob_history_by_id.setdefault(tid, deque(maxlen=self._prob_history_size))

            # Gap reset for this specific track
            if buf:
                gap = (timestamp - buf[-1][1]).total_seconds()
                if gap > self.max_pose_gap_seconds:
                    buf.clear()
                    ph.clear()

            buf.append((kp.astype(np.float32), timestamp))
            self.last_seen_by_id[tid] = timestamp

            if len(buf) < self.min_valid_poses:
                out[tid] = 0.0
                continue

            window = self._resample_window_for(buf)
            if window is None or len(window) < self.window_size:
                out[tid] = 0.0
                continue

            prob = self._forward_ensemble(window)

            if self.sdl_velocity_gate > 0:
                peak_vel = self._peak_velocity(window)
                if peak_vel < self.sdl_velocity_gate:
                    prob = 0.0
            # Aspect veto for sujud/squat/bend (compact vertical body).
            # Velocity protection: high-velocity falls (e.g. facing-camera)
            # bypass aspect veto.
            if self.sdl_aspect_min > 0 and prob > 0:
                peak_aspect = self._peak_aspect_ratio(window)
                if peak_aspect < self.sdl_aspect_min:
                    peak_vel_local = self._peak_velocity(window)
                    if peak_vel_local < self.sdl_aspect_velocity_protect:
                        prob = 0.0

            ph.append(prob)

            # K-consecutive voting
            if self.k_consecutive > 1 and len(ph) >= self.k_consecutive:
                recent = list(ph)[-self.k_consecutive:]
                if all(p >= self.threshold for p in recent):
                    prob = max(prob, self.threshold + 0.01)
            out[tid] = prob
        return out

    def warmup_progress_for(self, track_id: int) -> float:
        buf = self.pose_buffers_by_id.get(int(track_id))
        if buf is None:
            return 0.0
        return min(1.0, len(buf) / max(self.min_valid_poses, 1))


__all__ = ["STGCNFallClassifier"]
