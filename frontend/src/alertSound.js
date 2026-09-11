// Fall-alert tone, synthesized with the Web Audio API.
//
// The system runs on an offline lab PC and is meant to be self-contained, so
// instead of shipping (and licensing) an .mp3/.wav asset the alarm is generated
// on the fly. The cadence is a short high-low two-tone repeated three times,
// which reads clearly as an emergency alert without being harsh.

let ctx = null;

function getCtx() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    try { ctx = new AC(); } catch { return null; }
  }
  return ctx;
}

// Browsers start an AudioContext suspended until the user interacts with the
// page. Calling this from the first click/tap unlocks audio so the alarm can
// fire later without being blocked by autoplay policy.
export function primeAudio() {
  const c = getCtx();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

export function playFallAlert() {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});

  // High-low two-tone cadence, repeated three times.
  const pattern = [988, 740, 988, 740, 988, 740];
  const dur = 0.18;
  const gap = 0.06;
  let t = c.currentTime + 0.02;

  for (const freq of pattern) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    // Short attack + decay so each beep starts and ends without a click.
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.45, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
    t += dur + gap;
  }
}
