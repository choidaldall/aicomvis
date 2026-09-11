"""Physics features per window for fall vs controlled-lying discrimination (M4).

Computes 4-dim global feature vector per window:
  1. peak_velocity_hip       — max ||Δhip|| per frame
  2. accel_max               — max ||Δv_hip|| (jerk-like impulse signal)
  3. aspect_ratio_max_change — max bbox W/H change over window
  4. hip_drop_rate           — vertical hip displacement per second (positive = falling)

These are global motion descriptors that ST-GCN graph conv (per-window-step) struggles
to capture. Concat to ST-GCN++ embedding before classifier (M4 mitigation).

Robust to per-frame min-max normalized input (features are relative).
"""

from __future__ import annotations

import numpy as np

L_HIP = 11
R_HIP = 12


def hip_center(joints: np.ndarray) -> np.ndarray:
    """(T, V, 2) -> (T, 2). Midpoint of left and right hip."""
    return 0.5 * (joints[:, L_HIP, :] + joints[:, R_HIP, :])


def bbox_per_frame(joints: np.ndarray) -> np.ndarray:
    """(T, V, 2) -> (T, 4) array of (x_min, y_min, x_max, y_max)."""
    xs = joints[..., 0]
    ys = joints[..., 1]
    x_min = xs.min(axis=-1)
    x_max = xs.max(axis=-1)
    y_min = ys.min(axis=-1)
    y_max = ys.max(axis=-1)
    return np.stack([x_min, y_min, x_max, y_max], axis=-1)


def aspect_ratio(joints: np.ndarray, eps: float = 1e-6) -> np.ndarray:
    """(T, V, 2) -> (T,) bbox W/H per frame."""
    bbox = bbox_per_frame(joints)
    w = bbox[:, 2] - bbox[:, 0]
    h = bbox[:, 3] - bbox[:, 1]
    return w / (h + eps)


def compute_physics(joints: np.ndarray, fps: float = 15.0) -> np.ndarray:
    """Compute 4-dim physics feature for a single window.

    Args:
        joints: (T, V, 2) keypoint array, normalized or raw
        fps: frame rate for time-scale conversion
    Returns:
        (4,) float32 array: [peak_vel, accel_max, aspect_change_rate, hip_drop_rate]
    """
    T = joints.shape[0]
    if T < 3:
        return np.zeros(4, dtype=np.float32)

    hip = hip_center(joints)
    vel = np.linalg.norm(np.diff(hip, axis=0), axis=-1)
    peak_vel = float(vel.max()) * fps

    accel = np.diff(vel, axis=0)
    accel_max = float(np.abs(accel).max()) * (fps ** 2) if accel.size > 0 else 0.0

    ar = aspect_ratio(joints)
    ar_diff = np.abs(np.diff(ar, axis=0))
    aspect_change_rate = float(ar_diff.max()) * fps if ar_diff.size > 0 else 0.0

    hip_y = hip[:, 1]
    hip_y_drop = hip_y[-1] - hip_y[0]
    hip_drop_rate = float(hip_y_drop) * fps / max(T - 1, 1)

    feats = np.array([peak_vel, accel_max, aspect_change_rate, hip_drop_rate],
                     dtype=np.float32)
    feats = np.clip(feats, -100.0, 100.0)
    feats = np.nan_to_num(feats, nan=0.0, posinf=100.0, neginf=-100.0)
    return feats


def compute_physics_batch(windows: np.ndarray, fps: float = 15.0) -> np.ndarray:
    """Batch version: (B, T, V, 2) -> (B, 4)."""
    return np.stack([compute_physics(w, fps=fps) for w in windows], axis=0)
