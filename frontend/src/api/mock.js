// Demo / SUS mode mock layer.
//
// When the bundle is built with VITE_DEMO=1, the axios `client` and the
// WebSocket hook intercept their network calls and return the mocks below.
// This lets the entire UI run statically on Netlify / Vercel / GitHub Pages
// without a backend, so SUS respondents can interact with the system.

const isDemo = () => typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_DEMO === '1';

const TRIAGE_OPTIONS = [
  { age_group: 'elderly', gender: 'female', glasses: true },
  { age_group: 'adult',   gender: 'male',   glasses: false },
  { age_group: 'child',   gender: 'female', glasses: false },
  { age_group: 'elderly', gender: 'male',   glasses: false },
  { age_group: 'unknown', gender: 'unknown', glasses: false },
];

const CATEGORIES = ['unreviewed', 'unreviewed', 'unreviewed', 'true_fall', 'false_positive'];

// Stable seed so the same demo URL always shows the same clips.
let _seed = 42;
const rand = () => { _seed = (_seed * 9301 + 49297) % 233280; return _seed / 233280; };
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const generateClips = (n) => {
  _seed = 42;
  const out = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const t = new Date(now.getTime() - (i * 3.7 + rand() * 2) * 3600 * 1000);
    out.push({
      id: `demo_${t.toISOString().replace(/[^0-9]/g, '').slice(0, 14)}_${i}`,
      timestamp: t.toISOString(),
      duration_seconds: 10 + rand() * 3,
      triage: pick(TRIAGE_OPTIONS),
      max_probability: 0.45 + rand() * 0.5,
      category: pick(CATEGORIES),
      thumbnail_url: '',
      video_url: '',
    });
  }
  return out;
};

const CLIPS = generateClips(24);

const STATS_30 = (() => {
  _seed = 7;
  const days = [];
  const today = new Date();
  // Generate a realistic event distribution: most days 0-3 events, occasional
  // higher days, no extreme spikes that would dominate the chart visually.
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const baseLoad = rand();
    // 35% of days have at least one elderly event (the most common case)
    const elderly = baseLoad > 0.65 ? 1 + Math.floor(rand() * 3) : 0;
    const adult   = rand() > 0.7  ? 1 + Math.floor(rand() * 2) : 0;
    const child   = rand() > 0.88 ? 1 : 0;
    const unknown = rand() > 0.92 ? 1 : 0;
    days.push({
      date: d.toISOString().slice(0, 10),
      total: elderly + adult + child + unknown,
      by_triage: { elderly, adult, child, unknown },
    });
  }
  return days;
})();

const stats = (period) => {
  if (period === '7d') return STATS_30.slice(-7);
  if (period === '90d') {
    // Duplicate 3x to fake 90 days
    return [...STATS_30, ...STATS_30, ...STATS_30].map((d, i) => ({ ...d, date: `D${i + 1}` }));
  }
  return STATS_30;
};

// Resolves a promise-like "axios response" so callers using .then((r) => r.data) work.
const resp = (data, ms = 120) => new Promise((resolve) => {
  setTimeout(() => resolve({ data }), ms);
});

// In-memory mutation so "mark clip" updates persist for the session.
const handleMark = (clipId, category) => {
  const c = CLIPS.find((x) => x.id === clipId);
  if (c) c.category = category;
  return resp({ ok: true });
};

const matchUrl = (url, method = 'GET') => {
  const u = url.replace(/^\/api/, '');
  // /clips, /clips/{id}/mark, /clips/{id}, /stats/fall-count, /status,
  // /notifications/test, /inference/rtsp/start, /inference/rtsp/stop
  if (u === '/status' || u.startsWith('/status?')) {
    return resp({
      camera: 'online',
      model_yolo: 'loaded',
      model_fall: 'loaded',
      telegram: 'connected',
      last_heartbeat: new Date().toISOString(),
      uptime_seconds: 3600 + Math.floor(rand() * 1000),
      disk_free_gb: 61.7,
    });
  }
  if (u.startsWith('/clips') && (u.match(/\/mark$/) || u.includes('/mark'))) {
    const m = u.match(/\/clips\/([^/]+)\/mark/);
    return handleMark(m && m[1], 'true_fall');
  }
  if (u.match(/\/clips\/[^/]+$/)) {
    const id = u.replace('/clips/', '');
    const clip = CLIPS.find((c) => c.id === id);
    return resp(clip || {});
  }
  if (u.startsWith('/clips')) {
    const params = new URLSearchParams(u.split('?')[1] || '');
    const limit = parseInt(params.get('limit') || '50', 10);
    const offset = parseInt(params.get('offset') || '0', 10);
    const cat = params.get('category');
    let list = CLIPS;
    if (cat === 'unreviewed') list = list.filter((c) => c.category === 'unreviewed');
    return resp({ clips: list.slice(offset, offset + limit), total: list.length, limit, offset });
  }
  if (u.startsWith('/stats/fall-count')) {
    const params = new URLSearchParams(u.split('?')[1] || '');
    const period = params.get('period') || '30d';
    return resp({ data: stats(period) });
  }
  if (u.startsWith('/notifications/test')) {
    return resp({ ok: true }, 600);
  }
  if (u.startsWith('/system/activity')) {
    const now = Date.now();
    const evt = (m, kind, level, mins) => ({
      kind, message: m, level,
      timestamp: new Date(now - mins * 60000).toISOString(),
    });
    return resp({ events: [
      evt('Jatuh terdeteksi (prob=0.87, klip=demo_event_1)', 'fall', 'warning', 2),
      evt('Notifikasi Telegram berhasil dikirim', 'telegram', 'info', 2),
      evt('Kamera RTSP tersambung: rtsp://demo:554/stream1', 'rtsp_start', 'info', 14),
      evt('Bot Telegram terhubung', 'telegram', 'info', 35),
      evt('YOLO pose + ST-GCN++ ensemble berhasil dimuat', 'model_load', 'info', 35),
      evt('Sistem AIComVis siap', 'startup', 'info', 36),
      evt('Jatuh terdeteksi (prob=0.92, klip=demo_event_2)', 'fall', 'warning', 124),
      evt('Penyimpanan klip mendekati 80%, rotasi otomatis aktif', 'storage', 'warning', 180),
      evt('Jatuh terdeteksi (prob=0.79, klip=demo_event_3)', 'fall', 'warning', 305),
      evt('Kamera RTSP terputus, mencoba reconnect', 'rtsp_warn', 'warning', 410),
    ]});
  }
  if (u.startsWith('/inference/rtsp/start')) {
    return resp({ status: 'started', rtsp_url: 'rtsp://demo' });
  }
  if (u.startsWith('/inference/rtsp/stop')) {
    return resp({ status: 'stopped' });
  }
  // Unknown — return empty data so callers fail gracefully
  return resp({});
};

// Public hook into the axios `client`. Installed by client.js when VITE_DEMO=1.
export const installMockClient = (client) => {
  if (!isDemo()) return;
  // Replace request adapter with one that returns the mock response.
  client.defaults.adapter = (config) => {
    const url = (config.baseURL || '') + config.url;
    return matchUrl(url, (config.method || 'get').toUpperCase()).then((r) => ({
      data: r.data, status: 200, statusText: 'OK', headers: {}, config, request: {},
    }));
  };
};

// Public hook into useWebSocket: simulate periodic status updates and an
// occasional fall_event so respondents see the alert banner without manual
// triggering. Returns a function the hook can call to register callbacks.
export const installMockWebSocket = (onStatus, onFall) => {
  if (!isDemo()) return () => {};
  let i = 0;
  // A short cycle that ends with a fall event so respondents see all states.
  const cycle = [
    { prob: 0.02, activity: 'normal',     person: false, triage: null },
    { prob: 0.08, activity: 'normal',     person: true,  triage: null },
    { prob: 0.36, activity: 'suspicious', person: true,  triage: { age_group: 'adult', gender: 'male', glasses: false } },
    { prob: 0.14, activity: 'normal',     person: true,  triage: { age_group: 'adult', gender: 'male', glasses: false } },
    { prob: 0.09, activity: 'normal',     person: false, triage: null },
    // Fall sequence (3 frames so the gauge ramps up)
    { prob: 0.62, activity: 'suspicious', person: true,  triage: { age_group: 'elderly', gender: 'female', glasses: true } },
    { prob: 0.87, activity: 'fall',       person: true,  triage: { age_group: 'elderly', gender: 'female', glasses: true }, fall: true },
    { prob: 0.42, activity: 'suspicious', person: true,  triage: { age_group: 'elderly', gender: 'female', glasses: true } },
    { prob: 0.12, activity: 'normal',     person: false, triage: null },
  ];
  const id = setInterval(() => {
    const s = cycle[i % cycle.length]; i += 1;
    onStatus({
      type: 'status_update',
      timestamp: new Date().toISOString(),
      current_probability: s.prob,
      current_activity: s.activity,
      person_detected: s.person,
      current_triage: s.triage,
      n_persons: s.person ? 1 : 0,
      persons: [],
    });
    if (s.fall && onFall) {
      onFall({
        type: 'fall_event',
        clip_id: 'demo_event_' + Date.now(),
        triage: s.triage,
        max_probability: s.prob,
      });
    }
  }, 1800);
  return () => clearInterval(id);
};

export const isDemoMode = isDemo;
