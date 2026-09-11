"""GET /api/status — system health check."""

import logging
import shutil
import time
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.schemas.status import SystemStatus

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["system"])


def _app_state():
    from app.main import app_state
    return app_state


@router.get("/status", response_model=SystemStatus)
async def get_status():
    state = _app_state()
    from app.config import settings

    disk = shutil.disk_usage(str(settings.clips_dir.parent))
    disk_free_gb = disk.free / (1024 ** 3)

    # Camera status
    rtsp_consumer = state.get("rtsp_consumer")
    if rtsp_consumer is None:
        camera = "offline"
    elif rtsp_consumer.is_connected:
        camera = "online"
    else:
        camera = "warning"

    # Model status
    model_yolo = "loaded" if state.get("yolo") else "error"
    model_fall = "loaded" if state.get("fall_clf") else "error"

    # Telegram
    telegram = state.get("telegram")
    if telegram is None:
        tg_status = "disconnected"
    elif not telegram.enabled:
        tg_status = "disconnected"
    else:
        tg_status = "connected"

    start_time = state.get("start_time", time.time())
    uptime = time.time() - start_time

    return SystemStatus(
        camera=camera,
        model_yolo=model_yolo,
        model_fall=model_fall,
        telegram=tg_status,
        last_heartbeat=datetime.now(tz=timezone.utc),
        uptime_seconds=round(uptime, 1),
        disk_free_gb=round(disk_free_gb, 2),
    )


@router.post("/notifications/test")
async def notifications_test():
    """Send a test Telegram message so the operator can verify the bot link
    from the Settings page. Returns {ok: true|false}."""
    state = _app_state()
    from app.config import settings

    telegram = state.get("telegram")
    if telegram is None or not telegram.enabled:
        raise HTTPException(status_code=503, detail="Telegram not configured")
    ok = telegram.send_test_message(camera_name=settings.camera_name)
    return {"ok": bool(ok)}


@router.get("/system/activity")
async def system_activity(limit: int = 20):
    """Return the most recent system events from the in-memory audit log.
    Used by the Settings page to render the System Activity Log card."""
    state = _app_state()
    log = state.get("system_log")
    events = list(log) if log else []
    return {"events": events[-limit:][::-1]}  # newest first
