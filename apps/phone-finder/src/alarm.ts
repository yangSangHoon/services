/**
 * "여기야!" 알람. 브라우저는 사용자가 화면을 한 번 터치하기 전엔 소리를 막으므로
 * 첫 터치 때 AudioContext 를 깨워 둔다(unlock).
 */
let ctx: AudioContext | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

export function unlockAudio() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    /* 지원 안 하는 브라우저 */
  }
}

export const audioReady = () => ctx?.state === 'running';

function beep(at: number, freq: number, dur: number) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(freq, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.5, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

/** 삐삐삐— 1.2초마다 반복 */
function phrase() {
  if (!ctx) return;
  const t = ctx.currentTime + 0.02;
  beep(t, 1568, 0.12);
  beep(t + 0.16, 1568, 0.12);
  beep(t + 0.32, 2093, 0.3);
}

export function startAlarm() {
  stopAlarm();
  unlockAudio();
  phrase();
  try {
    navigator.vibrate?.([400, 200, 400, 200, 400]);
  } catch {
    /* 진동 미지원 */
  }
  timer = setInterval(() => {
    phrase();
    try {
      navigator.vibrate?.([400, 200, 400]);
    } catch {
      /* 진동 미지원 */
    }
  }, 1200);
}

export function stopAlarm() {
  if (timer) clearInterval(timer);
  timer = null;
  try {
    navigator.vibrate?.(0);
  } catch {
    /* 진동 미지원 */
  }
}
