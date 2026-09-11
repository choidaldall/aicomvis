"""Global seed control for reproducibility across numpy, torch, cuda, python.

Used at the top of every training run. RNG state is also saved/loaded
via checkpoint so resumed runs match continuous-run trajectories
(modulo dataloader worker nondeterminism).
"""

import os
import random
from dataclasses import dataclass
from typing import Any

import numpy as np
import torch


@dataclass
class RngState:
    python: Any
    numpy: Any
    torch_cpu: Any
    torch_cuda: Any


def set_seed(seed: int, deterministic: bool = True) -> None:
    """Seed all RNGs. Set deterministic=False only if speed is critical."""
    os.environ["PYTHONHASHSEED"] = str(seed)
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)

    if deterministic:
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False
    else:
        torch.backends.cudnn.deterministic = False
        torch.backends.cudnn.benchmark = True


def capture_rng_state() -> RngState:
    return RngState(
        python=random.getstate(),
        numpy=np.random.get_state(),
        torch_cpu=torch.get_rng_state(),
        torch_cuda=torch.cuda.get_rng_state_all() if torch.cuda.is_available() else None,
    )


def restore_rng_state(state: RngState) -> None:
    random.setstate(state.python)
    np.random.set_state(state.numpy)
    torch.set_rng_state(state.torch_cpu)
    if state.torch_cuda is not None and torch.cuda.is_available():
        torch.cuda.set_rng_state_all(state.torch_cuda)
