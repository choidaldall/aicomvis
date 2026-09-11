# Bobot Model

## Disertakan di repository

Bobot ST-GCN++ hasil training pada penelitian ini (±2,3 MB per stream):

| File | Stream |
|---|---|
| `stgcn_prod_J.pth` + `stgcn_prod_J_config.yaml` | Joint |
| `stgcn_prod_B.pth` + `stgcn_prod_B_config.yaml` | Bone |
| `stgcn_prod_JM.pth` + `stgcn_prod_JM_config.yaml` | Joint motion |
| `stgcn_prod_BM.pth` + `stgcn_prod_BM_config.yaml` | Bone motion |

Keempatnya dimuat sekaligus sebagai ensemble; probabilitas jatuh diagregasi
lintas stream.

## Harus disiapkan sendiri

Bobot berikut merupakan turunan pihak ketiga dan tidak diredistribusikan.
Letakkan di folder ini sebelum menjalankan sistem:

| File | Isi | Wajib |
|---|---|---|
| `yolo26s-pose.pt` | Ekstraktor pose YOLO (17 keypoint COCO) | Ya |
| `age_gender_ver4_best.pt` | Classifier kelompok usia + jenis kelamin | Ya |
| `glasses_ver2_best.pt` | Detektor kacamata | Tidak — `ENABLE_GLASSES_MODEL=false` secara default |

Nama file dikonfigurasi lewat `backend/.env`: `YOLO_POSE_MODEL`,
`AGE_GENDER_MODEL`, `GLASSES_MODEL`.

## Catatan Docker

Folder ini di-mount read-only ke `/app/models` di dalam container. Isi folder
harus berupa **file asli** — symlink yang menunjuk ke luar folder tidak terbaca
dari dalam container. Untuk mengganti symlink dengan file asli:

```bash
cp --remove-destination "$(readlink -f yolo26s-pose.pt)" yolo26s-pose.pt
```
