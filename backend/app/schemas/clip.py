"""Pydantic schemas for clip-related API responses."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class TriageInfo(BaseModel):
    age_group: str = "unknown"   # elderly | adult | child | unknown
    gender: str = "unknown"      # male | female | unknown
    glasses: bool = False


class ClipSummary(BaseModel):
    id: str
    timestamp: datetime
    duration_seconds: float
    triage: TriageInfo
    max_probability: float
    category: str             # unreviewed | true_fall | false_positive | uncertain
    thumbnail_url: str
    video_url: str


class ClipDetail(ClipSummary):
    pass


class ClipListResponse(BaseModel):
    clips: List[ClipSummary]
    total: int
    limit: int
    offset: int


class MarkClipRequest(BaseModel):
    category: str             # true_fall | false_positive | uncertain
