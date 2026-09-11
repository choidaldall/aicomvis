// Reusable UI primitives for the AIComVis dashboard.
// Each primitive is a named export; styling is driven by the CSS variables
// defined in styles/tokens.css so light/dark themes stay consistent.

import React from 'react';

// -------------------------------------------------------------------
// i18n
// -------------------------------------------------------------------
export const STRINGS = {
  id: {
    // Navigasi
    nav_live: 'Pemantauan Langsung', nav_clips: 'Riwayat Klip', nav_settings: 'Pengaturan',
    role_caregiver: 'Pengasuh', role_operator: 'Operator',
    open_menu: 'Buka menu', close_menu: 'Tutup menu',
    help: 'Bantuan',

    // Sistem
    sys_status: 'Status Sistem',
    sys_camera: 'Kamera', sys_storage: 'Penyimpanan',
    last_detection: 'Deteksi Terakhir',
    last_update: 'Pembaruan Terakhir',

    // Banner peringatan
    alert_fall_title: 'JATUH TERDETEKSI',
    alert_view_clip: 'Lihat klip',

    // Halaman Pemantauan Langsung
    live_room: 'Ruang XG ITB',
    live_today: 'Statistik Hari Ini',
    live_events_today: 'kejadian hari ini',
    live_vs_last_week: 'dibandingkan minggu lalu',
    live_vs_yesterday: 'dibandingkan kemarin',
    live_recent: 'Deteksi Terbaru',
    live_view_all: 'Lihat semua',

    // Metrik bawah
    metric_24h: 'Deteksi 24 Jam Terakhir',
    metric_month: 'Total 30 Hari Terakhir',
    metric_uptime: 'Ketersediaan Kamera',
    metric_sync: 'Sinkronisasi Terakhir',

    // Halaman Riwayat Klip
    cb_title: 'Riwayat Klip',
    cb_stats_title: 'Statistik Kejadian',
    cb_download_all: 'Unduh Semua', cb_download_clip: 'Unduh klip',
    cb_search_placeholder: 'Cari berdasarkan demografi atau waktu',
    cb_search_clear: 'Hapus pencarian',
    cb_no_match: 'Tidak ada klip yang sesuai',
    cb_no_match_desc: 'Coba kata kunci lain atau hapus pencarian.',
    cb_results_count: '{n} hasil',
    cb_empty_title: 'Belum ada klip',
    cb_empty_desc: 'Sistem akan menyimpan klip baru secara otomatis saat kejadian terdeteksi.',
    cb_detail_title: 'Rincian Klip',
    cb_detail_time: 'Waktu Kejadian',
    cb_detail_duration: 'Durasi',
    cb_detail_probability: 'Tingkat Keyakinan',
    cb_detail_triage: 'Triase',

    // Halaman Pengaturan
    set_title: 'Pengaturan',
    sec_display: 'Tampilan',
    sec_cameras: 'Kamera',
    sec_status: 'Status Sistem',
    sec_about: 'Tentang',
    theme_label: 'Tema', theme_light: 'Terang', theme_dark: 'Gelap', theme_auto: 'Otomatis',
    lang_label: 'Bahasa', lang_id: 'Indonesia', lang_en: 'English',
    about_version: 'Versi Aplikasi', about_project: 'Proyek', about_credits: 'Kredit',
    rtsp_connection: 'Koneksi', rtsp_location: 'Lokasi',

    // Kamera (CRUD)
    cam_plural: 'Kamera', cam_all: 'Semua Kamera',
    cam_add: 'Tambah Kamera', cam_edit: 'Ubah', cam_remove: 'Hapus',
    cam_name: 'Nama', cam_rtsp: 'Alamat RTSP',
    cam_rtsp_help: 'Contoh: rtsp://192.168.1.10:554/stream1. Mendukung H.264 dan H.265.',
    cam_test: 'Uji Koneksi', cam_testing: 'Menguji',
    cam_test_ok: 'Stream berhasil terhubung', cam_test_fail: 'Tidak dapat tersambung',
    cam_save: 'Simpan Kamera', cam_cancel: 'Batal', cam_form_new: 'Kamera Baru',
    cam_empty_title: 'Belum ada kamera',
    cam_empty_desc: 'Tambahkan kamera CCTV melalui alamat RTSP untuk mulai memantau.',
    cam_max_reached: 'Jumlah kamera maksimum {n} telah tercapai.',
    cam_single_only: 'Hanya satu kamera yang dapat aktif pada satu waktu pada versi 1.0 ini.',

    // Triase
    triage_red: 'Lansia', triage_yellow: 'Anak-anak', triage_green: 'Dewasa', triage_white: 'Tidak Dikenali',
    triage_elderly: 'Lansia', triage_adult: 'Dewasa', triage_child: 'Anak-anak', triage_unknown: 'Tidak Dikenali',
    triage_total: 'Total Kejadian',

    // Kartu insight tambahan (donut + heatmap + timeline)
    insight_triage_title: 'Distribusi Triase',
    insight_triage_desc: 'Rincian demografi 30 hari terakhir.',
    insight_hourly_title: 'Aktivitas per Jam',
    insight_hourly_desc: 'Distribusi kejadian sepanjang hari.',
    hourly_peak: 'Puncak',
    hourly_events: 'kejadian',
    hourly_total: 'Total',
    timeline_events_24h: 'kejadian dalam 24 jam terakhir',
    timeline_window: '24 jam terakhir',

    // Diagram dan filter periode
    filter_7d: '7 Hari', filter_30d: '30 Hari', filter_90d: '90 Hari',
    empty_data_period: 'Belum ada data kejadian pada periode ini.',
    loading: 'Memuat data', error_load: 'Gagal memuat data.',
    camera_offline: 'Kamera tidak terhubung',
    camera_offline_hint: 'Periksa kabel atau alamat RTSP kamera.',

    // System activity log (Settings)
    sec_activity: 'Aktivitas Sistem',
    activity_desc: 'Catatan kejadian sistem terbaru.',

    // KPI strip (Clip Browser)
    kpi_total: 'Total Kejadian',
    kpi_total_sub: '30 hari terakhir',
    kpi_avg: 'Rata-rata per Hari',
    kpi_avg_sub: 'rata-rata 30 hari',
    kpi_peakday: 'Hari Tersibuk',
    kpi_peakday_sub: 'pekan dengan kejadian terbanyak',
    kpi_top_demo: 'Demografi Terbanyak',
    kpi_top_demo_sub: 'proporsi 30 hari terakhir',

    // Banner demo SUS (hanya muncul pada bundel demo)
    sus_banner: 'Mode Demo SUS. Data yang ditampilkan merupakan contoh untuk evaluasi usabilitas.',
  },
  en: {
    nav_live: 'Live Monitor', nav_clips: 'Clip Browser', nav_settings: 'Settings',
    role_caregiver: 'Caregiver', role_operator: 'Operator',
    open_menu: 'Open menu', close_menu: 'Close menu',
    help: 'Help',

    sys_status: 'System Status',
    sys_camera: 'Camera', sys_storage: 'Storage',
    last_detection: 'Last Detection',
    last_update: 'Last Update',

    alert_fall_title: 'FALL DETECTED',
    alert_view_clip: 'View clip',

    live_room: 'XG Room ITB',
    live_today: 'Today',
    live_events_today: 'events today',
    live_vs_last_week: 'compared to last week',
    live_vs_yesterday: 'compared to yesterday',
    live_recent: 'Recent Detections',
    live_view_all: 'View all',

    metric_24h: 'Detections (last 24 hours)',
    metric_month: 'Total last 30 days',
    metric_uptime: 'Camera availability',
    metric_sync: 'Last synchronization',

    cb_title: 'Clip Browser',
    cb_stats_title: 'Event Statistics',
    cb_download_all: 'Download All', cb_download_clip: 'Download clip',
    cb_search_placeholder: 'Search by demographic or time',
    cb_search_clear: 'Clear search',
    cb_no_match: 'No matching clips',
    cb_no_match_desc: 'Try different keywords or clear the search.',
    cb_results_count: '{n} results',
    cb_empty_title: 'No clips yet',
    cb_empty_desc: 'The system will save new clips automatically when an event is detected.',
    cb_detail_title: 'Clip Details',
    cb_detail_time: 'Event Time',
    cb_detail_duration: 'Duration',
    cb_detail_probability: 'Confidence',
    cb_detail_triage: 'Triage',

    set_title: 'Settings',
    sec_display: 'Display',
    sec_cameras: 'Cameras',
    sec_status: 'System Status',
    sec_about: 'About',
    theme_label: 'Theme', theme_light: 'Light', theme_dark: 'Dark', theme_auto: 'Auto',
    lang_label: 'Language', lang_id: 'Indonesia', lang_en: 'English',
    about_version: 'Application Version', about_project: 'Project', about_credits: 'Credits',
    rtsp_connection: 'Connection', rtsp_location: 'Location',

    cam_plural: 'Cameras', cam_all: 'All Cameras',
    cam_add: 'Add Camera', cam_edit: 'Edit', cam_remove: 'Remove',
    cam_name: 'Name', cam_rtsp: 'RTSP URL',
    cam_rtsp_help: 'Example: rtsp://192.168.1.10:554/stream1. H.264 and H.265 are supported.',
    cam_test: 'Test Connection', cam_testing: 'Testing',
    cam_test_ok: 'Stream connected successfully', cam_test_fail: 'Unable to connect',
    cam_save: 'Save Camera', cam_cancel: 'Cancel', cam_form_new: 'New Camera',
    cam_empty_title: 'No cameras yet',
    cam_empty_desc: 'Add a CCTV camera via an RTSP URL to begin monitoring.',
    cam_max_reached: 'Maximum number of cameras ({n}) has been reached.',
    cam_single_only: 'Only one camera can be active at a time in version 1.0.',

    triage_red: 'Elderly', triage_yellow: 'Child', triage_green: 'Adult', triage_white: 'Unknown',
    triage_elderly: 'Elderly', triage_adult: 'Adult', triage_child: 'Child', triage_unknown: 'Unknown',
    triage_total: 'Total Events',

    insight_triage_title: 'Triage Distribution',
    insight_triage_desc: 'Demographic breakdown for the last 30 days.',
    insight_hourly_title: 'Hourly Activity',
    insight_hourly_desc: 'Event distribution throughout the day.',
    hourly_peak: 'Peak',
    hourly_events: 'events',
    hourly_total: 'Total',
    timeline_events_24h: 'events in the last 24 hours',
    timeline_window: 'Last 24 hours',

    filter_7d: '7 days', filter_30d: '30 days', filter_90d: '90 days',
    empty_data_period: 'No event data in this period.',
    loading: 'Loading data', error_load: 'Failed to load data.',
    camera_offline: 'Camera disconnected',
    camera_offline_hint: 'Check the camera cable or RTSP address.',

    sec_activity: 'System Activity',
    activity_desc: 'Recent system event log.',

    kpi_total: 'Total Events',
    kpi_total_sub: 'last 30 days',
    kpi_avg: 'Average per Day',
    kpi_avg_sub: '30-day average',
    kpi_peakday: 'Busiest Day',
    kpi_peakday_sub: 'day of week with most events',
    kpi_top_demo: 'Top Demographic',
    kpi_top_demo_sub: 'share over the last 30 days',

    sus_banner: 'SUS Demo Mode. The data shown is sample content for usability evaluation.',
  },
};

export const I18nContext = React.createContext({ lang: 'id', t: (k) => k });
export const useT = () => React.useContext(I18nContext);

// -------------------------------------------------------------------
// Icons (Lucide-style)
// -------------------------------------------------------------------
export const Icon = ({ name, size = 20, stroke = 1.8, className, style }) => {
  const paths = {
    monitor:  <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></>,
    clip:     <><rect x="3" y="6" width="14" height="12" rx="2"/><path d="M17 10l4-2v8l-4-2z"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 01-.6 2.8l2 1.6-2 3.4-2.4-.9a7 7 0 01-2.4 1.4L13 23h-2l-.6-2.7a7 7 0 01-2.4-1.4l-2.4 .9-2-3.4 2-1.6A7 7 0 015 12c0-1 .2-2 .6-2.8l-2-1.6 2-3.4 2.4 .9A7 7 0 0110.4 3.7L11 1h2l.6 2.7a7 7 0 012.4 1.4l2.4-.9 2 3.4-2 1.6c.4.8.6 1.8.6 2.8z"/></>,
    alert:    <><path d="M12 3l10 18H2z"/><path d="M12 10v5"/><path d="M12 18h.01"/></>,
    clock:    <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    check:    <><path d="M20 6L9 17l-5-5"/></>,
    x:        <><path d="M18 6L6 18M6 6l12 12"/></>,
    play:     <><polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none"/></>,
    pause:    <><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></>,
    search:   <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>,
    eye:      <><circle cx="12" cy="12" r="3"/><path d="M3 12c3-6 9-6 9-6s6 0 9 6c-3 6-9 6-9 6s-6 0-9-6z"/></>,
    camera:   <><rect x="3" y="6" width="14" height="12" rx="2"/><path d="M17 10l4-2v8l-4-2z"/></>,
    cpu:      <><rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/></>,
    bell:     <><path d="M6 8a6 6 0 0112 0c0 7 3 8 3 8H3s3-1 3-8z"/><path d="M10 21a2 2 0 004 0"/></>,
    person:   <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></>,
    help:     <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 3.5"/><path d="M12 17h.01"/></>,
    sun:      <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
    moon:     <><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></>,
    bar:      <><path d="M3 21V10M10 21V4M17 21v-7"/><path d="M2 21h20"/></>,
    globe:    <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></>,
    hdd:      <><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M3 14l3-8h12l3 8"/><circle cx="7" cy="17" r="0.6" fill="currentColor"/></>,
    info:     <><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></>,
    send:     <><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></>,
    wifi_off: <><path d="M1 1l22 22M16.7 16.7A8 8 0 008.6 9.4M5 12.6A11 11 0 0112 10a11 11 0 018.8 4.4"/><path d="M12 20h.01"/></>,
    menu:     <><path d="M3 6h18M3 12h18M3 18h18"/></>,
    chevron:  <><path d="M9 18l6-6-6-6"/></>,
    grid:     <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
    focus:    <><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></>,
    plus:     <><path d="M12 5v14M5 12h14"/></>,
    trash:    <><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></>,
    volume:    <><path d="M11 5L6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 010 7"/><path d="M18.5 5.5a9 9 0 010 13"/></>,
    volume_off:<><path d="M11 5L6 9H2v6h4l5 4z"/><path d="M22 9l-6 6M16 9l6 6"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
         className={className} style={style}>
      {paths[name] || null}
    </svg>
  );
};

// -------------------------------------------------------------------
// Primitives
// -------------------------------------------------------------------
export const StatusDot = ({ variant = 'online', pulse = false, size = 8 }) => {
  const colors = {
    online:  { bg: '#10B981', ring: 'rgba(16,185,129,0.20)' },
    warning: { bg: '#F59E0B', ring: 'rgba(245,158,11,0.20)' },
    offline: { bg: '#6B7280', ring: 'rgba(107,114,128,0.18)' },
    alert:   { bg: '#EF4444', ring: 'rgba(239,68,68,0.22)' },
  }[variant] || { bg: '#6B7280', ring: 'rgba(107,114,128,0.18)' };
  return (
    <span style={{
      display: 'inline-block', width: size, height: size, borderRadius: '50%',
      background: colors.bg, boxShadow: `0 0 0 3px ${colors.ring}`,
      flex: 'none',
      animation: pulse ? 'vc-pulse 1.4s ease-in-out infinite' : 'none',
    }}/>
  );
};

export const TriageBadge = ({ tier = 'green', children, icon, size = 'md' }) => {
  const palettes = {
    red:    { bg: 'var(--vc-triage-red-bg)',    fg: '#DC2626', bd: 'var(--vc-triage-red-bg)' },
    yellow: { bg: 'var(--vc-triage-yellow-bg)', fg: '#A16207', bd: 'var(--vc-triage-yellow-bg)' },
    green:  { bg: 'var(--vc-triage-green-bg)',  fg: '#15803D', bd: 'var(--vc-triage-green-bg)' },
    white:  { bg: 'var(--vc-triage-white-bg)',  fg: '#64748B', bd: 'var(--vc-triage-white-bg)' },
  };
  const p = palettes[tier] || palettes.white;
  const small = size === 'sm';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: small ? '3px 8px' : '5px 10px',
      borderRadius: 999, border: `1px solid ${p.bd}`,
      background: p.bg, color: p.fg,
      fontSize: small ? 11 : 12, fontWeight: 500, lineHeight: 1.2,
    }}>
      {icon ? <Icon name={icon} size={small ? 11 : 13} stroke={2.2}/> : null}
      {children}
    </span>
  );
};

export const Button = ({ variant = 'secondary', icon, children, onClick, disabled, style }) => {
  const v = {
    primary:   { bg: 'var(--vc-fg-1)',    fg: 'var(--vc-bg)',   bd: 'var(--vc-fg-1)' },
    secondary: { bg: 'var(--vc-surface)', fg: 'var(--vc-fg-1)', bd: 'var(--vc-border-strong)' },
    ghost:     { bg: 'transparent',       fg: 'var(--vc-fg-1)', bd: 'transparent' },
    danger:    { bg: '#DC2626',           fg: '#fff',           bd: '#DC2626' },
    success:   { bg: 'var(--vc-surface)', fg: '#15803D',        bd: 'rgba(22,163,74,0.45)' },
  }[variant] || { bg: 'var(--vc-surface)', fg: 'var(--vc-fg-1)', bd: 'var(--vc-border-strong)' };
  const [hover, setHover] = React.useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
        padding: '8px 14px', borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer',
        border: `1px solid ${v.bd}`,
        background: v.bg, color: v.fg,
        filter: hover && !disabled ? 'brightness(0.96)' : 'none',
        opacity: disabled ? 0.5 : 1,
        transition: 'filter 120ms cubic-bezier(0.2,0,0.2,1)',
        ...style,
      }}>
      {icon ? <Icon name={icon} size={14} stroke={2.2}/> : null}
      {children}
    </button>
  );
};

// Spread the rest props (e.g. data-tour-id, role, aria-label) onto the root
// div so callers can attach tour anchors and a11y attributes directly.
export const Card = ({ children, padding = 24, style, ...rest }) => (
  <div {...rest} style={{
    background: 'var(--vc-surface)', border: '1px solid var(--vc-border)', borderRadius: 8,
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)', padding,
    ...style,
  }}>
    {children}
  </div>
);

export const SectionTitle = ({ eyebrow, children, right }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
    <div>
      {eyebrow ? <div style={{ fontSize: 11, color: 'var(--vc-fg-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{eyebrow}</div> : null}
      <h2 style={{ fontSize: 20, fontWeight: 500, margin: 0, color: 'var(--vc-fg-1)' }}>{children}</h2>
    </div>
    {right}
  </div>
);

// Small inline line chart used by MetricCard. Renders nothing if data is
// missing or has fewer than 2 points so the card stays clean.
export const Sparkline = ({ data, color = 'var(--vc-fg-3)', width = 96, height = 28, filled = true }) => {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const stepX = width / (data.length - 1);
  const pts = data.map((v, i) => [i * stepX, height - (v / max) * (height - 2) - 1]);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const fill = `${pts[0][0]},${height} ${line} ${pts[pts.length - 1][0]},${height}`;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}
         preserveAspectRatio="none" style={{ display: 'block' }}>
      {filled ? <polygon points={fill} fill={color} opacity="0.12"/> : null}
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

export const MetricCard = ({ title, value, unit, trend, trendDir = 'flat', sparkline, sparkColor, sparklineHeight = 28, valueFontSize = 28, padding = 18 }) => {
  const trendColor = { up: '#15803D', down: '#991B1B', flat: 'var(--vc-fg-2)' }[trendDir];
  const trendArrow = { up: '▲', down: '▼', flat: '·' }[trendDir];
  return (
    <Card padding={padding} style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 11, color: 'var(--vc-fg-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{title}</div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: valueFontSize, fontWeight: 500, lineHeight: 1.1, color: 'var(--vc-fg-1)' }}>
        {value}{unit ? <span style={{ fontSize: Math.round(valueFontSize * 0.5), color: 'var(--vc-fg-2)', fontWeight: 400 }}>{` ${unit}`}</span> : null}
      </div>
      {trend ? <div style={{ fontSize: 12, color: trendColor, marginTop: 6 }}>{trendArrow} {trend}</div> : null}
      {sparkline ? (
        <div style={{ marginTop: 12 }}>
          <Sparkline data={sparkline} color={sparkColor || trendColor || 'var(--vc-fg-3)'} height={sparklineHeight}/>
        </div>
      ) : null}
    </Card>
  );
};

// -------------------------------------------------------------------
// TriageDonut: donut chart showing demographic distribution.
// Input: { elderly, child, adult, unknown } counts. Renders an inline
// legend on the right with percentage and count per tier.
// -------------------------------------------------------------------
export const TriageDonut = ({ data, size = 140, layout = 'horizontal' }) => {
  const { t } = useT();
  const segments = [
    { key: 'elderly', tier: 'red',    value: data.elderly || 0 },
    { key: 'child',   tier: 'yellow', value: data.child   || 0 },
    { key: 'adult',   tier: 'green',  value: data.adult   || 0 },
    { key: 'unknown', tier: 'white',  value: data.unknown || 0 },
  ];
  const total = segments.reduce((s, x) => s + x.value, 0);
  // Stroke width scales with size so the ring stays visually weighty at any size.
  const sw = Math.max(14, Math.round(size * 0.12));
  const cx = size / 2, cy = size / 2, r = size / 2 - sw / 2 - 4;
  const c = 2 * Math.PI * r;
  const isVertical = layout === 'vertical';
  // Center label font scales with donut size.
  const centerNum = Math.max(20, Math.round(size * 0.18));
  const centerLabel = Math.max(9, Math.round(size * 0.06));

  let offset = 0;
  const ringColor = 'var(--vc-border)';

  return (
    <div style={{
      display: 'flex',
      flexDirection: isVertical ? 'column' : 'row',
      alignItems: 'center',
      gap: isVertical ? 22 : 24,
      flexWrap: 'wrap',
      width: '100%',
    }}>
      <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={ringColor} strokeWidth={sw}/>
          {total > 0 ? segments.map((seg) => {
            if (seg.value === 0) return null;
            const len = (seg.value / total) * c;
            const dasharray = `${len} ${c - len}`;
            const el = (
              <circle key={seg.key} cx={cx} cy={cy} r={r} fill="none"
                stroke={TIER_COLORS[seg.tier]} strokeWidth={sw}
                strokeDasharray={dasharray} strokeDashoffset={-offset}
                transform={`rotate(-90 ${cx} ${cy})`}/>
            );
            offset += len;
            return el;
          }) : null}
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: centerNum, fontWeight: 500, color: 'var(--vc-fg-1)', lineHeight: 1 }}>{total}</div>
          <div style={{ fontSize: centerLabel, color: 'var(--vc-fg-2)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('triage_total')}</div>
        </div>
      </div>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: isVertical ? 12 : 8,
        minWidth: 140,
        width: isVertical ? '100%' : 'auto',
      }}>
        {segments.map((seg) => {
          const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
          return (
            <div key={seg.key} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: isVertical ? 14 : 12,
              padding: isVertical ? '4px 8px' : 0,
              background: isVertical ? 'var(--vc-surface-2)' : 'transparent',
              borderRadius: isVertical ? 6 : 0,
            }}>
              <span style={{ width: isVertical ? 12 : 10, height: isVertical ? 12 : 10, borderRadius: 3, background: TIER_COLORS[seg.tier], flex: 'none' }}/>
              <span style={{ color: 'var(--vc-fg-1)', flex: 1 }}>{t('triage_' + seg.key)}</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--vc-fg-1)', fontWeight: 500, minWidth: 42, textAlign: 'right' }}>{pct}%</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: isVertical ? 12 : 11, color: 'var(--vc-fg-3)', minWidth: 30, textAlign: 'right' }}>({seg.value})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// -------------------------------------------------------------------
// HourlyActivityChart: 24-bar histogram of event counts per hour of day.
// Highlights the bar(s) with the maximum count.
// -------------------------------------------------------------------
export const HourlyActivityChart = ({ data, height = 96 }) => {
  const { t } = useT();
  const counts = (data && data.length === 24) ? data : new Array(24).fill(0);
  const max = Math.max(...counts, 1);
  const peakHour = counts.indexOf(max);
  const total = counts.reduce((a, b) => a + b, 0);
  const W = 480, padL = 24, padB = 18, padT = 4;
  const innerW = W - padL;
  const barGap = 2;
  const barW = (innerW - barGap * 23) / 24;
  const innerH = height - padB - padT;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12, color: 'var(--vc-fg-2)' }}>
          {t('hourly_peak')}: <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--vc-fg-1)', fontWeight: 500 }}>
            {String(peakHour).padStart(2, '0')}:00
          </span> ({max} {t('hourly_events')})
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--vc-fg-3)' }}>
          {t('hourly_total')}: <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{total}</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height}
           preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
        {/* Baseline */}
        <line x1={padL} y1={padT + innerH} x2={W} y2={padT + innerH} stroke="var(--vc-border)" strokeWidth="1"/>
        {/* Bars */}
        {counts.map((v, h) => {
          const x = padL + h * (barW + barGap);
          const barH = v > 0 ? Math.max(2, (v / max) * innerH) : 1;
          const y = padT + innerH - barH;
          const isPeak = h === peakHour && v > 0;
          return (
            <rect key={h} x={x} y={y} width={Math.max(1, barW)} height={barH}
                  fill={isPeak ? '#DC2626' : 'var(--vc-fg-2)'}
                  opacity={v === 0 ? 0.2 : isPeak ? 1 : 0.55}/>
          );
        })}
        {/* Hour labels: 00, 06, 12, 18 */}
        {[0, 6, 12, 18].map((h) => (
          <text key={h} x={padL + h * (barW + barGap) + barW / 2} y={height - 4}
                fontSize="10" fill="var(--vc-fg-3)"
                fontFamily="JetBrains Mono, monospace" textAnchor="middle">
            {String(h).padStart(2, '0')}
          </text>
        ))}
      </svg>
    </div>
  );
};

// -------------------------------------------------------------------
// SystemActivityLog: terminal-style audit feed of recent system events
// (RTSP connect/disconnect, model load, fall detected, Telegram sent).
// Newest at top, color-coded by level.
// -------------------------------------------------------------------
const KIND_ICON = {
  startup: 'check', model_load: 'cpu', rtsp_start: 'camera', rtsp_stop: 'camera',
  rtsp_warn: 'camera', rtsp_error: 'alert',
  fall: 'alert', telegram: 'bell', storage: 'hdd', info: 'info',
};
const LEVEL_COLOR = {
  info:    { fg: 'var(--vc-fg-2)', dot: '#10B981' },
  warning: { fg: '#A16207',        dot: '#F59E0B' },
  error:   { fg: '#991B1B',        dot: '#EF4444' },
};

export const SystemActivityLog = ({ events, lang = 'id' }) => {
  const { t } = useT();
  if (!events || events.length === 0) {
    return (
      <div style={{ padding: 16, fontSize: 12, color: 'var(--vc-fg-3)', fontStyle: 'italic' }}>
        {lang === 'id' ? 'Belum ada aktivitas sistem terekam.' : 'No system activity recorded yet.'}
      </div>
    );
  }
  const formatRelative = (iso) => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return lang === 'id' ? 'baru saja' : 'just now';
    if (mins < 60) return `${mins} ${lang === 'id' ? 'menit lalu' : 'min ago'}`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} ${lang === 'id' ? 'jam lalu' : 'h ago'}`;
    const days = Math.floor(hrs / 24);
    return `${days} ${lang === 'id' ? 'hari lalu' : 'd ago'}`;
  };
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      maxHeight: 360, overflowY: 'auto',
      fontFamily: 'JetBrains Mono, monospace',
    }}>
      {events.map((e, i) => {
        const level = LEVEL_COLOR[e.level] || LEVEL_COLOR.info;
        const iconName = KIND_ICON[e.kind] || 'info';
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '10px 12px',
            borderBottom: i < events.length - 1 ? '1px solid var(--vc-surface-2)' : 'none',
            fontSize: 12,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: level.dot, marginTop: 5, flex: 'none',
            }}/>
            <Icon name={iconName} size={14} stroke={2} style={{ color: level.fg, marginTop: 1, flex: 'none' }}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: 'var(--vc-fg-1)', wordBreak: 'break-word', fontFamily: 'inherit' }}>
                {e.message}
              </div>
              <div style={{ fontSize: 10, color: 'var(--vc-fg-3)', marginTop: 2 }}>
                {formatRelative(e.timestamp)} · {new Date(e.timestamp).toLocaleTimeString(lang === 'id' ? 'id-ID' : 'en-GB', { hour12: false })}
              </div>
            </div>
            <span style={{
              fontSize: 9, fontWeight: 600, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: level.fg,
              padding: '2px 6px', borderRadius: 4,
              background: 'var(--vc-surface-2)', flex: 'none',
            }}>{e.kind}</span>
          </div>
        );
      })}
    </div>
  );
};

// -------------------------------------------------------------------
// ActivityTimeline24h: horizontal 24-hour band with event markers.
// Each marker is a colored dot positioned at the event timestamp;
// hovering shows a tooltip with time and triage.
// Input: array of { timestamp, triage }
// -------------------------------------------------------------------
export const ActivityTimeline24h = ({ events, lang = 'id' }) => {
  const { t } = useT();
  const tierByGroup = { elderly: 'red', child: 'yellow', adult: 'green', unknown: 'white' };
  const now = Date.now();
  const start = now - 24 * 3600 * 1000;
  // Position each event as a fraction across the 24h window
  const markers = (events || [])
    .map((e) => {
      const ts = new Date(e.timestamp).getTime();
      if (ts < start || ts > now) return null;
      const frac = (ts - start) / (24 * 3600 * 1000);
      const tier = tierByGroup[e.triage?.age_group] || 'white';
      return { frac, tier, e };
    })
    .filter(Boolean);

  const [hover, setHover] = React.useState(null);
  const totalCount = markers.length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, color: 'var(--vc-fg-2)' }}>
        <span>{totalCount} {t('timeline_events_24h')}</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--vc-fg-3)' }}>{t('timeline_window')}</span>
      </div>
      <div style={{ position: 'relative', height: 56, marginTop: 6 }}>
        {/* Baseline */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: '50%', height: 2,
          background: 'var(--vc-surface-2)', borderRadius: 999, transform: 'translateY(-50%)',
        }}/>
        {/* Hour ticks */}
        {[0, 6, 12, 18, 24].map((h) => (
          <div key={h} style={{
            position: 'absolute', left: `${(h / 24) * 100}%`, top: 0, bottom: 18,
            width: 1, background: 'var(--vc-border)', transform: 'translateX(-0.5px)',
          }}/>
        ))}
        {/* Event markers */}
        {markers.map((m, i) => (
          <button key={i}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
            style={{
              position: 'absolute', left: `${m.frac * 100}%`, top: '50%',
              transform: 'translate(-50%, -50%)',
              width: hover === i ? 14 : 10, height: hover === i ? 14 : 10, borderRadius: '50%',
              background: TIER_COLORS[m.tier],
              border: '2px solid var(--vc-surface)',
              cursor: 'pointer', padding: 0,
              transition: 'width 120ms, height 120ms',
              zIndex: hover === i ? 2 : 1,
            }}
            aria-label={new Date(m.e.timestamp).toLocaleTimeString()}/>
        ))}
        {/* Hover tooltip */}
        {hover !== null && markers[hover] ? (
          <div style={{
            position: 'absolute',
            left: `${markers[hover].frac * 100}%`, bottom: 22,
            transform: 'translateX(-50%)',
            padding: '4px 8px', borderRadius: 4,
            background: 'var(--vc-fg-1)', color: 'var(--vc-bg)',
            fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
            whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 3,
          }}>
            {new Date(markers[hover].e.timestamp).toLocaleTimeString(lang === 'id' ? 'id-ID' : 'en-GB', { hour12: false })}
            {' · '}
            {t('triage_' + (markers[hover].e.triage?.age_group || 'unknown'))}
          </div>
        ) : null}
      </div>
      {/* Hour labels */}
      <div style={{ position: 'relative', height: 14, fontSize: 10, color: 'var(--vc-fg-3)', fontFamily: 'JetBrains Mono, monospace' }}>
        {[0, 6, 12, 18, 24].map((h) => (
          <span key={h} style={{
            position: 'absolute', left: `${(h / 24) * 100}%`,
            transform: h === 0 ? 'translateX(0)' : h === 24 ? 'translateX(-100%)' : 'translateX(-50%)',
          }}>{String(h).padStart(2, '0')}:00</span>
        ))}
      </div>
    </div>
  );
};

export const AlertBanner = ({ variant = 'info', title, children, action }) => {
  const v = {
    info:    { bg: 'var(--vc-status-offline-bg)', bd: 'var(--vc-border)',     fg: 'var(--vc-fg-1)',  shadow: 'none' },
    warning: { bg: 'var(--vc-status-warning-bg)', bd: 'rgba(245,158,11,0.4)', fg: '#92400E',         shadow: 'none' },
    danger:  { bg: 'var(--vc-status-alert-bg)',   bd: 'rgba(239,68,68,0.4)',  fg: '#991B1B',         shadow: '0 0 0 4px rgba(220,38,38,0.12), 0 4px 12px rgba(220,38,38,0.18)' },
  }[variant] || {};
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px', borderRadius: 8,
      border: `1px solid ${v.bd}`, background: v.bg, color: v.fg,
      boxShadow: v.shadow,
    }}>
      <Icon name={variant === 'info' ? 'info' : 'alert'} size={18} stroke={2.2}/>
      <div style={{ flex: 1, fontSize: 14 }}>
        {title ? <span style={{ fontWeight: 600, letterSpacing: '0.01em', marginRight: 8 }}>{title}</span> : null}
        {children}
      </div>
      {action}
    </div>
  );
};

export const ProbabilityGauge = ({ value, size = 132, label }) => {
  const r = 50, c = 2 * Math.PI * r;
  const off = c * (1 - value);
  const color = value >= 0.7 ? '#DC2626' : value >= 0.4 ? '#EAB308' : '#16A34A';
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--vc-border)" strokeWidth="10"/>
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dashoffset 240ms cubic-bezier(0.2,0,0.2,1), stroke 240ms' }}/>
      <text x="60" y="58" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="22" fontWeight="500"
            fill={value >= 0.7 ? '#DC2626' : 'var(--vc-fg-1)'}>{value.toFixed(2)}</text>
      {label ? <text x="60" y="78" textAnchor="middle" fontFamily="Inter 18, system-ui, sans-serif" fontSize="10" fill="var(--vc-fg-2)">{label}</text> : null}
    </svg>
  );
};

export const TIER_COLORS = { red: '#DC2626', yellow: '#EAB308', green: '#16A34A', white: '#94A3B8' };

export const FilterChip = ({ label, active, onClick }) => (
  <button onClick={onClick}
    style={{
      padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500,
      border: '1px solid', cursor: 'pointer', fontFamily: 'inherit',
      background: active ? 'var(--vc-fg-1)' : 'var(--vc-surface)',
      color: active ? 'var(--vc-bg)' : 'var(--vc-fg-1)',
      borderColor: active ? 'var(--vc-fg-1)' : 'var(--vc-border)',
    }}>{label}</button>
);

// Picks a "nice" y-axis scale: returns the max value AND the step between
// ticks so every label is a clean integer (0, 10, 20, 30 — not 0, 13, 25, 38).
// Without this, the bars don't line up with any tick which makes them
// look "off" even when they are numerically correct.
const niceScale = (raw) => {
  if (raw <= 0) return { max: 4, step: 1 };
  if (raw <= 4) return { max: 4, step: 1 };
  if (raw <= 10) return { max: 10, step: 2 };
  if (raw <= 20) return { max: 20, step: 5 };
  if (raw <= 30) return { max: 30, step: 10 };
  if (raw <= 50) return { max: 50, step: 10 };
  if (raw <= 100) return { max: 100, step: 20 };
  if (raw <= 200) return { max: 200, step: 50 };
  if (raw <= 500) return { max: 500, step: 100 };
  if (raw <= 1000) return { max: 1000, step: 200 };
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const max = Math.ceil(raw / pow) * pow;
  return { max, step: pow };
};

export const FallStatisticsChart = ({ data, variant = 'full', height = 180, onFilter, period = '30d', lang = 'id' }) => {
  const { t } = useT();
  const [hover, setHover] = React.useState(null);
  const svgRef = React.useRef(null);
  const roRef = React.useRef(null);
  const [measuredW, setMeasuredW] = React.useState(0);

  // Drop the hover when the data changes (e.g. switching 7d/30d/90d) so a
  // stale index can't draw the highlight line past the new last bar.
  React.useEffect(() => { setHover(null); }, [data]);

  // Measure the chart's real pixel width and use it as the viewBox width so one
  // SVG unit equals one pixel — that keeps bars full-width without stretching
  // the axis text, and lets the tooltip be positioned in real pixels.
  //
  // A callback ref (not a one-shot effect) is used on purpose: the chart first
  // renders an empty-data placeholder, so an effect with [] deps would measure
  // a null node once and leave the width stuck at 0, which pushed the tooltip
  // off the right edge. The callback re-fires when the real chart node mounts.
  const setContainer = React.useCallback((node) => {
    if (roRef.current) { roRef.current.disconnect(); roRef.current = null; }
    if (node) {
      setMeasuredW(node.clientWidth);
      const ro = new ResizeObserver(() => setMeasuredW(node.clientWidth));
      ro.observe(node);
      roRef.current = ro;
    }
  }, []);

  if (!data || data.length === 0) {
    return (
      <div style={{
        height, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--vc-fg-2)', fontSize: 13, border: '1px dashed var(--vc-border)', borderRadius: 8,
      }}>{t('empty_data_period')}</div>
    );
  }
  const totals = data.map((d) => d.red + d.yellow + d.green + d.white);
  const rawMax = Math.max(...totals, 1);
  const { max, step: tickStep } = niceScale(rawMax);
  const yTicks = [];
  for (let v = 0; v <= max + 0.001; v += tickStep) yTicks.push(v);
  const isMini = variant === 'mini';
  // viewBox width tracks the measured pixel width (1 unit = 1px); the constants
  // are only a first-paint fallback before the ResizeObserver reports in.
  const W = measuredW > 0 ? measuredW : (isMini ? 320 : 640);
  const H = isMini ? height : (height - 24);
  const padL = isMini ? 0 : 32;
  const padR = isMini ? 0 : 0;
  const padT = isMini ? 4 : 12;
  const padB = isMini ? 16 : 22;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const barGap = isMini ? 4 : 3;
  const barW = (innerW - barGap * (data.length - 1)) / data.length;
  const tiers = ['white', 'green', 'yellow', 'red'];
  // Show every label for short series (≤8 points), stride longer ones.
  const labelStride = Math.max(1, Math.ceil(data.length / (isMini ? 7 : 8)));

  // Format full date for tooltip (e.g. "Senin, 21 Mei 2026" / "Monday, 21 May 2026")
  const formatFullDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (lang === 'id') {
      const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
      const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
      return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Short tick label for mini chart day axis. Prefers "21" (day-of-month) but
  // accepts the precomputed label string passed in by callers.
  const tickLabel = (d) => {
    if (d.date) {
      const dt = new Date(d.date);
      return String(dt.getDate());
    }
    return (d.label || '').split(' ')[0];
  };

  const hovered = hover !== null ? data[hover] : null;
  // Position the tooltip in pixels and clamp it inside the chart so it is never
  // cut off at the left/right edge — which happened when hovering the last bars.
  const chartW = measuredW || W;
  const tipW = Math.min(220, chartW - 8);
  // Place the tooltip BESIDE the pressed bar — to its right if it fits, else to
  // its left — so it never covers the column being inspected, then clamp inside
  // the chart so it can't be clipped at either edge. Holds on every width.
  const barCx = hover !== null ? padL + hover * (barW + barGap) + barW / 2 : chartW / 2;
  const tipGap = 14;
  let tipLeft = barCx + barW / 2 + tipGap;
  if (tipLeft + tipW > chartW - 4) tipLeft = barCx - barW / 2 - tipGap - tipW;
  tipLeft = Math.max(4, Math.min(tipLeft, chartW - tipW - 4));

  // Touch handling: hovering relies on mouse events, which phones/tablets don't
  // fire, so map the touch x to the nearest bar and select it. touchAction
  // pan-y on the svg keeps vertical page scrolling working.
  const selectBarFromTouch = (e) => {
    const touch = e.touches && e.touches[0];
    if (!touch || !svgRef.current) return;
    const box = svgRef.current.getBoundingClientRect();
    if (box.width === 0) return;
    const xView = ((touch.clientX - box.left) / box.width) * W;
    let best = 0, bestDist = Infinity;
    for (let i = 0; i < data.length; i++) {
      const cx = padL + i * (barW + barGap) + barW / 2;
      const dist = Math.abs(cx - xView);
      if (dist < bestDist) { bestDist = dist; best = i; }
    }
    setHover(best);
  };

  return (
    <div style={{ width: '100%', position: 'relative' }} ref={setContainer}>
      {!isMini ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          {['7d','30d','90d'].map((p) => (
            <FilterChip key={p}
              label={t(p === '7d' ? 'filter_7d' : p === '30d' ? 'filter_30d' : 'filter_90d')}
              active={period === p} onClick={() => onFilter && onFilter(p)}/>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--vc-fg-2)' }}>
            {tiers.slice().reverse().map((tier) => (
              <span key={tier} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: TIER_COLORS[tier] }}/>
                {t('triage_' + tier)}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" height={height - (isMini ? 0 : 24)}
           preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible', touchAction: 'pan-y' }}
           onMouseLeave={() => setHover(null)}
           onTouchStart={selectBarFromTouch} onTouchMove={selectBarFromTouch}>
        {/* Grid lines (full variant) or just a baseline (mini variant). */}
        {!isMini ? (yTicks.map((v) => {
          const y = padT + innerH - innerH * (v / max);
          return (
            <g key={v}>
              <line x1={padL} y1={y} x2={W} y2={y}
                    stroke="var(--vc-border)" strokeWidth="1" strokeDasharray={v === 0 ? '' : '2 3'}/>
              <text x={padL - 6} y={y + 3} fontSize="10" fill="var(--vc-fg-2)"
                    fontFamily="JetBrains Mono, monospace" textAnchor="end" fontWeight="500">{v}</text>
            </g>
          );
        })) : (
          <line x1={padL} y1={padT + innerH} x2={W} y2={padT + innerH}
                stroke="var(--vc-border)" strokeWidth="1" opacity="0.8"/>
        )}
        {data.map((d, i) => {
          const x = padL + i * (barW + barGap);
          let y0 = padT + innerH;
          const isHover = hover === i;
          const totalForDay = (d.red || 0) + (d.yellow || 0) + (d.green || 0) + (d.white || 0);
          return (
            <g key={i} style={{ cursor: 'pointer' }}>
              {/* Subtle column background on hover so the user can see which
                  day they're inspecting even on zero-event days. */}
              {isHover ? (
                <rect x={x - barGap / 2} y={padT} width={barW + barGap} height={innerH}
                      fill="var(--vc-fg-1)" opacity="0.04" rx="2"/>
              ) : null}
              {/* Empty-day marker so zero days are still visible on the axis */}
              {totalForDay === 0 ? (
                <rect x={x} y={padT + innerH - 1.5} width={Math.max(1, barW)} height={1.5}
                      fill="var(--vc-border)" opacity="0.7"/>
              ) : null}
              {tiers.map((tier) => {
                const v = d[tier];
                if (!v) return null;
                const h = (v / max) * innerH;
                y0 -= h;
                return <rect key={tier} x={x} y={y0} width={Math.max(1, barW)} height={h}
                             fill={TIER_COLORS[tier]} opacity={hover === null || isHover ? 1 : 0.4}
                             rx={isMini ? 1 : 0}/>;
              })}
              {/* Invisible wide hit-target so hovering the column space (not just the bar) works */}
              <rect x={x - barGap / 2} y={padT} width={barW + barGap} height={innerH + padB}
                    fill="transparent" onMouseEnter={() => setHover(i)}/>
              {i % labelStride === 0 ? (
                <text x={x + barW / 2} y={H - 4} fontSize={isMini ? 9 : 10}
                      fill="var(--vc-fg-3)" fontFamily="JetBrains Mono, monospace"
                      textAnchor="middle" fontWeight="500">
                  {isMini ? tickLabel(d) : d.label}
                </text>
              ) : null}
            </g>
          );
        })}
        {/* Vertical highlight line on hover (both variants) */}
        {hover !== null ? (() => {
          const x = padL + hover * (barW + barGap) + barW / 2;
          return <line x1={x} y1={padT} x2={x} y2={padT + innerH} stroke="var(--vc-fg-1)" strokeWidth="1" strokeDasharray="2 2" opacity="0.4"/>;
        })() : null}
      </svg>
      {/* Floating tooltip — now available on both variants */}
      {hovered ? (
        <div style={{
          position: 'absolute',
          left: tipLeft, top: 30,
          width: tipW, boxSizing: 'border-box',
          background: 'var(--vc-surface)',
          border: '1px solid var(--vc-border-strong)',
          borderRadius: 6, padding: '8px 10px',
          boxShadow: '0 8px 20px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.06)',
          fontSize: 12, color: 'var(--vc-fg-1)',
          pointerEvents: 'none', zIndex: 5,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{formatFullDate(hovered.date)}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {[
              { key: 'red', label: t('triage_elderly') },
              { key: 'yellow', label: t('triage_child') },
              { key: 'green', label: t('triage_adult') },
              { key: 'white', label: t('triage_unknown') },
            ].map((row) => (
              <div key={row.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: TIER_COLORS[row.key], flex: 'none' }}/>
                <span style={{ flex: 1, color: 'var(--vc-fg-2)' }}>{row.label}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 500 }}>{hovered[row.key] || 0}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, paddingTop: 4, borderTop: '1px solid var(--vc-surface-2)' }}>
              <span style={{ flex: 1, color: 'var(--vc-fg-2)' }}>{t('triage_total')}</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                {(hovered.red || 0) + (hovered.yellow || 0) + (hovered.green || 0) + (hovered.white || 0)}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export const Toggle = ({ on, onChange, disabled = false }) => (
  <button onClick={() => !disabled && onChange(!on)}
    disabled={disabled}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 0,
      background: 'transparent', border: 0, padding: 0,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
    }}>
    <span style={{
      width: 36, height: 20, borderRadius: 999,
      background: on ? '#16A34A' : 'var(--vc-border-strong)',
      position: 'relative', transition: 'background 200ms',
    }}>
      <span style={{
        position: 'absolute', top: 2, left: 2, width: 16, height: 16, borderRadius: '50%',
        background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
        transform: on ? 'translateX(16px)' : 'translateX(0)',
        transition: 'transform 200ms',
      }}/>
    </span>
  </button>
);

export const Segmented = ({ value, onChange, options, size = 'md' }) => {
  const pad = size === 'sm' ? '4px 10px' : '6px 12px';
  const fs = size === 'sm' ? 12 : 13;
  return (
    <div style={{
      display: 'inline-flex', padding: 2, gap: 2,
      background: 'var(--vc-surface-2)', borderRadius: 999,
      border: '1px solid var(--vc-border)',
    }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: pad, borderRadius: 999, border: 0, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: fs, fontWeight: 500,
              background: active ? 'var(--vc-surface)' : 'transparent',
              color: active ? 'var(--vc-fg-1)' : 'var(--vc-fg-2)',
              boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              transition: 'background 120ms',
            }}>
            {o.icon ? <Icon name={o.icon} size={fs}/> : null}
            {o.label}
          </button>
        );
      })}
    </div>
  );
};

export const ThemeToggle = ({ theme, onChange }) => {
  const { t } = useT();
  return (
    <Segmented value={theme} onChange={onChange} size="sm" options={[
      { value: 'light', label: t('theme_light'), icon: 'sun' },
      { value: 'dark',  label: t('theme_dark'),  icon: 'moon' },
    ]}/>
  );
};

export const LanguageToggle = ({ lang, onChange }) => (
  <Segmented value={lang} onChange={onChange} size="sm" options={[
    { value: 'id', label: 'ID' },
    { value: 'en', label: 'EN' },
  ]}/>
);

export const EmptyState = ({ icon = 'clip', title, children, action }) => (
  <div style={{
    background: 'var(--vc-surface)', border: '1px dashed var(--vc-border-strong)', borderRadius: 8,
    padding: '40px 24px', textAlign: 'center',
  }}>
    <div style={{
      width: 64, height: 64, borderRadius: '50%', background: 'var(--vc-surface-2)',
      margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--vc-fg-3)',
    }}>
      <Icon name={icon} size={28} stroke={1.6}/>
    </div>
    <h3 style={{ fontSize: 16, fontWeight: 500, margin: '0 0 6px', color: 'var(--vc-fg-1)' }}>{title}</h3>
    <p style={{ color: 'var(--vc-fg-2)', fontSize: 13, maxWidth: 360, margin: '0 auto 14px' }}>{children}</p>
    {action}
  </div>
);

// -------------------------------------------------------------------
// Form inputs (used by camera CRUD)
// -------------------------------------------------------------------
export const Field = ({ label, help, children, mono }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <label style={{ fontSize: 12, color: 'var(--vc-fg-2)', fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit' }}>{label}</label>
    {children}
    {help ? <span style={{ fontSize: 11, color: 'var(--vc-fg-3)' }}>{help}</span> : null}
  </div>
);

export const TextInput = ({ value, onChange, mono, placeholder }) => (
  <input
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    spellCheck={false}
    style={{
      padding: '8px 12px', fontSize: 13,
      fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit',
      border: '1px solid var(--vc-border-strong)',
      borderRadius: 6, background: 'var(--vc-bg)',
      color: 'var(--vc-fg-1)',
      outline: 'none',
    }}
  />
);

// -------------------------------------------------------------------
// SearchInput: search box with icon + clear button
// -------------------------------------------------------------------
export const SearchInput = ({ value, onChange, placeholder, clearLabel }) => {
  const ref = React.useRef(null);
  const [focused, setFocused] = React.useState(false);
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '0 8px 0 10px',
      background: 'var(--vc-surface)',
      border: `1px solid ${focused ? 'var(--vc-fg-1)' : 'var(--vc-border-strong)'}`,
      borderRadius: 6,
      transition: 'border-color 120ms',
      width: 320, maxWidth: '100%',
    }}>
      <Icon name="search" size={14} stroke={2} style={{ color: 'var(--vc-fg-2)', flex: 'none' }}/>
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        style={{
          flex: 1, minWidth: 0,
          border: 0, outline: 'none',
          background: 'transparent',
          fontFamily: 'inherit', fontSize: 13,
          color: 'var(--vc-fg-1)',
          padding: '8px 0',
        }}
      />
      {value ? (
        <button onClick={() => { onChange(''); ref.current && ref.current.focus(); }}
          aria-label={clearLabel}
          style={{
            border: 0, background: 'transparent', cursor: 'pointer',
            color: 'var(--vc-fg-2)', padding: 4, borderRadius: 4,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flex: 'none',
          }}>
          <Icon name="x" size={14} stroke={2.2}/>
        </button>
      ) : null}
    </div>
  );
};

// -------------------------------------------------------------------
// Camera context: shared multi-camera state. backend single-camera,
// only one can be "enabled" at a time; others are cosmetic.
// -------------------------------------------------------------------
export const CameraContext = React.createContext({
  cameras: [], activeId: null, setActiveId: () => {},
  addCamera: () => {}, updateCamera: () => {}, removeCamera: () => {},
});
export const useCameras = () => React.useContext(CameraContext);

// -------------------------------------------------------------------
// CameraTabs: top-row tabs for switching active camera, plus an
// "All cameras" tab that toggles grid view in Live Monitor.
// -------------------------------------------------------------------
export const CameraTabs = ({ cameras, activeId, onChange, showAll = true }) => {
  const { t } = useT();
  if (!cameras || cameras.length === 0) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
      padding: '6px', background: 'var(--vc-surface-2)',
      border: '1px solid var(--vc-border)', borderRadius: 999,
      width: 'fit-content', maxWidth: '100%',
    }}>
      {showAll && cameras.length > 1 ? (
        <CameraTab active={activeId === 'all'} onClick={() => onChange('all')} name={t('cam_all')} icon="grid" status="none"/>
      ) : null}
      {cameras.map((c) => (
        <CameraTab key={c.id}
          active={activeId === c.id}
          onClick={() => onChange(c.id)}
          name={c.name}
          status={c.enabled && c.status === 'online' ? 'online' : c.enabled ? 'warning' : 'offline'}
          alertActive={c.fallActive}
          icon="camera"
        />
      ))}
    </div>
  );
};

const CameraTab = ({ active, onClick, name, status = 'online', alertActive, icon }) => (
  <button onClick={onClick}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 12px', borderRadius: 999, border: 0, cursor: 'pointer',
      fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
      background: active ? 'var(--vc-surface)' : 'transparent',
      color: active ? 'var(--vc-fg-1)' : 'var(--vc-fg-2)',
      boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
      transition: 'background 120ms',
      maxWidth: 220,
    }}>
    <Icon name={icon} size={12} stroke={2}/>
    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
    {alertActive ? (
      <StatusDot variant="alert" pulse size={6}/>
    ) : status === 'none' ? null
    : status === 'online' ? (
      <StatusDot variant="online" size={6}/>
    ) : status === 'warning' ? (
      <StatusDot variant="warning" size={6}/>
    ) : (
      <StatusDot variant="offline" size={6}/>
    )}
  </button>
);

// -------------------------------------------------------------------
// CameraTile: a single camera preview (SVG mock by default; can be
// overridden by passing children for the real MJPEG stream).
//
// `hideOverlay` skips the built-in name/status pill so callers can render
// their own overlay (e.g. LiveMonitor focused view).
// -------------------------------------------------------------------
export const CameraTile = ({ camera, compact = false, children, onSelect, hideOverlay = false, fill = false, aspectRatio = '16 / 10' }) => {
  const { t } = useT();
  const fall = camera.fallActive;
  return (
    <div style={{
      position: 'relative',
      ...(fill ? { height: '100%', width: '100%' } : { aspectRatio }),
      background: '#1C1917',
      overflow: 'hidden',
      cursor: onSelect ? 'pointer' : 'default',
    }} onClick={onSelect ? () => onSelect(camera.id) : undefined}>
      {children ? children : (!camera.enabled ? (
        // Disconnected state: a compact centered marker instead of a stylized
        // room scene scaled up to fill the whole tile.
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: compact ? 6 : 10, padding: 16, textAlign: 'center',
          background: '#1C1917',
        }}>
          <div style={{
            width: compact ? 34 : 46, height: compact ? 34 : 46, borderRadius: '50%',
            background: 'rgba(250,250,249,0.06)', border: '1px solid rgba(250,250,249,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="camera" size={compact ? 16 : 22} stroke={1.6} style={{ color: '#A8A29E' }}/>
          </div>
          <div style={{ fontSize: compact ? 11 : 13, fontWeight: 500, color: '#D6D3D1' }}>{t('camera_offline')}</div>
          {!compact ? (
            <div style={{ fontSize: 11, color: '#78716C', maxWidth: 240, lineHeight: 1.45 }}>{t('camera_offline_hint')}</div>
          ) : null}
        </div>
      ) : (
        <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice"
             style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <rect width="320" height="200" fill="#1a1714"/>
          <rect y="120" width="320" height="80" fill="#2c2825"/>
          <rect x="40" y="60" width="60" height="60" fill="#2a2522" stroke="#3d3733"/>
          <rect x="220" y="40" width="70" height="80" fill="#2a2522" stroke="#3d3733"/>
          <line x1="0" y1="120" x2="320" y2="120" stroke="#3d3733"/>
          {fall ? (
            <g>
              <rect x="130" y="118" width="74" height="42" fill="none" stroke="#DC2626" strokeWidth="2" strokeDasharray="4 3"/>
              <circle cx="148" cy="142" r="6" fill="#fafaf9"/>
              <rect x="148" y="138" width="50" height="14" rx="7" fill="#fafaf9"/>
            </g>
          ) : (
            <g>
              <rect x="138" y="78" width="22" height="50" fill="none" stroke="#10B981" strokeWidth="1.2" strokeDasharray="2 2"/>
              <circle cx="149" cy="86" r="5" fill="#fafaf9"/>
              <rect x="143" y="92" width="14" height="22" rx="2" fill="#fafaf9"/>
            </g>
          )}
        </svg>
      ))}

      {!hideOverlay ? (
        <div style={{ position: 'absolute', top: compact ? 8 : 12, left: compact ? 8 : 12, right: compact ? 8 : 12, display: 'flex', justifyContent: 'space-between' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: compact ? '3px 8px' : '4px 10px', borderRadius: 999,
            background: 'rgba(0,0,0,0.55)',
            color: '#fff', fontSize: compact ? 10 : 11, fontWeight: 500,
          }}>
            <StatusDot variant={fall ? 'alert' : camera.enabled && camera.status === 'online' ? 'online' : 'offline'} pulse={fall}/>
            {camera.name}
          </div>
        </div>
      ) : null}
    </div>
  );
};

// -------------------------------------------------------------------
// CameraGrid: responsive grid of CameraTile (1 or 2 cols on mobile,
// up to 3 cols on desktop). Click a tile to focus it.
// -------------------------------------------------------------------
export const CameraGrid = ({ cameras, onSelectId, fill = false, aspectRatio = '16 / 10' }) => {
  const n = cameras.length;
  // Choose a grid that approximates a square so multi-camera walls feel
  // balanced (1 col for 1, 2 cols for 2-4, 3 cols for 5+).
  const cols = n <= 1 ? 1 : n <= 4 ? 2 : 3;
  const rows = Math.ceil(n / cols);
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gridTemplateRows: fill ? `repeat(${rows}, 1fr)` : 'auto',
      gap: 16,
      height: fill ? '100%' : 'auto',
      minHeight: 0,
    }}>
      {cameras.map((c) => (
        <Card key={c.id} padding={0} style={{
          overflow: 'hidden',
          outline: c.fallActive ? '2px solid #DC2626' : 'none',
          outlineOffset: -2,
          display: fill ? 'flex' : 'block',
          minHeight: 0,
        }}>
          <CameraTile camera={c} compact onSelect={onSelectId} fill={fill} aspectRatio={aspectRatio}/>
        </Card>
      ))}
    </div>
  );
};
