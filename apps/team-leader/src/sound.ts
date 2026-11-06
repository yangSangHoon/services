import type { SoundName } from './game';

const KEY = 'team-leader:muted';
let ac: AudioContext | null = null;
let muted = (() => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
})();

export const isMuted = () => muted;
export function setMuted(v: boolean) {
  muted = v;
  try {
    localStorage.setItem(KEY, v ? '1' : '0');
  } catch {
    /* 무시 */
  }
}

/** 사용자 제스처 안에서 한 번 호출 (iOS 오디오 잠금 해제) */
export function unlockAudio() {
  if (!ac) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctor) ac = new Ctor();
  }
  void ac?.resume();
}

function tone(freq: number, dur: number, type: OscillatorType, vol = 0.12, slide = 0, delay = 0) {
  if (!ac || muted) return;
  const t = ac.currentTime + delay;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ac.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export function play(s: SoundName) {
  switch (s) {
    case 'block':
      tone(520 + Math.random() * 80, 0.07, 'square', 0.07, 300);
      break;
    case 'heavy':
      tone(140, 0.22, 'square', 0.12, -60);
      tone(90, 0.3, 'triangle', 0.15, -30);
      break;
    case 'hit':
      tone(200, 0.18, 'sawtooth', 0.1, -120);
      break;
    case 'heal':
      tone(660, 0.08, 'sine', 0.1);
      tone(990, 0.12, 'sine', 0.1, 0, 0.07);
      break;
    case 'warn':
      tone(1200, 0.05, 'square', 0.04);
      tone(1200, 0.05, 'square', 0.04, 0, 0.09);
      break;
    case 'year':
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.14, 'triangle', 0.1, 0, i * 0.09));
      break;
    case 'over':
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.25, 'triangle', 0.12, 0, i * 0.16));
      break;
  }
}
