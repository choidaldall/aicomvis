import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  I18nContext, LanguageToggle, Icon, STRINGS,
  CameraContext,
} from './components/components.jsx';
import { playFallAlert, primeAudio } from './alertSound.js';
import { OnboardingTour, HelpCenter } from './components/Onboarding.jsx';
import { useStatusWebSocket } from './hooks/useWebSocket.js';
import { useIsMobile } from './hooks/useMediaQuery.js';
import { listClips } from './api/clips.js';
import { getSystemStatus } from './api/status.js';
import { isDemoMode } from './api/mock.js';
import Sidebar from './pages/Sidebar.jsx';
import LiveMonitor from './pages/LiveMonitor.jsx';
import ClipBrowser from './pages/ClipBrowser.jsx';
import Settings from './pages/Settings.jsx';

const SUS_DEMO_BUILD = isDemoMode();

// Bump when persisted shape changes; old localStorage is discarded on mismatch.
const STATE_VERSION = '8';

// Default camera seed: one entry that mirrors current single-camera backend.
const DEFAULT_CAMERAS = [
  {
    id: 'cam1', name: 'Ruang XG ITB',
    rtsp: '',
    enabled: false, status: 'offline',
    resolution: null, fps: null,
    fallActive: false, lastDetection: '',
  },
];

export default function App() {
  useEffect(() => {
    if (localStorage.getItem('vc-state-version') !== STATE_VERSION) {
      ['vc-theme', 'vc-lang', 'vc-cameras', 'vc-rtsp-url'].forEach((k) => localStorage.removeItem(k));
      localStorage.setItem('vc-state-version', STATE_VERSION);
    }
  }, []);

  const [route, setRoute] = useState('live');
  const [theme, setTheme] = useState(() => {
    if (localStorage.getItem('vc-state-version') !== STATE_VERSION) return 'light';
    return localStorage.getItem('vc-theme') || 'light';
  });
  const [lang, setLang] = useState(() => {
    if (localStorage.getItem('vc-state-version') !== STATE_VERSION) return 'id';
    return localStorage.getItem('vc-lang') || 'id';
  });
  const [systemStatus, setSystemStatus] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [cameras, setCameras] = useState(() => {
    if (localStorage.getItem('vc-state-version') !== STATE_VERSION) return DEFAULT_CAMERAS;
    try {
      const saved = JSON.parse(localStorage.getItem('vc-cameras') || 'null');
      if (Array.isArray(saved) && saved.length > 0) return saved;
    } catch { /* fall through */ }
    return DEFAULT_CAMERAS;
  });
  const [activeId, setActiveId] = useState(() => cameras[0]?.id || null);

  const isMobile = useIsMobile();

  useEffect(() => {
    const resolved = theme === 'auto'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    document.documentElement.setAttribute('data-theme', resolved);
    localStorage.setItem('vc-theme', theme);
    if (theme !== 'auto') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      document.documentElement.setAttribute('data-theme', mq.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  useEffect(() => { localStorage.setItem('vc-lang', lang); }, [lang]);
  useEffect(() => { localStorage.setItem('vc-cameras', JSON.stringify(cameras)); }, [cameras]);
  useEffect(() => { if (isMobile) setDrawerOpen(false); }, [route, isMobile]);

  useEffect(() => {
    if (activeId !== 'all' && !cameras.find((c) => c.id === activeId)) {
      setActiveId(cameras[0]?.id || null);
    }
  }, [cameras, activeId]);

  const addCamera = useCallback((cam) => setCameras((cs) => [...cs, { ...cam, id: cam.id || `cam_${Date.now()}` }]), []);
  const updateCamera = useCallback((id, patch) => setCameras((cs) => cs.map((c) => c.id === id ? { ...c, ...patch } : c)), []);
  const removeCamera = useCallback((id) => setCameras((cs) => cs.filter((c) => c.id !== id)), []);

  const cameraCtx = useMemo(() => ({
    cameras, activeId, setActiveId,
    addCamera, updateCamera, removeCamera,
  }), [cameras, activeId, addCamera, updateCamera, removeCamera]);

  const { status: wsStatus, fallEvent, clearFallEvent, connected } = useStatusWebSocket();

  // Audible fall alarm (synthesized, see alertSound.js). On/off persisted.
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem('vc-alert-sound') !== '0');
  const soundOnRef = useRef(soundOn);
  useEffect(() => {
    soundOnRef.current = soundOn;
    localStorage.setItem('vc-alert-sound', soundOn ? '1' : '0');
  }, [soundOn]);
  // Unlock audio on the first user gesture so the alarm isn't blocked later.
  useEffect(() => {
    const unlock = () => primeAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);
  useEffect(() => { if (fallEvent && soundOnRef.current) playFallAlert(); }, [fallEvent]);

  useEffect(() => {
    const fetchStatus = () => {
      getSystemStatus().then((s) => {
        setSystemStatus({
          camera:   buildStatusRow(s.camera, s.camera === 'online' ? '15 fps' : ''),
          telegram: buildStatusRow(s.telegram === 'connected' ? 'online' : 'offline', s.telegram),
          disk_free_gb: s.disk_free_gb,
          uptime_seconds: s.uptime_seconds,
          lastDetection: '--',
        });
        setCameras((cs) => cs.map((c) => c.enabled ? {
          ...c,
          status: s.camera === 'online' ? 'online' : s.camera === 'warning' ? 'warning' : 'offline',
        } : c));
      }).catch(() => {});
    };
    fetchStatus();
    const iv = setInterval(fetchStatus, 5000);
    return () => clearInterval(iv);
  }, [lang]);

  // Surface a fall event to the active camera so CameraTabs/Tile pulses red.
  useEffect(() => {
    if (fallEvent && activeId) {
      const cid = activeId === 'all' ? cameras.find((c) => c.enabled)?.id : activeId;
      if (cid) updateCamera(cid, { fallActive: true, lastDetection: new Date().toLocaleTimeString('id-ID', { hour12: false }) });
      const tid = setTimeout(() => { if (cid) updateCamera(cid, { fallActive: false }); }, 8000);
      return () => clearTimeout(tid);
    }
  }, [fallEvent]); // eslint-disable-line

  const t = useCallback((key) => (STRINGS[lang] && STRINGS[lang][key]) || key, [lang]);
  const i18n = useMemo(() => ({ lang, t }), [lang, t]);

  const rtspOnline = systemStatus?.camera?.variant === 'online';

  const [tourOpen, setTourOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  // Track the current tour step at the App level so LiveMonitor receives it
  // as a prop. Event-based propagation had timing races where the alert
  // banner step would commit before LiveMonitor's listener fired.
  const [tourStep, setTourStep] = useState(null);
  useEffect(() => {
    const tid = setTimeout(() => {
      if (SUS_DEMO_BUILD) {
        if (!sessionStorage.getItem('vc-sus-toured')) {
          setTourOpen(true);
          sessionStorage.setItem('vc-sus-toured', '1');
        }
      } else if (!localStorage.getItem('vc-onboarded')) {
        setTourOpen(true);
      }
    }, 600);
    return () => clearTimeout(tid);
  }, []);
  const startTour = () => { setHelpOpen(false); setTourOpen(true); };

  const sidebarVisible = !isMobile || drawerOpen;

  return (
    <I18nContext.Provider value={i18n}>
      <CameraContext.Provider value={cameraCtx}>
        <div style={{
          display: 'flex',
          minHeight: '100vh',
          background: 'var(--vc-bg)',
          color: 'var(--vc-fg-1)',
          fontFamily: 'inherit',
          position: 'relative',
        }}>
          {SUS_DEMO_BUILD ? (
            <div style={{
              position: 'sticky', top: 0, zIndex: 40,
              background: '#1C1917', color: '#FAFAF9',
              padding: '8px 14px', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: 12,
              fontSize: 12, flexWrap: 'wrap',
            }}>
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '2px 6px', borderRadius: 4,
                background: '#DC2626', color: '#fff',
              }}>SUS DEMO</span>
              <span>{t('sus_banner')}</span>
              {import.meta.env.VITE_SUS_FORM_URL ? (
                <a href={import.meta.env.VITE_SUS_FORM_URL} target="_blank" rel="noopener"
                   style={{ color: '#FAFAF9', textDecoration: 'underline', fontWeight: 500 }}>
                  {lang === 'id' ? 'Buka formulir survei' : 'Open survey form'}
                </a>
              ) : null}
            </div>
          ) : null}

          {sidebarVisible && (
            <>
              {isMobile && (
                <div onClick={() => setDrawerOpen(false)}
                     style={{
                       position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
                       zIndex: 50,
                     }}/>
              )}
              <div style={isMobile ? {
                position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 51,
                boxShadow: '0 0 24px rgba(0,0,0,0.2)',
              } : {}}>
                <Sidebar
                  route={route}
                  setRoute={setRoute}
                  systemStatus={systemStatus}
                  theme={theme}
                  setTheme={setTheme}
                  onOpenHelp={() => setHelpOpen(true)}
                />
              </div>
            </>
          )}

          <main style={{
            flex: 1,
            padding: isMobile ? '12px 14px 56px' : '24px 32px 64px',
            maxWidth: 1280, width: '100%', margin: '0 auto',
            display: 'flex', flexDirection: 'column', gap: 16,
            minWidth: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 4, flexWrap: 'wrap' }}>
              {isMobile && (
                <button onClick={() => setDrawerOpen((v) => !v)}
                        aria-label={t('open_menu')}
                        style={{
                          background: 'var(--vc-surface-2)',
                          border: '1px solid var(--vc-border-strong)',
                          color: 'var(--vc-fg-1)',
                          borderRadius: 8, padding: 7,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer',
                        }}>
                  <Icon name="menu" size={18} stroke={2}/>
                </button>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--vc-fg-2)' }}>
                <Icon name="globe" size={14}/>
                <LanguageToggle lang={lang} onChange={setLang}/>
              </div>
              <button
                onClick={() => setSoundOn((v) => !v)}
                title={soundOn ? (lang === 'id' ? 'Bisukan alarm jatuh' : 'Mute fall alarm') : (lang === 'id' ? 'Aktifkan alarm jatuh' : 'Unmute fall alarm')}
                aria-label={soundOn ? (lang === 'id' ? 'Bisukan alarm jatuh' : 'Mute fall alarm') : (lang === 'id' ? 'Aktifkan alarm jatuh' : 'Unmute fall alarm')}
                style={{
                  marginLeft: 'auto',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 30, height: 30, borderRadius: 999,
                  border: '1px solid var(--vc-border)',
                  background: 'var(--vc-surface)',
                  color: soundOn ? 'var(--vc-fg-1)' : 'var(--vc-fg-3)',
                  cursor: 'pointer',
                }}>
                <Icon name={soundOn ? 'volume' : 'volume_off'} size={15} stroke={1.9}/>
              </button>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 999,
                background: connected ? 'var(--vc-status-online-bg)' : 'var(--vc-status-offline-bg)',
                fontSize: 11, color: connected ? '#15803D' : 'var(--vc-fg-2)',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? '#16A34A' : 'var(--vc-fg-3)', display: 'inline-block' }}/>
                {connected ? 'WebSocket OK' : 'WS offline'}
              </div>
            </div>

            {route === 'live' && (
              <LiveMonitor
                wsStatus={wsStatus}
                fallEvent={fallEvent}
                clearFallEvent={clearFallEvent}
                setRoute={setRoute}
                rtspOnline={rtspOnline}
                tourStep={tourStep}
              />
            )}
            {route === 'clips' && <ClipBrowser/>}
            {route === 'settings' && (
              <Settings theme={theme} setTheme={setTheme} lang={lang} setLang={setLang}/>
            )}
          </main>

          <OnboardingTour open={tourOpen} onClose={() => setTourOpen(false)} route={route} setRoute={setRoute}
            contextHints={{ hasMultiCam: cameras.length > 1 }}
            onStepChange={setTourStep}/>
          <HelpCenter open={helpOpen} onClose={() => setHelpOpen(false)} onReplayTour={startTour}/>
        </div>
      </CameraContext.Provider>
    </I18nContext.Provider>
  );
}

function buildStatusRow(variant, detail) {
  return { variant, detail };
}
