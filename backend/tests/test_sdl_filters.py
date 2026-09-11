"""Unit tests for SDL Priority 2 (Lying Confirmation), Priority 3 (Squat), and ImpactFilter."""
from datetime import datetime, timedelta

import pytest


# ---------------------------------------------------------------------------
# SquatFilter (P3) — peak velocity threshold
# ---------------------------------------------------------------------------

def test_squat_filter_blocks_low_velocity():
    from app.inference.filters.squat import SquatFilter
    f = SquatFilter(peak_velocity_threshold=0.05)
    d = f.should_skip(peak_velocity=0.010)
    assert d.skip
    assert "peak_vel=0.010" in d.reason


def test_squat_filter_preserves_higher_velocity():
    from app.inference.filters.squat import SquatFilter
    f = SquatFilter(peak_velocity_threshold=0.05)
    d = f.should_skip(peak_velocity=0.058)   # lowest TP observed
    assert not d.skip


def test_squat_filter_disabled():
    from app.inference.filters.squat import SquatFilter
    f = SquatFilter(enable=False)
    d = f.should_skip(peak_velocity=0.001)
    assert not d.skip
    assert d.reason == "disabled"


def test_squat_filter_metrics_present():
    from app.inference.filters.squat import SquatFilter
    f = SquatFilter()
    d = f.should_skip(peak_velocity=0.123)
    assert "peak_velocity" in d.metrics
    assert d.metrics["peak_velocity"] == 0.123


# ---------------------------------------------------------------------------
# LyingConfirmationFilter (P2) — stateful, live-mode
# ---------------------------------------------------------------------------

def _now(offset_s: float = 0) -> datetime:
    return datetime(2026, 5, 13, 12, 0, 0) + timedelta(seconds=offset_s)


def test_lying_pending_creation():
    from app.inference.filters.lying import LyingConfirmationFilter
    f = LyingConfirmationFilter(confirmation_seconds=2.0)
    pending = f.make_pending("clip_001", _now(0), 0.92)
    assert pending.clip_id == "clip_001"
    assert pending.deadline == _now(2.0)


def test_lying_still_waiting_returns_none():
    from app.inference.filters.lying import LyingConfirmationFilter
    f = LyingConfirmationFilter(confirmation_seconds=2.0)
    pending = f.make_pending("clip_001", _now(0), 0.92)
    # Before deadline
    result = f.evaluate(pending, _now(1.0), current_aspect_ratio=0.5,
                        current_vertical_velocity=0.1)
    assert result is None


def test_lying_recovery_cancels():
    """Subject vertical again after 2s → cancel (lying_slow ADL pattern)."""
    from app.inference.filters.lying import LyingConfirmationFilter
    f = LyingConfirmationFilter(confirmation_seconds=2.0, recovery_aspect_threshold=1.2)
    pending = f.make_pending("clip_001", _now(0), 0.92)
    result = f.evaluate(pending, _now(2.1), current_aspect_ratio=1.5,
                        current_vertical_velocity=0.2)
    assert result is not None
    assert not result.confirmed
    assert "recovered" in result.reason
    assert result.metrics["aspect_ratio"] == 1.5


def test_lying_still_horizontal_confirms():
    """Subject still on ground after 2s → confirm fall."""
    from app.inference.filters.lying import LyingConfirmationFilter
    f = LyingConfirmationFilter(confirmation_seconds=2.0, recovery_aspect_threshold=1.2)
    pending = f.make_pending("clip_001", _now(0), 0.92)
    result = f.evaluate(pending, _now(2.1), current_aspect_ratio=0.5,
                        current_vertical_velocity=0.05)
    assert result is not None
    assert result.confirmed
    assert "horizontal" in result.reason


# ---------------------------------------------------------------------------
# ImpactFilter — raw impulse threshold (catches FP_lying_slow)
# ---------------------------------------------------------------------------

def test_impact_blocks_below_threshold():
    from app.inference.filters.impact import ImpactFilter
    f = ImpactFilter(min_peak_impulse=0.40)
    # Profile data: FP_lying_slow ranges 0.178 - 0.370 (under threshold)
    for impulse in [0.178, 0.247, 0.299, 0.370]:
        d = f.should_skip(peak_impulse=impulse)
        assert d.skip, f"Expected block at impulse={impulse}"
        assert f"impulse={impulse:.3f}" in d.reason


def test_impact_preserves_at_threshold_tp_floor():
    """All 6 audited TPs have impulse >= 0.473; threshold 0.40 leaves margin 0.073."""
    from app.inference.filters.impact import ImpactFilter
    f = ImpactFilter(min_peak_impulse=0.40)
    for impulse in [0.473, 0.491, 0.579, 0.777, 1.133, 5.815]:   # observed TP impulses
        d = f.should_skip(peak_impulse=impulse)
        assert not d.skip, f"TP at impulse={impulse} should NOT be blocked"


def test_impact_disabled():
    from app.inference.filters.impact import ImpactFilter
    f = ImpactFilter(enable=False)
    d = f.should_skip(peak_impulse=0.001)
    assert not d.skip
    assert d.reason == "disabled"


def test_impact_metrics_present():
    from app.inference.filters.impact import ImpactFilter
    f = ImpactFilter()
    d = f.should_skip(peak_impulse=0.789)
    assert d.metrics["peak_impulse"] == 0.789


# ---------------------------------------------------------------------------
# VelocityTracker.peak_instantaneous_velocity (raw impulse, no median)
# ---------------------------------------------------------------------------

def test_peak_instantaneous_zero_when_empty():
    from app.inference.pipeline import VelocityTracker
    vt = VelocityTracker()
    assert vt.peak_instantaneous_velocity == 0.0


def test_peak_instantaneous_captures_impulse():
    """A single sharp jump in y_center should yield a high impulse."""
    from app.inference.pipeline import VelocityTracker
    import numpy as np
    vt = VelocityTracker(history_seconds=2.0)
    kp_low = np.zeros((17, 2), dtype=np.float32)
    kp_low[11] = [0.5, 0.3]; kp_low[12] = [0.5, 0.3]
    kp_high = np.zeros((17, 2), dtype=np.float32)
    kp_high[11] = [0.5, 0.8]; kp_high[12] = [0.5, 0.8]

    t0 = _now(0); t1 = _now(0.1)
    vt.update(kp_low, None, 480, t0)
    vt.update(kp_high, None, 480, t1)

    # Δy = 0.5 over Δt = 0.1s → impulse = 5.0 norm/s
    assert vt.peak_instantaneous_velocity > 4.5


def test_lying_disabled_always_confirms():
    from app.inference.filters.lying import LyingConfirmationFilter
    f = LyingConfirmationFilter(enable=False)
    pending = f.make_pending("clip_001", _now(0), 0.92)
    result = f.evaluate(pending, _now(2.5), current_aspect_ratio=2.0,
                        current_vertical_velocity=0)
    assert result.confirmed
    assert result.reason == "disabled"
