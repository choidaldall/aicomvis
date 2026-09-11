"""ST-GCN++ architecture for skeleton-based fall detection.

Reference: Duan et al. "Revisiting Skeleton-based Action Recognition" CVPR 2022.

Single-stream backbone. For 4-stream fusion (J/B/JM/BM), instantiate 4 models
with same arch but different preprocessed input.
"""

from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F

from .graph import NUM_JOINTS, adjacency_torch


class GraphConv(nn.Module):
    """Spatial graph convolution with multi-partition adjacency."""

    def __init__(self, in_ch: int, out_ch: int, A: torch.Tensor):
        super().__init__()
        K = A.size(0)
        self.K = K
        self.register_buffer("A", A)
        self.conv = nn.Conv2d(in_ch, out_ch * K, kernel_size=1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        B, C, T, V = x.shape
        x = self.conv(x)
        x = x.view(B, self.K, -1, T, V)
        x = torch.einsum("bkctv,kvw->bctw", x, self.A)
        return x


class MultiScaleTCN(nn.Module):
    """Parallel temporal conv with kernels {3, 5, 7} + 1×1 + maxpool branches.

    Standard multi-scale design from PYSKL. Sum of branches.
    """

    def __init__(self, channels: int, stride: int = 1, dropout: float = 0.0):
        super().__init__()
        branch_ch = channels // 4
        rem = channels - branch_ch * 4
        self.branches = nn.ModuleList()
        for k in (3, 5, 7):
            self.branches.append(nn.Sequential(
                nn.Conv2d(channels, branch_ch, kernel_size=1),
                nn.BatchNorm2d(branch_ch),
                nn.ReLU(inplace=True),
                nn.Conv2d(branch_ch, branch_ch, kernel_size=(k, 1),
                          padding=(k // 2, 0), stride=(stride, 1),
                          groups=branch_ch),
                nn.BatchNorm2d(branch_ch),
            ))
        last_ch = branch_ch + rem
        self.branches.append(nn.Sequential(
            nn.Conv2d(channels, last_ch, kernel_size=1, stride=(stride, 1)),
            nn.BatchNorm2d(last_ch),
        ))
        self.act = nn.ReLU(inplace=True)
        self.drop = nn.Dropout2d(dropout) if dropout > 0 else nn.Identity()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        outs = [branch(x) for branch in self.branches]
        out = torch.cat(outs, dim=1)
        return self.drop(self.act(out))


class STGCNBlock(nn.Module):
    """One ST-GCN++ block: GCN → multi-scale TCN → residual."""

    def __init__(self, in_ch: int, out_ch: int, A: torch.Tensor,
                 stride: int = 1, dropout: float = 0.0):
        super().__init__()
        self.gcn = GraphConv(in_ch, out_ch, A)
        self.bn1 = nn.BatchNorm2d(out_ch)
        self.act1 = nn.ReLU(inplace=True)
        self.tcn = MultiScaleTCN(out_ch, stride=stride, dropout=dropout)

        if in_ch == out_ch and stride == 1:
            self.residual = nn.Identity()
        else:
            self.residual = nn.Sequential(
                nn.Conv2d(in_ch, out_ch, kernel_size=1, stride=(stride, 1)),
                nn.BatchNorm2d(out_ch),
            )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        res = self.residual(x)
        x = self.gcn(x)
        x = self.act1(self.bn1(x))
        x = self.tcn(x)
        return F.relu(x + res, inplace=True)


class STGCNPlus(nn.Module):
    """ST-GCN++ single-stream backbone + classifier.

    Input: (B, C_in, T, V, M) where
      C_in = 2 (xy coord) or 3 (xy + confidence)
      T = temporal window length (e.g. 30 frames)
      V = 17 (COCO-17 joints)
      M = 1 (single-person fall detection)

    Output: logits (B, num_classes)
    """

    def __init__(
        self,
        in_channels: int = 2,
        num_classes: int = 2,
        num_joints: int = NUM_JOINTS,
        partition: str = "spatial",
        channels: tuple[int, ...] = (16, 32, 64, 128),
        blocks_per_stage: tuple[int, ...] = (2, 2, 2),
        dropout: float = 0.1,
        physics_dim: int = 0,
    ):
        super().__init__()
        A = adjacency_torch(partition=partition)
        self.num_joints = num_joints
        self.physics_dim = physics_dim

        self.data_bn = nn.BatchNorm1d(in_channels * num_joints)

        stages = []
        ch_in = in_channels
        ch_progression = list(channels[:1]) + list(channels[1:])
        for stage_idx, (ch_out, n_blocks) in enumerate(zip(channels[1:], blocks_per_stage)):
            for b in range(n_blocks):
                stride = 2 if (b == 0 and stage_idx > 0) else 1
                if b == 0 and stage_idx == 0:
                    stages.append(STGCNBlock(ch_in, channels[0], A, stride=1, dropout=dropout))
                    ch_in = channels[0]
                stages.append(STGCNBlock(ch_in, ch_out, A, stride=stride, dropout=dropout))
                ch_in = ch_out
        self.stages = nn.Sequential(*stages)

        embed_dim = channels[-1]
        if physics_dim > 0:
            self.physics_bn = nn.BatchNorm1d(physics_dim)
        else:
            self.physics_bn = None
        cls_in = embed_dim + physics_dim
        self.fc = nn.Linear(cls_in, num_classes)

    def extract_features(self, x: torch.Tensor) -> torch.Tensor:
        """Extract pooled embedding before classifier.

        Args:
            x: (B, C, T, V, M) or (B, C, T, V)
        Returns:
            (B, embed_dim)
        """
        if x.ndim == 5:
            B, C, T, V, M = x.shape
            x = x.permute(0, 4, 1, 2, 3).contiguous().view(B * M, C, T, V)
        else:
            B = x.size(0)
            M = 1

        N, C, T, V = x.shape
        x = x.permute(0, 1, 3, 2).contiguous().view(N, C * V, T)
        x = self.data_bn(x)
        x = x.view(N, C, V, T).permute(0, 1, 3, 2).contiguous()

        x = self.stages(x)

        x = F.adaptive_avg_pool2d(x, (1, 1)).flatten(1)
        x = x.view(B, M, -1).mean(dim=1)
        return x

    def forward(self, x: torch.Tensor, physics: torch.Tensor | None = None) -> torch.Tensor:
        feat = self.extract_features(x)
        if self.physics_dim > 0:
            if physics is None:
                raise ValueError(f"physics_dim={self.physics_dim} but no physics tensor passed")
            physics = self.physics_bn(physics)
            physics = torch.clamp(physics, -5.0, 5.0)
            feat = torch.cat([feat, physics], dim=1)
        return self.fc(feat)


def build_stgcn_plus(cfg: dict) -> STGCNPlus:
    return STGCNPlus(
        in_channels=cfg.get("in_channels", 2),
        num_classes=cfg.get("num_classes", 2),
        num_joints=cfg.get("num_joints", NUM_JOINTS),
        partition=cfg.get("partition", "spatial"),
        channels=tuple(cfg.get("channels", (16, 32, 64, 128))),
        blocks_per_stage=tuple(cfg.get("blocks_per_stage", (2, 2, 2))),
        dropout=cfg.get("dropout", 0.1),
        physics_dim=cfg.get("physics_dim", 0),
    )
