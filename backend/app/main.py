"""
FastAPI entry point for AIComVis backend.

Startup sequence:
  1. Preload YOLO pose + ST-GCN++ ensemble (always-on)
  2. Najla triage models lazy-loaded on first fall
  3. ClipRecorder + ClipStore + FallStats initialized
  4. TelegramNotifier initialized
  5. InferencePipeline started (background thread)
  6. WebSocket status broadcaster started (asyncio task)
  7. React static files served at /
"""

import asyncio
import logging
import time
from collections import deque
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# App-wide logger config (capture INFO from all app modules — Najla lazy-load,
# RTSP connect, telegram send, etc.)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)

from app.config import settings
from app.inference.stgcn_fall import STGCNFallClassifier
from app.inference.pipeline import FrameData, InferencePipeline, InferenceResult
from app.inference.triage import TriageInference
from app.inference.yolo_pose import YoloPoseExtractor
from app.notifications.telegram import TelegramNotifier
from app.routers import clips, inference, stats, stream, system
from app.storage.clips import ClipStore
from app.storage.stats import FallStats
from app.streaming.recorder import ClipRecorder
from app.websocket.status_stream import broadcast_fall_event, broadcast_status_update, ws_status_handler

logger = logging.getLogger(__name__)

# ------------------------------------------------------------------
# Global singletons — accessed by routers via module-level imports
# ------------------------------------------------------------------
app_state: Dict[str, Any] = {}
clip_store: ClipStore = None   # type: ignore
fall_stats: FallStats = None   # type: ignore


def _build_clip_id() -> str:
    return "fall_" + datetime.now().strftime("%Y%m%d_%H%M%S")


def _on_inference_result(result: InferenceResult) -> None:
    """Called from inference worker thread for every frame. Thread-safe."""
    app_state["latest_result"] = result


def log_event(kind: str, message: str, level: str = "info") -> None:
    """Append an audit event to the in-memory system activity log. Surfaced
    by the /api/system/activity endpoint for the Settings page."""
    log = app_state.get("system_log")
    if log is None:
        return
    log.append({
        "kind": kind,
        "message": message,
        "level": level,
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
    })


@asynccontextmanager
async def lifespan(app: FastAPI):
    global clip_store, fall_stats

    logger.info("=== AIComVis startup ===")

    # Storage
    settings.clips_dir.mkdir(parents=True, exist_ok=True)
    clip_store = ClipStore(settings.clips_dir, settings.max_clips_storage_gb)
    fall_stats = FallStats(settings.clips_dir)

    # Models
    logger.info("Loading YOLO pose model...")
    yolo = YoloPoseExtractor(
        model_path=str(settings.model_path(settings.yolo_pose_model)),
        device=None,
    )

    logger.info("Loading ST-GCN++ fall classifier (4-stream v4 LDAM finetune)...")
    fall_clf = STGCNFallClassifier(
        models_dir=str(settings.models_dir),
        target_fps=settings.fps_target,
        window_size=30,
        threshold=settings.fall_threshold,
        k_consecutive=1,                     # v4 K=1 (SDL gate handles FP suppression)
        streams=("J", "B", "JM", "BM"),
        weights=[0.25, 0.25, 0.25, 0.25],   # equal weights — v4 K-fold val: configs converge
        sdl_velocity_gate=0.50,
        sdl_aspect_min=0.85,                 # v4 sujud/squat/bend gate
        sdl_aspect_velocity_protect=1.50,    # protect high-impact facing-cam falls
    )

    # Najla triage (lazy — not loaded yet)
    triage = TriageInference(
        age_gender_model_path=str(settings.model_path(settings.age_gender_model)),
        glasses_model_path=str(settings.model_path(settings.glasses_model)),
        enable_glasses=settings.enable_glasses_model,
    )

    # Recorder — updates clip metadata duration after encode completes,
    # then sends the clip video to Telegram (now that the MP4 actually exists).
    def _on_clip_encoded(clip_id: str, duration: float) -> None:
        clip_store.update_duration(clip_id, duration)
        tg = app_state.get("telegram")
        if tg is not None:
            clip_path = settings.clips_dir / f"{clip_id}.mp4"
            tg.send_clip_video(clip_path, caption=f"Klip jatuh · {clip_id}")

    recorder = ClipRecorder(
        clips_dir=settings.clips_dir,
        pre_seconds=5.0,
        post_seconds=5.0,
        fps=settings.fps_target,
        on_encoded=_on_clip_encoded,
    )

    # Telegram
    telegram = TelegramNotifier(
        bot_token=settings.telegram_bot_token,
        chat_id=settings.telegram_chat_id,
        cooldown_seconds=settings.notification_cooldown_seconds,
    )

    # Pipeline
    pipeline = InferencePipeline(yolo=yolo, fall_clf=fall_clf, triage=triage)
    pipeline.start(_on_inference_result)

    # Frame callback for RTSP consumer.
    # Updates app_state["latest_frame"] so the MJPEG endpoint can stream it.
    def on_frame(fd: FrameData) -> None:
        app_state["latest_frame"] = fd
        recorder.add_frame(fd)
        pipeline.push_frame(fd)

    # Fill app_state
    app_state.update({
        "yolo": yolo,
        "fall_clf": fall_clf,
        "triage": triage,
        "pipeline": pipeline,
        "recorder": recorder,
        "telegram": telegram,
        "rtsp_consumer": None,
        "rtsp_active": False,
        "rtsp_url": None,
        "on_frame": on_frame,
        "start_time": time.time(),
        "latest_result": None,
        "latest_frame": None,
        # Set by _fall_event_handler after P2 confirms. Status broadcaster reads this
        # so 'fall' activity (banner + red border) only shows POST-confirmation —
        # prevents the phantom-alert flicker when P2 cancels a tentative fall.
        "confirmed_fall_at": None,
        # In-memory ring buffer for audit/diagnostic events surfaced in Settings.
        "system_log": deque(maxlen=50),
    })
    log_event("startup", "Sistem AIComVis siap")
    log_event("model_load", "YOLO pose + ST-GCN++ ensemble berhasil dimuat")
    if telegram and telegram.enabled:
        log_event("telegram", "Bot Telegram terhubung")

    # Start WebSocket status broadcaster (asyncio task)
    broadcaster_task = asyncio.create_task(_status_broadcaster())

    # Fall event handler (polls latest_result in background)
    fall_handler_task = asyncio.create_task(
        _fall_event_handler(pipeline, recorder, telegram, clip_store)
    )

    logger.info("=== AIComVis ready ===")

    yield

    # Shutdown
    logger.info("=== AIComVis shutdown ===")
    broadcaster_task.cancel()
    fall_handler_task.cancel()
    pipeline.stop()
    consumer = app_state.get("rtsp_consumer")
    if consumer:
        consumer.stop()


async def _status_broadcaster() -> None:
    """Push inference status to all WebSocket clients every second."""
    while True:
        await asyncio.sleep(1)
        result: InferenceResult = app_state.get("latest_result")
        if result is None:
            payload = {
                "type": "status_update",
                "timestamp": datetime.now(tz=timezone.utc).isoformat(),
                "current_probability": 0.0,
                "current_activity": "normal",
                "person_detected": False,
                "current_triage": None,
            }
        else:
            # 'fall' activity unlocks for 5s after a confirmed fall — keeps the red banner
            # / pulsing UI state in sync with the alert TTL.
            confirmed_at = app_state.get("confirmed_fall_at")
            within_confirmed_window = (
                confirmed_at is not None
                and (datetime.now(tz=timezone.utc) - confirmed_at).total_seconds() < 5.0
            )
            if result.is_fall and within_confirmed_window:
                activity = "fall"
            elif result.is_fall or result.probability > 0.4:
                activity = "suspicious"
            else:
                activity = "normal"

            payload = {
                "type": "status_update",
                "timestamp": result.timestamp.isoformat(),
                "current_probability": round(result.probability, 4),
                "current_activity": activity,
                "person_detected": result.person_detected,
                "current_triage": result.triage.model_dump() if result.triage else None,
                "n_persons": getattr(result, "n_persons", 0),
                "persons": [
                    {
                        "track_id": p.track_id,
                        "probability": round(p.probability, 4),
                        "is_fall": p.is_fall,
                        "warmup_progress": round(p.warmup_progress, 3),
                        "bbox": list(p.bbox) if p.bbox else None,
                    }
                    for p in getattr(result, "persons", [])
                ],
            }
        await broadcast_status_update(payload)


async def _fall_event_handler(pipeline: InferencePipeline, recorder: ClipRecorder,
                               telegram: TelegramNotifier, store: ClipStore) -> None:
    """Detect rising-edge `is_fall=True` and fire alert (recording + Telegram + WS event)."""
    from app.schemas.clip import TriageInfo

    last_was_fall = False
    while True:
        await asyncio.sleep(0.1)
        result: InferenceResult = app_state.get("latest_result")
        if result is None:
            continue

        # Rising edge: only trigger when transitioning False -> True, and recorder is free.
        # The recorder check prevents cascade triggers while a clip is still capturing
        # post-fall frames.
        if (result.is_fall and not last_was_fall and not recorder.is_recording):
            clip_id = _build_clip_id()
            triage = result.triage or TriageInfo()
            clip_path = settings.clips_dir / f"{clip_id}.mp4"

            logger.warning(
                f"FALL DETECTED: {clip_id} (prob={result.probability:.2f})"
            )
            app_state["confirmed_fall_at"] = datetime.now(tz=timezone.utc)
            log_event(
                "fall",
                f"Jatuh terdeteksi (prob={result.probability:.2f}, klip={clip_id})",
                level="warning",
            )
            recorder.trigger(clip_id)
            store.save_metadata(
                clip_id=clip_id,
                timestamp=result.timestamp,
                duration_seconds=10.0,
                triage=triage,
                max_probability=result.probability,
            )
            # Text alert fires immediately (fast). The video is sent later from
            # _on_clip_encoded once the MP4 finishes encoding — at this point the
            # clip file does not exist yet, so passing clip_path here would be a no-op.
            telegram.send_fall_alert(
                camera_name=settings.camera_name,
                timestamp=result.timestamp,
                triage=triage,
                prob=result.probability,
            )
            await broadcast_fall_event(
                clip_id=clip_id,
                triage=triage.model_dump(),
                max_probability=result.probability,
            )

        last_was_fall = result.is_fall


# ------------------------------------------------------------------
# FastAPI app
# ------------------------------------------------------------------
app = FastAPI(
    title="AIComVis API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(clips.router)
app.include_router(inference.router)
app.include_router(system.router)
app.include_router(stats.router)
app.include_router(stream.router)


@app.websocket("/ws/stream/status")
async def websocket_status(websocket: WebSocket):
    await ws_status_handler(websocket)


# Serve React static files (built by Vite) at /
def _resolve_static_dir() -> Path | None:
    import os
    candidates = []
    if os.getenv("STATIC_DIR"):
        candidates.append(Path(os.environ["STATIC_DIR"]))
    candidates.append(Path("/app/static"))  # Docker default
    candidates.append(Path(__file__).resolve().parent.parent.parent / "static")  # local dev
    for c in candidates:
        if c.exists() and (c / "index.html").exists():
            return c
    return None


_static_dir = _resolve_static_dir()
if _static_dir:
    logger.info(f"Serving static frontend from {_static_dir}")
    app.mount("/", StaticFiles(directory=str(_static_dir), html=True), name="static")
else:
    logger.warning("No static frontend build found — only /api and /ws endpoints served")
