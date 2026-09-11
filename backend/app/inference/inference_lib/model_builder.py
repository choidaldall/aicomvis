"""Model builder dispatcher for production inference.

Only supports ST-GCN++ architecture (Duan et al. CVPR 2022) — the
production model. Other architectures explored during research (TCNTE,
LSTM, tcn_only, transformer_only) live in the research archive and are
not shipped with the deployment.
"""

from __future__ import annotations

import torch.nn as nn

from .stgcn_plus import build_stgcn_plus


def build_model(model_cfg: dict) -> nn.Module:
    """Factory dispatch on model_cfg['arch']. Deployment supports ST-GCN++ only."""
    arch = str(model_cfg.get("arch", "stgcn_plus")).lower()
    if arch in ("stgcn_plus", "stgcnplus", "stgcn++"):
        return build_stgcn_plus(model_cfg)
    raise ValueError(
        f"Production deployment only supports stgcn_plus arch (got: {arch}). "
        "Other architectures live in the research archive."
    )


def count_parameters(model: nn.Module) -> int:
    return sum(p.numel() for p in model.parameters() if p.requires_grad)
