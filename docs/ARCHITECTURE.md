# Arsitektur AIComVis v1.0

Dokumen teknis untuk pengembang yang bekerja pada backend/frontend AIComVis.


## 1. Tentang Project

Nama: AIComVis v1.0 (Vision-Based Fall Detection System)
Konteks: Tugas Akhir ET4092, Teknik Telekomunikasi ITB, 2026
Penulis: Septian Alfito Rachman (NIM 18122008), PLaiGROUND ITB

Folder ini adalah build produksi (inference-only) yang siap dijalankan. Berisi:

- Backend FastAPI (inference-only)
- Frontend React yang sudah di-build (static/)
- Bobot produksi ST-GCN++ 4 stream
- Pustaka inferensi minimal yang self-contained

Tujuan sistem: deteksi jatuh real-time dari CCTV menggunakan ST-GCN++ skeleton classifier. Saat jatuh terdeteksi:

1. Rekam klip 10 detik (5 detik pra + 5 detik pasca kejadian)
2. Triase demografis (kelompok usia/jenis kelamin/kacamata) via cascaded YOLO classifier
3. Kirim notifikasi Telegram berisi info triase
4. Broadcast status ke UI lewat WebSocket


## 2. Tech Stack

Backend:
- Framework: FastAPI + uvicorn (Python 3.10)
- ML: PyTorch 2.7.1 + CUDA 11.8
- CV: OpenCV (cv2), ultralytics YOLO
- Venv: .venv/ dedicated

Frontend:
- Sumber: React 18 + Vite 6
- Build: di static/, di-serve langsung oleh backend
- Rebuild: cd frontend && npm run build

Models (folder models/):
- stgcn_prod_{J,B,JM,BM}.pth  produksi ST-GCN++ 4 stream (~2.3 MB tiap stream)
- yolo26s-pose.pt  YOLO pose extractor
- age_gender_ver4_best.pt  classifier usia/jenis kelamin
- glasses_ver2_best.pt  detektor kacamata


## 3. Pipeline

```
RTSP Camera
    |
YoloPoseExtractor (ByteTrack multi-person, ID persisten)
    |
STGCNFallClassifier (buffer pose per track_id)
    ├── Forward 4 stream (J/B/JM/BM)
    ├── SDL velocity gate (peak_vel < 0.50 -> veto)
    └── SDL aspect gate (aspect < 0.85 DAN vel < 1.5 -> veto sujud/squat/bend)
    |
Keputusan per orang (is_fall)
    |
-> ClipRecorder (5 detik pra + 5 detik pasca)
-> TelegramNotifier (cooldown 30 detik)
-> WebSocket broadcast (update UI per orang)
```


## 4. Struktur Folder

```
aicomvis/
├── .venv/                          # Python 3.10 venv (dedicated)
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── inference/
│   │   │   ├── yolo_pose.py        # YOLO + ByteTrack
│   │   │   ├── stgcn_fall.py       # ST-GCN++ classifier (multi-person)
│   │   │   ├── triage.py           # Cascaded triage (lazy load)
│   │   │   ├── pipeline.py         # Orchestration
│   │   │   └── inference_lib/      # Dependensi ML self-contained
│   │   │       ├── checkpoint.py
│   │   │       ├── physics_features.py
│   │   │       ├── stream_transforms.py
│   │   │       ├── model_builder.py
│   │   │       ├── stgcn_plus.py
│   │   │       ├── graph.py
│   │   │       ├── layers.py
│   │   │       └── seed.py
│   │   ├── routers/                # clips, inference, stats, stream, system
│   │   ├── notifications/telegram.py
│   │   ├── schemas/
│   │   ├── storage/                # clips.py, stats.py
│   │   ├── streaming/              # rtsp.py, recorder.py
│   │   └── websocket/status_stream.py
│   ├── tests/
│   ├── requirements.txt
│   └── .env
├── frontend/                       # React source
├── static/                         # Built frontend
├── models/                         # 4 stgcn + 3 weight triase + yolo
├── data/live_events/               # Log event runtime
├── clips/                          # Klip jatuh terekam
├── docker/                         # Konfigurasi container
├── docs/
│   ├── api.md
│   ├── deployment.md
│   └── ARCHITECTURE.md             # dokumen ini
├── scripts/setup_dev.sh
└── README.md
```


## 5. Pustaka Inferensi Self-Contained

backend/app/inference/inference_lib/ adalah pustaka minimal agar produksi tidak bergantung pada infrastruktur training.

- checkpoint.py        load_checkpoint (atomic load)
- physics_features.py  compute_physics fitur global 4 dimensi
- stream_transforms.py apply_stream (J/B/JM/BM)
- model_builder.py     dispatcher build_model (stgcn_plus)
- stgcn_plus.py        backbone ST-GCN++
- graph.py             adjacency COCO-17
- layers.py            blok TCN
- seed.py              RngState (dependensi checkpoint)

Pola import di stgcn_fall.py:

```python
from app.inference.inference_lib.checkpoint import load_checkpoint
from app.inference.inference_lib.physics_features import compute_physics
```


## 6. Menjalankan

```bash
cd aicomvis
source .venv/bin/activate
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Browser ke http://localhost:8000


## 7. Konfigurasi (backend/.env)

- RTSP_URL                    opsional, bisa dikirim via API
- TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID   untuk alert Telegram
- FALL_THRESHOLD             default 0.45
- HIGH_CONFIDENCE_THRESHOLD  0.99 (efektif nonaktif, SDL gate yang menangani)
- VELOCITY_THRESHOLD         0.5
- MAX_CLIPS_STORAGE_GB       5


## 8. Performa (nested cross-validation, leak-free)

Angka jujur, terverifikasi tanpa kebocoran. JANGAN pakai angka lama
91.7%/98.2% (itu dari k-fold model-bersama = bocor di tingkat bobot).
Sumber lengkap: RINGKASAN_PERFORMA_FINAL.md (research archive).

Bebas-threshold (paling kuat) di situs deployment Ruang XG (n=147):
- AUROC 0.934 [0.89, 0.97], AUPRC 0.859 [0.76, 0.93].

Titik operasi:
- Aturan deployed saat ini (SDL gate + FALL_THRESHOLD 0.45) = konservatif:
  Sens 61% / Spec 97% / F1 72% (alarm palsu minim).
- Aturan recall-first (ambang skor mentah ~0.44, dipilih di validasi):
  Sens 89% / Spec 87% / F1 78% / MCC 0.71 (disarankan bila ingin tangkap
  lebih banyak jatuh).

Benchmark publik: F1 80-92%. Gabungan lintas-domain (n=246) lebih rendah
karena dataset shift data legacy.
