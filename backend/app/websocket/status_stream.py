"""WebSocket /ws/stream/status — push live inference status every second."""

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Set

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

_connections: Set[WebSocket] = set()


async def ws_status_handler(websocket: WebSocket) -> None:
    await websocket.accept()
    _connections.add(websocket)
    logger.info(f"WebSocket client connected (total={len(_connections)})")

    try:
        # Keep connection alive; sends come from broadcast_status_update
        while True:
            # Receive (client may send ping or nothing; we just keep reading)
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=30)
            except asyncio.TimeoutError:
                # Send a keepalive ping
                await websocket.send_text(json.dumps({"type": "ping"}))
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.warning(f"WebSocket closed with unexpected error: {exc!r}", exc_info=True)
    finally:
        _connections.discard(websocket)
        logger.info(f"WebSocket client disconnected (total={len(_connections)})")


async def broadcast_status_update(payload: dict) -> None:
    """Broadcast a status update to all connected clients. Fire-and-forget."""
    dead = set()
    msg = json.dumps(payload, default=str)
    for ws in list(_connections):
        try:
            await ws.send_text(msg)
        except Exception:
            dead.add(ws)
    _connections.difference_update(dead)


async def broadcast_fall_event(clip_id: str, triage: dict, max_probability: float) -> None:
    payload = {
        "type": "fall_event",
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
        "clip_id": clip_id,
        "triage": triage,
        "max_probability": round(max_probability, 4),
    }
    await broadcast_status_update(payload)
