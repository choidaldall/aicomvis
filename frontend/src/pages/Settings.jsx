import React, { useEffect, useState } from 'react';
import {
  Button, Card, EmptyState, Field, Icon, SectionTitle, Segmented,
  StatusDot, TextInput, Toggle, useT, useCameras,
} from '../components/components.jsx';
import { getSystemStatus } from '../api/status.js';
import { startRtsp, stopRtsp } from '../api/inference.js';

const MAX_CAMERAS = 8;

export default function Settings({ theme, setTheme, lang, setLang }) {
  const { t } = useT();
  const { cameras, updateCamera, removeCamera } = useCameras();
  const [sysStatus, setSysStatus] = useState(null);
  const [rtspBusy, setRtspBusy] = useState(false);
  const [rtspError, setRtspError] = useState(null);

  useEffect(() => {
    getSystemStatus().then(setSysStatus).catch(() => {});
    const iv = setInterval(() => {
      getSystemStatus().then(setSysStatus).catch(() => {});
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  const cameraVariant = { online: 'online', warning: 'warning', offline: 'offline' }[sysStatus?.camera] || 'offline';

  const diskFreeGb = sysStatus ? sysStatus.disk_free_gb.toFixed(1) : '--';
  const diskVariant = sysStatus && sysStatus.disk_free_gb < 1 ? 'warning' : 'online';

  const uptimeStr = sysStatus
    ? (() => {
        const s = Math.round(sysStatus.uptime_seconds);
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        return h > 0 ? `${h}j ${m}m` : `${m}m`;
      })()
    : '--';

  const handleEnable = (cam, on) => {
    setRtspError(null);
    if (on) {
      if (!cam.rtsp?.trim()) {
        setRtspError(lang === 'id' ? 'Mohon isi alamat RTSP terlebih dahulu melalui tombol Ubah.' : 'Please set the RTSP URL first via the Edit button.');
        return;
      }
      setRtspBusy(true);
      startRtsp(cam.rtsp.trim())
        .then(() => updateCamera(cam.id, { enabled: true, status: 'online' }))
        .catch((e) => {
          setRtspError(e?.response?.data?.detail || (lang === 'id' ? 'Gagal menyambungkan ke kamera.' : 'Failed to connect to the camera.'));
          updateCamera(cam.id, { enabled: false, status: 'offline' });
        })
        .finally(() => setRtspBusy(false));
    } else {
      setRtspBusy(true);
      stopRtsp()
        .then(() => updateCamera(cam.id, { enabled: false, status: 'offline' }))
        .finally(() => setRtspBusy(false));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--vc-fg-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{t('role_operator')}</div>
          <h1 style={{ fontSize: 28, fontWeight: 500, margin: 0 }}>{t('set_title')}</h1>
        </div>
      </div>

      {/* Tampilan */}
      <div>
        <SectionTitle>{t('sec_display')}</SectionTitle>
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SettingRow label={t('theme_label')}>
              <Segmented value={theme} onChange={setTheme} options={[
                { value: 'light', label: t('theme_light'), icon: 'sun' },
                { value: 'dark',  label: t('theme_dark'),  icon: 'moon' },
                { value: 'auto',  label: t('theme_auto') },
              ]}/>
            </SettingRow>
            <SettingRow label={t('lang_label')}>
              <Segmented value={lang} onChange={setLang} options={[
                { value: 'id', label: t('lang_id') },
                { value: 'en', label: t('lang_en') },
              ]}/>
            </SettingRow>
          </div>
        </Card>
      </div>

      {/* Kamera */}
      <div data-tour-id="cameras-section">
        <SectionTitle>
          {t('sec_cameras')}
        </SectionTitle>

        {cameras.length === 0 ? (
          <EmptyState icon="camera" title={t('cam_empty_title')}>{t('cam_empty_desc')}</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {cameras.map((cam) => (
              <CameraRow
                key={cam.id}
                camera={cam}
                onChange={(patch) => updateCamera(cam.id, patch)}
                onRemove={() => removeCamera(cam.id)}
                canRemove={cameras.length > 1}
                onEnable={handleEnable}
                rtspBusy={rtspBusy}
                lang={lang}
              />
            ))}
          </div>
        )}

        {rtspError && (
          <div style={{
            marginTop: 12,
            fontSize: 12, color: '#991B1B', background: 'var(--vc-status-alert-bg)',
            padding: '8px 12px', borderRadius: 6,
          }}>
            {rtspError}
          </div>
        )}
      </div>

      {/* Status Sistem (tanpa Model card, tanpa GPU card) */}
      <div>
        <SectionTitle>{t('sec_status')}</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <StatusCard icon="camera" label={t('sys_camera')} status={cameraVariant}>
            <KV k={t('rtsp_connection')} v={cameraVariant === 'online' ? 'RTSP' : '--'} mono/>
            <KV k="Target FPS" v="15" mono/>
            <KV k={t('rtsp_location')} v="Ruang XG ITB"/>
          </StatusCard>
          <StatusCard icon="hdd" label={t('sys_storage')} status={diskVariant}>
            <KV k={lang === 'id' ? 'Disk tersedia' : 'Disk available'} v={`${diskFreeGb} GB`} mono/>
            <KV k={lang === 'id' ? 'Batas klip' : 'Clip cap'} v="5 GB" mono/>
            {diskVariant === 'warning' && (
              <div style={{ fontSize: 11, color: '#A16207', marginTop: 4 }}>
                {lang === 'id' ? 'Disk mendekati batas kapasitas.' : 'Disk is nearing capacity.'}
              </div>
            )}
          </StatusCard>
          <StatusCard icon="clock" label={lang === 'id' ? 'Waktu Aktif' : 'Uptime'} status="online">
            <KV k={lang === 'id' ? 'Berjalan' : 'Running'} v={uptimeStr} mono/>
          </StatusCard>
        </div>
      </div>

      {/* Tentang */}
      <div>
        <SectionTitle>{t('sec_about')}</SectionTitle>
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <KV k={t('about_version')} v="AIComVis v1.0" mono/>
              <KV k={t('about_project')} v={lang === 'id'
                ? 'Tugas Akhir ET4092, Teknik Telekomunikasi ITB, 2026'
                : 'Final Project ET4092, Telecommunication Engineering ITB, 2026'}/>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--vc-fg-2)', marginBottom: 6 }}>{t('about_credits')}</div>
              <div style={{ fontSize: 13, color: 'var(--vc-fg-1)', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 500 }}>Septian Alfito Rachman</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--vc-fg-2)' }}>NIM 18122008</div>
                <div style={{ marginTop: 8, color: 'var(--vc-fg-2)' }}>
                  PLaiGROUND ITB<br/>
                  {lang === 'id'
                    ? 'Sekolah Teknik Elektro dan Informatika'
                    : 'School of Electrical Engineering and Informatics'}<br/>
                  {lang === 'id'
                    ? 'Institut Teknologi Bandung'
                    : 'Bandung Institute of Technology'}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// CameraRow: one camera entry. Read-only by default; click Ubah to edit
// the name and RTSP URL inline.
// -------------------------------------------------------------------
const CameraRow = ({ camera, onChange, onRemove, canRemove = true, onEnable, rtspBusy, lang }) => {
  const { t } = useT();
  const [editing, setEditing] = useState(!!camera._editing);
  const [name, setName] = useState(camera.name || '');
  const [rtsp, setRtsp] = useState(camera.rtsp || '');
  const [testState, setTestState] = useState('idle');

  const save = () => {
    onChange({ name, rtsp, _editing: false });
    setEditing(false);
    setTestState('idle');
  };
  const test = () => {
    setTestState('testing');
    setTimeout(() => {
      const valid = /^rtsp:\/\/.+/i.test(rtsp);
      setTestState(valid ? 'ok' : 'fail');
    }, 800);
  };

  if (editing) {
    return (
      <Card padding={18} style={{ borderColor: 'var(--vc-fg-1)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="camera" size={16}/>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{camera.id && camera.name ? camera.name : t('cam_form_new')}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label={t('cam_name')}>
            <TextInput value={name} onChange={setName} placeholder={lang === 'id' ? 'Misalnya: Ruang Tamu' : 'For example: Living Room'}/>
          </Field>
          <Field label={t('cam_rtsp')} help={t('cam_rtsp_help')} mono>
            <TextInput value={rtsp} onChange={(v) => { setRtsp(v); setTestState('idle'); }} placeholder="rtsp://192.168.1.10:554/stream1" mono/>
          </Field>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <Button variant="secondary" icon="bar" onClick={test} disabled={!rtsp || testState === 'testing'}>
            {testState === 'testing' ? t('cam_testing') : t('cam_test')}
          </Button>
          {testState === 'ok' ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#15803D' }}>
              <Icon name="check" size={14} stroke={2.4}/> {t('cam_test_ok')}
            </span>
          ) : null}
          {testState === 'fail' ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#991B1B' }}>
              <Icon name="x" size={14} stroke={2.4}/> {t('cam_test_fail')}
            </span>
          ) : null}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {!camera._editing ? (
              <Button variant="ghost" onClick={() => {
                setEditing(false);
                setName(camera.name); setRtsp(camera.rtsp);
              }}>{t('cam_cancel')}</Button>
            ) : null}
            <Button variant="primary" icon="check" onClick={save} disabled={!name || !rtsp}>{t('cam_save')}</Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card padding={16}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 8, background: 'var(--vc-surface-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--vc-fg-2)', flex: 'none',
        }}>
          <Icon name="camera" size={20}/>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{camera.name}</span>
            <StatusDot variant={!camera.enabled ? 'offline' : camera.status === 'online' ? 'online' : 'warning'}/>
            <span style={{ fontSize: 11, color: 'var(--vc-fg-2)' }}>
              {!camera.enabled ? (lang === 'id' ? 'nonaktif' : 'inactive')
                : camera.status === 'online' ? (lang === 'id' ? 'terhubung' : 'connected')
                : (lang === 'id' ? 'menghubungkan' : 'connecting')}
            </span>
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--vc-fg-2)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {camera.rtsp || (lang === 'id' ? 'Alamat RTSP belum diisi' : 'RTSP URL not set')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <Toggle on={camera.enabled}
            onChange={(on) => onEnable(camera, on)}
            disabled={rtspBusy || !camera.rtsp}/>
          <Button variant="secondary" onClick={() => setEditing(true)}>{t('cam_edit')}</Button>
          {canRemove ? (
            <Button variant="ghost" icon="trash" onClick={onRemove} style={{ color: '#991B1B' }}>{t('cam_remove')}</Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
};

const SettingRow = ({ label, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--vc-fg-1)', width: 140 }}>{label}</div>
    <div>{children}</div>
  </div>
);

const StatusCard = ({ icon, label, status, children }) => (
  <Card padding={18}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, background: 'var(--vc-surface-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--vc-fg-2)',
      }}>
        <Icon name={icon} size={16}/>
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--vc-fg-1)' }}>{label}</div>
      <span style={{ marginLeft: 'auto' }}><StatusDot variant={status}/></span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
  </Card>
);

const KV = ({ k, v, mono }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
    <span style={{ color: 'var(--vc-fg-2)' }}>{k}</span>
    <span style={{ color: 'var(--vc-fg-1)', fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit', textAlign: 'right' }}>{v}</span>
  </div>
);
