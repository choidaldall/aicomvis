// Onboarding tour + Help Center (FAQ).
// Bahasa Indonesia mengikuti KBBI/EYD; bahasa Inggris formal.
// Daftar langkah pada FAQ disajikan dalam bentuk numbering.

import React from 'react';
import { Button, Icon, useT } from './components.jsx';

// -------------------------------------------------------------------
// Strings
// -------------------------------------------------------------------
export const TOUR_STRINGS = {
  id: {
    welcome_title: 'Selamat datang di AIComVis',
    welcome_desc: 'AIComVis adalah sistem deteksi jatuh berbasis computer vision. Panduan singkat ini akan memandu Anda mengenal tiga halaman utama, yaitu Pemantauan Langsung, Riwayat Klip, dan Pengaturan. Durasi panduan kurang lebih satu menit.',
    start: 'Mulai panduan', skip: 'Lewati', skip_confirm: 'Apakah Anda yakin ingin melewati panduan?',
    later: 'Nanti saja', resume: 'Lanjutkan',
    progress: 'Langkah {n} dari {total}',
    next: 'Berikutnya', back: 'Kembali', got_it: 'Mengerti', done: 'Selesai',
    badge_live: 'Pemantau Aktif',     badge_live_desc: 'Anda telah memahami halaman Pemantauan Langsung.',
    badge_clips: 'Pemeriksa Klip',    badge_clips_desc: 'Anda telah memahami halaman Riwayat Klip.',
    badge_settings: 'Operator Siap',  badge_settings_desc: 'Anda telah memahami halaman Pengaturan.',
    badge_complete: 'Panduan Selesai',badge_complete_desc: 'Seluruh materi dasar telah dikuasai.',
    finish_title: 'Anda siap memulai',
    finish_desc: 'Selamat. Anda telah mengenal seluruh bagian utama AIComVis. Pusat Bantuan dapat dibuka kapan saja melalui tombol tanda tanya pada bilah sisi untuk membaca pertanyaan yang sering diajukan atau memutar ulang panduan ini.',
    finish_cta: 'Tutup',
    s_alert_title: 'Banner peringatan',
    s_alert_desc: 'Apabila sistem mendeteksi peristiwa jatuh, banner merah berdenyut akan muncul pada bagian atas halaman. Banner tersebut menampilkan kamera yang memicu peringatan, waktu kejadian, serta demografi orang yang terdeteksi.',
    s_tabs_title: 'Memilih kamera',
    s_tabs_desc: 'Setiap kamera ditampilkan sebagai tab pada bilah ini. Klik nama kamera untuk fokus pada satu kamera, atau klik tab Semua Kamera untuk melihat seluruh kamera sekaligus dalam tampilan grid.',
    s_tabs_action: 'Klik tab Semua Kamera untuk melanjutkan.',
    s_stats_title: 'Statistik harian',
    s_stats_desc: 'Panel di sebelah kanan menampilkan jumlah kejadian pada hari ini beserta perbandingannya dengan minggu sebelumnya. Diagram tujuh hari di bawahnya memberikan gambaran tren secara cepat.',
    s_metrics_title: 'Metrik sistem',
    s_metrics_desc: 'Empat metrik pada bagian bawah halaman selalu terlihat, yaitu jumlah deteksi dalam 24 jam terakhir, total bulan berjalan, ketersediaan kamera, serta waktu sinkronisasi terakhir.',
    s_nav_clips_title: 'Membuka Riwayat Klip',
    s_nav_clips_desc: 'Setiap kali peringatan dipicu, sistem menyimpan klip berdurasi sepuluh detik. Buka halaman Riwayat Klip dari bilah sisi untuk meninjau klip-klip tersebut.',
    s_nav_clips_action: 'Klik menu Riwayat Klip pada bilah sisi untuk melanjutkan.',
    s_search_title: 'Mencari klip',
    s_search_desc: 'Ketik demografi atau waktu pada kotak pencarian. Hasil akan tersaring secara langsung sesuai dengan kata kunci yang dimasukkan.',
    s_download_title: 'Mengunduh klip',
    s_download_desc: 'Setiap klip dapat diunduh sebagai berkas .mp4, baik satu per satu melalui tombol unduh pada daftar maupun seluruhnya sekaligus melalui tombol Unduh Semua.',
    s_nav_settings_title: 'Membuka Pengaturan',
    s_nav_settings_desc: 'Pada halaman Pengaturan, Anda dapat menambahkan kamera, mengatur tema dan bahasa, serta memantau status sistem secara menyeluruh.',
    s_nav_settings_action: 'Klik menu Pengaturan pada bilah sisi untuk melanjutkan.',
    s_cameras_title: 'Menambahkan kamera RTSP',
    s_cameras_desc: 'Pada bagian Kamera, tekan Ubah untuk mengisi nama kamera dan alamat RTSP. Tekan Uji Koneksi untuk memastikan stream dapat dijangkau, lalu aktifkan kamera melalui sakelar Aktif.',
    help_title: 'Pusat Bantuan',
    help_search: 'Cari pertanyaan',
    help_replay: 'Putar ulang panduan',
    help_close: 'Tutup',
    help_no_results: 'Tidak ada pertanyaan yang cocok.',
    help_contact_title: 'Masih butuh bantuan?',
    help_contact_desc: 'Hubungi tim PLaiGROUND ITB melalui surel support@plaiground.itb.ac.id.',

    faq_q1: 'Bagaimana cara mengatur nama kamera dan alamat RTSP?',
    faq_a1: { text: 'Untuk mengatur nama dan alamat RTSP kamera, ikuti langkah berikut.', steps: [
      'Buka halaman Pengaturan, kemudian gulir ke bagian Kamera.',
      'Tekan tombol Ubah pada kamera yang ingin dikonfigurasi.',
      'Isi kolom Nama untuk kamera tersebut.',
      'Masukkan alamat RTSP dengan format rtsp://192.168.1.10:554/stream1.',
      'Klik Uji Koneksi untuk memastikan stream dapat diakses.',
      'Klik Simpan, lalu aktifkan kamera dengan menekan sakelar Aktif.',
    ]},

    faq_q2: 'Apa arti warna triase merah, kuning, hijau, dan putih?',
    faq_a2: { text: 'Sistem mengelompokkan deteksi berdasarkan demografi orang yang terdeteksi mengikuti konvensi triase medis. Setiap warna memiliki tingkat prioritas yang berbeda.', steps: [
      'Merah untuk lansia, dengan prioritas tertinggi.',
      'Kuning untuk anak-anak, dengan prioritas menengah.',
      'Hijau untuk dewasa, dengan prioritas standar.',
      'Putih untuk demografi yang belum dapat dikenali oleh sistem.',
    ]},

    faq_q3: 'Bagaimana cara mengunduh klip kejadian?',
    faq_a3: { text: 'Klip kejadian dapat diunduh secara individu maupun keseluruhan.', steps: [
      'Buka halaman Riwayat Klip.',
      'Untuk mengunduh satu klip, klik ikon unduh pada baris klip yang diinginkan.',
      'Untuk mengunduh seluruh klip yang sedang ditampilkan, klik tombol Unduh Semua pada bagian kanan atas halaman.',
      'Berkas akan tersimpan dalam format .mp4 pada folder unduhan peramban Anda.',
    ]},

    faq_q4: 'Apakah video direkam dan disimpan secara permanen?',
    faq_a4: { text: 'Tidak. Sistem hanya menyimpan klip berdurasi sepuluh detik di sekitar setiap peristiwa deteksi jatuh. Tidak ada perekaman video kontinu. Seluruh klip tersimpan pada komputer laboratorium lokal, bukan pada layanan awan, sehingga privasi pengguna tetap terjaga.' },

    faq_q5: 'Bagaimana cara melihat statistik kejadian dalam periode tertentu?',
    faq_a5: { text: 'Statistik kejadian tersedia pada dua tempat.', steps: [
      'Pada halaman Pemantauan Langsung, kartu Statistik Hari Ini menampilkan jumlah kejadian hari berjalan beserta tren tujuh hari terakhir.',
      'Pada halaman Riwayat Klip, diagram pada bagian atas menampilkan statistik 30 hari terakhir secara baku.',
      'Untuk mengubah periode menjadi 7 hari atau 90 hari, klik chip periode pada bagian atas diagram.',
    ]},

    faq_q6: 'Berapa kamera maksimum yang dapat ditampilkan?',
    faq_a6: { text: 'Antarmuka pengguna mendukung hingga delapan kamera. Pada versi 1.0 ini, hanya satu kamera yang dapat aktif (terhubung) pada satu waktu karena pipeline inferensi backend masih bersifat aliran tunggal pada GPU GTX 1080 8GB. Dukungan multi-kamera serentak direncanakan pada versi berikutnya.' },

    faq_q7: 'Apakah AIComVis dapat diakses melalui telepon pintar?',
    faq_a7: { text: 'Ya. Antarmuka AIComVis sepenuhnya responsif. Pada layar telepon, bilah sisi otomatis berubah menjadi menu geser yang dapat dibuka melalui ikon hamburger. Untuk pengalaman serupa aplikasi asli, kami menyarankan menambahkan halaman ini ke layar utama melalui fitur Tambahkan ke Layar Beranda pada iOS atau Pasang Aplikasi pada Android Chrome.' },

    faq_q8: 'Apakah pengguna dapat mengganti model machine learning?',
    faq_a8: { text: 'Pada versi 1.0 ini, model deteksi jatuh yang terdiri atas YOLO-pose dan ST-GCN++ sudah dilatih ulang secara khusus dan tidak dapat diganti melalui antarmuka pengguna. Penggantian model memerlukan pelatihan ulang dengan dataset yang sesuai dan validasi performa pada protokol evaluasi.' },

    faq_q9: 'Mengapa kamera saya muncul tetapi tampilan stream kosong?',
    faq_a9: { text: 'Apabila kamera terdaftar namun tampilannya kosong, periksa hal-hal berikut.', steps: [
      'Pastikan alamat RTSP yang dimasukkan benar dan dapat dijangkau dari jaringan komputer inferensi.',
      'Sertakan nama pengguna dan kata sandi pada alamat RTSP apabila kamera memerlukan autentikasi.',
      'Pastikan tembok api tidak memblokir port 554 yang digunakan oleh protokol RTSP.',
      'Klik tombol Ubah pada kamera, kemudian jalankan Uji Koneksi untuk mendiagnosis sumber masalah.',
    ]},

    faq_q10: 'Bagaimana cara mengganti bahasa atau tema tampilan?',
    faq_a10: { text: 'Pengaturan bahasa dan tema tersedia pada dua tempat.', steps: [
      'Bahasa dapat diubah melalui sakelar ID atau EN pada bagian kanan atas halaman.',
      'Tema dapat diubah melalui sakelar Terang atau Gelap pada bagian bawah bilah sisi.',
      'Pilihan tema Otomatis tersedia pada halaman Pengaturan, bagian Tampilan, dan akan mengikuti preferensi sistem operasi Anda.',
    ]},
  },

  en: {
    welcome_title: 'Welcome to AIComVis',
    welcome_desc: 'AIComVis is a computer vision based fall detection system. This brief guided tour will walk you through the three core pages: Live Monitor, Clip Browser, and Settings. The tour takes approximately one minute.',
    start: 'Start tour', skip: 'Skip', skip_confirm: 'Are you sure you want to skip the tour?',
    later: 'Later', resume: 'Continue',
    progress: 'Step {n} of {total}',
    next: 'Next', back: 'Back', got_it: 'Got it', done: 'Done',
    badge_live: 'Active Watcher',     badge_live_desc: 'You have completed the Live Monitor page.',
    badge_clips: 'Clip Reviewer',     badge_clips_desc: 'You have completed the Clip Browser page.',
    badge_settings: 'Ready Operator', badge_settings_desc: 'You have completed the Settings page.',
    badge_complete: 'Tour Complete',  badge_complete_desc: 'All fundamentals are now covered.',
    finish_title: 'You are ready to begin',
    finish_desc: 'Well done. You are now familiar with every major area of AIComVis. The Help Center can be opened at any time from the question mark button in the sidebar to review frequently asked questions or replay this tour.',
    finish_cta: 'Close',
    s_alert_title: 'Alert banner',
    s_alert_desc: 'When the system detects a fall, a pulsing red banner appears at the top of the page. The banner indicates which camera triggered the alert, the time of the event, and the demographic of the detected person.',
    s_tabs_title: 'Selecting a camera',
    s_tabs_desc: 'Each camera appears as a tab on this bar. Click a camera name to focus on a single camera, or click All Cameras to view every camera at once in a grid.',
    s_tabs_action: 'Click the All Cameras tab to continue.',
    s_stats_title: 'Daily statistics',
    s_stats_desc: 'The panel on the right shows the number of events today along with the comparison against the previous week. The seven-day chart below offers a quick view of the trend.',
    s_metrics_title: 'System metrics',
    s_metrics_desc: 'Four metrics at the bottom of the page remain visible at all times: detections in the last 24 hours, total for the current month, camera availability, and time since the last synchronization.',
    s_nav_clips_title: 'Opening the Clip Browser',
    s_nav_clips_desc: 'Each time an alert is triggered, the system saves a ten second clip. Open the Clip Browser page from the sidebar to review these clips.',
    s_nav_clips_action: 'Click the Clip Browser menu item in the sidebar to continue.',
    s_search_title: 'Searching for a clip',
    s_search_desc: 'Type a demographic or a time into the search box. The results are filtered in real time according to your keywords.',
    s_download_title: 'Downloading a clip',
    s_download_desc: 'Each clip can be downloaded as an .mp4 file, either one at a time using the download button next to each list entry or all at once using the Download All button.',
    s_nav_settings_title: 'Opening the Settings',
    s_nav_settings_desc: 'On the Settings page you can add cameras, configure theme and language, and monitor overall system status.',
    s_nav_settings_action: 'Click the Settings menu item in the sidebar to continue.',
    s_cameras_title: 'Adding an RTSP camera',
    s_cameras_desc: 'In the Cameras section, press Edit to fill in the camera name and RTSP URL. Press Test Connection to verify that the stream is reachable, then activate the camera with the Active switch.',
    help_title: 'Help Center',
    help_search: 'Search questions',
    help_replay: 'Replay tour',
    help_close: 'Close',
    help_no_results: 'No matching questions.',
    help_contact_title: 'Still need help?',
    help_contact_desc: 'Contact the PLaiGROUND ITB team at support@plaiground.itb.ac.id.',

    faq_q1: 'How do I set the camera name and RTSP URL?',
    faq_a1: { text: 'To set the camera name and RTSP URL, follow these steps.', steps: [
      'Open the Settings page and scroll to the Cameras section.',
      'Click the Edit button on the camera you want to configure.',
      'Fill in the Name field for that camera.',
      'Enter the RTSP URL in the format rtsp://192.168.1.10:554/stream1.',
      'Click Test Connection to verify that the stream is reachable.',
      'Click Save, then activate the camera with the Active switch.',
    ]},

    faq_q2: 'What do the red, yellow, green, and white triage colors mean?',
    faq_a2: { text: 'The system classifies detections by the demographic of the detected person, following standard medical triage conventions. Each color represents a different priority level.', steps: [
      'Red is used for the elderly, indicating the highest priority.',
      'Yellow is used for children, indicating medium priority.',
      'Green is used for adults, indicating standard priority.',
      'White indicates that the demographic could not be identified.',
    ]},

    faq_q3: 'How do I download event clips?',
    faq_a3: { text: 'Event clips can be downloaded individually or in bulk.', steps: [
      'Open the Clip Browser page.',
      'To download a single clip, click the download icon on the desired clip row.',
      'To download all currently displayed clips, click the Download All button at the top right of the page.',
      'Files are saved in .mp4 format to your browser download folder.',
    ]},

    faq_q4: 'Is the video recorded and stored permanently?',
    faq_a4: { text: 'No. The system only stores a ten second clip surrounding each detected fall event. There is no continuous video recording. All clips are saved on the local laboratory computer rather than on a cloud service, so user privacy is preserved.' },

    faq_q5: 'How do I view event statistics for a particular period?',
    faq_a5: { text: 'Event statistics are available in two places.', steps: [
      'On the Live Monitor page, the Today statistics card shows the count for the current day together with the seven-day trend.',
      'On the Clip Browser page, the chart at the top displays statistics for the last 30 days by default.',
      'To change the period to 7 days or 90 days, click the period chip at the top of the chart.',
    ]},

    faq_q6: 'What is the maximum number of cameras supported?',
    faq_a6: { text: 'The user interface supports up to eight cameras. In version 1.0, only one camera can be active (connected) at a time because the backend inference pipeline is still single-stream on a GTX 1080 8GB GPU. Concurrent multi-camera support is planned for a future version.' },

    faq_q7: 'Can AIComVis be accessed from a smartphone?',
    faq_a7: { text: 'Yes. The AIComVis interface is fully responsive. On phone-sized screens the sidebar automatically collapses into a slide-out menu that can be opened from the hamburger icon. For a native-like experience, we recommend adding the page to the home screen using Add to Home Screen on iOS or Install App on Android Chrome.' },

    faq_q8: 'Can the user swap the machine learning model?',
    faq_a8: { text: 'In version 1.0, the fall detection model consisting of YOLO-pose and ST-GCN++ has been specifically retrained and cannot be replaced from the user interface. Replacing the model requires retraining with an appropriate dataset and performance validation against the evaluation protocol.' },

    faq_q9: 'Why does my camera show up but the stream is empty?',
    faq_a9: { text: 'When a camera is registered but its stream is empty, please verify the following.', steps: [
      'Make sure the RTSP URL is correct and reachable from the inference computer network.',
      'Include a username and password in the RTSP URL if the camera requires authentication.',
      'Ensure that no firewall is blocking port 554 used by the RTSP protocol.',
      'Click Edit on the camera, then run Test Connection to diagnose the root cause.',
    ]},

    faq_q10: 'How do I change the language or display theme?',
    faq_a10: { text: 'Language and theme settings are available in two places.', steps: [
      'Language can be switched using the ID or EN toggle at the top right of the page.',
      'Theme can be switched using the Light or Dark toggle at the bottom of the sidebar.',
      'An Auto theme option is available on the Settings page, in the Display section, and follows your operating system preference.',
    ]},
  },
};

// -------------------------------------------------------------------
// Tour step definitions. Each targets a [data-tour-id] element.
//   gate    describes how the step advances (next button or user action).
//   route   jumps the app to a page when the step starts.
//   badge   shows a small badge between sections.
// -------------------------------------------------------------------
export const TOUR_STEPS = [
  // Primary target only exists during an actual fall; fallback to the page
  // header anchor so the step is never an orphan centered popover.
  { id: 'alert',         target: '[data-tour-id="alert-banner"], [data-tour-id="live-page"]', placement: 'bottom', route: 'live', title: 's_alert_title',         desc: 's_alert_desc' },
  { id: 'tabs',          target: '[data-tour-id="camera-tabs"]',  placement: 'bottom', route: 'live', title: 's_tabs_title',          desc: 's_tabs_desc',          gate: { kind: 'event', name: 'tour:tabs-all' }, gateHint: 's_tabs_action' },
  { id: 'stats',         target: '[data-tour-id="stats-card"]',   placement: 'left',   route: 'live', title: 's_stats_title',         desc: 's_stats_desc',         badge: 'live' },
  { id: 'nav-clips',     target: '[data-tour-id="nav-clips"]',    placement: 'right',  title: 's_nav_clips_title',     desc: 's_nav_clips_desc',     gate: { kind: 'route', value: 'clips' }, gateHint: 's_nav_clips_action' },
  { id: 'search',        target: '[data-tour-id="clips-search"]', placement: 'bottom', route: 'clips', title: 's_search_title',        desc: 's_search_desc' },
  { id: 'download',      target: '[data-tour-id="clip-download"]', placement: 'left',  route: 'clips', title: 's_download_title',      desc: 's_download_desc',     badge: 'clips' },
  { id: 'nav-settings',  target: '[data-tour-id="nav-settings"]', placement: 'right',  title: 's_nav_settings_title',  desc: 's_nav_settings_desc',  gate: { kind: 'route', value: 'settings' }, gateHint: 's_nav_settings_action' },
  { id: 'cameras',       target: '[data-tour-id="cameras-section"]', placement: 'bottom', route: 'settings', title: 's_cameras_title',  desc: 's_cameras_desc',       badge: 'settings' },
];

const tt = (lang, key) => (TOUR_STRINGS[lang] && TOUR_STRINGS[lang][key]) || key;

// Resolves a comma-separated selector list with priority: the FIRST selector
// that has a visible match wins. Uses a MutationObserver so a higher-priority
// target appearing late (e.g. an alert banner mounted after the step starts)
// upgrades the spotlight to it instead of getting stuck on the fallback.
const useTargetRect = (selector, deps = []) => {
  const [rect, setRect] = React.useState(null);
  React.useEffect(() => {
    setRect(null);
    if (!selector) return;
    const selectors = selector.split(',').map((s) => s.trim()).filter(Boolean);
    let cancelled = false;
    let currentEl = null;
    let scrolled = false;

    const findBest = () => {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return el;
      }
      return null;
    };
    const updateRect = (el) => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom, right: r.right });
    };
    let rafId = 0;
    const tryUpdate = () => {
      if (cancelled) return;
      const el = findBest();
      if (!el) return;
      const isNew = el !== currentEl;
      currentEl = el;
      updateRect(el);
      if (isNew && !scrolled) {
        scrolled = true;
        const r = el.getBoundingClientRect();
        const targetCenter = r.top + window.scrollY + r.height / 2;
        const desiredY = Math.max(0, targetCenter - window.innerHeight / 2);
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: desiredY, behavior: reduceMotion ? 'auto' : 'smooth' });
        setTimeout(() => { if (!cancelled && currentEl) updateRect(currentEl); }, 360);
      }
    };
    // Coalesce bursts of observer / scroll / resize callbacks into a single
    // update per animation frame. The smooth-scroll above emits a stream of
    // scroll events, so without this the spotlight would recompute dozens of
    // times mid-animation.
    const schedule = () => {
      if (cancelled || rafId) return;
      rafId = requestAnimationFrame(() => { rafId = 0; tryUpdate(); });
    };

    tryUpdate();
    // Watch only for tour anchors appearing or moving. A narrow attribute
    // filter keeps this off the critical path during the page's per-second
    // status re-renders, which churn class/style on unrelated nodes.
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, {
      childList: true, subtree: true,
      attributes: true, attributeFilter: ['data-tour-id'],
    });
    let count = 0;
    const tid = setInterval(() => {
      if (cancelled || count++ > 40) { clearInterval(tid); return; }
      tryUpdate();
    }, 50);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      mo.disconnect();
      clearInterval(tid);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
    };
  }, [selector, ...deps]); // eslint-disable-line
  return rect;
};

export const OnboardingTour = ({ open, onClose, route, setRoute, contextHints = {}, onStepChange }) => {
  const { lang } = useT();
  const t = React.useCallback((k) => tt(lang, k), [lang]);
  const [stepIdx, setStepIdx] = React.useState(-1);
  const [badge, setBadge] = React.useState(null);

  // Filter steps based on current state so the tour stays logically valid.
  // The "tabs" step references the camera tabs that only appear when more
  // than one camera is configured, so it is hidden for new users.
  const steps = React.useMemo(() =>
    TOUR_STEPS.filter((s) => {
      if (s.id === 'tabs' && !contextHints.hasMultiCam) return false;
      return true;
    }),
    [contextHints.hasMultiCam],
  );

  React.useEffect(() => { if (open) { setStepIdx(-1); setBadge(null); } }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => { html.style.overflow = prevHtml; body.style.overflow = prevBody; };
  }, [open]);

  const advance = React.useCallback(() => {
    const cur = steps[stepIdx];
    if (cur && cur.badge) { setBadge(cur.badge); return; }
    if (stepIdx + 1 >= steps.length) {
      setStepIdx(steps.length);
      setBadge('complete');
    } else setStepIdx(stepIdx + 1);
  }, [stepIdx]);

  React.useEffect(() => {
    if (!open || stepIdx < 0) return;
    const step = steps[stepIdx];
    if (!step || !step.gate) return;
    if (step.gate.kind === 'event') {
      const handler = () => advance();
      window.addEventListener(step.gate.name, handler);
      return () => window.removeEventListener(step.gate.name, handler);
    }
    if (step.gate.kind === 'route') {
      if (route === step.gate.value) advance();
    }
  }, [open, stepIdx, route, advance]);

  React.useEffect(() => {
    if (!open || stepIdx < 0) return;
    const step = steps[stepIdx];
    if (step && step.route && step.route !== route) setRoute(step.route);
  }, [open, stepIdx]); // eslint-disable-line

  // Broadcast the active step id so pages can react (e.g. LiveMonitor injects
  // a demo alert banner while the "alert" step is on screen so the user sees
  // exactly what the banner looks like).
  React.useEffect(() => {
    const id = (!open || stepIdx < 0 || stepIdx >= steps.length)
      ? null
      : steps[stepIdx].id;
    if (onStepChange) onStepChange(id);
  }, [open, stepIdx, steps, onStepChange]);

  if (!open) return null;

  const total = steps.length;
  const step = stepIdx >= 0 && stepIdx < total ? steps[stepIdx] : null;

  const back = () => { if (stepIdx > 0) setStepIdx(stepIdx - 1); };
  const finish = () => { setStepIdx(total); setBadge('complete'); };
  const skip = () => {
    if (window.confirm(t('skip_confirm'))) {
      localStorage.setItem('vc-onboarded', '1');
      onClose();
    }
  };

  if (stepIdx === -1) {
    return (
      <Modal onClose={onClose} maxWidth={460}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14 }}>
          <BadgeArt kind="welcome"/>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 6px' }}>{t('welcome_title')}</h2>
            <p style={{ fontSize: 14, color: 'var(--vc-fg-2)', margin: 0, lineHeight: 1.55 }}>{t('welcome_desc')}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'stretch', marginTop: 8 }}>
            <button onClick={() => { localStorage.setItem('vc-onboarded', '1'); onClose(); }} style={ghostBtnStyle}>{t('later')}</button>
            <Button variant="primary" icon="play" style={{ marginLeft: 'auto' }} onClick={() => setStepIdx(0)}>{t('start')}</Button>
          </div>
        </div>
      </Modal>
    );
  }

  if (stepIdx >= total) {
    return (
      <Modal onClose={() => { localStorage.setItem('vc-onboarded', '1'); onClose(); }} maxWidth={420}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14 }}>
          <BadgeArt kind="complete"/>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 6px' }}>{t('finish_title')}</h2>
            <p style={{ fontSize: 14, color: 'var(--vc-fg-2)', margin: 0, lineHeight: 1.55 }}>{t('finish_desc')}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, alignSelf: 'stretch', justifyContent: 'space-between', alignItems: 'center' }}>
            <BadgeRow earned={['live','clips','settings']}/>
            <Button variant="primary" onClick={() => { localStorage.setItem('vc-onboarded', '1'); onClose(); }}>{t('finish_cta')}</Button>
          </div>
        </div>
      </Modal>
    );
  }

  if (badge) {
    const name = t(`badge_${badge}`);
    const desc = t(`badge_${badge}_desc`);
    return (
      <Modal onClose={() => { setBadge(null); if (stepIdx + 1 >= total) finish(); else setStepIdx(stepIdx + 1); }} maxWidth={380}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
          <BadgeArt kind={badge}/>
          <div>
            <div style={{ fontSize: 11, color: 'var(--vc-fg-2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Badge</div>
            <h3 style={{ fontSize: 18, fontWeight: 500, margin: '0 0 4px' }}>{name}</h3>
            <p style={{ fontSize: 13, color: 'var(--vc-fg-2)', margin: 0 }}>{desc}</p>
          </div>
          <Button variant="primary" onClick={() => { setBadge(null); if (stepIdx + 1 >= total) finish(); else setStepIdx(stepIdx + 1); }}>{t('next')}</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Spotlight step={step} stepIdx={stepIdx} total={total} lang={lang}
      onNext={advance} onBack={back} onSkip={skip}
      canBack={stepIdx > 0} gated={!!step.gate}/>
  );
};

const Spotlight = ({ step, stepIdx, total, lang, onNext, onBack, onSkip, canBack, gated }) => {
  const t = (k) => tt(lang, k);
  const rect = useTargetRect(step.target, [step.id]);
  if (!rect) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', pointerEvents: 'auto' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', maxWidth: 380 }}>
          <PopoverCard t={t} step={step} stepIdx={stepIdx} total={total}
            onNext={onNext} onBack={onBack} onSkip={onSkip} canBack={canBack} gated={gated}/>
        </div>
      </div>
    );
  }
  const pad = 8;
  const cutTop = Math.max(0, rect.top - pad);
  const cutLeft = Math.max(0, rect.left - pad);
  const cutW = rect.width + pad * 2;
  const cutH = rect.height + pad * 2;
  const vw = window.innerWidth, vh = window.innerHeight;

  const popW = Math.min(380, vw - 24);
  const gap = 14;
  let popLeft = rect.left + rect.width / 2 - popW / 2;
  let popTop;
  const place = step.placement || 'bottom';
  if (place === 'top')    popTop = rect.top - gap - 10 - 220;
  else if (place === 'left')  { popLeft = rect.left - gap - popW; popTop = rect.top + rect.height / 2 - 110; }
  else if (place === 'right') { popLeft = rect.right + gap;       popTop = rect.top + rect.height / 2 - 110; }
  else                     popTop = rect.bottom + gap;

  popLeft = Math.max(12, Math.min(popLeft, vw - popW - 12));
  popTop  = Math.max(12, Math.min(popTop,  vh - 240));

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, pointerEvents: 'none' }}>
      <div onClick={onSkip} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: cutTop, background: 'rgba(0,0,0,0.55)', pointerEvents: 'auto' }}/>
      <div onClick={onSkip} style={{ position: 'absolute', top: cutTop + cutH, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', pointerEvents: 'auto' }}/>
      <div onClick={onSkip} style={{ position: 'absolute', top: cutTop, left: 0, width: cutLeft, height: cutH, background: 'rgba(0,0,0,0.55)', pointerEvents: 'auto' }}/>
      <div onClick={onSkip} style={{ position: 'absolute', top: cutTop, left: cutLeft + cutW, right: 0, height: cutH, background: 'rgba(0,0,0,0.55)', pointerEvents: 'auto' }}/>

      <div style={{
        position: 'absolute', top: cutTop, left: cutLeft, width: cutW, height: cutH,
        borderRadius: 10,
        boxShadow: '0 0 0 2px rgba(255,255,255,0.5), 0 0 0 4px rgba(220,38,38,0.5)',
        pointerEvents: 'none',
        animation: 'vc-pulse 1.6s ease-in-out infinite',
      }}/>

      <div style={{ position: 'absolute', top: popTop, left: popLeft, width: popW, pointerEvents: 'auto' }}>
        <PopoverCard t={t} step={step} stepIdx={stepIdx} total={total}
          onNext={onNext} onBack={onBack} onSkip={onSkip} canBack={canBack} gated={gated}/>
      </div>
    </div>
  );
};

const PopoverCard = ({ t, step, stepIdx, total, onNext, onBack, onSkip, canBack, gated }) => (
  <div style={{
    background: 'var(--vc-surface)',
    border: '1px solid var(--vc-border-strong)',
    borderRadius: 10,
    padding: '14px 16px 12px',
    boxShadow: '0 12px 32px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.08)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <ProgressDots total={total} active={stepIdx}/>
      <span style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--vc-fg-2)' }}>
        {t('progress').replace('{n}', stepIdx + 1).replace('{total}', total)}
      </span>
    </div>
    <h3 style={{ fontSize: 16, fontWeight: 500, margin: '0 0 6px' }}>{t(step.title)}</h3>
    <p style={{ fontSize: 13, color: 'var(--vc-fg-2)', margin: '0 0 12px', lineHeight: 1.55 }}>{t(step.desc)}</p>
    {gated ? (
      <div style={{
        fontSize: 11, color: '#A16207',
        background: 'var(--vc-status-warning-bg)',
        border: '1px solid rgba(245,158,11,0.4)',
        padding: '6px 10px', borderRadius: 6,
        marginBottom: 12,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <Icon name="info" size={12}/> {t(step.gateHint)}
      </div>
    ) : null}
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button onClick={onSkip} style={ghostBtnStyle}>{t('skip')}</button>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
        {canBack ? <Button variant="secondary" onClick={onBack}>{t('back')}</Button> : null}
        {!gated ? <Button variant="primary" onClick={onNext}>{t('next')}</Button> : null}
      </div>
    </div>
  </div>
);

const ProgressDots = ({ total, active }) => (
  <div style={{ display: 'flex', gap: 4 }}>
    {Array.from({ length: total }).map((_, i) => (
      <span key={i} style={{
        width: i === active ? 16 : 6, height: 6, borderRadius: 999,
        background: i <= active ? 'var(--vc-fg-1)' : 'var(--vc-border)',
        transition: 'width 200ms cubic-bezier(0.2,0,0.2,1), background 200ms',
      }}/>
    ))}
  </div>
);

const ghostBtnStyle = {
  fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
  padding: '8px 10px', border: 0, background: 'transparent',
  color: 'var(--vc-fg-2)', cursor: 'pointer', borderRadius: 6,
};

const BADGE_GLYPHS = {
  welcome:  { glyph: <path d="M8 12l3 3 5-7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>, color: '#1C1917' },
  live:     { glyph: <><rect x="6" y="7" width="12" height="9" rx="1.5" strokeWidth="2"/><path d="M10 16v2M14 16v2M9 18h6" strokeWidth="2" strokeLinecap="round"/></>, color: '#0F172A' },
  clips:    { glyph: <><rect x="6" y="8" width="10" height="9" rx="1.5" strokeWidth="2"/><path d="M16 11l3-1.5v6L16 14" strokeWidth="2" strokeLinejoin="round"/></>, color: '#0F172A' },
  settings: { glyph: <><circle cx="12" cy="12" r="2.5" strokeWidth="2"/><path d="M12 6v2M12 16v2M6 12h2M16 12h2M8.5 8.5l1.4 1.4M14.1 14.1l1.4 1.4M8.5 15.5l1.4-1.4M14.1 9.9l1.4-1.4" strokeWidth="2" strokeLinecap="round"/></>, color: '#0F172A' },
  complete: { glyph: <path d="M7 12l3 3 7-8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>, color: '#15803D' },
};

const BadgeArt = ({ kind, size = 72 }) => {
  const g = BADGE_GLYPHS[kind] || BADGE_GLYPHS.welcome;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--vc-surface-2)',
      border: '2px solid var(--vc-border-strong)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: g.color, flex: 'none',
    }}>
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        {g.glyph}
      </svg>
    </div>
  );
};

const BadgeRow = ({ earned }) => (
  <div style={{ display: 'flex', gap: 8 }}>
    {['live','clips','settings'].map((k) => (
      <div key={k} style={{ opacity: earned.includes(k) ? 1 : 0.3 }}>
        <BadgeArt kind={k} size={40}/>
      </div>
    ))}
  </div>
);

const Modal = ({ children, onClose, maxWidth = 480 }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 90,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20,
  }} onClick={onClose}>
    <div onClick={(e) => e.stopPropagation()} style={{
      background: 'var(--vc-surface)',
      border: '1px solid var(--vc-border)',
      borderRadius: 12,
      boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
      padding: 22, width: '100%', maxWidth,
      maxHeight: '90vh', overflow: 'auto',
    }}>
      {children}
    </div>
  </div>
);

export const HelpCenter = ({ open, onClose, onReplayTour }) => {
  const { lang } = useT();
  const t = React.useCallback((k) => tt(lang, k), [lang]);
  const [query, setQuery] = React.useState('');
  const [expanded, setExpanded] = React.useState(null);

  const questions = Array.from({ length: 10 }).map((_, i) => ({
    q: t(`faq_q${i + 1}`),
    a: t(`faq_a${i + 1}`),
  }));
  const answerToText = (a) => {
    if (typeof a === 'string') return a;
    if (a && typeof a === 'object') return [a.text || '', ...(a.steps || [])].join(' ');
    return '';
  };
  const q = query.trim().toLowerCase();
  const filtered = q === '' ? questions : questions.filter((it) =>
    it.q.toLowerCase().includes(q) || answerToText(it.a).toLowerCase().includes(q)
  );

  if (!open) return null;
  return (
    <Modal onClose={onClose} maxWidth={620}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>{t('help_title')}</h2>
        <button onClick={onClose} aria-label={t('help_close')} style={{
          width: 32, height: 32, border: 0, background: 'transparent', cursor: 'pointer',
          color: 'var(--vc-fg-2)', borderRadius: 6,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="x" size={18} stroke={2.2}/>
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '0 8px 0 10px',
          background: 'var(--vc-surface)', border: '1px solid var(--vc-border-strong)',
          borderRadius: 6, flex: 1, minWidth: 220,
        }}>
          <Icon name="search" size={14} stroke={2} style={{ color: 'var(--vc-fg-2)' }}/>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('help_search')}
            style={{ flex: 1, border: 0, outline: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 13, color: 'var(--vc-fg-1)', padding: '9px 0' }}/>
        </div>
        <Button variant="secondary" icon="play" onClick={onReplayTour}>{t('help_replay')}</Button>
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--vc-fg-2)', fontSize: 13 }}>
          {t('help_no_results')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filtered.map((it, i) => {
            const isOpen = expanded === i;
            return (
              <div key={i} style={{ borderBottom: '1px solid var(--vc-surface-2)' }}>
                <button onClick={() => setExpanded(isOpen ? null : i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '12px 4px', border: 0, background: 'transparent',
                    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: 'var(--vc-fg-1)',
                  }}>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{it.q}</span>
                  <span style={{ color: 'var(--vc-fg-2)', transform: isOpen ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 200ms', flex: 'none' }}>
                    <Icon name="chevron" size={14}/>
                  </span>
                </button>
                {isOpen ? (
                  <div style={{ padding: '0 4px 14px', fontSize: 13, color: 'var(--vc-fg-2)', lineHeight: 1.65 }}>
                    <FAQAnswer answer={it.a}/>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <div style={{
        marginTop: 16, paddingTop: 14, borderTop: '1px dashed var(--vc-border)',
        fontSize: 12, color: 'var(--vc-fg-2)',
      }}>
        <div style={{ fontWeight: 500, color: 'var(--vc-fg-1)', marginBottom: 2 }}>{t('help_contact_title')}</div>
        {t('help_contact_desc')}
      </div>
    </Modal>
  );
};

const FAQAnswer = ({ answer }) => {
  if (typeof answer === 'string') return <p style={{ margin: 0 }}>{answer}</p>;
  if (answer && typeof answer === 'object') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {answer.text ? <p style={{ margin: 0 }}>{answer.text}</p> : null}
        {answer.steps && answer.steps.length ? (
          <ol style={{ margin: 0, paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {answer.steps.map((s, i) => <li key={i} style={{ paddingLeft: 4 }}>{s}</li>)}
          </ol>
        ) : null}
      </div>
    );
  }
  return null;
};

export const HelpButton = ({ onClick, label }) => (
  <button onClick={onClick} aria-label={label}
    style={{
      width: 32, height: 32, borderRadius: '50%',
      background: 'var(--vc-surface-2)', border: '1px solid var(--vc-border)',
      cursor: 'pointer', color: 'var(--vc-fg-2)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
    }}
    title={label}>
    ?
  </button>
);
