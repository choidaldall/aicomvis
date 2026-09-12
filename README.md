# AIComVis v1.0

DESIGN AND IMPLEMENTATION OF A SKELETON-BASED REAL-TIME FALL DETECTION SYSTEM ON CCTV USING ST-GCN++

## Tentang Project

Aplikasi web deteksi jatuh siap produksi:

- Membaca stream RTSP dari CCTV
- Mendeteksi jatuh secara real-time pakai ST-GCN++ (skeleton classifier 4 stream)
- Merekam klip 10 detik (5 detik pra dan 5 detik pasca) saat ada kejadian
- Triase demografis (kelompok usia, jenis kelamin, kacamata) untuk prioritas penanganan
- Mengirim alert Telegram berisi prioritas dan klip video
- UI web untuk pemantauan langsung dan daftar klip


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


## Prasyarat

Minimum:

- Python 3.10 (3.11 dan 3.12 juga jalan)
- RAM 8 GB
- Ruang disk 3 GB (mode CPU) atau 15 GB (mode Docker)

Untuk performa realtime:

- GPU NVIDIA, compute capability 6.1 ke atas (GTX 1080 atau lebih baru)
- Driver NVIDIA versi 520 ke atas
- CUDA 11.8

Tanpa GPU NVIDIA sistem tetap jalan di CPU, tetapi jauh di bawah realtime. Cukup untuk inferensi file video, tidak cukup untuk RTSP live.

Catatan GPU:

- GPU AMD tidak didukung. PyTorch ROCm hanya tersedia untuk Linux, dan tidak ada dukungan Windows.
- RTX 50-series (compute capability 12.0) tidak kompatibel dengan CUDA 11.8.


## Menyiapkan Bobot Model

Repositori ini menyertakan bobot ST-GCN++ hasil training pada penelitian ini:

```
models/stgcn_prod_J.pth   + stgcn_prod_J_config.yaml
models/stgcn_prod_B.pth   + stgcn_prod_B_config.yaml
models/stgcn_prod_JM.pth  + stgcn_prod_JM_config.yaml
models/stgcn_prod_BM.pth  + stgcn_prod_BM_config.yaml
```

Tiga bobot berikut tidak disertakan karena merupakan turunan pihak ketiga. Letakkan sendiri di folder models/:

```
yolo26s-pose.pt              ekstraktor pose YOLO            (wajib)
age_gender_ver4_best.pt      classifier usia/jenis kelamin   (wajib)
glasses_ver2_best.pt         detektor kacamata               (opsional)
```

Nama file dapat diubah lewat backend/.env: YOLO_POSE_MODEL, AGE_GENDER_MODEL, GLASSES_MODEL. Detektor kacamata nonaktif secara default (ENABLE_GLASSES_MODEL=false).

Metodologi training dan angka performa bobot ini ada di bagian Model Produksi.


## Konfigurasi

Salin contoh konfigurasi lalu isi nilainya:

```bash
cp backend/.env.example backend/.env
```

Isi yang perlu disesuaikan:

```
RTSP_URL                        rtsp://user:pass@IP:554/stream1 (opsional, bisa dikirim via API)
TELEGRAM_BOT_TOKEN              token dari @BotFather (kosongkan untuk menonaktifkan alert)
TELEGRAM_CHAT_ID                chat atau grup tujuan alert
FALL_THRESHOLD                  ambang probabilitas jatuh, default 0.45
VELOCITY_THRESHOLD              ambang SDL velocity gate, default 0.5
NOTIFICATION_COOLDOWN_SECONDS   jarak minimum antar alert, default 30
MAX_CLIPS_STORAGE_GB            kuota penyimpanan klip, default 5
```

File backend/.env sudah masuk .gitignore dan tidak boleh di-commit.


## Deployment di Linux

### Opsi A: Python venv

Pasang pustaka sistem yang dibutuhkan OpenCV dan perekaman klip:

```bash
sudo apt update
sudo apt install -y python3.10 python3.10-venv ffmpeg libgl1 libglib2.0-0
```

Buat virtual environment dan pasang dependensi:

```bash
python3.10 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt
```

Jalankan:

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Buka browser ke http://localhost:8000

Untuk mesin tanpa GPU NVIDIA, pasang torch versi CPU agar venv tidak membengkak dari 2,5 GB menjadi 6 GB oleh pustaka CUDA yang tidak terpakai:

```bash
pip install torch==2.7.1 torchvision==0.22.1 --index-url https://download.pytorch.org/whl/cpu
grep -vE '^(--extra-index-url|torch==|torchvision==)' backend/requirements.txt > req-cpu.txt
pip install -r req-cpu.txt
```

### Opsi B: Docker

Pasang Docker Engine:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Logout lalu login kembali agar keanggotaan grup docker aktif.

Untuk mesin ber-GPU NVIDIA, pasang NVIDIA Container Toolkit. Jalankan `sudo -v` sendirian terlebih dahulu, baru tempel blok di bawah, agar prompt password tidak menelan baris berikutnya:

```bash
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey \
  | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list \
  | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' \
  | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml
sudo systemctl restart docker
```

Baris `cdi generate` wajib untuk Docker 25 ke atas, yang mengakses GPU lewat CDI dan bukan lagi lewat runtime hook lama. Tanpa itu `--gpus all` ditolak dengan pesan "failed to discover GPU vendor from CDI".

Verifikasi GPU terbaca Docker:

```bash
docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi
```

Build dan jalankan:

```bash
cd docker
docker compose build
docker compose up -d
docker compose logs -f aicomvis
```

Tanpa GPU, gunakan file compose mandiri berikut:

```bash
docker compose -f docker-compose.cpu.yml build
docker compose -f docker-compose.cpu.yml up -d
```

Menghentikan container:

```bash
docker compose down
```

Catatan Docker:

- Butuh Compose v2.24 ke atas. Periksa dengan `docker compose version`.
- Folder models/, clips/, dan data/ di-mount dari host, sehingga bobot dan klip tetap ada setelah container dihapus.
- Isi models/ harus berupa file asli. Symlink yang menunjuk ke luar folder tidak terbaca dari dalam container. Ubah dengan `cp --remove-destination "$(readlink -f namafile.pt)" namafile.pt`
- Build pertama memerlukan waktu sekitar 20 menit dan ruang sekitar 15 GB, sebagian besar untuk wheel torch cu118 yang berukuran 2,5 GB.


## Deployment di Windows

Hanya mode CPU. CUDA di Windows memerlukan GPU NVIDIA; pengguna GPU AMD atau Intel tetap dapat menjalankan sistem ini, namun pada kecepatan CPU.

Pasang terlebih dahulu:

- Python dari https://www.python.org/downloads/ — centang "Add python.exe to PATH"
- Git dari https://git-scm.com/download/win

Buka PowerShell, lalu buat virtual environment:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

Jika muncul pesan "running scripts is disabled on this system", jalankan perintah berikut lalu ulangi aktivasi. Perintah ini hanya berlaku pada jendela PowerShell yang sedang terbuka dan tidak mengubah pengaturan sistem:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Pasang dependensi versi CPU:

```powershell
python -m pip install --upgrade pip
pip install torch==2.7.1 torchvision==0.22.1 --index-url https://download.pytorch.org/whl/cpu
Get-Content backend\requirements.txt |
  Where-Object { $_ -notmatch '^(--extra-index-url|torch==|torchvision==)' } |
  Set-Content req-cpu.txt
pip install -r req-cpu.txt
```

Tiga baris pertama requirements.txt mengunci torch varian CUDA 11.8, sehingga harus dilewati dan diganti dengan wheel CPU.

Salin konfigurasi:

```powershell
Copy-Item backend\.env.example backend\.env
notepad backend\.env
```

Jalankan:

```powershell
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Buka browser ke http://localhost:8000

Catatan Windows:

- Paket uvloop yang biasanya ditarik oleh uvicorn[standard] tidak tersedia untuk Windows. Penanda dependensinya sudah mengecualikan Windows, sehingga pip melewatinya secara otomatis dan tidak ada yang perlu dilakukan.
- Gunakan `curl.exe`, bukan `curl`, karena di PowerShell `curl` merupakan alias untuk Invoke-WebRequest yang sintaksnya berbeda.


## Verifikasi

Periksa status sistem:

```bash
curl http://localhost:8000/api/status
```

Keluaran yang benar memuat `"model_yolo":"loaded"` dan `"model_fall":"loaded"`.

Periksa device yang dipakai:

```bash
python -c "import torch; print(torch.cuda.is_available())"
```

Log saat startup akan menuliskan `loaded ... on cuda` atau `loaded ... on cpu` sesuai perangkat yang tersedia.

Uji inferensi tanpa kamera:

```bash
curl -X POST http://localhost:8000/api/inference/upload -F "video=@/path/video.mp4"
```

Nama field-nya adalah `video`. Respons memuat `verdict`, `max_probability`, dan deret probabilitas per frame.

Mulai memantau stream RTSP:

```bash
curl -X POST http://localhost:8000/api/inference/rtsp/start \
    -H "Content-Type: application/json" \
    -d '{"rtsp_url": "rtsp://USER:PASS@CAM_IP:554/stream1"}'
```

Menghentikan:

```bash
curl -X POST http://localhost:8000/api/inference/rtsp/stop
```


## Pemecahan Masalah

`torch.cuda.is_available()` bernilai False padahal ada GPU NVIDIA
Periksa versi driver dengan `nvidia-smi`; CUDA 11.8 memerlukan driver 520 ke atas. Pastikan pula torch yang terpasang adalah varian +cu118, bukan versi CPU.

`--gpus all` ditolak dengan pesan "failed to discover GPU vendor from CDI"
Docker 25 ke atas mengakses GPU melalui CDI. Jalankan `sudo nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml` lalu restart Docker.

Container berstatus unhealthy dan langsung berhenti
Periksa `docker compose logs aicomvis`. Penyebab paling umum adalah bobot model yang tidak ditemukan di /app/models, biasanya karena isi folder models/ masih berupa symlink.

`ModuleNotFoundError: No module named 'app'`
Uvicorn harus dijalankan dari dalam folder backend/, bukan dari root proyek.

Frontend tidak muncul, hanya endpoint API yang merespons
Backend tidak menemukan folder static/. Bangun ulang dari sumber React dengan `cd frontend && npm ci && npm run build`.

Port 8000 sudah dipakai proses lain
Ganti port lewat argumen uvicorn `--port 8001`, atau ubah pemetaan port pada file compose.


## Model Produksi

Bobot produksi ada di models/stgcn_prod_{J,B,JM,BM}.pth, dilatih dengan transfer learning:

1. Pretrain pada 7 dataset publik (~3000 video) dengan LDAM Loss dan K-fold Model Soups
2. Finetune pada 147 video dataset mandiri

Performa (5-fold CV + bootstrap CI 1000 resamples):

- CAUCAFall (Eraso Guerrero dkk., 2022), GMDCSA-24 (Alam dkk., 2024), FUKinect, URFD (Kwolek dan Kepski, 2014), dan Le2i (Charfi dkk., 2013). : memperoleh rata-rata sensitivitas 86,9%, spesifisitas 92,0%, dan F1-score 86,3% 
- Dataset Mandiri (n=147): sensitivitas 88,9%, spesifisitas 84,7%, dan F1-score 75,3%


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
├── docker/
│   ├── Dockerfile
│   ├── docker-compose.yml       # dengan GPU
│   └── docker-compose.cpu.yml   # tanpa GPU
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
