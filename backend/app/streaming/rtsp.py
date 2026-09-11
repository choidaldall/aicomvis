"""RTSP consumer via FFmpeg subprocess (forced constant FPS) — ported from live_ipcam.py."""

import logging
import queue
import subprocess
import sys
import threading
from datetime import datetime
from typing import Callable, Optional

import numpy as np

from app.inference.pipeline import FrameData

logger = logging.getLogger(__name__)


class RTSPConsumer:
    """
    Reads RTSP stream via ffmpeg, forces constant FPS, pushes FrameData to callback.
    Uses drop-old queue policy (always real-time, no latency buildup).
    Auto-reconnects on stream loss.
    """

    def __init__(self, rtsp_url: str, target_fps: int = 15,
                 on_frame: Optional[Callable[[FrameData], None]] = None,
                 use_tcp: bool = True):
        self.rtsp_url = rtsp_url
        self.target_fps = target_fps
        self.on_frame = on_frame
        self.use_tcp = use_tcp

        self.width: Optional[int] = None
        self.height: Optional[int] = None
        self.frame_size: Optional[int] = None

        self._stopped = False
        self._connected = False
        self._frame_count = 0
        self._proc: Optional[subprocess.Popen] = None
        self._thread: Optional[threading.Thread] = None

    @property
    def is_connected(self) -> bool:
        return self._connected and not self._stopped

    def start(self) -> "RTSPConsumer":
        self._probe_resolution()
        self.frame_size = self.width * self.height * 3

        self._thread = threading.Thread(target=self._read_loop, daemon=True,
                                         name="rtsp-consumer")
        self._thread.start()

        # Wait for first frame (up to 15s)
        import time
        deadline = time.time() + 15
        while not self._connected and time.time() < deadline:
            time.sleep(0.1)

        if not self._connected:
            self.stop()
            raise ConnectionError(f"Cannot connect to RTSP stream: {self.rtsp_url}")

        logger.info(f"RTSP connected: {self.width}x{self.height} @ {self.target_fps}fps")
        return self

    def stop(self) -> None:
        self._stopped = True
        self._connected = False
        if self._proc:
            try:
                self._proc.terminate()
            except Exception:
                pass
        if self._thread:
            self._thread.join(timeout=5)

    def _probe_resolution(self) -> None:
        try:
            cmd = [
                "ffprobe", "-v", "error",
                "-rtsp_transport", "tcp" if self.use_tcp else "udp",
                "-select_streams", "v:0",
                "-show_entries", "stream=width,height",
                "-of", "csv=p=0", self.rtsp_url,
            ]
            out = subprocess.run(cmd, capture_output=True, timeout=15, text=True)
            if out.returncode == 0 and out.stdout.strip():
                w, h = out.stdout.strip().split(",")
                self.width, self.height = int(w), int(h)
                logger.info(f"Probed resolution: {self.width}x{self.height}")
                return
        except Exception as exc:
            logger.warning(f"ffprobe failed: {exc}. Using 800x456 fallback")
        self.width, self.height = 800, 456

    def _build_cmd(self) -> list:
        return [
            "ffmpeg",
            "-rtsp_transport", "tcp" if self.use_tcp else "udp",
            "-fflags", "nobuffer",
            "-flags", "low_delay",
            "-i", self.rtsp_url,
            "-vf", f"fps={self.target_fps},scale={self.width}:{self.height}",
            "-pix_fmt", "bgr24",
            "-f", "rawvideo",
            "-loglevel", "warning",
            "-",
        ]

    def _read_loop(self) -> None:
        import time
        while not self._stopped:
            cmd = self._build_cmd()
            logger.info("Starting ffmpeg RTSP reader...")
            try:
                self._proc = subprocess.Popen(
                    cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                    bufsize=10**8,
                )
            except FileNotFoundError:
                logger.error("ffmpeg not found. Install ffmpeg.")
                return

            # Drain stderr in background
            def _drain_stderr():
                for line in iter(self._proc.stderr.readline, b""):
                    msg = line.decode("utf-8", errors="ignore").strip()
                    if msg:
                        low = msg.lower()
                        if any(k in low for k in ["error", "401", "403", "timeout",
                                                   "refused", "unauthorized"]):
                            logger.error(f"[ffmpeg] {msg}")
            threading.Thread(target=_drain_stderr, daemon=True).start()

            while not self._stopped:
                raw = self._proc.stdout.read(self.frame_size)
                if len(raw) != self.frame_size:
                    logger.warning("RTSP stream ended / incomplete frame. Reconnecting in 2s...")
                    self._connected = False
                    break

                frame = np.frombuffer(raw, np.uint8).reshape((self.height, self.width, 3))
                self._frame_count += 1
                self._connected = True

                if self.on_frame:
                    fd = FrameData(
                        frame=frame,
                        timestamp=datetime.now(),
                        frame_id=self._frame_count,
                    )
                    self.on_frame(fd)

            try:
                self._proc.terminate()
                self._proc.wait(timeout=2)
            except Exception:
                try:
                    self._proc.kill()
                except Exception:
                    pass

            if not self._stopped:
                time.sleep(2)
