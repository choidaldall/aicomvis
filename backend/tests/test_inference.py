"""Tests for the LSTM fall classifier and VelocityTracker (no GPU required)."""
from collections import deque
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import numpy as np
import pytest


# ---------------------------------------------------------------------------
# LSTMFallClassifier — warmup gate + pose buffer
# ---------------------------------------------------------------------------

def _dt(offset_s: float = 0.0) -> datetime:
    return datetime(2026, 5, 1, 10, 0, 0, tzinfo=timezone.utc) + timedelta(seconds=offset_s)


def test_warmup_gate_returns_zero():
    """Classifier returns 0.0 before warmup_min valid poses have been seen."""
    from app.inference.lstm_fall import LSTMFallClassifier

    with patch.object(LSTMFallClassifier, "__init__", return_value=None):
        clf = LSTMFallClassifier.__new__(LSTMFallClassifier)
        clf.pose_buffer = deque(maxlen=200)
        clf.min_valid_poses = 30
        clf.max_pose_gap_seconds = 1.5
        clf.target_fps = 15
        clf.frame_interval = 1 / 15
        clf.max_seq_len = 100

        kp = np.zeros((17, 2), dtype=np.float32)
        prob = clf.predict(kp, _dt(0))
        assert prob == 0.0, "Should return 0.0 before warmup"


def test_warmup_progress():
    """warmup_progress should reflect pose_buffer size."""
    from app.inference.lstm_fall import LSTMFallClassifier

    with patch.object(LSTMFallClassifier, "__init__", return_value=None):
        clf = LSTMFallClassifier.__new__(LSTMFallClassifier)
        clf.pose_buffer = deque(maxlen=200)
        clf.min_valid_poses = 30

        assert clf.warmup_progress == 0.0
        for i in range(15):
            clf.pose_buffer.append((np.zeros((17, 2)), _dt(i * 0.067)))
        assert clf.warmup_progress == pytest.approx(0.5, abs=0.01)


def test_is_warmed_up():
    """is_warmed_up becomes True after min_valid_poses frames."""
    from app.inference.lstm_fall import LSTMFallClassifier

    with patch.object(LSTMFallClassifier, "__init__", return_value=None):
        clf = LSTMFallClassifier.__new__(LSTMFallClassifier)
        clf.pose_buffer = deque(maxlen=200)
        clf.min_valid_poses = 5

        assert not clf.is_warmed_up
        for i in range(5):
            clf.pose_buffer.append((np.zeros((17, 2)), _dt(i * 0.067)))
        assert clf.is_warmed_up


def test_gap_resets_buffer():
    """A gap > max_pose_gap_seconds resets the pose buffer."""
    from app.inference.lstm_fall import LSTMFallClassifier

    with patch.object(LSTMFallClassifier, "__init__", return_value=None):
        clf = LSTMFallClassifier.__new__(LSTMFallClassifier)
        clf.pose_buffer = deque(maxlen=200)
        clf.min_valid_poses = 30
        clf.max_pose_gap_seconds = 1.5
        clf.target_fps = 15
        clf.frame_interval = 1 / 15
        clf.max_seq_len = 100

        for i in range(10):
            clf.pose_buffer.append((np.zeros((17, 2)), _dt(i * 0.067)))

        # 5-second gap — should reset
        kp = np.zeros((17, 2), dtype=np.float32)
        clf.predict(kp, _dt(15.0))
        assert len(clf.pose_buffer) == 1, "Buffer should reset to 1 after gap"


def test_reset_buffer():
    """reset_buffer() clears pose_buffer."""
    from app.inference.lstm_fall import LSTMFallClassifier

    with patch.object(LSTMFallClassifier, "__init__", return_value=None):
        clf = LSTMFallClassifier.__new__(LSTMFallClassifier)
        clf.pose_buffer = deque(maxlen=200)
        clf.min_valid_poses = 30

        for i in range(10):
            clf.pose_buffer.append((np.zeros((17, 2)), _dt(i * 0.067)))

        clf.reset_buffer()
        assert len(clf.pose_buffer) == 0


# ---------------------------------------------------------------------------
# VelocityTracker
# ---------------------------------------------------------------------------

def test_velocity_tracker_insufficient_history():
    """Returns 0.0 vertical_velocity when fewer than 2 frames recorded."""
    from app.inference.pipeline import VelocityTracker
    vt = VelocityTracker()
    assert vt.vertical_velocity == 0.0


def test_velocity_tracker_detects_fall():
    """Fast downward hip movement gives positive vertical_velocity."""
    from app.inference.pipeline import VelocityTracker
    vt = VelocityTracker(history_seconds=2.0)

    kp_high = np.zeros((17, 2), dtype=np.float32)
    kp_high[11] = [0.5, 0.3]   # hip y = 0.3 (high up, normalized)
    kp_high[12] = [0.5, 0.3]

    kp_low = np.zeros((17, 2), dtype=np.float32)
    kp_low[11] = [0.5, 0.7]    # hip y = 0.7 (lower, normalized)
    kp_low[12] = [0.5, 0.7]

    frame_h = 480
    t0 = _dt(0)
    t1 = _dt(0.1)  # 100ms later — delta_y=0.4, velocity=4.0
    # Pass bbox=None so keypoint y values are used directly
    vt.update(kp_high, None, frame_h, t0)
    vt.update(kp_low, None, frame_h, t1)

    assert vt.vertical_velocity > 0.5, f"Expected high velocity, got {vt.vertical_velocity}"


def test_velocity_tracker_is_falling_motion():
    """is_falling_motion True when velocity exceeds threshold."""
    from app.inference.pipeline import VelocityTracker
    vt = VelocityTracker(velocity_threshold=0.1, history_seconds=2.0)

    kp = np.zeros((17, 2), dtype=np.float32)
    kp[11] = [0.5, 0.2]
    kp[12] = [0.5, 0.2]
    kp2 = np.zeros((17, 2), dtype=np.float32)
    kp2[11] = [0.5, 0.9]
    kp2[12] = [0.5, 0.9]

    frame_h = 480
    # bbox=None so normalized keypoint y is used directly
    vt.update(kp, None, frame_h, _dt(0))
    vt.update(kp2, None, frame_h, _dt(0.1))
    assert vt.is_falling_motion


def test_velocity_tracker_gap_reset():
    """Gap > max_gap_seconds clears the history."""
    from app.inference.pipeline import VelocityTracker
    vt = VelocityTracker(max_gap_seconds=2.0)

    kp = np.zeros((17, 2), dtype=np.float32)
    kp[11] = [0.5, 0.3]
    kp[12] = [0.5, 0.3]
    frame_h = 480

    vt.update(kp, None, frame_h, _dt(0))
    vt.update(kp, None, frame_h, _dt(0.1))

    # Long gap — should reset
    vt.update(kp, None, frame_h, _dt(10.0))
    assert len(vt.position_history) == 1, "History should reset after gap"
