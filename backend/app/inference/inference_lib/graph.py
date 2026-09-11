"""COCO-17 skeleton graph definition for ST-GCN++."""

from __future__ import annotations

import numpy as np
import torch

NUM_JOINTS = 17

JOINT_NAMES = [
    "nose", "l_eye", "r_eye", "l_ear", "r_ear",
    "l_shoulder", "r_shoulder", "l_elbow", "r_elbow",
    "l_wrist", "r_wrist", "l_hip", "r_hip",
    "l_knee", "r_knee", "l_ankle", "r_ankle",
]

EDGES: list[tuple[int, int]] = [
    (0, 1), (0, 2), (1, 3), (2, 4),
    (5, 6),
    (0, 5), (0, 6),
    (5, 7), (7, 9), (6, 8), (8, 10),
    (5, 11), (6, 12), (11, 12),
    (11, 13), (13, 15), (12, 14), (14, 16),
]

BONE_PARENT: dict[int, int] = {
    0: 0,
    1: 0, 2: 0,
    3: 1, 4: 2,
    5: 0, 6: 0,
    7: 5, 8: 6,
    9: 7, 10: 8,
    11: 5, 12: 6,
    13: 11, 14: 12,
    15: 13, 16: 14,
}

CENTER_JOINT = 11

FLIP_PAIRS: list[tuple[int, int]] = [
    (1, 2), (3, 4), (5, 6), (7, 8), (9, 10),
    (11, 12), (13, 14), (15, 16),
]


def build_adjacency(num_nodes: int = NUM_JOINTS,
                    edges: list[tuple[int, int]] = EDGES,
                    self_loop: bool = True) -> np.ndarray:
    """Symmetric binary adjacency with optional self-loop."""
    A = np.zeros((num_nodes, num_nodes), dtype=np.float32)
    for u, v in edges:
        A[u, v] = 1.0
        A[v, u] = 1.0
    if self_loop:
        A += np.eye(num_nodes, dtype=np.float32)
    return A


def normalize_adjacency(A: np.ndarray) -> np.ndarray:
    """Symmetric normalization: D^(-1/2) A D^(-1/2)."""
    D = A.sum(axis=1)
    D_inv_sqrt = np.power(D, -0.5, where=D > 0)
    D_inv_sqrt[D == 0] = 0.0
    D_mat = np.diag(D_inv_sqrt)
    return D_mat @ A @ D_mat


def build_spatial_partition(num_nodes: int = NUM_JOINTS,
                            edges: list[tuple[int, int]] = EDGES,
                            center: int = CENTER_JOINT) -> np.ndarray:
    """Spatial partition strategy from ST-GCN paper.

    Returns 3 adjacency matrices stacked: (3, V, V)
      - A[0]: self-loop only
      - A[1]: neighbors closer to skeleton center (centripetal)
      - A[2]: neighbors farther from center (centrifugal)
    """
    A_self = np.eye(num_nodes, dtype=np.float32)

    hop_dist = _hop_distance(num_nodes, edges)
    center_dist = hop_dist[center]

    A_close = np.zeros((num_nodes, num_nodes), dtype=np.float32)
    A_far = np.zeros((num_nodes, num_nodes), dtype=np.float32)
    for u, v in edges:
        for i, j in ((u, v), (v, u)):
            if center_dist[j] < center_dist[i]:
                A_close[i, j] = 1.0
            else:
                A_far[i, j] = 1.0

    A_close = normalize_adjacency(A_close + np.eye(num_nodes, dtype=np.float32) * 1e-6)
    A_far = normalize_adjacency(A_far + np.eye(num_nodes, dtype=np.float32) * 1e-6)
    return np.stack([A_self, A_close, A_far], axis=0)


def _hop_distance(num_nodes: int, edges: list[tuple[int, int]]) -> np.ndarray:
    """All-pairs shortest path (hops) on undirected graph."""
    A = build_adjacency(num_nodes, edges, self_loop=False)
    INF = 10**9
    dist = np.full((num_nodes, num_nodes), INF, dtype=np.int32)
    np.fill_diagonal(dist, 0)
    for u, v in edges:
        dist[u, v] = 1
        dist[v, u] = 1
    for k in range(num_nodes):
        dist = np.minimum(dist, dist[:, k:k+1] + dist[k:k+1, :])
    return dist


def adjacency_torch(partition: str = "uniform") -> torch.Tensor:
    """Return adjacency as torch.Tensor for use in GCN.

    Args:
        partition: "uniform" → (1, V, V) single normalized adjacency
                   "spatial" → (3, V, V) self/close/far partition
    """
    if partition == "uniform":
        A = build_adjacency()
        A = normalize_adjacency(A)
        return torch.from_numpy(A).unsqueeze(0).float()
    elif partition == "spatial":
        A = build_spatial_partition()
        return torch.from_numpy(A).float()
    else:
        raise ValueError(f"Unknown partition: {partition}")


def joint_to_bone(joints: torch.Tensor) -> torch.Tensor:
    """Convert joint coords to bone vectors.

    Args:
        joints: (B, C, T, V) or (B, C, T, V, M) tensor of joint coordinates
    Returns:
        bones: same shape; bone[:,:,:,v] = joint[:,:,:,v] - joint[:,:,:,parent[v]]
    """
    bones = torch.zeros_like(joints)
    for child, parent in BONE_PARENT.items():
        bones[..., child] = joints[..., child] - joints[..., parent]
    return bones


def temporal_diff(x: torch.Tensor, dim: int = 2) -> torch.Tensor:
    """First-order temporal difference, padded with zeros at start.

    Args:
        x: tensor with time dimension
        dim: time dimension index (default 2 for (B, C, T, V) layout)
    Returns:
        same shape; diff[t] = x[t+1] - x[t], last frame zero-padded.
    """
    shifted = torch.roll(x, shifts=-1, dims=dim)
    diff = shifted - x
    idx = [slice(None)] * x.ndim
    idx[dim] = -1
    diff[tuple(idx)] = 0.0
    return diff
