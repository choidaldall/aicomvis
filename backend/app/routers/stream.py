"""Live video streaming: MJPEG endpoint for in-browser preview.

Re-encodes the latest RTSP frame to JPEG and yields multipart stream.
Frontend uses <img src="/api/stream/mjpeg"> to display.

Trade-off chosen:
  - MJPEG (not WebRTC/HLS) for simplicity. Higher bandwidth than H.264 but
    needs no special build, no STUN/TURN, no .m3u8 segmenter.
  - JPEG quality 70 + 15 fps target → ~500-700 KB/s per client. Adequate for LAN.
  - Multi-client supported via independent generators (each reads same latest_frame).
"""

import asyncio
import logging

import cv2
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/stream", tags=["stream"])


def _app_state():
    from app.main import app_state
    return app_state


@router.get("/mjpeg")
async def mjpeg_stream(fps: int = 15, quality: int = 70):
    """Stream the live RTSP feed as MJPEG.

    Query params:
      - fps:     target frames per second (default 15, max 30)
      - quality: JPEG quality 1-95 (default 70). Lower = less bandwidth.
    """
    state = _app_state()
    if state.get("rtsp_consumer") is None or not state.get("rtsp_active"):
        raise HTTPException(status_code=503,
                            detail="RTSP belum aktif. Mulai dulu via /api/inference/rtsp/start")

    fps = max(1, min(30, fps))
    quality = max(1, min(95, quality))
    interval = 1.0 / fps

    boundary = b"--aicomvis-frame"
    encode_params = [cv2.IMWRITE_JPEG_QUALITY, quality]

    async def generator():
        last_frame_id = -1
        idle_count = 0
        try:
            while True:
                fd = state.get("latest_frame")
                if fd is None or fd.frame_id == last_frame_id:
                    idle_count += 1
                    if idle_count > 100:   # 6s no new frame → stream ended
                        logger.info("MJPEG generator: no new frames, ending stream")
                        break
                    await asyncio.sleep(interval)
                    continue

                idle_count = 0
                last_frame_id = fd.frame_id

                ok, buf = cv2.imencode(".jpg", fd.frame, encode_params)
                if not ok:
                    await asyncio.sleep(interval)
                    continue

                jpeg = buf.tobytes()
                yield (
                    boundary + b"\r\n"
                    b"Content-Type: image/jpeg\r\n"
                    b"Content-Length: " + str(len(jpeg)).encode() + b"\r\n\r\n"
                    + jpeg + b"\r\n"
                )
                await asyncio.sleep(interval)
        except asyncio.CancelledError:
            logger.debug("MJPEG client disconnected")
            raise
        except Exception as exc:
            logger.warning(f"MJPEG generator error: {exc!r}")

    return StreamingResponse(
        generator(),
        media_type="multipart/x-mixed-replace; boundary=aicomvis-frame",
        headers={"Cache-Control": "no-cache, no-store, must-revalidate"},
    )
