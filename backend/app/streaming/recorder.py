"""Pre/post fall clip recorder using a rolling deque buffer."""

import logging
import queue
import subprocess
import threading
from collections import deque
from datetime import datetime
from pathlib import Path
from typing import Callable, List, Optional

import cv2
import numpy as np

from app.inference.pipeline import FrameData

logger = logging.getLogger(__name__)


class ClipRecorder:
    """
    Maintains a rolling pre-fall frame buffer.
    On fall trigger: freezes pre-fall frames, then collects post-fall frames,
    encodes to MP4 and calls back with the output path.

    on_encoded(clip_id, duration_seconds) is invoked after encode completes
    so the metadata store can be updated with the real duration.
    """

    def __init__(self, clips_dir: Path, pre_seconds: float = 5.0,
                 post_seconds: float = 5.0, fps: int = 15,
                 on_encoded: Optional[Callable[[str, float], None]] = None):
        self.clips_dir = clips_dir
        self.clips_dir.mkdir(parents=True, exist_ok=True)
        self.pre_seconds = pre_seconds
        self.post_seconds = post_seconds
        self.fps = fps
        self.on_encoded = on_encoded

        maxlen = int(fps * pre_seconds * 1.5)   # a bit more than needed
        self._pre_buffer: deque = deque(maxlen=maxlen)

        self._recording = False
        self._post_frames: List[FrameData] = []
        self._current_clip_id: Optional[str] = None
        self._post_target: int = int(fps * post_seconds)
        self._lock = threading.Lock()

        self._encode_queue: queue.Queue = queue.Queue()
        self._encode_thread = threading.Thread(target=self._encode_loop,
                                                daemon=True, name="clip-encoder")
        self._encode_thread.start()

    @property
    def is_recording(self) -> bool:
        return self._recording

    def add_frame(self, fd: FrameData) -> None:
        """Call for every frame. Thread-safe."""
        with self._lock:
            if not self._recording:
                self._pre_buffer.append(fd)
            else:
                self._post_frames.append(fd)
                if len(self._post_frames) >= self._post_target:
                    self._finalize()

    def trigger(self, clip_id: str) -> None:
        """Called when fall detected. Freezes pre-fall buffer, starts post collection."""
        with self._lock:
            if self._recording:
                return
            self._recording = True
            self._current_clip_id = clip_id
            self._post_frames = []
            pre_frames = list(self._pre_buffer)
            self._pre_frames_snapshot = pre_frames
            logger.info(f"Clip recording started: {clip_id} | pre={len(pre_frames)} frames")

    def cancel_pending(self) -> None:
        """Abort current recording without encoding. Used when SDL P2 cancels alert."""
        with self._lock:
            if not self._recording:
                return
            cid = self._current_clip_id
            self._recording = False
            self._current_clip_id = None
            self._post_frames = []
            self._pre_frames_snapshot = []
            logger.info(f"Clip recording cancelled (P2): {cid}")

    def _finalize(self) -> None:
        """Must be called with lock held."""
        clip_id = self._current_clip_id
        pre = list(self._pre_frames_snapshot)
        post = list(self._post_frames)
        self._recording = False
        self._current_clip_id = None
        self._post_frames = []
        self._pre_buffer.clear()
        self._encode_queue.put((clip_id, pre, post))
        logger.info(f"Clip finalized for encoding: {clip_id} | "
                    f"pre={len(pre)} post={len(post)} frames")

    def _encode_loop(self) -> None:
        while True:
            try:
                clip_id, pre, post = self._encode_queue.get()
                self._encode(clip_id, pre, post)
            except Exception as exc:
                logger.error(f"Clip encode error: {exc}", exc_info=True)

    def _encode(self, clip_id: str, pre: List[FrameData],
                post: List[FrameData]) -> Optional[Path]:
        all_frames = pre + post
        if not all_frames:
            return None

        h, w = all_frames[0].frame.shape[:2]
        t_first = all_frames[0].timestamp
        t_last = all_frames[-1].timestamp
        duration = (t_last - t_first).total_seconds()
        actual_fps = len(all_frames) / duration if duration > 0.5 else float(self.fps)
        actual_fps = max(5.0, min(30.0, actual_fps))

        out_path = self.clips_dir / f"{clip_id}.mp4"
        # H.264 via ffmpeg: browser-playable + Telegram preview-friendly.
        # +faststart moves moov atom to file head so <video> can start before full DL.
        if not self._encode_h264(out_path, all_frames, actual_fps, w, h):
            # Fallback: legacy mp4v (won't preview in Firefox/Telegram but at least saved).
            logger.warning(f"ffmpeg H.264 encode failed; falling back to mp4v for {clip_id}")
            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            writer = cv2.VideoWriter(str(out_path), fourcc, actual_fps, (w, h))
            for fd in all_frames:
                writer.write(fd.frame)
            writer.release()

        # Extract thumbnail from the first post-fall frame (peak fall moment)
        thumb_frame = post[0].frame if post else all_frames[len(pre) // 2].frame
        thumb_path = self.clips_dir / f"{clip_id}_thumb.jpg"
        cv2.imwrite(str(thumb_path), thumb_frame)

        logger.info(f"Clip encoded: {out_path} ({duration:.1f}s @ {actual_fps:.1f}fps)")

        if self.on_encoded:
            try:
                self.on_encoded(clip_id, duration)
            except Exception as exc:
                logger.error(f"on_encoded callback failed for {clip_id}: {exc}")

        return out_path

    @staticmethod
    def _encode_h264(out_path: Path, frames: List[FrameData],
                     fps: float, w: int, h: int) -> bool:
        """Pipe raw BGR frames into ffmpeg → libx264 mp4. Returns True on success."""
        cmd = [
            "ffmpeg", "-y",
            "-f", "rawvideo", "-pix_fmt", "bgr24",
            "-s", f"{w}x{h}", "-r", f"{fps:.3f}",
            "-i", "-",
            "-c:v", "libx264", "-preset", "veryfast",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            "-loglevel", "error",
            str(out_path),
        ]
        try:
            proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
        except FileNotFoundError:
            logger.error("ffmpeg not found; clip will use mp4v fallback")
            return False

        try:
            for fd in frames:
                proc.stdin.write(fd.frame.tobytes())
            proc.stdin.close()
            ret = proc.wait(timeout=60)
            if ret != 0:
                err = proc.stderr.read().decode("utf-8", errors="ignore")
                logger.error(f"ffmpeg exit {ret}: {err}")
                return False
            return out_path.exists() and out_path.stat().st_size > 0
        except Exception as exc:
            logger.error(f"H.264 encode error: {exc!r}")
            try:
                proc.kill()
            except Exception:
                pass
            return False
