"""Pydantic schemas for inference endpoints."""

from typing import List, Optional, Tuple
from pydantic import BaseModel

from app.schemas.clip import TriageInfo


class UploadInferenceResponse(BaseModel):
    verdict: str                          # fall_detected | no_fall
    max_probability: float
    peak_frame_time: Optional[float]
    triage: Optional[TriageInfo]
    probability_series: List[Tuple[float, float]]   # [(time_sec, probability), ...]
    velocity_series: List[Tuple[float, float]]       # [(time_sec, median-smoothed velocity)]


class RtspStartRequest(BaseModel):
    rtsp_url: Optional[str] = None   # falls back to settings.rtsp_url


class RtspStatusResponse(BaseModel):
    status: str
    rtsp_url: Optional[str] = None
