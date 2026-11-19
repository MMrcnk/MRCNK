// MRCNK – sesja Deep Work na ekranie blokady (widżet „Teraz odtwarzane”, cichy dźwięk)
import * as L from './logic.js';

let audio = null;
let url = null;

function silentWav(sec = 5) {
  const sr = 8000, n = sr * sec;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, n * 2, true);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

export const lockSupported = () => 'mediaSession' in navigator;
export const lockActive = () => !!(audio && !audio.paused);

// wywoływać z kliknięcia (iOS wymaga gestu)
export async function lockShow(f, taskTitle) {
  if (!lockSupported()) return false;
  if (!audio) {
    url = url || silentWav();
    audio = new Audio(url);
    audio.loop = true;
    audio.setAttribute('playsinline', '');
  }
  try { await audio.play(); } catch { return false; }
  lockUpdate(f, taskTitle);
  return true;
}

export function lockUpdate(f, taskTitle) {
  if (!lockActive() || !f) return;
  const ms = navigator.mediaSession;
  const endAt = f.start + (f.pausedMs || 0) + f.plannedMin * 60000;
  try {
    ms.metadata = new MediaMetadata({
      title: f.pausedAt ? 'Deep Work · PAUZA' : `Deep Work · do ${L.hm(endAt)}`,
      artist: taskTitle || 'MRCNK',
      album: 'MRCNK',
      artwork: [{ src: 'icon-512.png', sizes: '512x512', type: 'image/png' }],
    });
    const dur = f.plannedMin * 60;
    ms.setPositionState({ duration: dur, position: Math.min(dur, Math.max(0, L.focusMin(f) * 60)), playbackRate: 1 });
    ms.playbackState = f.pausedAt ? 'paused' : 'playing';
    ['play', 'pause'].forEach((a) => { try { ms.setActionHandler(a, () => { audio && audio.play().catch(() => {}); }); } catch {} });
    ['seekbackward', 'seekforward', 'previoustrack', 'nexttrack', 'seekto'].forEach((a) => { try { ms.setActionHandler(a, null); } catch {} });
  } catch {}
}

export function lockHide() {
  if (audio) { audio.pause(); try { audio.currentTime = 0; } catch {} }
  if (lockSupported()) { try { navigator.mediaSession.metadata = null; navigator.mediaSession.playbackState = 'none'; } catch {} }
}
