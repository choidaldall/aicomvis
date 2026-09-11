"""Fall count statistics aggregated from clip metadata."""

import json
import logging
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Dict, List

logger = logging.getLogger(__name__)


class FallStats:
    def __init__(self, clips_dir: Path):
        self.clips_dir = clips_dir

    def get_fall_count(self, period: str = "30d") -> Dict:
        """
        Aggregate fall counts per date for the given period. Fills every day
        in the window with a zero-entry so the frontend chart renders the full
        date range (one bar per day) instead of stretching a single bar across.
        period: '7d' | '30d' | '90d'
        """
        days = self._parse_period(period)
        today = date.today()
        cutoff = datetime.combine(today - timedelta(days=days - 1), datetime.min.time())

        per_date: Dict[str, Dict] = {}
        for offset in range(days):
            key = (today - timedelta(days=days - 1 - offset)).isoformat()
            per_date[key] = {
                "total": 0,
                "by_triage": {"elderly": 0, "adult": 0, "child": 0, "unknown": 0},
            }

        for mf in self.clips_dir.glob("*.json"):
            if mf.stem.endswith("_thumb"):
                continue
            try:
                with open(mf) as f:
                    meta = json.load(f)
                ts = datetime.fromisoformat(meta["timestamp"])
                if ts < cutoff:
                    continue
                date_key = ts.date().isoformat()
                if date_key not in per_date:
                    continue
                triage = meta.get("triage", {})
                age_group = triage.get("age_group", "unknown")
                if age_group not in per_date[date_key]["by_triage"]:
                    age_group = "unknown"
                per_date[date_key]["total"] += 1
                per_date[date_key]["by_triage"][age_group] += 1
            except Exception as exc:
                logger.debug(f"Stats: skip {mf.name}: {exc}")

        data: List[Dict] = [
            {"date": k, "total": v["total"], "by_triage": v["by_triage"]}
            for k, v in per_date.items()   # already ordered chronologically
        ]
        return {"period": period, "data": data}

    @staticmethod
    def _parse_period(period: str) -> int:
        mapping = {"7d": 7, "30d": 30, "90d": 90}
        return mapping.get(period, 30)
