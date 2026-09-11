import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button, Card, EmptyState, FallStatisticsChart,
  Icon, MetricCard, SearchInput, TIER_COLORS, TriageBadge, useT,
} from '../components/components.jsx';
import { getFallCount, listClips, videoUrl, thumbUrl } from '../api/clips.js';
import { useIsMobile } from '../hooks/useMediaQuery.js';

const TRIAGE_TIER = { elderly: 'red', child: 'yellow', adult: 'green', unknown: 'white' };

function formatDate(iso, lang) {
  const d = new Date(iso);
  if (lang === 'id') {
    const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
    return `${d.getDate()} ${months[d.getMonth()]}, ${d.toLocaleTimeString('id-ID', { hour12: false })}`;
  }
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ', ' +
         d.toLocaleTimeString('en-GB', { hour12: false });
}

// Period-aware sub-label helpers so the KPI strip stays in sync with the
// 7d / 30d / 90d chart tab. Without these the strip always said "30 days"
// even after the user picked another window, which makes the numbers look
// inconsistent against the chart.
const PERIOD_DAYS = { '7d': 7, '30d': 30, '90d': 90 };
function periodSubTotal(period, lang) {
  const n = PERIOD_DAYS[period] || 30;
  return lang === 'id' ? `${n} hari terakhir` : `last ${n} days`;
}
function periodSubAvg(period, lang) {
  const n = PERIOD_DAYS[period] || 30;
  return lang === 'id' ? `rata-rata ${n} hari` : `${n}-day average`;
}
function periodSubShare(period, lang) {
  const n = PERIOD_DAYS[period] || 30;
  return lang === 'id' ? `proporsi ${n} hari terakhir` : `share over the last ${n} days`;
}
function periodSubPeak(period, lang) {
  const n = PERIOD_DAYS[period] || 30;
  return lang === 'id' ? `hari tersibuk dalam ${n} hari` : `busiest day in ${n} days`;
}

// Trigger a real download via the backend video URL. Falls back to navigating
// directly if fetch fails.
async function downloadClip(c) {
  const safe = (s) => (s || '').toString().replace(/[^a-zA-Z0-9-]+/g, '_');
  const stamp = c.timestamp ? new Date(c.timestamp).toISOString().replace(/[^0-9]/g, '').slice(0, 14) : Date.now();
  const filename = `aicomvis_${safe(c.triage?.age_group || 'unknown')}_${stamp}_${c.id}.mp4`;
  try {
    const res = await fetch(videoUrl(c.id));
    if (!res.ok) throw new Error('http ' + res.status);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    window.location.href = videoUrl(c.id);
  }
}

export default function ClipBrowser() {
  const { t, lang } = useT();
  const isMobile = useIsMobile();
  const [clips, setClips] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [period, setPeriod] = useState('30d');
  const [statsData, setStatsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [query, setQuery] = useState('');
  const videoRef = React.useRef(null);
  const detailRef = React.useRef(null);
  const [detailHeight, setDetailHeight] = useState(null);

  // Track the right-column (video + details) height so the clip list can cap
  // to the same height and scroll internally, otherwise a long list pushes the
  // grid taller than the detail panel and leaves dead space below the video.
  // The observer fires on its own whenever the panel resizes (including when a
  // different clip is selected), so it only needs to be wired up once.
  useEffect(() => {
    if (!detailRef.current) return;
    const el = detailRef.current;
    const update = () => setDetailHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => { ro.disconnect(); window.removeEventListener('resize', update); };
  }, []);

  const loadClips = useCallback(() => {
    setLoading(true);
    listClips({ limit: 50, offset: 0 })
      .then((r) => { setClips(r.clips || []); setLoading(false); })
      .catch(() => { setError(t('error_load')); setLoading(false); });
  }, [t]);

  useEffect(() => { loadClips(); }, [loadClips]);

  useEffect(() => {
    const months = lang === 'id'
      ? ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des']
      : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    getFallCount(period).then((res) => {
      const mapped = (res.data || []).map((d) => {
        const dt = new Date(d.date);
        return {
          label: `${dt.getDate()} ${months[dt.getMonth()]}`,
          date: d.date,
          red: d.by_triage.elderly || 0, yellow: d.by_triage.child || 0,
          green: d.by_triage.adult || 0, white: d.by_triage.unknown || 0,
        };
      });
      setStatsData(mapped);
    }).catch(() => {});
  }, [period, lang]);

  // Search filter: match against demographic, time, triage tier
  const q = query.trim().toLowerCase();
  const filtered = q === ''
    ? clips
    : clips.filter((c) => {
        const tierKey = TRIAGE_TIER[c.triage?.age_group] || 'white';
        const haystack = [
          c.id,
          c.triage?.age_group || '',
          c.triage?.gender || '',
          c.triage?.glasses ? (lang === 'id' ? 'berkacamata' : 'eyeglasses') : '',
          t('triage_' + tierKey),
          formatDate(c.timestamp, lang),
          tierKey,
        ].join(' ').toLowerCase();
        return haystack.includes(q);
      });

  // Derived KPIs (above-the-chart summary cards) — recomputed when stats change.
  // peakDay is the SPECIFIC date with the most events (e.g. "Kamis, 21 Mei 2026"),
  // not just a day-of-week label — that was too vague to act on.
  const kpis = useMemo(() => {
    const sumDay = (d) => (d.red || 0) + (d.yellow || 0) + (d.green || 0) + (d.white || 0);
    if (!statsData.length) {
      return { total: 0, avg: '0.0', peakDay: '--', peakDaySub: '', topTier: '--', topTierKey: 'unknown', topTierPct: 0 };
    }
    const total = statsData.reduce((s, d) => s + sumDay(d), 0);
    const avg = (total / statsData.length).toFixed(1);
    // Find the SPECIFIC date with the highest count
    const days = lang === 'id'
      ? ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']
      : ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = lang === 'id'
      ? ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
      : ['January','February','March','April','May','June','July','August','September','October','November','December'];
    let peakIdx = 0;
    for (let i = 1; i < statsData.length; i++) {
      if (sumDay(statsData[i]) > sumDay(statsData[peakIdx])) peakIdx = i;
    }
    const peakCount = sumDay(statsData[peakIdx]);
    let peakDay = '--';
    let peakDaySub = '';
    if (peakCount > 0) {
      const d = new Date(statsData[peakIdx].date);
      peakDay = `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
      peakDaySub = lang === 'id'
        ? `${peakCount} kejadian pada tanggal tersebut`
        : `${peakCount} events on this day`;
    }
    // Most common demographic. When the period has no events at all, the
    // all-zero tie would otherwise resolve to "elderly 0%" (first key wins the
    // strict-greater reduce), so we report a neutral placeholder instead.
    const tiers = { red: 0, yellow: 0, green: 0, white: 0 };
    statsData.forEach((d) => { tiers.red += d.red || 0; tiers.yellow += d.yellow || 0; tiers.green += d.green || 0; tiers.white += d.white || 0; });
    const tierMap = { red: 'elderly', yellow: 'child', green: 'adult', white: 'unknown' };
    let topTierKey = 'unknown';
    let topTierPct = 0;
    let topTierLabel = '--';
    if (total > 0) {
      const topTier = Object.entries(tiers).reduce((a, b) => a[1] > b[1] ? a : b);
      topTierKey = tierMap[topTier[0]];
      topTierPct = Math.round((topTier[1] / total) * 100);
      topTierLabel = t('triage_' + topTierKey);
    }
    return { total, avg, peakDay, peakDaySub, topTier: topTierLabel, topTierKey, topTierPct };
  }, [statsData, lang, t]);

  const selected = filtered.find((c) => c.id === selectedId) || filtered[0] || null;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else          { videoRef.current.play();  setPlaying(true); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--vc-fg-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{t('role_caregiver')}</div>
          <h1 style={{ fontSize: 28, fontWeight: 500, margin: 0 }}>{t('cb_title')}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span data-tour-id="clips-search" style={{ display: 'inline-flex' }}>
            <SearchInput value={query} onChange={setQuery}
              placeholder={t('cb_search_placeholder')}
              clearLabel={t('cb_search_clear')}/>
          </span>
          <Button variant="secondary" icon="download"
            onClick={() => filtered.forEach((c) => downloadClip(c))}
            disabled={filtered.length === 0}>
            {t('cb_download_all')}
          </Button>
        </div>
      </div>

      {/* KPI summary strip — four key insight cards, sub-labels are
          period-aware so they switch alongside the 7d / 30d / 90d chart tab. */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 16,
      }}>
        <MetricCard
          title={t('kpi_total')}
          value={String(kpis.total)}
          trend={periodSubTotal(period, lang)}
          trendDir="flat"/>
        <MetricCard
          title={t('kpi_avg')}
          value={kpis.avg}
          trend={periodSubAvg(period, lang)}
          trendDir="flat"/>
        <Card padding={18} style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--vc-fg-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{t('kpi_peakday')}</div>
          <div title={kpis.peakDay !== '--' ? kpis.peakDay : undefined}
            style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.25, color: 'var(--vc-fg-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{kpis.peakDay}</div>
          <div style={{ fontSize: 12, color: 'var(--vc-fg-2)', marginTop: 6 }}>{kpis.peakDaySub || periodSubPeak(period, lang)}</div>
        </Card>
        <Card padding={18} style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--vc-fg-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{t('kpi_top_demo')}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{
              width: 10, height: 10, borderRadius: 2,
              background: TIER_COLORS[{ elderly: 'red', child: 'yellow', adult: 'green', unknown: 'white' }[kpis.topTierKey] || 'white'],
              alignSelf: 'center',
            }}/>
            <span style={{ fontSize: 20, fontWeight: 500, color: 'var(--vc-fg-1)' }}>{kpis.topTier}</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: 'var(--vc-fg-2)', marginLeft: 'auto' }}>{kpis.topTierPct}%</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--vc-fg-2)', marginTop: 6 }}>{periodSubShare(period, lang)}</div>
        </Card>
      </div>

      <Card>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{t('cb_stats_title')}</div>
          {statsData.length > 0 ? (
            <div style={{ fontSize: 11, color: 'var(--vc-fg-2)', fontFamily: 'JetBrains Mono, monospace' }}>
              {statsData[0].label} – {statsData[statsData.length - 1].label} {new Date(statsData[statsData.length - 1].date).getFullYear()}
            </div>
          ) : null}
        </div>
        <FallStatisticsChart data={statsData} variant="full" height={220} period={period} onFilter={setPeriod} lang={lang}/>
      </Card>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '320px 1fr',
        gap: 16,
        alignItems: 'start',
      }}>

        {/* Clip list — capped to the right column's measured height so a long
            list scrolls internally instead of pushing past the detail panel
            and leaving white space below it. */}
        <Card padding={0} style={{
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          maxHeight: detailHeight && detailHeight > 400
            ? `${detailHeight}px`
            : 'min(70vh, 640px)',
        }}>
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid var(--vc-surface-2)',
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            fontSize: 11, color: 'var(--vc-fg-2)',
            flex: 'none',
          }}>
            <span>{filtered.length} {lang === 'id' ? 'klip' : 'clips'}</span>
            {q !== '' ? (
              <span style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace' }}>
                {t('cb_results_count').replace('{n}', filtered.length)}
              </span>
            ) : null}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {loading ? (
              <div aria-busy="true" aria-label={t('loading')}>
                {Array.from({ length: 7 }).map((_, i) => <ClipRowSkeleton key={i} delay={i * 0.08}/>)}
              </div>
            ) : error ? (
              <div style={{ padding: 24, color: '#991B1B', fontSize: 13 }}>{error}</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 24 }}>
                <EmptyState icon={q ? 'search' : 'clip'} title={q ? t('cb_no_match') : t('cb_empty_title')}>
                  {q ? t('cb_no_match_desc') : t('cb_empty_desc')}
                </EmptyState>
              </div>
            ) : filtered.map((c) => {
              const active = c.id === (selected?.id);
              const tier = TRIAGE_TIER[c.triage?.age_group] || 'white';
              return (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'stretch',
                  borderBottom: '1px solid var(--vc-surface-2)',
                  borderLeft: active ? '3px solid var(--vc-fg-1)' : '3px solid transparent',
                  background: active ? 'var(--vc-surface-2)' : 'var(--vc-surface)',
                }}>
                  <button onClick={() => setSelectedId(c.id)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      flex: 1, padding: '12px 8px 12px 16px', border: 0,
                      background: 'transparent',
                      cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: 'var(--vc-fg-1)',
                    }}>
                    <div style={{ width: 56, height: 40, borderRadius: 4, flex: 'none', background: '#1a1714', position: 'relative', overflow: 'hidden' }}>
                      <img src={thumbUrl(c.id)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                           onError={(e) => { e.target.style.display = 'none'; }}/>
                      <Icon name="play" size={14} style={{ color: '#fff', position: 'absolute', top: 13, left: 21 }}/>
                      <div style={{ position: 'absolute', bottom: 2, right: 3, fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#fff', opacity: 0.85 }}>
                        {c.duration_seconds?.toFixed(0)}s
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>Ruang XG</span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--vc-fg-3)', marginLeft: 'auto' }}>{formatDate(c.timestamp, lang).split(',')[1]?.trim() || ''}</span>
                      </div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--vc-fg-2)', marginTop: 2 }}>{formatDate(c.timestamp, lang).split(',')[0]}</div>
                      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <TriageBadge tier={tier} size="sm">{t('triage_' + (c.triage?.age_group || 'unknown'))}</TriageBadge>
                      </div>
                    </div>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); downloadClip(c); }}
                    title={t('cb_download_clip')}
                    aria-label={t('cb_download_clip')}
                    data-tour-id={c.id === filtered[0]?.id ? 'clip-download' : undefined}
                    style={{
                      width: 40, border: 0, background: 'transparent',
                      color: 'var(--vc-fg-2)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flex: 'none', marginRight: 6, borderRadius: 6,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--vc-surface-2)'; e.currentTarget.style.color = 'var(--vc-fg-1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--vc-fg-2)'; }}>
                    <Icon name="download" size={16} stroke={1.8}/>
                  </button>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Detail panel: video player + metadata. Measured via ResizeObserver
            so the clip list on the left can match this column's height. */}
        <div ref={detailRef} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {selected ? (
            <>
              <Card padding={0} style={{ overflow: 'hidden' }}>
                <div style={{ position: 'relative', aspectRatio: '16 / 9', background: '#1C1917' }}>
                  <video ref={videoRef} src={videoUrl(selected.id)}
                    poster={thumbUrl(selected.id)} preload="metadata"
                    onClick={togglePlay}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer' }}
                    onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
                    onEnded={() => setPlaying(false)}/>
                  {!playing ? (
                    <button onClick={togglePlay} aria-label={lang === 'id' ? 'Putar' : 'Play'} style={{
                      position: 'absolute', inset: 0, margin: 'auto',
                      width: 60, height: 60, borderRadius: '50%', border: 0,
                      background: 'rgba(0,0,0,0.5)', color: '#fff', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)',
                      transition: 'transform 120ms cubic-bezier(0.2,0,0.2,1), background 120ms',
                    }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.background = 'rgba(0,0,0,0.62)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(0,0,0,0.5)'; }}>
                      <Icon name="play" size={24}/>
                    </button>
                  ) : null}
                  <div style={{ position: 'absolute', top: 12, left: 12 }}>
                    <TriageBadge tier={TRIAGE_TIER[selected.triage?.age_group] || 'white'} icon="person">
                      {t('triage_' + (selected.triage?.age_group || 'unknown'))}
                      {selected.triage?.gender && selected.triage.gender !== 'unknown'
                        ? ' · ' + (selected.triage.gender === 'male' ? (lang === 'id' ? 'Pria' : 'Male') : (lang === 'id' ? 'Wanita' : 'Female'))
                        : ''}
                      {selected.triage?.glasses ? (lang === 'id' ? ' · Berkacamata' : ' · Eyeglasses') : ''}
                    </TriageBadge>
                  </div>
                  <div style={{ position: 'absolute', top: 12, right: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#fff', background: 'rgba(0,0,0,0.55)', padding: '4px 10px', borderRadius: 999 }}>
                    {formatDate(selected.timestamp, lang)}
                  </div>
                  <div style={{ position: 'absolute', inset: 'auto 0 0 0', padding: 12, display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(0deg,rgba(0,0,0,0.6),transparent)' }}>
                    <button onClick={togglePlay} aria-label={playing ? (lang === 'id' ? 'Jeda' : 'Pause') : (lang === 'id' ? 'Putar' : 'Play')} style={{
                      width: 36, height: 36, borderRadius: '50%', border: 0,
                      background: '#fff', color: '#1C1917', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon name={playing ? 'pause' : 'play'} size={16}/>
                    </button>
                  </div>
                </div>
              </Card>
            </>
          ) : (
            <EmptyState icon="clip" title={t('cb_empty_title')}>{t('cb_empty_desc')}</EmptyState>
          )}
        </div>
      </div>
    </div>
  );
}

const Kv = ({ k, v, mono }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    <span style={{ fontSize: 11, color: 'var(--vc-fg-2)' }}>{k}</span>
    <span style={{ fontSize: 13, color: 'var(--vc-fg-1)', fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit' }}>{v}</span>
  </div>
);

// Shimmering placeholder block used while the clip list loads.
const Sk = ({ w = '100%', h = 10, r = 4, delay = 0, style }) => (
  <span style={{
    display: 'block', width: w, height: h, borderRadius: r,
    background: 'var(--vc-surface-2)',
    animation: 'vc-skeleton 1.4s ease-in-out infinite',
    animationDelay: `${delay}s`,
    ...style,
  }}/>
);

const ClipRowSkeleton = ({ delay }) => (
  <div style={{
    display: 'flex', gap: 12, alignItems: 'center',
    padding: '12px 16px', borderBottom: '1px solid var(--vc-surface-2)',
  }}>
    <Sk w={56} h={40} delay={delay}/>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Sk w="62%" h={10} delay={delay}/>
      <Sk w="42%" h={9} delay={delay}/>
      <Sk w={70} h={16} r={999} delay={delay}/>
    </div>
  </div>
);
