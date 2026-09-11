# AIComVis v1.0

Sistem deteksi jatuh real-time berbasis computer vision (ST-GCN++ skeleton classifier) dengan triase demografis. Dirancang untuk deployment CCTV institusional.

Tugas Akhir ET4092, Teknik Telekomunikasi ITB, 2026.
Septian Alfito Rachman (NIM 18122008), PLaiGROUND ITB.


## Tentang Project

Aplikasi web deteksi jatuh siap produksi:

- Membaca stream RTSP dari CCTV
- Mendeteksi jatuh secara real-time pakai ST-GCN++ (skeleton classifier 4 stream)
- Merekam klip 10 detik (5 detik pra + 5 detik pasca) saat ada kejadian
- Triase demografis (kelompok usia, jenis kelamin, kacamata) untuk prioritas pengasuh
- Mengirim alert Telegram berisi prioritas + tautan klip
- UI web untuk pemantauan langsung + penelusuran klip


## Arsitektur

```
RTSP CCTV
    |
YOLO pose (17 keypoint, ByteTrack multi-person)
    |
ST-GCN++ 4 stream (J/B/JM/BM) -> probabilitas jatuh per orang
    |
SDL gate (filter kecepatan + rasio aspek)
    |
Keputusan: ada yang jatuh?
    |
-> ClipRecorder (buffer 5 detik pra + 5 detik pasca)
-> TelegramNotifier (alert dengan triase)
-> WebSocket broadcast (update UI)
```


## Stack

- ML: YOLO26s-pose, ST-GCN++ (Duan et al. CVPR 2022)
- Backend: FastAPI + uvicorn, Python 3.10
- Frontend: React 18 + Vite 6 (pre-built ke static)
- GPU: NVIDIA CUDA 11.8 (GTX 1080+ disarankan)


## Quick Start

```bash
cd ~/aicomvis

# 1. Buat + aktifkan venv
python3.10 -m venv .venv
source .venv/bin/activate

# 2. Install dependency
pip install -r backend/requirements.txt

# 3. Konfigurasi environment
cp backend/.env.example backend/.env     # kalau .env belum ada
# Edit backend/.env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

# 4. Jalankan backend (sekaligus serve frontend di /)
cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Buka browser ke http://localhost:8000

Untuk mulai memantau jatuh (di terminal lain):

```bash
curl -X POST http://localhost:8000/api/inference/rtsp/start \
    -H "Content-Type: application/json" \
    -d '{"rtsp_url": "rtsp://USER:PASS@CAM_IP:554/stream1"}'
```


## Menjalankan dengan Docker

Alternatif dari Quick Start di atas. Butuh Docker Engine, Compose v2.24+, dan NVIDIA Container Toolkit.

```bash
cd ~/aicomvis

# 1. Konfigurasi environment
cp backend/.env.example backend/.env     # kalau .env belum ada
# Edit backend/.env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

# 2. Build + jalankan
cd docker
docker compose build                     # build pertama ~20 menit
docker compose up -d
docker compose logs -f aicomvis
```

Buka browser ke http://localhost:8000

Tanpa GPU (file mandiri, bukan override):

```bash
docker compose -f docker-compose.cpu.yml up -d
```

Menghentikan container: docker compose down

Catatan:

- Folder models/, clips/, dan data/ di-mount dari host, jadi bobot dan klip tetap ada setelah container dihapus.
- Isi models/ harus file asli, bukan symlink. Symlink yang menunjuk ke luar folder tidak terbaca dari dalam container.
- Docker 25+ memakai CDI untuk akses GPU. Kalau `--gpus all` ditolak, jalankan sekali:
  `sudo nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml && sudo systemctl restart docker`


## Model Produksi

Bobot produksi ada di models/stgcn_prod_{J,B,JM,BM}.pth, dilatih dengan transfer learning:

1. Pretrain pada 7 dataset publik (~3000 video) dengan LDAM Loss + K-fold Model Soups
2. Finetune pada 147 video Ruang XG

Performa (5-fold CV + bootstrap CI 1000 resamples):

- CAUCAFall (Eraso Guerrero dkk., 2022), GMDCSA-24 (Alam dkk., 2024), FUKinect, URFD (Kwolek dan Kepski, 2014), dan Le2i (Charfi dkk., 2013). : memperoleh rata-rata sensitivitas 86,9%, spesifisitas 92,0%, dan F1-score 86,3% 
- Ruang XG (n=147): Sens 88,9%, Spec 84,7%, F1 75,3%


## Struktur Folder (Produksi)

```
~/aicomvis/
├── .venv/                       # Python 3.10 venv (dibuat saat setup)
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── inference/
│   │   │   ├── stgcn_fall.py    # ST-GCN++ classifier (multi-person)
│   │   │   ├── yolo_pose.py     # YOLO pose extractor
│   │   │   ├── triage.py        # classifier usia/jenis kelamin/kacamata
│   │   │   ├── pipeline.py      # orchestration
│   │   │   └── inference_lib/   # dependensi model+checkpoint minimal
│   │   └── routers/             # endpoint FastAPI
│   ├── tests/
│   ├── requirements.txt
│   └── .env
├── frontend/                    # React source
├── static/                      # Built frontend (di-serve backend di /)
├── models/                      # Bobot produksi
├── data/live_events/            # Log event runtime
├── clips/                       # Penyimpanan klip runtime
├── docker/                      # Konfigurasi container
├── docs/
│   ├── ARCHITECTURE.md          # Pipeline + struktur + konfigurasi
│   ├── api.md                   # Referensi API
│   └── deployment.md            # Panduan deployment
└── README.md (file ini)
```


## Dokumentasi

- docs/ARCHITECTURE.md  pipeline, struktur folder, konfigurasi
- docs/api.md           referensi API
- docs/deployment.md    panduan deployment


## Research Archive

Metodologi, protokol evaluasi, kode training, info lisensi dataset, dan dokumentasi pra-cleanup disimpan terpisah di:

~/aicomvis_research_archive/

Isi penting:

- 01_STGCN++_breakthrough/docs/METODOLOGI_TA.md   metodologi lengkap
- 01_STGCN++_breakthrough/docs/HONEST_EVALUATION.md   protokol evaluasi bebas leakage
- 01_STGCN++_breakthrough/docs/ISTILAH_TEKNIS_TA.md   glosarium teknis
- 01_STGCN++_breakthrough/code/training/   infrastruktur training
- 04_research_datasets/   dataset pretrain (37GB)


## Lisensi

Penggunaan akademis. Bobot produksi berasal dari rekaman sendiri + dataset riset publik (lihat ~/aicomvis_research_archive/04_research_datasets/README.md untuk lisensi tiap dataset).
