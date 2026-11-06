/** 효과음 — WebAudio 로 짧은 비프. 파일 없음 */
const KEY = 'study-develop:muted';
let ctx: AudioContext | null = null;
export let muted = (() => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
})();

export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem(KEY, m ? '1' : '0');
  } catch {
    /* noop */
  }
}

function tone(freq: number, at: number, dur: number, type: OscillatorType = 'sine', vol = 0.08) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, ctx.currentTime + at);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + dur);
  o.connect(g).connect(ctx.destination);
  o.start(ctx.currentTime + at);
  o.stop(ctx.currentTime + at + dur + 0.02);
}

export function sfx(kind: 'correct' | 'wrong' | 'levelup' | 'step' | 'open' | 'coin') {
  if (muted) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    return;
  }
  if (kind === 'correct') { tone(660, 0, 0.1); tone(990, 0.08, 0.15); }
  else if (kind === 'wrong') tone(180, 0, 0.25, 'square', 0.05);
  else if (kind === 'levelup') [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.12, 0.25, 'triangle'));
  else if (kind === 'step') tone(320, 0, 0.03, 'triangle', 0.02);
  else if (kind === 'open') { tone(440, 0, 0.08, 'triangle'); tone(660, 0.06, 0.1, 'triangle'); }
  else if (kind === 'coin') { tone(988, 0, 0.07, 'square', 0.04); tone(1318, 0.07, 0.15, 'square', 0.04); }
}
