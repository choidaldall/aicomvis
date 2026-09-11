# Deployment Guide AIComVis Production

## Prerequisites

- Ubuntu 22.04 (or similar Linux), NVIDIA GPU dengan CUDA 11.8+ support (GTX 1080+ recommended)
- Python 3.10 (`python3.10 --version` harus jalan)
- Node.js 20+ (hanya untuk rebuild frontend — production already built di `static/`)
- Camera CCTV dengan RTSP stream support
- Telegram bot (untuk alert) — optional

## Setup (First Time)

### 1. Create dedicated venv

```bash
cd ~/aicomvis
python3.10 -m venv .venv
source .venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r backend/requirements.txt
```

Ini akan install:
- FastAPI + uvicorn (web server)
- PyTorch 2.7.1 + CUDA 11.8 (ML inference)
- OpenCV, ultralytics YOLO, numpy
- python-telegram-bot, websockets, dll

Sekitar 5-10 menit download (torch ~600MB).

### 3. Configure environment

```bash
cp backend/.env.example backend/.env       # kalau .env belum ada
nano backend/.env
```

Required keys di `.env`:

- RTSP_URL                   contoh rtsp://user:pass@CAMERA_IP:554/stream1 (opsional, bisa dikirim via API)
- TELEGRAM_BOT_TOKEN         contoh 1234567890:AAF... (untuk alert)
- TELEGRAM_CHAT_ID           contoh -1001234567890 (untuk alert)
- FALL_THRESHOLD             0.45 (default OK)
- HIGH_CONFIDENCE_THRESHOLD  0.99 (default OK, disable bypass)
- VELOCITY_THRESHOLD         0.5 (default OK)
- MAX_CLIPS_STORAGE_GB       5 (cap auto-rotation)
- API_PORT                   8000 (default OK)

## Run

```bash
source ~/aicomvis/.venv/bin/activate
cd ~/aicomvis/backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Backend juga serve static frontend di `/`. Buka browser ke http://localhost:8000

Saat startup, log akan tampil:
```
Loading YOLO pose model...
Loading ST-GCN++ fall classifier (J+B 2-stream, LDAM trained)...
ST-GCN++ loaded 4 models on cuda: 4 streams × 1 folds
...
Uvicorn running on http://0.0.0.0:8000
```

Kalau ada "CUDA initialization" warning, GPU driver mismatch — perlu reboot ke kernel yang ada modul nvidia-nya. Detail di Troubleshooting.

## Start Monitoring

Via UI: buka http://localhost:8000, klik tombol Start Monitoring (di Settings page).

Via API:
```bash
curl -X POST http://localhost:8000/api/inference/rtsp/start \
    -H "Content-Type: application/json" \
    -d '{"rtsp_url": "rtsp://user:pass@CAM_IP:554/stream1"}'
```

Stop monitoring:
```bash
curl -X POST http://localhost:8000/api/inference/rtsp/stop
```

Status check:
```bash
curl http://localhost:8000/api/status | python -m json.tool
```

## Run as Systemd Service (Optional)

```bash
sudo nano /etc/systemd/system/aicomvis.service
```

```ini
[Unit]
Description=AIComVis Fall Detection
After=network.target

[Service]
Type=simple
User=telmat
WorkingDirectory=/home/telmat/aicomvis/backend
Environment="PATH=/home/telmat/aicomvis/.venv/bin"
ExecStart=/home/telmat/aicomvis/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable aicomvis
sudo systemctl start aicomvis
sudo systemctl status aicomvis
```

## Rebuild Frontend (Optional)

Frontend sudah di-build ke `static/`. Kalau Brandon ubah React code:

```bash
cd ~/aicomvis/frontend
npm install        # first time only
npm run build      # outputs to ../static/
```

Backend otomatis serve `static/` di `/`. Reload browser saja.

## Troubleshooting

### GPU CUDA error: "forward compatibility was attempted"
NVIDIA driver mismatch dengan kernel. Solusi:
1. Cek kernel: `uname -r`
2. Cek available kernels: `ls /boot/vmlinuz*`
3. Reboot ke kernel yang punya modul nvidia: `sudo grub-reboot "Advanced options..."; sudo reboot`

### Backend tidak start: "ModuleNotFoundError: No module named 'app'"
Salah working directory. Harus jalan dari `~/aicomvis/backend/`:
```bash
cd ~/aicomvis/backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Camera tidak konek
1. Cek RTSP URL benar (user/pass/IP/path)
2. Ping camera IP dari machine: `ping CAM_IP`
3. Test RTSP dengan VLC dulu sebelum AIComVis

### Telegram alert tidak masuk
1. Cek `TELEGRAM_BOT_TOKEN` dan `CHAT_ID` di `.env`
2. Pastikan bot sudah di-add ke chat/group
3. Cek log backend untuk error Telegram API

### Clip storage penuh
Auto-rotation aktif default 5GB. Adjust di `.env`:
```
MAX_CLIPS_STORAGE_GB=10
```

## Production Tips

- Storage cap: auto-delete clip terlama saat melewati MAX_CLIPS_STORAGE_GB
- Telegram cooldown: NOTIFICATION_COOLDOWN_SECONDS=30 untuk cegah spam
- RTSP auto-reconnect: retry 5 detik kalau stream putus
- Triage lazy-load: model age/gender dimuat saat fall pertama (hemat VRAM idle)
- Multi-person: ByteTrack auto-track sampai 4 orang sekaligus, fall trigger per orang

## File Structure (Deployment)

```
~/aicomvis/
├── .venv/                         # Python 3.10 venv
├── backend/
│   ├── app/main.py                # FastAPI entry
│   ├── app/inference/inference_lib/  # Minimal ST-GCN++ deps
│   ├── requirements.txt
│   └── .env
├── frontend/                      # React source (optional rebuild)
├── static/                        # Built frontend (served by backend)
├── models/
│   ├── stgcn_prod_{J,B,JM,BM}.pth    # Production weights (2.3MB each)
│   ├── yolo26s-pose.pt               # YOLO pose (symlink ke ~/pifr_lstm/)
│   ├── age_gender_ver4_best.pt       # Najla triage (symlink)
│   └── glasses_ver2_best.pt          # Najla triage (symlink)
├── data/
│   ├── skeletons/user_feedback/   # Empty (active learning removed)
│   └── live_events/               # Runtime event logs
├── clips/                         # Recorded fall clips
└── docker/                        # Container configs (optional)
```

## Health Check Endpoint

```bash
curl http://localhost:8000/api/status
```

Output:
```json
{
    "camera": "online",
    "model_yolo": "loaded",
    "model_fall": "loaded",
    "telegram": "connected",
    "uptime_seconds": 3600,
    "disk_free_gb": 71.2
}
```

## Research / Training

Production deployment ini **inference-only**. Untuk training, evaluation reproducibility, dan dokumen TA, lihat:

**`~/aicomvis_research_archive/`** (separate folder, ~37GB)

- `01_STGCN++_breakthrough/code/training/` — full training code
- `01_STGCN++_breakthrough/docs/METODOLOGI_TA.md` — metodologi lengkap
- `04_research_datasets/` — pretrain datasets (NTU, FallVision, dll)
