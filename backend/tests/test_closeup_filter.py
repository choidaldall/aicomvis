"""Unit tests for Smart Decision Layer Priority 1 — Closeup Filter."""
import numpy as np
import pytest


def _kpts_confidence(n_visible: int) -> np.ndarray:
    """Build a (17,) keypoint confidence array with `n_visible` above 0.3."""
    conf = np.full(17, 0.1, dtype=np.float32)
    conf[:n_visible] = 0.9
    return conf


def test_area_check_triggers_for_large_vertical_bbox():
    from app.inference.filters.closeup import CloseupFilter
    f = CloseupFilter(area_threshold=0.4, aspect_ratio_min=1.0)
    # Frame 720x1280 (h x w) area = 921_600
    # Vertical bbox 500x700 (w x h), area = 350_000, ratio = 0.38, aspect = 1.4 (vertical)
    is_closeup, ratio, aspect = f.check_area((300, 10, 500, 700), (720, 1280))
    assert not is_closeup, "ratio 0.38 below threshold"
    assert aspect > 1.0

    # Vertical bbox 600x700, area = 420_000, ratio = 0.456 > 0.4
    is_closeup, ratio, aspect = f.check_area((300, 10, 600, 700), (720, 1280))
    assert is_closeup
    assert ratio > 0.4
    assert aspect > 1.0


def test_area_check_aspect_gate_skips_horizontal():
    """Horizontal bbox (lying down) exempt from area check, even if huge."""
    from app.inference.filters.closeup import CloseupFilter
    f = CloseupFilter(area_threshold=0.3, aspect_ratio_min=1.0)
    # Bbox 800x300 (h/w=0.375 < 1.0) — aspect gate kicks in
    is_closeup, ratio, aspect = f.check_area((0, 200, 800, 300), (720, 1280))
    assert not is_closeup, "Horizontal bbox should be exempt"
    assert aspect < 1.0


def test_visibility_check_below_threshold():
    from app.inference.filters.closeup import CloseupFilter
    f = CloseupFilter(min_visible_keypoints=9)
    poor, count = f.check_visibility(np.zeros((17, 2)), _kpts_confidence(5))
    assert poor
    assert count == 5

    poor, count = f.check_visibility(np.zeros((17, 2)), _kpts_confidence(12))
    assert not poor
    assert count == 12


def test_visibility_none_inputs():
    from app.inference.filters.closeup import CloseupFilter
    f = CloseupFilter()
    poor, count = f.check_visibility(None, None)
    assert poor
    assert count == 0


def test_edge_proximity_top_and_bottom():
    from app.inference.filters.closeup import CloseupFilter
    f = CloseupFilter(edge_proximity_ratio=0.05)
    # Frame 720x1280, edge threshold = 36px (5% of 720)
    # Bbox 100, 5, 200, 710 — y1=5 (top), y2=715, bottom_dist=5 → both touch
    touches, dists = f.check_edge_proximity((100, 5, 200, 710), (720, 1280))
    assert touches
    assert dists["top_dist"] < 36
    assert dists["bottom_dist"] < 36

    # Bbox only touches top
    touches, _ = f.check_edge_proximity((100, 5, 200, 400), (720, 1280))
    assert not touches


def test_should_skip_combined_or_logic():
    """Any one of the 3 checks failing → skip=True."""
    from app.inference.filters.closeup import CloseupFilter
    f = CloseupFilter(area_threshold=0.4, min_visible_keypoints=9,
                      edge_proximity_ratio=0.05)
    frame_shape = (720, 1280)

    # Case 1: small bbox, good visibility, no edge — should pass
    d = f.should_skip(
        bbox_xywh=(400, 300, 100, 200),
        keypoints_xyn=np.zeros((17, 2)),
        kpts_conf=_kpts_confidence(15),
        frame_shape=frame_shape,
    )
    assert not d.skip
    assert d.reason == "ok"

    # Case 2: large vertical bbox triggers area check
    d = f.should_skip(
        bbox_xywh=(100, 50, 900, 650),   # h/w=0.72... actually wait, aspect=650/900=0.72 <1
        keypoints_xyn=np.zeros((17, 2)),
        kpts_conf=_kpts_confidence(15),
        frame_shape=frame_shape,
    )
    # aspect < 1 → area check gated, so this should NOT skip
    assert not d.skip

    # Case 3: tall narrow bbox covering large area
    d = f.should_skip(
        bbox_xywh=(400, 20, 400, 680),   # h/w=1.7 >1, area=272000/921600=0.295 (<0.4)
        keypoints_xyn=np.zeros((17, 2)),
        kpts_conf=_kpts_confidence(15),
        frame_shape=frame_shape,
    )
    # area below threshold but edge: y=20 (top<36), y+h=700 (bottom_dist=20<36) → edge_crop
    assert d.skip
    assert "edge_crop" in d.reason


def test_should_skip_poor_visibility():
    from app.inference.filters.closeup import CloseupFilter
    f = CloseupFilter(min_visible_keypoints=9, enable_area_check=False, enable_edge_check=False)
    d = f.should_skip(
        bbox_xywh=(100, 100, 200, 300),
        keypoints_xyn=np.zeros((17, 2)),
        kpts_conf=_kpts_confidence(3),
        frame_shape=(720, 1280),
    )
    assert d.skip
    assert "visible=3" in d.reason


def test_should_skip_no_bbox():
    from app.inference.filters.closeup import CloseupFilter
    f = CloseupFilter()
    d = f.should_skip(bbox_xywh=None, keypoints_xyn=None, kpts_conf=None,
                       frame_shape=(720, 1280))
    assert not d.skip
    assert d.reason == "no_pose_input"


def test_individual_check_toggles():
    from app.inference.filters.closeup import CloseupFilter
    # All disabled → never skips
    f = CloseupFilter(enable_area_check=False, enable_visibility_check=False, enable_edge_check=False)
    d = f.should_skip(
        bbox_xywh=(0, 0, 1280, 720),     # huge bbox
        keypoints_xyn=np.zeros((17, 2)),
        kpts_conf=_kpts_confidence(0),    # no visible
        frame_shape=(720, 1280),
    )
    assert not d.skip
