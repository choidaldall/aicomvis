"""Test demo notifikasi Telegram: kirim alert (jam WIB) + video jatuh menyusul,
untuk beberapa klip — meniru persis alur main.py (_fall_event_handler + _on_clip_encoded).
Jalankan dari folder backend/:  ../.venv/bin/python demo_telegram_test.py
"""
import time
from datetime import datetime
from pathlib import Path

from app.config import settings
from app.notifications.telegram import TelegramNotifier
from app.schemas.clip import TriageInfo

CLIPS = Path(__file__).resolve().parent.parent / "clips"
# 3 klip jatuh berbeda + skenario triase berbeda (biar prioritas MERAH/KUNING/HIJAU kelihatan)
TESTS = [
    ("fall_20260513_130007.mp4", TriageInfo(age_group="elderly", gender="male"),   0.93),
    ("fall_20260521_135615.mp4", TriageInfo(age_group="child",   gender="female"), 0.88),
    ("fall_20260521_164224.mp4", TriageInfo(age_group="adult",   gender="male", glasses=True), 0.81),
]

tg = TelegramNotifier(settings.telegram_bot_token, settings.telegram_chat_id,
                      cooldown_seconds=0)  # cooldown 0 supaya beberapa video bisa diuji
print(f"Telegram enabled={tg.enabled} | getMe ok={tg.test_connection()}")
assert tg.enabled, "Telegram belum dikonfigurasi di backend/.env"

for i, (clip, triage, prob) in enumerate(TESTS, 1):
    path = CLIPS / clip
    if not path.exists():
        print(f"[{i}] LEWAT: {clip} tidak ada"); continue
    ts = datetime.now()  # naive WIB (host = Asia/Jakarta) -> tampil sebagai WIB
    print(f"[{i}] kirim alert + video: {clip} (prob={prob}, {triage.age_group})")
    # 1) teks alert (langsung) — persis send_fall_alert di main.py
    tg.send_fall_alert(camera_name=settings.camera_name, timestamp=ts, triage=triage, prob=prob)
    time.sleep(2)  # jeda kecil seperti post-roll+encode di sistem nyata
    # 2) video menyusul — persis send_clip_video dari _on_clip_encoded
    tg.send_clip_video(path, caption=f"Klip jatuh - {clip.replace('.mp4','')}")
    time.sleep(6)  # beri waktu upload video sebelum klip berikutnya

time.sleep(8)  # tunggu thread upload terakhir selesai
print("Selesai. Cek Telegram-mu: tiap kejadian = 1 pesan teks (jam WIB) lalu 1 video.")
