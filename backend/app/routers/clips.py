"""REST endpoints for clip management."""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

from app.schemas.clip import ClipDetail, ClipListResponse, MarkClipRequest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/clips", tags=["clips"])


def _store():
    from app.main import clip_store
    return clip_store


@router.get("", response_model=ClipListResponse)
async def list_clips(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    category: Optional[str] = Query(None),
    triage: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    clips, total = _store().list_clips(
        limit=limit, offset=offset,
        category=category, triage_filter=triage,
        date_from=date_from, date_to=date_to,
    )
    return ClipListResponse(clips=clips, total=total, limit=limit, offset=offset)


@router.get("/{clip_id}", response_model=ClipDetail)
async def get_clip(clip_id: str):
    clip = _store().get_clip(clip_id)
    if not clip:
        raise HTTPException(status_code=404, detail="Clip tidak ditemukan")
    return clip


@router.get("/{clip_id}/video")
async def stream_video(clip_id: str):
    path = _store().video_path(clip_id)
    if not path:
        raise HTTPException(status_code=404, detail="Video tidak ditemukan")
    return FileResponse(str(path), media_type="video/mp4",
                        headers={"Accept-Ranges": "bytes"})


@router.get("/{clip_id}/thumbnail")
async def get_thumbnail(clip_id: str):
    path = _store().thumb_path(clip_id)
    if not path:
        raise HTTPException(status_code=404, detail="Thumbnail tidak ditemukan")
    return FileResponse(str(path), media_type="image/jpeg")


@router.post("/{clip_id}/mark")
async def mark_clip(clip_id: str, body: MarkClipRequest):
    ok = _store().mark_category(clip_id, body.category)
    if not ok:
        raise HTTPException(status_code=400,
                            detail="Clip tidak ditemukan atau kategori tidak valid")
    return {"status": "ok", "clip_id": clip_id, "category": body.category}
