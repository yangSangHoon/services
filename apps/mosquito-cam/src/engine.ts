import { Buzz } from './buzz';
import { Mosquito, type Mode } from './mosquito';

export type Facing = 'environment' | 'user';

/** 카메라·마이크·오디오 컨텍스트. 화면이 다시 그려져도 유지되고 '끝내기'에서만 닫는다 */
export type Session = {
  audio: AudioContext;
  cam: MediaStream;
  mic: MediaStream | null;
  facing: Facing;
};

const videoConstraints = (facing: Facing): MediaTrackConstraints => ({
  facingMode: { ideal: facing },
  width: { ideal: 1280 },
  height: { ideal: 720 },
});

/**
 * 반드시 버튼 클릭 핸들러에서 호출한다.
 * iOS 는 사용자 제스처 안에서 만든 AudioContext 만 소리를 낸다(첫 await 전에 생성).
 */
export async function openSession(): Promise<Session> {
  const audio = new AudioContext();
  void audio.resume();
  try {
    const both = await navigator.mediaDevices.getUserMedia({ video: videoConstraints('environment'), audio: true });
    return {
      audio,
      cam: new MediaStream(both.getVideoTracks()),
      mic: new MediaStream(both.getAudioTracks()),
      facing: 'environment',
    };
  } catch (e) {
    // 마이크가 없거나 막힌 경우 카메라만이라도
    if ((e as Error).name === 'NotFoundError' || (e as Error).name === 'NotReadableError') {
      const cam = await navigator.mediaDevices.getUserMedia({ video: videoConstraints('environment') });
      return { audio, cam, mic: null, facing: 'environment' };
    }
    void audio.close();
    throw e;
  }
}

export function closeSession(s: Session) {
  s.cam.getTracks().forEach((t) => t.stop());
  s.mic?.getTracks().forEach((t) => t.stop());
  void s.audio.close();
}

// 인스타·카톡 호환을 위해 mp4(H.264 + AAC)를 먼저 시도
const MIME_CANDIDATES = [
  'video/mp4;codecs=avc1.42E01F,mp4a.40.2',
  'video/mp4;codecs=avc1,mp4a',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm',
];
const LONG_SIDE = 1280;

export type Recording = { blob: Blob; ext: 'mp4' | 'webm' };

/**
 * 카메라 화면 + 모기를 캔버스에 그리고, 캔버스 영상과 (마이크 + 모기 소리)를 함께 녹화한다.
 * 스피커로도 모기 소리를 내서 찍히는 사람이 실제로 듣는다.
 */
export class Engine {
  mode: Mode = 'ear';
  buzzOn = true;
  /** 결과 미리보기 중에는 모기를 잠깐 조용히 */
  muted = false;
  onKill?: () => void;

  private ctx: CanvasRenderingContext2D;
  private mosq = new Mosquito();
  private buzz: Buzz;
  private recDest: MediaStreamAudioDestinationNode;
  private micSrc: MediaStreamAudioSourceNode | null = null;
  private raf = 0;
  private last = 0;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  constructor(
    private canvas: HTMLCanvasElement,
    private video: HTMLVideoElement,
    private session: Session,
  ) {
    this.ctx = canvas.getContext('2d')!;
    const { audio } = session;
    this.recDest = audio.createMediaStreamDestination();
    this.buzz = new Buzz(audio);
    this.buzz.setPitch(this.mosq.pitch);
    this.buzz.out.connect(audio.destination);
    this.buzz.out.connect(this.recDest);
    if (session.mic) {
      // 스피커로는 보내지 않는다(하울링 방지). 녹화에만 섞는다
      this.micSrc = audio.createMediaStreamSource(session.mic);
      this.micSrc.connect(this.recDest);
    }
    this.attachVideo(session.cam);
    this.resize();
    addEventListener('resize', this.resize);
    document.addEventListener('visibilitychange', this.wake);
    this.raf = requestAnimationFrame(this.frame);
  }

  get recording() {
    return this.recorder?.state === 'recording';
  }

  get facing() {
    return this.session.facing;
  }

  async flip() {
    const next: Facing = this.session.facing === 'environment' ? 'user' : 'environment';
    // iOS 는 카메라 두 개를 동시에 못 연다 → 먼저 닫는다
    this.session.cam.getTracks().forEach((t) => t.stop());
    const cam = await navigator.mediaDevices.getUserMedia({ video: videoConstraints(next) });
    this.session.cam = cam;
    this.session.facing = next;
    this.attachVideo(cam);
  }

  /** 화면 탭 → 모기를 맞혔으면 true */
  tap(clientX: number, clientY: number) {
    this.wake();
    const r = this.canvas.getBoundingClientRect();
    const k = this.canvas.width / r.width;
    const { width: W, height: H } = this.canvas;
    if (!this.mosq.hit((clientX - r.left) * k, (clientY - r.top) * k, W, H, 36 * k)) return false;
    this.mosq.kill(W, H);
    this.buzz.splat();
    navigator.vibrate?.(30);
    this.onKill?.();
    return true;
  }

  startRecording() {
    const video = this.canvas.captureStream(30);
    const stream = new MediaStream([...video.getVideoTracks(), ...this.recDest.stream.getAudioTracks()]);
    const mimeType = MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m));
    this.chunks = [];
    this.recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
    this.recorder.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.recorder.start(500);
  }

  stopRecording(): Promise<Recording> {
    const rec = this.recorder!;
    return new Promise((resolve) => {
      rec.onstop = () => {
        rec.stream.getVideoTracks().forEach((t) => t.stop());
        const type = rec.mimeType || this.chunks[0]?.type || 'video/webm';
        resolve({ blob: new Blob(this.chunks, { type }), ext: type.includes('mp4') ? 'mp4' : 'webm' });
        this.recorder = null;
      };
      rec.stop();
    });
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    removeEventListener('resize', this.resize);
    document.removeEventListener('visibilitychange', this.wake);
    if (this.recorder?.state === 'recording') this.recorder.stop();
    this.buzz.dispose();
    this.micSrc?.disconnect();
  }

  private attachVideo(stream: MediaStream) {
    this.video.srcObject = stream;
    void this.video.play().catch(() => {});
  }

  /** 백그라운드에 다녀오면 멈춘 오디오를 다시 깨운다 */
  private wake = () => {
    if (this.session.audio.state !== 'running') void this.session.audio.resume();
  };

  /** 보이는 화면 비율 그대로, 긴 변을 1280px 로 */
  private resize = () => {
    if (this.recording) return; // 녹화 중에 해상도가 바뀌면 영상이 깨진다
    const { clientWidth: w, clientHeight: h } = this.canvas;
    if (!w || !h) return;
    const k = LONG_SIDE / Math.max(w, h);
    // 영상 인코더는 짝수 크기를 요구한다
    this.canvas.width = Math.round((w * k) / 2) * 2;
    this.canvas.height = Math.round((h * k) / 2) * 2;
  };

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0.016;
    this.last = now;
    const { width: W, height: H } = this.canvas;

    if (this.mosq.step(dt, this.mode, W, H)) this.buzz.setPitch(this.mosq.pitch);
    this.draw(W, H);

    const m = this.mosq;
    const on = this.buzzOn && !this.muted && !m.dead && m.x > -0.15 && m.x < 1.15;
    this.buzz.set(
      on ? 0.04 + 0.96 * m.z ** 2 : 0,
      Math.max(-1, Math.min(1, (m.x - 0.5) * 1.6)),
      Math.max(-0.08, Math.min(0.08, m.vz * 0.08)),
    );
  };

  private draw(W: number, H: number) {
    const { ctx, video: v } = this;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    if (v.videoWidth) {
      const s = Math.max(W / v.videoWidth, H / v.videoHeight);
      const dw = v.videoWidth * s;
      const dh = v.videoHeight * s;
      ctx.save();
      if (this.session.facing === 'user') {
        ctx.translate(W, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(v, (W - dw) / 2, (H - dh) / 2, dw, dh);
      ctx.restore();
    }
    this.mosq.draw(ctx, W, H);

    // 영상에 남는 워터마크
    const fs = Math.round(Math.min(W, H) * 0.035);
    ctx.save();
    ctx.font = `700 ${fs}px 'Pretendard Variable', -apple-system, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = fs * 0.3;
    ctx.textBaseline = 'bottom';
    ctx.fillText('🦟 앵앵 몰카', fs * 0.8, H - fs * 0.8);
    ctx.restore();
  }
}
