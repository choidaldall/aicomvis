"""Stream representation transforms for ST-GCN++ 4-stream fusion.

Input format: skeleton windows shape (T, V, C) where
  T = temporal length (e.g. 30 frames)
  V = number of joints (17 for COCO)
  C = 2 (xy) or 3 (xyc with confidence)

4 streams:
  J  (Joint)        : raw joint coordinates
  B  (Bone)         : bone vector = joint - joint_parent
  JM (Joint Motion) : temporal diff of joint
  BM (Bone Motion)  : temporal diff of bone
"""

from __future__ import annotations

import numpy as np

from .graph import BONE_PARENT, NUM_JOINTS


def to_bone(joints: np.ndarray) -> np.ndarray:
    """Bone vector representation.

    Args:
        joints: (T, V, C) array
    Returns:
        bones: same shape, bones[:, v, :] = joints[:, v, :] - joints[:, parent[v], :]
    """
    bones = np.zeros_like(joints)
    for child, parent in BONE_PARENT.items():
        bones[:, child, :] = joints[:, child, :] - joints[:, parent, :]
    return bones


def to_motion(x: np.ndarray) -> np.ndarray:
    """First-order temporal difference, zero-padded at end.

    Args:
        x: (T, V, C) array
    Returns:
        diff: same shape, diff[t] = x[t+1] - x[t], diff[T-1] = 0
    """
    diff = np.zeros_like(x)
    diff[:-1] = x[1:] - x[:-1]
    return diff


STREAM_TRANSFORMS = {
    "J": lambda x: x.copy(),
    "B": to_bone,
    "JM": to_motion,
    "BM": lambda x: to_motion(to_bone(x)),
}


def apply_stream(joints: np.ndarray, stream: str) -> np.ndarray:
    """Apply one of {J, B, JM, BM} stream transform.

    Args:
        joints: (T, V, C) joint coordinates
        stream: one of "J", "B", "JM", "BM"
    Returns:
        (T, V, C) transformed representation
    """
    if stream not in STREAM_TRANSFORMS:
        raise ValueError(f"unknown stream {stream}, expected one of {list(STREAM_TRANSFORMS)}")
    return STREAM_TRANSFORMS[stream](joints).astype(np.float32)
