"""Integration tests for critical paths: recorder, telegram, pipeline, websocket."""
import asyncio
import json
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import numpy as np
import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _frame(idx: int, ts: datetime, h: int = 120, w: int = 160) -> "FrameData":
    from app.inference.pipeline import FrameData
    arr = np.zeros((h, w, 3), dtype=np.uint8)
    arr[:] = (idx % 256, (idx * 2) % 256, (idx * 3) % 256)
    return FrameData(frame=arr, timestamp=ts, frame_id=idx)


# ---------------------------------------------------------------------------
# ClipRecorder — pre/post buffer + encode + on_encoded callback
# ---------------------------------------------------------------------------

def test_recorder_pre_buffer_rolls(tmp_path):
    from app.streaming.recorder import ClipRecorder
    rec = ClipRecorder(clips_dir=tmp_path, pre_seconds=1.0,
                       post_seconds=1.0, fps=10)
    # pre_buffer maxlen = int(10 * 1.0 * 1.5) = 15
    now = datetime.now()
    for i in range(50):
        rec.add_frame(_frame(i, now + timedelta(seconds=i * 0.1)))
    assert len(rec._pre_buffer) == 15, "Rolling buffer should cap at maxlen"


def test_recorder_trigger_and_finalize(tmp_path):
    from app.streaming.recorder import ClipRecorder
    encoded = []

    def on_encoded(clip_id, duration):
        encoded.append((clip_id, duration))

    rec = ClipRecorder(clips_dir=tmp_path, pre_seconds=0.5,
                       post_seconds=0.5, fps=10, on_encoded=on_encoded)

    now = datetime.now()
    # Fill pre-buffer
    for i in range(5):
        rec.add_frame(_frame(i, now + timedelta(seconds=i * 0.1)))

    # Trigger and feed post frames
    rec.trigger("test_clip_001")
    for i in range(5, 10):
        rec.add_frame(_frame(i, now + timedelta(seconds=i * 0.1)))

    # Wait for encode thread to finish (poll for output file)
    deadline = time.time() + 10
    while time.time() < deadline and not (tmp_path / "test_clip_001.mp4").exists():
        time.sleep(0.2)
    time.sleep(0.3)   # ensure callback fires after encode

    assert (tmp_path / "test_clip_001.mp4").exists(), "MP4 should be encoded"
    assert (tmp_path / "test_clip_001_thumb.jpg").exists(), "Thumbnail should be saved"
    assert len(encoded) == 1
    assert encoded[0][0] == "test_clip_001"
    assert encoded[0][1] > 0, "Duration should be positive"


def test_recorder_double_trigger_ignored(tmp_path):
    from app.streaming.recorder import ClipRecorder
    rec = ClipRecorder(clips_dir=tmp_path, pre_seconds=0.5,
                       post_seconds=0.5, fps=10)
    rec.trigger("clip_a")
    rec.trigger("clip_b")
    assert rec._current_clip_id == "clip_a", "Second trigger while recording should be no-op"


# ---------------------------------------------------------------------------
# TelegramNotifier — cooldown enforcement
# ---------------------------------------------------------------------------

def test_telegram_disabled_when_no_token():
    from app.notifications.telegram import TelegramNotifier
    tg = TelegramNotifier(bot_token="", chat_id="")
    assert not tg.enabled
    # Should not raise, just log
    tg.send_fall_alert(
        camera_name="Test", timestamp=datetime.now(),
        triage=MagicMock(age_group="adult", gender="male", glasses=False),
        prob=0.9,
    )


def test_telegram_cooldown_blocks_second_call():
    from app.notifications.telegram import TelegramNotifier
    from app.schemas.clip import TriageInfo

    tg = TelegramNotifier(bot_token="fake_token", chat_id="123",
                          cooldown_seconds=5)
    triage = TriageInfo(age_group="elderly", gender="female", glasses=True)
    now = datetime.now()

    with patch("app.notifications.telegram.httpx.Client") as mock_client:
        mock_ctx = MagicMock()
        mock_ctx.__enter__.return_value.post.return_value = MagicMock(status_code=200)
        mock_client.return_value = mock_ctx

        tg.send_fall_alert("Room A", now, triage, 0.9)
        time.sleep(0.5)  # let thread start
        first_call_time = tg._last_alert_time

        # Second call should be blocked by cooldown
        tg.send_fall_alert("Room A", now, triage, 0.95)
        assert tg._last_alert_time == first_call_time, "Cooldown should prevent update"


def test_telegram_format_alert():
    from app.notifications.telegram import _format_alert
    from app.schemas.clip import TriageInfo
    ts = datetime(2026, 5, 12, 14, 32, 7)
    triage = TriageInfo(age_group="elderly", gender="female", glasses=True)
    msg = _format_alert("Ruang XG", ts, triage, 0.92)
    assert "FALL DETECTED" in msg
    assert "elderly" in msg
    assert "female" in msg
    assert "kacamata" in msg
    assert "92" in msg  # 92.0%
    assert "MERAH" in msg


# ---------------------------------------------------------------------------
# InferencePipeline — drop-old queue + callback firing
# ---------------------------------------------------------------------------

def test_pipeline_drops_old_frames():
    from app.inference.pipeline import InferencePipeline

    # Don't start the worker — just test push_frame's drop policy
    pipe = InferencePipeline.__new__(InferencePipeline)
    from collections import deque
    pipe._frame_queue = deque(maxlen=4)

    now = datetime.now()
    for i in range(10):
        pipe.push_frame(_frame(i, now + timedelta(seconds=i)))

    assert len(pipe._frame_queue) == 4, "Queue capped at 4"
    # Should retain newest, drop oldest
    assert pipe._frame_queue[0].frame_id == 6, f"Got {pipe._frame_queue[0].frame_id}"
    assert pipe._frame_queue[-1].frame_id == 9


def test_pipeline_callback_fires_on_result():
    """Worker loop calls on_result for each processed frame."""
    from app.inference.pipeline import InferencePipeline, InferenceResult, FrameData

    yolo = MagicMock()
    yolo.extract.return_value = (None, None, None)   # no person → prob=0.0

    lstm = MagicMock()
    lstm.predict.return_value = 0.0
    lstm.is_warmed_up = False
    lstm.warmup_progress = 0.0

    triage = MagicMock()

    pipe = InferencePipeline(yolo=yolo, lstm=lstm, triage=triage)

    results = []
    pipe.start(lambda r: results.append(r))

    now = datetime.now()
    for i in range(3):
        pipe.push_frame(_frame(i, now + timedelta(seconds=i)))

    time.sleep(0.3)   # let worker drain
    pipe.stop()

    assert len(results) >= 1, "Callback should fire at least once"
    assert all(isinstance(r, InferenceResult) for r in results)


# ---------------------------------------------------------------------------
# RTSPConsumer — subprocess mocked
# ---------------------------------------------------------------------------

def test_rtsp_probe_fallback_on_ffprobe_failure():
    """When ffprobe fails, resolution falls back to 800x456."""
    from app.streaming.rtsp import RTSPConsumer

    consumer = RTSPConsumer(rtsp_url="rtsp://fake/stream", target_fps=15)

    with patch("app.streaming.rtsp.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=1, stdout="")
        consumer._probe_resolution()

    assert consumer.width == 800
    assert consumer.height == 456


def test_rtsp_probe_parses_ffprobe_output():
    from app.streaming.rtsp import RTSPConsumer

    consumer = RTSPConsumer(rtsp_url="rtsp://fake/stream", target_fps=15)

    with patch("app.streaming.rtsp.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="1280,720\n")
        consumer._probe_resolution()

    assert consumer.width == 1280
    assert consumer.height == 720


def test_rtsp_stop_terminates_process():
    from app.streaming.rtsp import RTSPConsumer

    consumer = RTSPConsumer(rtsp_url="rtsp://fake/stream", target_fps=15)
    mock_proc = MagicMock()
    consumer._proc = mock_proc
    consumer._thread = MagicMock()

    consumer.stop()

    assert consumer._stopped
    assert not consumer._connected
    mock_proc.terminate.assert_called_once()


# ---------------------------------------------------------------------------
# WebSocket broadcast — connected/disconnected handling
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_ws_broadcast_skips_dead_connections():
    from app.websocket import status_stream

    alive = AsyncMock()
    alive.send_text = AsyncMock()

    dead = AsyncMock()
    dead.send_text = AsyncMock(side_effect=Exception("connection closed"))

    status_stream._connections.clear()
    status_stream._connections.update({alive, dead})

    await status_stream.broadcast_status_update({"type": "status_update", "x": 1})

    alive.send_text.assert_awaited_once()
    # Dead connection should be removed
    assert dead not in status_stream._connections
    assert alive in status_stream._connections

    status_stream._connections.clear()


@pytest.mark.asyncio
async def test_ws_broadcast_fall_event_payload():
    from app.websocket import status_stream

    captured = []
    client = AsyncMock()

    async def fake_send(msg):
        captured.append(json.loads(msg))

    client.send_text = AsyncMock(side_effect=fake_send)

    status_stream._connections.clear()
    status_stream._connections.add(client)

    await status_stream.broadcast_fall_event(
        clip_id="fall_001", triage={"age_group": "elderly"}, max_probability=0.93,
    )

    assert len(captured) == 1
    assert captured[0]["type"] == "fall_event"
    assert captured[0]["clip_id"] == "fall_001"
    assert captured[0]["max_probability"] == 0.93
    assert captured[0]["triage"]["age_group"] == "elderly"

    status_stream._connections.clear()


# ---------------------------------------------------------------------------
# ClipStore — duration update
# ---------------------------------------------------------------------------

def test_clipstore_update_duration(tmp_path):
    from app.storage.clips import ClipStore
    from app.schemas.clip import TriageInfo

    store = ClipStore(clips_dir=tmp_path, max_storage_gb=1.0)
    store.save_metadata(
        "clip_x", datetime(2026, 5, 12, 14, 0, 0), 10.0,
        TriageInfo(), 0.88,
    )

    ok = store.update_duration("clip_x", 7.342)
    assert ok
    clip = store.get_clip("clip_x")
    assert clip.duration_seconds == 7.34


def test_clipstore_update_duration_missing(tmp_path):
    from app.storage.clips import ClipStore
    store = ClipStore(clips_dir=tmp_path, max_storage_gb=1.0)
    assert not store.update_duration("nonexistent", 5.0)
