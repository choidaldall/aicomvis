// Live Monitor page — caregiver-facing dashboard.
//
// Layout: the camera feed is the hero (tall 2/3 column, min-height 60vh) so it
// dominates the viewport. The right rail stacks Today's stats over a scrolling
// Recent Detections feed: "is anything happening now?" and "what happened
// recently?". A detected fall takes over the top of the page with an alert
// banner.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertBanner, Button, Card, EmptyState, FallStatisticsChart, Icon, TIER_COLORS,
  StatusDot, TriageBadge, useT,
  CameraTabs, CameraGrid, CameraTile, useCameras,
} from '../components/components.jsx';
import { getFallCount, listClips } from '../api/clips.js';
import { isDemoMode } from '../api/mock.js';
import { useIsMobile } from '../hooks/useMediaQuery.js';

const SUS_DEMO_BUILD = isDemoMode();
const TRIAGE_TIER = { elderly: 'red', child: 'yellow', adult: 'green', unknown: 'white' };

function triageLabel(triage, t, lang) {
  if (!triage) return '';
  const age = t('triage_' + (triage.age_group || 'unknown'));
  const gender = triage.gender && triage.gender !== 'unknown'
    ? (triage.gender === 'male' ? (lang === 'id' ? 'Pria' : 'Male') : (lang === 'id' ? 'Wanita' : 'Female'))
    : '';
  const glasses = triage.glasses ? (lang === 'id' ? 'Berkacamata' : 'Eyeglasses') : '';
  return [age, gender, glasses].filter(Boolean).join(' · ');
}

function formatTime(iso) {
  if (!iso) return '--:--:--';
  return new Date(iso).toLocaleTimeString('id-ID', { hour12: false });
}

export default function LiveMonitor({ wsStatus, fallEvent, clearFallEvent, setRoute, rtspOnline, tourStep }) {
  const { t, lang } = useT();
  const isMobile = useIsMobile();
  // Tablets (iPad/Galaxy Tab portrait, 768-1024) are too narrow for the
  // camera + side-rail split — the rail squeezes badges and the tier legend
  // until they clip. Stack the layout there like on phones.
  const isNarrow = useIsMobile(1024);
  const { cameras, activeId, setActiveId } = useCameras();

  const [statsData, setStatsData] = useState([]);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [clipsRecent, setClipsRecent] = useState([]);
  const [streamError, setStreamError] = useState(false);

  useEffect(() => { if (rtspOnline) setStreamError(false); }, [rtspOnline]);

  const loadStats = useCallback(() => {
    const months = lang === 'id'
      ? ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des']
      : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    getFallCount('7d').then((res) => {
      const mapped = (res.data || []).map((d) => {
        const dt = new Date(d.date);
        return {
          label: `${dt.getDate()} ${months[dt.getMonth()]}`,
          date: d.date,
          red:    d.by_triage.elderly || 0,
          yellow: d.by_triage.child   || 0,
          green:  d.by_triage.adult   || 0,
          white:  d.by_triage.unknown || 0,
        };
      });
      setStatsData(mapped);
    }).catch(() => {}).finally(() => setStatsLoaded(true));
  }, [lang]);

  const loadRecent = useCallback(() => {
    listClips({ limit: 20 }).then((r) => setClipsRecent(r.clips || [])).catch(() => {});
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadRecent(); }, [loadRecent]);

  // Keep the dashboard live: refresh stats and the recent feed on a slow timer.
  useEffect(() => {
    const iv = setInterval(() => { loadStats(); loadRecent(); }, 30000);
    return () => clearInterval(iv);
  }, [loadStats, loadRecent]);

  // A clip is written a few seconds after the fall (post-roll), so when an
  // event fires we refresh stats immediately and re-pull the feed twice to
  // catch the new clip once it lands on disk.
  useEffect(() => {
    if (!fallEvent) return;
    loadStats();
    const t1 = setTimeout(loadRecent, 2000);
    const t2 = setTimeout(loadRecent, 6000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [fallEvent, loadStats, loadRecent]);

  if (cameras.length === 0) {
    return (
      <EmptyState icon="camera" title={t('cam_empty_title')} action={
        <Button variant="primary" icon="plus" onClick={() => setRoute('settings')}>{t('cam_add')}</Button>
      }>
        {t('cam_empty_desc')}
      </EmptyState>
    );
  }

  const allView = activeId === 'all' && cameras.length > 1;
  const activeCam = allView ? null : (cameras.find((c) => c.id === activeId) || cameras[0]);

  const activity = wsStatus?.current_activity ?? 'normal';
  const tourDemoFall = tourStep === 'alert';
  const isFall = activity === 'fall' || !!fallEvent || tourDemoFall;
  const currentTriage = wsStatus?.current_triage
    || (tourDemoFall ? { age_group: 'elderly', gender: 'female', glasses: true } : null);
  const tier = TRIAGE_TIER[currentTriage?.age_group] || 'green';

  // The stream counts as live only when the MJPEG feed is actually showing
  // (the demo build always previews live). This drives the LIVE/OFFLINE pill so
  // a disconnected camera never shows a green "connected" dot.
  const camLive = SUS_DEMO_BUILD || (rtspOnline && !streamError && !!activeCam?.enabled);

  const sumDay = (d) => (d.red || 0) + (d.yellow || 0) + (d.green || 0) + (d.white || 0);
  const todayCount = statsData.length > 0 ? sumDay(statsData[statsData.length - 1]) : 0;
  const yesterdayCount = statsData.length > 1 ? sumDay(statsData[statsData.length - 2]) : 0;
  const delta = todayCount - yesterdayCount;
  const weekTotal = statsData.reduce((s, d) => s + sumDay(d), 0);

  const recentDetections = useMemo(() => {
    const real = clipsRecent.slice(0, 10).map((c) => ({
      id: c.id,
      time: formatTime(c.timestamp),
      date: c.timestamp,
      tier: TRIAGE_TIER[c.triage?.age_group] || 'white',
      ageGroup: c.triage?.age_group || 'unknown',
      // Resolve the camera by id; if it was removed, show the clip's stored
      // name or a neutral label rather than blaming the first camera.
      camera: cameras.find((cam) => cam.id === c.camera_id)?.name || c.camera_name || t('live_room'),
    }));
    if (real.length > 0) return real;
    if (tourDemoFall) {
      return [{
        id: 'demo',
        time: new Date().toLocaleTimeString('id-ID', { hour12: false }),
        tier: 'red',
        ageGroup: 'elderly',
        camera: cameras[0]?.name || t('live_room'),
      }];
    }
    return [];
  }, [clipsRecent, cameras, t, tourDemoFall]);

  const now = new Date().toLocaleTimeString('id-ID', { hour12: false });
  const fallingCams = cameras.filter((c) => c.fallActive);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {isFall ? (
        <div data-tour-id="alert-banner">
          <AlertBanner
            variant="danger"
            title={t('alert_fall_title')}
            action={
              <Button variant="danger" onClick={() => { clearFallEvent(); setRoute('clips'); }}>
                {t('alert_view_clip')}
              </Button>
            }
          >
            {currentTriage ? triageLabel(currentTriage, t, lang) : t('triage_red')}
            {' · '}
            {fallingCams.length > 0 ? fallingCams.map((c) => c.name).join(', ') : (activeCam?.name || t('live_room'))}
            {' · '}{now}
          </AlertBanner>
        </div>
      ) : null}

      <div data-tour-id="live-page" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--vc-fg-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{t('role_caregiver')}</div>
          <h1 style={{ fontSize: 28, fontWeight: 500, margin: 0 }}>{t('nav_live')}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <InlineStat
            icon="alert"
            value={todayCount}
            label={lang === 'id' ? 'Hari ini' : 'Today'}
            tone={todayCount > 0 ? 'danger' : 'muted'}
          />
          <InlineStat
            icon="clip"
            value={weekTotal}
            label={lang === 'id' ? '7 hari' : '7 days'}
            tone="neutral"
          />
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--vc-fg-2)' }}>
            {t('last_update')}: {now}
          </span>
        </div>
      </div>

      {cameras.length > 1 ? (
        <div data-tour-id="camera-tabs">
          <CameraTabs cameras={cameras} activeId={activeId} onChange={(id) => {
            setActiveId(id);
            if (id === 'all') window.dispatchEvent(new CustomEvent('tour:tabs-all'));
          }} showAll={true}/>
        </div>
      ) : null}

      {allView ? (
        // ALL CAMERAS view — square camera grid full-width on top, stats row below.
        // The square aspect makes the camera wall feel like a real security
        // monitor wall instead of stretched portrait tiles.
        <>
          <CameraGrid cameras={cameras} onSelectId={setActiveId} aspectRatio="1 / 1"/>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isNarrow ? '1fr' : '1fr 1.4fr',
            gap: 16,
            alignItems: 'stretch',
          }}>
            <TodayCard
              allView={allView} lang={lang} t={t} statsLoaded={statsLoaded}
              todayCount={todayCount} delta={delta} statsData={statsData}/>
            <RecentDetectionsCard
              lang={lang} t={t} recentDetections={recentDetections}
              isFall={isFall} setRoute={setRoute}/>
          </div>
        </>
      ) : (
        // SINGLE CAMERA view — hero row with camera left, stats panel right.
        // min-height: 60vh keeps the page from collapsing into a thin band.
        <div style={{
          display: 'grid',
          gridTemplateColumns: isNarrow ? '1fr' : '2fr 1fr',
          gap: 16,
          minHeight: isNarrow ? 'auto' : 'min(720px, 60vh)',
          alignItems: 'stretch',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: isNarrow ? (isMobile ? 320 : 440) : 0 }}>
            <Card padding={0} style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              minHeight: 0,
              outline: isFall ? '2px solid #DC2626' : 'none',
              outlineOffset: -2,
              boxShadow: isFall
                ? '0 0 0 4px rgba(220,38,38,0.12), 0 1px 2px rgba(0,0,0,0.04)'
                : '0 1px 2px rgba(0,0,0,0.04)',
            }}>
              <div style={{ position: 'relative', flex: 1, background: '#1C1917', minHeight: isMobile ? 240 : 0 }}>
                {!SUS_DEMO_BUILD && rtspOnline && !streamError && activeCam?.enabled ? (
                  <img
                    src={`/api/stream/mjpeg?fps=15&quality=70&_=${rtspOnline}`}
                    alt="Live feed"
                    onError={() => setStreamError(true)}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <CameraTile
                    fill
                    hideOverlay
                    camera={activeCam || { name: t('live_room'), enabled: SUS_DEMO_BUILD, fallActive: isFall, status: 'online' }}/>
                )}

                <div style={{ position: 'absolute', top: 14, left: 14, right: 14, display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '6px 12px', borderRadius: 999,
                    background: 'rgba(0,0,0,0.62)',
                    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                    color: '#fff', fontSize: 12, fontWeight: 500,
                  }}>
                    <StatusDot variant={isFall ? 'alert' : camLive ? 'online' : 'offline'} pulse={isFall}/>
                    {isFall || camLive ? 'LIVE' : 'OFFLINE'} · {activeCam?.name || t('live_room')}
                  </div>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                    padding: '6px 12px', borderRadius: 999,
                    background: 'rgba(0,0,0,0.62)',
                    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                    color: '#fff',
                  }}>{now}</div>
                </div>

                <div style={{ position: 'absolute', bottom: 14, left: 14, right: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  {currentTriage ? (
                    <TriageBadge tier={tier} icon={isFall ? 'alert' : 'person'}>
                      {triageLabel(currentTriage, t, lang)}
                    </TriageBadge>
                  ) : <span/>}
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#FAFAF9', opacity: 0.7 }}>
                    {camLive ? 'RTSP LIVE' : 'RTSP OFFLINE'}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0, minHeight: 0 }}>
            <TodayCard
              allView={allView} lang={lang} t={t} statsLoaded={statsLoaded}
              todayCount={todayCount} delta={delta} statsData={statsData}/>
            <RecentDetectionsCard
              lang={lang} t={t} recentDetections={recentDetections}
              isFall={isFall} setRoute={setRoute} flex={!isNarrow}/>
          </div>
        </div>
      )}
    </div>
  );
}

// Today statistics card — shows day count, delta chip, 7-day mini chart,
// and a per-tier breakdown for the period. Same content in both layouts;
// extracted so all-cam and single-cam render identically.
const TodayCard = ({ allView, lang, t, todayCount, delta, statsData, statsLoaded = true }) => {
  const tierTotals = statsData.reduce((acc, d) => {
    acc.red    += d.red    || 0;
    acc.yellow += d.yellow || 0;
    acc.green  += d.green  || 0;
    acc.white  += d.white  || 0;
    return acc;
  }, { red: 0, yellow: 0, green: 0, white: 0 });
  const tierRows = [
    { tier: 'red',    key: 'elderly' },
    { tier: 'yellow', key: 'child'   },
    { tier: 'green',  key: 'adult'   },
    { tier: 'white',  key: 'unknown' },
  ];

  return (
    <Card padding={20} data-tour-id="stats-card">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--vc-fg-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {allView
            ? (lang === 'id' ? 'Statistik Hari Ini · semua kamera' : 'Today · all cameras')
            : t('live_today')}
        </div>
        {statsData.length > 1 ? (
          <div style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 999,
            background: delta > 0 ? 'var(--vc-status-alert-bg)' : delta < 0 ? 'var(--vc-status-online-bg)' : 'var(--vc-surface-2)',
            color: delta > 0 ? '#991B1B' : delta < 0 ? '#15803D' : 'var(--vc-fg-2)',
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            {delta > 0 ? '+' : ''}{delta} {lang === 'id' ? 'vs kemarin' : 'vs yesterday'}
          </div>
        ) : null}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        {statsLoaded ? (
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 56, fontWeight: 500, color: 'var(--vc-fg-1)', lineHeight: 1, letterSpacing: '-0.02em' }}>{todayCount}</span>
        ) : (
          <span aria-hidden="true" style={{ width: 56, height: 48, borderRadius: 8, background: 'var(--vc-surface-2)', animation: 'vc-skeleton 1.4s ease-in-out infinite' }}/>
        )}
        <span style={{ fontSize: 13, color: 'var(--vc-fg-2)' }}>{t('live_events_today')}</span>
      </div>
      <div style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <span style={{ fontSize: 10, color: 'var(--vc-fg-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {lang === 'id' ? 'Tren 7 hari per kategori' : '7-day trend by tier'}
          </span>
          {statsData.length > 0 ? (
            <span style={{ fontSize: 10, color: 'var(--vc-fg-3)', fontFamily: 'JetBrains Mono, monospace' }}>
              {statsData[0].label} – {statsData[statsData.length - 1].label}
            </span>
          ) : null}
        </div>
        <FallStatisticsChart data={statsData} variant="mini" height={110} lang={lang}/>
      </div>
      {/* Per-tier breakdown for the period — fills empty card space and
          doubles as a legend explaining the chart colors. */}
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--vc-surface-2)',
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {tierRows.map(({ tier, key }) => (
          <div key={tier} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 12, padding: '6px 10px',
            background: 'var(--vc-surface-2)', borderRadius: 6,
          }}>
            <span style={{
              width: 10, height: 10, borderRadius: 2,
              background: TIER_COLORS[tier],
              border: tier === 'white' ? '1px solid var(--vc-border)' : 'none',
              flex: 'none',
            }}/>
            <span style={{ flex: 1, color: 'var(--vc-fg-1)' }}>{t('triage_' + key)}</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 500, color: tierTotals[tier] > 0 ? 'var(--vc-fg-1)' : 'var(--vc-fg-3)' }}>
              {statsLoaded ? tierTotals[tier] : '·'}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};

// Recent detections feed card. `flex` makes it grow to fill the side rail in
// single-cam mode; in all-cam mode it sits in a fixed-height row instead.
const RecentDetectionsCard = ({ lang, t, recentDetections, isFall, setRoute, flex = false }) => (
  <Card padding={20} style={{
    ...(flex ? { flex: 1 } : {}),
    display: 'flex', flexDirection: 'column', minHeight: 0,
  }}>
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14, flex: 'none' }}>
      <div style={{ fontSize: 11, color: 'var(--vc-fg-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('live_recent')}</div>
      <button onClick={() => setRoute('clips')} style={{
        background: 'transparent', border: 0, padding: 0,
        fontFamily: 'inherit', fontSize: 11, color: 'var(--vc-fg-2)', cursor: 'pointer', textDecoration: 'underline',
      }}>{t('live_view_all')}</button>
    </div>
    {recentDetections.length === 0 ? (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 8, color: 'var(--vc-fg-3)', minHeight: 140 }}>
        <Icon name="check" size={28} stroke={1.5}/>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--vc-fg-2)' }}>
          {lang === 'id' ? 'Belum ada deteksi' : 'No detections yet'}
        </div>
        <div style={{ fontSize: 11, maxWidth: 220 }}>
          {lang === 'id' ? 'Sistem berjalan normal. Daftar akan terisi ketika peristiwa terdeteksi.' : 'System is running. The list will fill as events are detected.'}
        </div>
      </div>
    ) : (
      <div style={{
        flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8,
        minHeight: 0, maxHeight: flex ? 'none' : 360,
        margin: '0 -8px', padding: '0 8px',
      }}>
        {recentDetections.map((d, i) => (
          <DetectionRow key={d.id || `r-${i}`} time={d.time} tier={d.tier}
            label={t('triage_' + d.ageGroup) + ' · ' + d.camera}
            active={i === 0 && isFall}
            onClick={() => setRoute('clips')}/>
        ))}
      </div>
    )}
  </Card>
);

// Small inline KPI shown in the header bar — surfaces "Today" + "7 days"
// near the title so users see those numbers without scanning the right rail.
const InlineStat = ({ icon, value, label, tone = 'neutral' }) => {
  const color = tone === 'danger' ? '#991B1B' : tone === 'muted' ? 'var(--vc-fg-3)' : 'var(--vc-fg-1)';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 12, color: 'var(--vc-fg-2)',
    }}>
      <Icon name={icon} size={12} stroke={1.8} style={{ color }}/>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 500, color: 'var(--vc-fg-1)' }}>{value}</span>
      <span>{label}</span>
    </span>
  );
};

const DetectionRow = ({ time, tier, label, active, onClick }) => (
  <button onClick={onClick} style={{
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 12px', borderRadius: 8,
    background: active ? 'var(--vc-status-alert-bg)' : 'var(--vc-surface-2)',
    border: 0,
    cursor: onClick ? 'pointer' : 'default',
    fontFamily: 'inherit',
    textAlign: 'left',
    transition: 'background 120ms',
  }}
    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--vc-border)'; }}
    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'var(--vc-surface-2)'; }}>
    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--vc-fg-2)', width: 68, flex: 'none' }}>{time}</span>
    <TriageBadge tier={tier} size="sm" icon={tier === 'red' ? 'alert' : 'person'}>{label}</TriageBadge>
  </button>
);
