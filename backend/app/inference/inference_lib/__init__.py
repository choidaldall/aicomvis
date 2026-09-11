"""Inference-only library for ST-GCN++ deployment.

Self-contained subset of model + checkpoint + data utilities, extracted from
the research training codebase. Lives alongside backend/app/ so deployment
has no dependency on the research/training infrastructure (which lives in
the research archive).

Files:
  checkpoint.py        — atomic load_checkpoint for production weights
  graph.py             — COCO-17 adjacency + bone parent map
  layers.py            — TCN layer building blocks
  stgcn_plus.py        — ST-GCN++ backbone (Duan et al. CVPR 2022)
  model_builder.py     — build_model dispatcher (stgcn_plus only)
  physics_features.py  — 4-dim global motion features (compute_physics)
  stream_transforms.py — J/B/JM/BM stream computation
  seed.py              — RNG state (required by checkpoint.py)
"""
