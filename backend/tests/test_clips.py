"""Tests for clip storage and REST endpoints."""
import json
import tempfile
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# ClipStore unit tests
# ---------------------------------------------------------------------------

def _make_store(tmp_path: Path):
    from app.storage.clips import ClipStore
    return ClipStore(clips_dir=tmp_path, max_storage_gb=1.0)


def _triage(age="elderly", gender="female", glasses=False):
    from app.schemas.clip import TriageInfo
    return TriageInfo(age_group=age, gender=gender, glasses=glasses)


def _ts(date="2026-05-01T10:00:00"):
    return datetime.fromisoformat(date)


def test_save_and_get_clip(tmp_path):
    store = _make_store(tmp_path)
    store.save_metadata("clip_001", _ts(), 6.0, _triage(), 0.91)
    result = store.get_clip("clip_001")
    assert result is not None
    assert result.id == "clip_001"
    assert result.max_probability == pytest.approx(0.91, abs=0.001)


def test_mark_category(tmp_path):
    store = _make_store(tmp_path)
    store.save_metadata("clip_002", _ts("2026-05-01T11:00:00"), 5.0, _triage(), 0.82)
    ok = store.mark_category("clip_002", "true_fall")
    assert ok
    assert store.get_clip("clip_002").category == "true_fall"


def test_mark_invalid_category(tmp_path):
    store = _make_store(tmp_path)
    store.save_metadata("clip_003", _ts("2026-05-01T12:00:00"), 4.0, _triage(), 0.75)
    ok = store.mark_category("clip_003", "invalid_value")
    assert not ok


def test_list_clips_filter_by_category(tmp_path):
    store = _make_store(tmp_path)
    store.save_metadata("c000", _ts("2026-05-01T13:00:00"), 5.0, _triage(), 0.8)
    # Mark the others to different categories
    store.save_metadata("c001", _ts("2026-05-01T14:00:00"), 5.0, _triage(), 0.8)
    store.mark_category("c001", "true_fall")
    store.save_metadata("c002", _ts("2026-05-01T15:00:00"), 5.0, _triage(), 0.8)
    store.mark_category("c002", "false_positive")

    clips, total = store.list_clips(category="unreviewed")
    assert total == 1
    assert clips[0].id == "c000"


def test_list_clips_pagination(tmp_path):
    store = _make_store(tmp_path)
    for i in range(5):
        store.save_metadata(f"p{i:03d}", _ts(f"2026-05-0{i+1}T00:00:00"), 5.0, _triage(), 0.8)
    clips, total = store.list_clips(limit=2, offset=0)
    assert total == 5
    assert len(clips) == 2


# ---------------------------------------------------------------------------
# REST endpoint tests
# ---------------------------------------------------------------------------

@pytest.fixture()
def test_client(tmp_path):
    from app.storage.clips import ClipStore
    store = ClipStore(clips_dir=tmp_path, max_storage_gb=1.0)
    store.save_metadata(
        "test_clip", _ts("2026-05-01T14:00:00"), 7.0,
        _triage("elderly", "male", False), 0.88,
    )

    with patch("app.main.clip_store", store), \
         patch("app.main.app_state", {}):
        from app.main import app
        client = TestClient(app, raise_server_exceptions=True)
        yield client


def test_list_clips_endpoint(test_client):
    r = test_client.get("/api/clips")
    assert r.status_code == 200
    data = r.json()
    assert "clips" in data
    assert data["total"] >= 0


def test_get_clip_endpoint(test_client):
    r = test_client.get("/api/clips/test_clip")
    assert r.status_code == 200
    assert r.json()["id"] == "test_clip"


def test_get_clip_404(test_client):
    r = test_client.get("/api/clips/nonexistent")
    assert r.status_code == 404


def test_mark_clip_endpoint(test_client):
    r = test_client.post("/api/clips/test_clip/mark", json={"category": "true_fall"})
    assert r.status_code == 200
    assert r.json()["category"] == "true_fall"


def test_mark_clip_invalid(test_client):
    r = test_client.post("/api/clips/test_clip/mark", json={"category": "bogus"})
    assert r.status_code == 400
