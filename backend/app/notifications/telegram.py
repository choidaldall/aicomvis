"""Telegram notifier with cooldown — ported from live_ipcam.py."""

import logging
import time
import threading
from pathlib import Path
from typing import Optional
from zoneinfo import ZoneInfo

import httpx

from app.schemas.clip import TriageInfo

# Alerts display Jakarta wallclock time, not server UTC.
_JAKARTA_TZ = ZoneInfo("Asia/Jakarta")

logger = logging.getLogger(__name__)

_TRIAGE_PRIORITY = {
    "elderly": "MERAH (Prioritas Tertinggi)",
    "child":   "KUNING (Prioritas Menengah)",
    "adult":   "HIJAU (Prioritas Standar)",
    "unknown": "ABU-ABU (Tidak Diketahui)",
}


def _format_alert(camera_name: str, timestamp, triage: TriageInfo, prob: float) -> str:
    gender_str = triage.gender if triage.gender != "unknown" else "tidak diketahui"
    age_str = triage.age_group if triage.age_group != "unknown" else "tidak diketahui"
    priority = _TRIAGE_PRIORITY.get(triage.age_group, _TRIAGE_PRIORITY["unknown"])

    # Frames are stamped with datetime.now() (naive server-local time), so a
    # naive value already represents wallclock on the host. astimezone() treats
    # a naive datetime as system-local and converts it to WIB; an aware value is
    # converted normally. Either way the message shows correct local time.
    local_ts = timestamp.astimezone(_JAKARTA_TZ)

    # Skip the glasses line when the model didn't detect — keeps the message
    # honest while ENABLE_GLASSES_MODEL=false.
    person_parts = [age_str, gender_str]
    if triage.glasses:
        person_parts.append("dengan kacamata")
    person_line = " ".join(person_parts)

    return (
        f"<b>FALL DETECTED</b>\n\n"
        f"Lokasi: {camera_name}\n"
        f"Waktu: {local_ts.strftime('%H:%M:%S')} WIB\n"
        f"Tanggal: {local_ts.strftime('%d/%m/%Y')}\n\n"
        f"Person: {person_line}\n"
        f"Prioritas: {priority}\n\n"
        f"Segera ke lokasi!"
    )


class TelegramNotifier:
    def __init__(self, bot_token: str, chat_id: str,
                 cooldown_seconds: int = 30):
        self.bot_token = bot_token
        self.chat_id = chat_id
        self.cooldown_seconds = cooldown_seconds
        self.enabled = bool(bot_token and chat_id)
        self._last_alert_time: float = 0.0
        self._lock = threading.Lock()

        if not self.enabled:
            logger.warning("Telegram not configured — notifications disabled")

    @property
    def base_url(self) -> str:
        return f"https://api.telegram.org/bot{self.bot_token}"

    def _in_cooldown(self) -> bool:
        return time.monotonic() - self._last_alert_time < self.cooldown_seconds

    def send_fall_alert(self, camera_name: str, timestamp,
                        triage: TriageInfo, prob: float,
                        clip_path: Optional[Path] = None) -> None:
        """
        Send alert text immediately, then clip video (if provided).
        Respects cooldown. Thread-safe (non-blocking — runs in background thread).
        """
        if not self.enabled:
            logger.info("[Telegram MOCK] Fall alert suppressed (not configured)")
            return

        with self._lock:
            if self._in_cooldown():
                logger.info("Telegram cooldown active — alert skipped")
                return
            self._last_alert_time = time.monotonic()

        threading.Thread(
            target=self._send_sequence,
            args=(camera_name, timestamp, triage, prob, clip_path),
            daemon=True,
        ).start()

    def _send_sequence(self, camera_name: str, timestamp,
                       triage: TriageInfo, prob: float,
                       clip_path: Optional[Path]) -> None:
        msg = _format_alert(camera_name, timestamp, triage, prob)
        ok = self._send_message(msg)
        if ok and clip_path and clip_path.exists():
            self._send_video(clip_path, caption=f"Clip {clip_path.stem}")

    def _send_message(self, text: str) -> bool:
        try:
            with httpx.Client(timeout=10) as client:
                r = client.post(
                    f"{self.base_url}/sendMessage",
                    data={"chat_id": self.chat_id, "text": text, "parse_mode": "HTML"},
                )
            if r.status_code == 200:
                logger.info("Telegram alert sent")
                return True
            logger.error(f"Telegram sendMessage failed: {r.status_code} {r.text}")
        except Exception as exc:
            logger.error(f"Telegram sendMessage error: {exc}")
        return False

    def _send_video(self, path: Path, caption: str = "") -> bool:
        try:
            with httpx.Client(timeout=120) as client:
                with open(path, "rb") as f:
                    r = client.post(
                        f"{self.base_url}/sendVideo",
                        data={"chat_id": self.chat_id, "caption": caption},
                        files={"video": (path.name, f, "video/mp4")},
                    )
            if r.status_code == 200:
                logger.info(f"Telegram video sent: {path.name}")
                return True
            logger.error(f"Telegram sendVideo failed: {r.status_code}")
        except Exception as exc:
            logger.error(f"Telegram sendVideo error: {exc}")
        return False

    def send_clip_video(self, clip_path: Path, caption: str = "") -> None:
        """Send a clip video on its own (no cooldown), in a background thread.

        Called once the MP4 is fully encoded (ClipRecorder.on_encoded) so the file
        actually exists. Fixes the race where send_fall_alert fired at detection
        time — before the ~5s post-roll + encode finished — and silently skipped
        the video because clip_path.exists() was still False.
        """
        if not self.enabled:
            return
        if not clip_path or not clip_path.exists():
            logger.warning(f"send_clip_video: clip missing, skip {clip_path}")
            return
        threading.Thread(
            target=self._send_video, args=(clip_path, caption), daemon=True
        ).start()

    def test_connection(self) -> bool:
        if not self.enabled:
            return False
        try:
            with httpx.Client(timeout=5) as client:
                r = client.get(f"{self.base_url}/getMe")
            return r.status_code == 200
        except Exception:
            return False

    def send_test_message(self, camera_name: str = "Test") -> bool:
        """Send a one-off test message that bypasses cooldown so the operator
        can verify the bot/chat configuration from the Settings page."""
        if not self.enabled:
            return False
        text = (
            f"<b>AIComVis · Pesan Uji</b>\n\n"
            f"Bot terhubung dan siap mengirim peringatan dari <b>{camera_name}</b>.\n"
            f"Apabila Anda menerima pesan ini, notifikasi Telegram telah aktif."
        )
        return self._send_message(text)
