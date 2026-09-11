"""Clip metadata storage — JSON sidecar files next to MP4 clips."""

import json
import logging
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.schemas.clip import ClipSummary, TriageInfo

logger = logging.getLogger(__name__)

VALID_CATEGORIES = {"unreviewed", "true_fall", "false_positive", "uncertain"}


def _meta_path(clips_dir: Path, clip_id: str) -> Path:
    return clips_dir / f"{clip_id}.json"


def _video_path(clips_dir: Path, clip_id: str) -> Path:
    return clips_dir / f"{clip_id}.mp4"


def _thumb_path(clips_dir: Path, clip_id: str) -> Path:
    return clips_dir / f"{clip_id}_thumb.jpg"


class ClipStore:
    def __init__(self, clips_dir: Path, max_storage_gb: float = 5.0):
        self.clips_dir = clips_dir
        self.max_storage_gb = max_storage_gb
        clips_dir.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    def save_metadata(self, clip_id: str, timestamp: datetime,
                      duration_seconds: float, triage: TriageInfo,
                      max_probability: float) -> None:
        meta: Dict[str, Any] = {
            "id": clip_id,
            "timestamp": timestamp.isoformat(),
            "duration_seconds": duration_seconds,
            "triage": triage.model_dump(),
            "max_probability": round(max_probability, 4),
            "category": "unreviewed",
        }
        with open(_meta_path(self.clips_dir, clip_id), "w") as f:
            json.dump(meta, f, indent=2)
        logger.info(f"Clip metadata saved: {clip_id}")
        self._enforce_storage_cap()

    def mark_category(self, clip_id: str, category: str) -> bool:
        if category not in VALID_CATEGORIES:
            return False
        meta_file = _meta_path(self.clips_dir, clip_id)
        if not meta_file.exists():
            return False
        with open(meta_file) as f:
            meta = json.load(f)
        meta["category"] = category
        with open(meta_file, "w") as f:
            json.dump(meta, f, indent=2)
        return True

    def update_duration(self, clip_id: str, duration_seconds: float) -> bool:
        """Update the clip's duration after encoding completes."""
        meta_file = _meta_path(self.clips_dir, clip_id)
        if not meta_file.exists():
            return False
        with open(meta_file) as f:
            meta = json.load(f)
        meta["duration_seconds"] = round(duration_seconds, 2)
        with open(meta_file, "w") as f:
            json.dump(meta, f, indent=2)
        return True

    def delete_metadata(self, clip_id: str) -> bool:
        """Delete clip metadata + video + thumbnail."""
        meta_file = _meta_path(self.clips_dir, clip_id)
        deleted = False
        if meta_file.exists():
            meta_file.unlink()
            deleted = True
        for ext in (".mp4", "_thumb.jpg"):
            f = self.clips_dir / f"{clip_id}{ext}"
            if f.exists():
                f.unlink()
        return deleted

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    def get_clip(self, clip_id: str) -> Optional[ClipSummary]:
        meta_file = _meta_path(self.clips_dir, clip_id)
        if not meta_file.exists():
            return None
        return self._load_summary(meta_file)

    def list_clips(self, limit: int = 20, offset: int = 0,
                   category: Optional[str] = None,
                   triage_filter: Optional[str] = None,
                   date_from: Optional[str] = None,
                   date_to: Optional[str] = None) -> tuple[List[ClipSummary], int]:
        meta_files = sorted(self.clips_dir.glob("*.json"), reverse=True)
        all_clips = []
        for mf in meta_files:
            if mf.stem.endswith("_thumb"):
                continue
            s = self._load_summary(mf)
            if s is None:
                continue
            if category and category != "all" and s.category != category:
                continue
            if triage_filter and triage_filter != "all" and s.triage.age_group != triage_filter:
                continue
            if date_from:
                if s.timestamp.date().isoformat() < date_from:
                    continue
            if date_to:
                if s.timestamp.date().isoformat() > date_to:
                    continue
            all_clips.append(s)

        total = len(all_clips)
        return all_clips[offset:offset + limit], total

    def video_path(self, clip_id: str) -> Optional[Path]:
        p = _video_path(self.clips_dir, clip_id)
        return p if p.exists() else None

    def thumb_path(self, clip_id: str) -> Optional[Path]:
        p = _thumb_path(self.clips_dir, clip_id)
        return p if p.exists() else None

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _load_summary(self, meta_file: Path) -> Optional[ClipSummary]:
        try:
            with open(meta_file) as f:
                meta = json.load(f)
            clip_id = meta["id"]
            return ClipSummary(
                id=clip_id,
                timestamp=datetime.fromisoformat(meta["timestamp"]),
                duration_seconds=meta["duration_seconds"],
                triage=TriageInfo(**meta["triage"]),
                max_probability=meta["max_probability"],
                category=meta.get("category", "unreviewed"),
                thumbnail_url=f"/api/clips/{clip_id}/thumbnail",
                video_url=f"/api/clips/{clip_id}/video",
            )
        except Exception as exc:
            logger.warning(f"Failed to load clip meta {meta_file}: {exc}")
            return None

    def _enforce_storage_cap(self) -> None:
        used_gb = sum(
            f.stat().st_size for f in self.clips_dir.iterdir() if f.is_file()
        ) / (1024 ** 3)

        if used_gb <= self.max_storage_gb:
            return

        # Delete oldest clips until under cap
        meta_files = sorted(self.clips_dir.glob("*.json"),
                            key=lambda f: f.stat().st_mtime)
        for mf in meta_files:
            if used_gb <= self.max_storage_gb * 0.9:
                break
            clip_id = mf.stem
            for path in [_video_path(self.clips_dir, clip_id),
                         _thumb_path(self.clips_dir, clip_id), mf]:
                if path.exists():
                    path.unlink()
                    used_gb -= path.stat().st_size / (1024 ** 3) if path.exists() else 0
            logger.info(f"Storage cap: deleted oldest clip {clip_id}")
