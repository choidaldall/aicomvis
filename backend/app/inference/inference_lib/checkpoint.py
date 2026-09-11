"""Atomic checkpoint save / load + lightweight policy manager.

Why atomic: a crash mid-write would otherwise produce a half-written
.pth file that fails to load on resume, forcing a full retrain. We write
to a temp path and rename — POSIX rename is atomic on the same filesystem.

CheckpointManager tracks: best-by-metric, last (for resume), and periodic
interval snapshots (last K kept). Auto-cleans old interval files.
"""

import logging
import os
import shutil
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

import torch

from .seed import RngState, capture_rng_state

logger = logging.getLogger(__name__)


@dataclass
class CheckpointState:
    epoch: int
    model_state: dict
    optimizer_state: dict
    scheduler_state: Optional[dict]
    metrics: dict[str, float]
    rng_state: RngState
    config: dict[str, Any] = field(default_factory=dict)


def save_checkpoint(path: Path, state: CheckpointState) -> None:
    """Atomic torch.save — write to .tmp then rename."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_suffix(path.suffix + ".tmp")

    payload = {
        "epoch": state.epoch,
        "model_state_dict": state.model_state,
        "optimizer_state_dict": state.optimizer_state,
        "scheduler_state_dict": state.scheduler_state,
        "metrics": state.metrics,
        "rng_state": {
            "python": state.rng_state.python,
            "numpy": state.rng_state.numpy,
            "torch_cpu": state.rng_state.torch_cpu,
            "torch_cuda": state.rng_state.torch_cuda,
        },
        "config": state.config,
    }

    torch.save(payload, tmp_path)

    # fsync for durability, then atomic rename
    with open(tmp_path, "rb") as f:
        os.fsync(f.fileno())
    os.replace(tmp_path, path)
    logger.info(f"Checkpoint saved: {path} (epoch={state.epoch})")


def load_checkpoint(path: Path, map_location: str = "cpu") -> CheckpointState:
    """Load a checkpoint — raises FileNotFoundError or RuntimeError on corruption."""
    if not path.exists():
        raise FileNotFoundError(f"Checkpoint not found: {path}")

    try:
        payload = torch.load(path, map_location=map_location, weights_only=False)
    except Exception as exc:
        raise RuntimeError(f"Checkpoint at {path} is corrupted: {exc}") from exc

    rng_dict = payload.get("rng_state", {})
    rng_state = RngState(
        python=rng_dict.get("python"),
        numpy=rng_dict.get("numpy"),
        torch_cpu=rng_dict.get("torch_cpu"),
        torch_cuda=rng_dict.get("torch_cuda"),
    )

    return CheckpointState(
        epoch=payload.get("epoch", 0),
        model_state=payload["model_state_dict"],
        optimizer_state=payload.get("optimizer_state_dict", {}),
        scheduler_state=payload.get("scheduler_state_dict"),
        metrics=payload.get("metrics", {}),
        rng_state=rng_state,
        config=payload.get("config", {}),
    )


class CheckpointManager:
    """Maintain best / last / interval checkpoints in a directory.

    - best_<metric>.pth: updated when a metric improves
    - last.pth: updated every epoch (for resume on crash)
    - interval_epoch_{n}.pth: every N epochs, last K kept

    Use update() at the end of each epoch.
    """

    def __init__(
        self,
        ckpt_dir: Path,
        metric_modes: dict[str, str] | None = None,
        interval: int = 10,
        keep_last_intervals: int = 3,
    ):
        self.ckpt_dir = Path(ckpt_dir)
        self.ckpt_dir.mkdir(parents=True, exist_ok=True)
        # metric_name -> "max" (higher better) or "min" (lower better)
        self.metric_modes = metric_modes or {"val_f1": "max", "val_pr_auc": "max"}
        self.best_values: dict[str, float] = {}
        self.interval = interval
        self.keep_last_intervals = keep_last_intervals

    def _is_improvement(self, metric: str, value: float) -> bool:
        mode = self.metric_modes[metric]
        if metric not in self.best_values:
            return True
        if mode == "max":
            return value > self.best_values[metric]
        return value < self.best_values[metric]

    def update(self, state: CheckpointState) -> list[str]:
        """Save last.pth always; save best_<metric>.pth if improved;
        save interval snapshot if epoch % interval == 0."""
        saved: list[str] = []

        # last (resume target)
        last_path = self.ckpt_dir / "last.pth"
        save_checkpoint(last_path, state)
        saved.append("last")

        # best per metric
        for metric in self.metric_modes:
            if metric in state.metrics and self._is_improvement(metric, state.metrics[metric]):
                self.best_values[metric] = state.metrics[metric]
                best_path = self.ckpt_dir / f"best_{metric}.pth"
                save_checkpoint(best_path, state)
                saved.append(f"best_{metric}")

        # interval snapshot
        if self.interval > 0 and state.epoch > 0 and state.epoch % self.interval == 0:
            interval_path = self.ckpt_dir / f"interval_epoch_{state.epoch}.pth"
            save_checkpoint(interval_path, state)
            saved.append(f"interval_{state.epoch}")
            self._prune_intervals()

        return saved

    def _prune_intervals(self) -> None:
        """Keep only the last K interval snapshots."""
        intervals = sorted(
            self.ckpt_dir.glob("interval_epoch_*.pth"),
            key=lambda p: int(p.stem.split("_")[-1]),
        )
        for p in intervals[: -self.keep_last_intervals]:
            p.unlink()
            logger.debug(f"Pruned old checkpoint: {p}")

    def find_last(self) -> Optional[Path]:
        """Return path to last.pth if it exists, for resume."""
        last_path = self.ckpt_dir / "last.pth"
        return last_path if last_path.exists() else None


def make_state(
    epoch: int,
    model: torch.nn.Module,
    optimizer: torch.optim.Optimizer,
    scheduler: Optional[Any],
    metrics: dict[str, float],
    config: dict[str, Any],
) -> CheckpointState:
    """Helper to build CheckpointState from training loop primitives."""
    return CheckpointState(
        epoch=epoch,
        model_state=model.state_dict(),
        optimizer_state=optimizer.state_dict(),
        scheduler_state=scheduler.state_dict() if scheduler is not None else None,
        metrics=dict(metrics),
        rng_state=capture_rng_state(),
        config=config,
    )
