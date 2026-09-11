"""REST endpoints for inference (upload + RTSP control)."""

import logging
import tempfile
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np
from fastapi import APIRouter, HTTPException, UploadFile, File

from app.inference.pipeline import FrameData, InferencePipeline
from app.schemas.inference import (
    RtspStartRequest, RtspStatusResponse, UploadInferenceResponse,
)
from app.schemas.clip import TriageInfo

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/inference", tags=["inference"])


def _app_state():
    from app.main import app_state
    return app_state


@router.post("/upload", response_model=UploadInferenceResponse)
async def upload_inference(video: UploadFile = File(...)):
    """
    Run offline inference on an uploaded video file.
    Processes every frame sequentially, returns probability series.
    """
    state = _app_state()

    # Save upload to temp file
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp.write(await video.read())
        tmp_path = tmp.name

    try:
        result = await _run_offline_inference(state, tmp_path)
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    return result


async def _run_offline_inference(state, video_path: str) -> UploadInferenceResponse:
    import asyncio
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _sync_offline_inference, state, video_path)


def _sync_offline_inference(state, video_path: str) -> UploadInferenceResponse:
    from app.inference.stgcn_fall import STGCNFallClassifier
    from app.inference.yolo_pose import YoloPoseExtractor
    from app.inference.pipeline import VelocityTracker
    from app.config import settings

    yolo: YoloPoseExtractor = state["yolo"]
    triage_inf = state["triage"]

    # Fresh instances for offline (don't pollute live state)
    fall_offline = STGCNFallClassifier(
        models_dir=str(settings.models_dir),
        target_fps=settings.fps_target,
        window_size=30,
        threshold=settings.fall_threshold,
        k_consecutive=2,
        streams=("J", "B"),
        weights=[0.7, 0.3],
    )
    velocity_offline = VelocityTracker(velocity_threshold=settings.velocity_threshold)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise HTTPException(status_code=400, detail="Tidak dapat membuka video")

    native_fps = cap.get(cv2.CAP_PROP_FPS) or settings.fps_target
    base_time = datetime.now()
    frame_idx = 0

    prob_series = []
    vel_series = []
    max_prob = 0.0
    peak_frame = 0
    fall_detected = False
    triage_result: TriageInfo = TriageInfo()
    peak_frame_data = None

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        from datetime import timedelta
        ts = base_time + timedelta(seconds=frame_idx / native_fps)
        fd = FrameData(frame=frame, timestamp=ts, frame_id=frame_idx)

        keypoints, bbox, _ = yolo.extract(frame)
        prob = fall_offline.predict(keypoints, ts)
        velocity_offline.update(keypoints, bbox, frame.shape[0], ts)
        vel = velocity_offline.vertical_velocity

        time_sec = frame_idx / native_fps
        prob_series.append((round(time_sec, 3), round(prob, 4)))
        vel_series.append((round(time_sec, 3), round(vel, 4)))

        if prob > max_prob:
            max_prob = prob
            peak_frame = frame_idx
            peak_frame_data = fd

        # Hybrid ST-GCN++ decision
        if fall_offline.is_warmed_up:
            high_conf = prob >= settings.high_confidence_threshold
            medium_conf = prob > settings.fall_threshold and velocity_offline.is_falling_motion
            if high_conf or medium_conf:
                fall_detected = True   # latch

        frame_idx += 1

    cap.release()

    peak_time = peak_frame / native_fps if native_fps > 0 else None

    if fall_detected and peak_frame_data is not None:
        try:
            triage_result = triage_inf.run(peak_frame_data.frame)
        except Exception:
            triage_result = TriageInfo()

    verdict = "fall_detected" if fall_detected else "no_fall"

    return UploadInferenceResponse(
        verdict=verdict,
        max_probability=round(max_prob, 4),
        peak_frame_time=round(peak_time, 3) if peak_time is not None else None,
        triage=triage_result if fall_detected else None,
        probability_series=prob_series,
        velocity_series=vel_series,
    )


@router.post("/rtsp/start", response_model=RtspStatusResponse)
async def rtsp_start(body: RtspStartRequest = RtspStartRequest()):
    state = _app_state()
    if state.get("rtsp_active"):
        return RtspStatusResponse(status="already_running",
                                  rtsp_url=state.get("rtsp_url"))

    from app.config import settings
    url = body.rtsp_url or settings.rtsp_url
    if not url:
        raise HTTPException(status_code=400, detail="RTSP URL belum di-konfigurasi")

    import asyncio
    loop = asyncio.get_event_loop()
    try:
        await loop.run_in_executor(None, _start_rtsp, state, url)
    except ConnectionError as exc:
        from app.main import log_event
        log_event("rtsp_error", f"RTSP gagal terhubung: {exc}", level="error")
        raise HTTPException(status_code=502, detail=f"RTSP gagal terhubung: {exc}")
    from app.main import log_event
    log_event("rtsp_start", f"Kamera RTSP tersambung: {url}")
    return RtspStatusResponse(status="started", rtsp_url=url)


def _start_rtsp(state: dict, url: str) -> None:
    from app.streaming.rtsp import RTSPConsumer
    from app.config import settings

    consumer = RTSPConsumer(
        rtsp_url=url,
        target_fps=settings.fps_target,
        on_frame=state["on_frame"],
    )
    consumer.start()
    state["rtsp_consumer"] = consumer
    state["rtsp_active"] = True
    state["rtsp_url"] = url
    logger.info(f"RTSP started: {url}")


@router.post("/rtsp/stop", response_model=RtspStatusResponse)
async def rtsp_stop():
    state = _app_state()
    consumer = state.get("rtsp_consumer")
    if consumer:
        import asyncio
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, consumer.stop)
        state["rtsp_consumer"] = None
        state["rtsp_active"] = False
        state["rtsp_url"] = None
        logger.info("RTSP stopped")
        from app.main import log_event
        log_event("rtsp_stop", "Kamera RTSP diberhentikan")
    return RtspStatusResponse(status="stopped")
