import React from 'react';
import { Icon, StatusDot, ThemeToggle, useT, useCameras } from '../components/components.jsx';
import { HelpButton } from '../components/Onboarding.jsx';

const StatusRow = ({ label, status }) => {
  const variant = { online: 'online', warning: 'warning', offline: 'offline', alert: 'alert' }[status?.variant] || 'offline';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <StatusDot variant={variant} pulse={variant === 'alert'}/>
      <span style={{ fontSize: 12, color: 'var(--vc-fg-1)' }}>{label}</span>
      <span style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--vc-fg-2)' }}>{status?.detail || ''}</span>
    </div>
  );
};

export default function Sidebar({ route, setRoute, systemStatus, theme, setTheme, onOpenHelp }) {
  const { t } = useT();
  const { cameras } = useCameras();
  const items = [
    { id: 'live',     label: t('nav_live'),     icon: 'monitor' },
    { id: 'clips',    label: t('nav_clips'),    icon: 'clip' },
    { id: 'settings', label: t('nav_settings'), icon: 'settings' },
  ];

  const onlineCount = cameras.filter((c) => c.enabled && c.status === 'online').length;
  const totalCount  = cameras.length;
  const anyAlert    = cameras.some((c) => c.enabled && c.fallActive);
  const lastDetection = cameras.map((c) => c.lastDetection).filter(Boolean).sort().reverse()[0] || systemStatus?.lastDetection || '--';

  return (
    <aside style={{
      width: 240, flex: 'none',
      background: 'var(--vc-surface)', borderRight: '1px solid var(--vc-border)',
      display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0,
    }}>
      <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--vc-fg-1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 48 48" fill="none" stroke="var(--vc-bg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 24c4-9 11-14 18-14s14 5 18 14c-4 9-11 14-18 14s-14-5-18-14z"/>
            <circle cx="24" cy="24" r="5" fill="var(--vc-bg)" stroke="none"/>
          </svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.015em' }}>
            AI<span style={{ color: '#DC2626' }}>Com</span>Vis
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--vc-fg-2)' }}>PLaiGROUND ITB · v1.0</div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--vc-surface-2)', margin: '4px 16px' }}/>

      <nav style={{ padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 2, flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: 10, color: 'var(--vc-fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 12px 6px' }}>Menu</div>
        {items.map((it) => {
          const active = route === it.id;
          return (
            <button key={it.id} onClick={() => setRoute(it.id)}
              data-tour-id={`nav-${it.id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 6,
                border: 0, background: active ? 'var(--vc-surface-2)' : 'transparent',
                color: active ? 'var(--vc-fg-1)' : 'var(--vc-fg-2)',
                fontFamily: 'inherit', fontSize: 13, fontWeight: active ? 500 : 400,
                cursor: 'pointer', textAlign: 'left',
                transition: 'background 120ms',
              }}>
              <Icon name={it.icon} size={16} stroke={1.8}/>
              <span>{it.label}</span>
              {it.id === 'live' && totalCount > 1 ? (
                <span style={{
                  marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10, padding: '1px 6px', borderRadius: 999,
                  background: 'var(--vc-surface-2)', color: 'var(--vc-fg-2)',
                }}>{totalCount}</span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* Status footer (Telegram row removed; UI no longer manages it) */}
      <div style={{ padding: 16, borderTop: '1px solid var(--vc-surface-2)' }}>
        <div style={{ fontSize: 10, color: 'var(--vc-fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{t('sys_status')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <StatusRow
            label={totalCount > 1 ? t('cam_plural') : t('sys_camera')}
            status={totalCount > 1
              ? { variant: anyAlert ? 'alert' : onlineCount > 0 ? 'online' : 'offline', detail: `${onlineCount}/${totalCount}` }
              : systemStatus?.camera}
          />
        </div>
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--vc-border)', fontSize: 11, color: 'var(--vc-fg-2)' }}>
          {t('last_detection')}
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--vc-fg-1)', marginTop: 2 }}>
            {lastDetection}
          </div>
        </div>
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--vc-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ThemeToggle theme={theme} onChange={setTheme}/>
          {onOpenHelp ? (
            <span style={{ marginLeft: 'auto' }}>
              <HelpButton onClick={onOpenHelp} label={t('help')}/>
            </span>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
