# AIComVis API Reference

Base URL (development): http://localhost:8000

Semua endpoint diawali /api. Frontend di-serve di /.


## Clips

GET /api/clips

List klip jatuh dengan filter opsional.

Query params:
- limit (int, default 20)      jumlah maksimum hasil (1-100)
- offset (int, default 0)      offset paginasi
- category (string)            filter: unreviewed, true_fall, false_positive, uncertain
- triage (string)             filter kelompok usia: elderly, adult, child, unknown
- date_from (string)          batas bawah tanggal ISO (inklusif)
- date_to (string)            batas atas tanggal ISO (inklusif)

Response 200:
```json
{
  "clips": [
    {
      "id": "fall_20260501_143207",
      "timestamp": "2026-05-01T14:32:07Z",
      "duration_seconds": 6.4,
      "max_probability": 0.91,
      "triage": { "age_group": "elderly", "gender": "female", "glasses": false },
      "category": "unreviewed"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

GET /api/clips/{clip_id}

Ambil satu klip berdasarkan ID.
Response 200: objek klip tunggal (skema sama seperti di atas).
Response 404: klip tidak ditemukan.

GET /api/clips/{clip_id}/video

Stream berkas video MP4. Mendukung Accept-Ranges untuk seeking.
Response 200: video/mp4
Response 404: berkas video tidak ditemukan.

GET /api/clips/{clip_id}/thumbnail

Gambar thumbnail JPEG (frame jatuh pertama).
Response 200: image/jpeg
Response 404: thumbnail tidak ditemukan.

POST /api/clips/{clip_id}/mark

Tandai klip sebagai sudah ditinjau.

Body:
```json
{ "category": "true_fall" }
```

Kategori valid: true_fall, false_positive, uncertain, unreviewed

Response 200:
```json
{ "status": "ok", "clip_id": "fall_20260501_143207", "category": "true_fall" }
```

Response 400: klip tidak ditemukan atau kategori tidak valid.


## Statistics

GET /api/stats/fall-count

Agregasi jumlah jatuh per tanggal dan tier triase.

Query params:
- period (string, default 30d)   7d, 30d, 90d

Response 200:
```json
{
  "period": "30d",
  "data": [
    {
      "date": "2026-05-01",
      "total": 3,
      "by_triage": { "elderly": 2, "adult": 1, "child": 0, "unknown": 0 }
    }
  ]
}
```


## Inference

POST /api/inference/upload

Inferensi offline pada berkas video yang diunggah.
Body: multipart/form-data dengan field file (video/mp4 atau video/avi).

Response 200:
```json
{
  "result": "fall_detected",
  "max_probability": 0.89,
  "triage": { "age_group": "elderly", "gender": "male", "glasses": false }
}
```

POST /api/inference/rtsp/start

Mulai stream kamera RTSP langsung.
Response 200: { "status": "started" }

POST /api/inference/rtsp/stop

Hentikan stream kamera RTSP langsung.
Response 200: { "status": "stopped" }


## System

GET /api/status

Snapshot kesehatan sistem.

Response 200:
```json
{
  "camera": "online",
  "model_yolo": "loaded",
  "model_fall": "loaded",
  "telegram": "connected",
  "last_heartbeat": "2026-05-01T14:33:00Z",
  "uptime_seconds": 3672.4,
  "disk_free_gb": 48.2
}
```

Nilai status: online | warning | offline (kamera), loaded | loading | error (model), connected | disconnected (telegram).


## WebSocket

WS /ws/stream/status

Stream status inferensi real-time.

Pesan status_update (dikirim tiap 1 detik):
```json
{
  "type": "status_update",
  "timestamp": "2026-05-01T14:33:01Z",
  "current_probability": 0.12,
  "current_activity": "normal",
  "person_detected": true,
  "current_triage": null
}
```

Nilai current_activity: normal, suspicious, fall

Pesan fall_event (dikirim sekali tiap deteksi jatuh):
```json
{
  "type": "fall_event",
  "timestamp": "2026-05-01T14:32:07Z",
  "clip_id": "fall_20260501_143207",
  "triage": { "age_group": "elderly", "gender": "female", "glasses": false },
  "max_probability": 0.91
}
```
