"""Pydantic schemas for system status."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class SystemStatus(BaseModel):
    camera: str             # online | offline | warning
    model_yolo: str         # loaded | loading | error
    model_fall: str         # loaded | loading | error (ST-GCN++ 4-stream)
    telegram: str           # connected | disconnected | error
    last_heartbeat: datetime
    uptime_seconds: float
    disk_free_gb: float


class WsStatusUpdate(BaseModel):
    type: str = "status_update"
    timestamp: datetime
    current_probability: float
    current_activity: str    # normal | suspicious | fall
    person_detected: bool
    current_triage: Optional[dict] = None


class WsFallEvent(BaseModel):
    type: str = "fall_event"
    timestamp: datetime
    clip_id: str
    triage: dict
    max_probability: float
