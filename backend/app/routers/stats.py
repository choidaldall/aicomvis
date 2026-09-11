"""GET /api/stats/fall-count."""

from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/stats", tags=["stats"])


def _stats():
    from app.main import fall_stats
    return fall_stats


@router.get("/fall-count")
async def get_fall_count(period: str = Query("30d")):
    return _stats().get_fall_count(period)
