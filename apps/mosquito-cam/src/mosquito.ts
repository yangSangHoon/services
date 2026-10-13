export type Mode = 'far' | 'ear' | 'chase';

type ModeSpec = {
  label: string;
  /** 평소 머무는 깊이(0 멀리 ~ 1 렌즈 바로 앞) */
  z: [number, number];
  speed: number;
  /** 목표 지점을 바꾸는 간격(초) */
  retarget: [number, number];
  /** 목표를 바꿀 때 얼굴(렌즈)로 돌진할 확률 */
  dive: number;
};

export const MODES: Record<Mode, ModeSpec> = {
  far: { label: '멀리서', z: [0.04, 0.28], speed: 0.8, retarget: [0.8, 1.8], dive: 0 },
  ear: { label: '귓가에', z: [0.25, 0.7], speed: 1, retarget: [0.5, 1.3], dive: 0.25 },
  chase: { label: '집요하게', z: [0.45, 0.9], speed: 1.5, retarget: [0.3, 0.8], dive: 0.5 },
};

const RESPAWN_SEC = 2.4;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

type Dead = { at: number; x: number; y: number; size: number; angle: number; legs: number[][] };

/** 화면 좌표는 0~1 비율, z 는 깊이. 크기·소리 크기가 z 를 따라간다 */
export class Mosquito {
  x = 0;
  y = 0;
  z = 0;
  vx = 0;
  vy = 0;
  vz = 0;
  pitch = 560;
  heading = 0;
  dead: Dead | null = null;
  private t = 0;
  private tx = 0.5;
  private ty = 0.5;
  private tz = 0.2;
  private jx = 0;
  private jy = 0;
  private jz = 0;
  private nextTarget = 0;
  private nextJitter = 0;

  constructor() {
    this.spawn();
  }

  /** 화면 옆에서 멀리 날아 들어온다 */
  spawn() {
    const left = Math.random() < 0.5;
    this.x = left ? -0.08 : 1.08;
    this.y = rand(0.15, 0.6);
    this.z = rand(0.05, 0.15);
    this.vx = left ? 0.4 : -0.4;
    this.vy = 0;
    this.vz = 0;
    this.heading = left ? 0 : Math.PI;
    this.nextTarget = this.t;
    this.pitch = rand(470, 640);
    this.dead = null;
  }

  size(W: number, H: number) {
    return Math.min(W, H) * (0.035 + 0.6 * this.z ** 2.2);
  }

  /** 되살아난 프레임이면 true */
  step(dt: number, mode: Mode, W: number, H: number): boolean {
    this.t += dt;
    if (this.dead) {
      if (this.t - this.dead.at < RESPAWN_SEC) return false;
      this.spawn();
      return true;
    }
    const m = MODES[mode];

    if (this.t >= this.nextTarget) {
      this.nextTarget = this.t + rand(...m.retarget);
      const dive = Math.random() < m.dive;
      this.tz = dive ? rand(0.85, 1) : rand(...m.z);
      // 귓가에: 얼굴 양옆(화면 가장자리 쪽)을 맴돈다
      this.tx = mode === 'ear' && !dive ? (Math.random() < 0.5 ? rand(0.08, 0.3) : rand(0.7, 0.92)) : rand(0.12, 0.88);
      this.ty = dive ? rand(0.35, 0.6) : rand(0.12, 0.78);
    }
    // 모기 특유의 갈지자: 짧은 간격으로 무작위 가속을 바꾼다
    if (this.t >= this.nextJitter) {
      this.nextJitter = this.t + rand(0.06, 0.18);
      const j = 2.4 * m.speed;
      this.jx = rand(-j, j);
      this.jy = rand(-j, j) * 0.8;
      this.jz = rand(-0.6, 0.6) * m.speed;
    }

    const k = 3 * m.speed;
    const damp = Math.exp(-2.8 * dt);
    this.vx = this.vx * damp + ((this.tx - this.x) * k + this.jx) * dt;
    this.vy = this.vy * damp + ((this.ty - this.y) * k + this.jy) * dt;
    this.vz = this.vz * damp + ((this.tz - this.z) * k * 0.8 + this.jz) * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.z = clamp(this.z + this.vz * dt, 0.02, 1);

    const sx = this.vx * W;
    const sy = this.vy * H;
    if (Math.hypot(sx, sy) > 0.05 * Math.min(W, H)) {
      let d = Math.atan2(sy, sx) - this.heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.heading += d * Math.min(1, dt * 6);
    }
    return false;
  }

  private screen(W: number, H: number) {
    const s = Math.min(W, H) * 0.0025 * (1 + this.z);
    return {
      px: this.x * W + (Math.sin(this.t * 41) + Math.sin(this.t * 27)) * s,
      py: this.y * H + (Math.sin(this.t * 37) + Math.cos(this.t * 23)) * s,
    };
  }

  /** 탭 판정. 작게 보일 때도 잡을 수 있게 최소 반경(slop)을 둔다 */
  hit(cx: number, cy: number, W: number, H: number, slop: number) {
    if (this.dead) return false;
    const { px, py } = this.screen(W, H);
    return Math.hypot(cx - px, cy - py) < Math.max(this.size(W, H) * 0.55, slop);
  }

  kill(W: number, H: number) {
    const { px, py } = this.screen(W, H);
    const size = Math.min(this.size(W, H), Math.min(W, H) * 0.3);
    const legs = Array.from({ length: 5 }, () => [rand(0, Math.PI * 2), rand(0.18, 0.4), rand(-0.6, 0.6)]);
    this.dead = { at: this.t, x: px, y: py, size, angle: this.heading, legs };
  }

  draw(ctx: CanvasRenderingContext2D, W: number, H: number) {
    if (this.dead) return this.drawSplat(ctx);
    if (this.x < -0.2 || this.x > 1.2) return;
    const { px, py } = this.screen(W, H);
    const L = this.size(W, H);

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(this.heading);
    // 렌즈에 아주 가까우면 초점이 나간 듯 흐리게
    if (this.z > 0.75 && 'filter' in ctx) ctx.filter = `blur(${((this.z - 0.75) * L * 0.04).toFixed(1)}px)`;
    ctx.lineCap = 'round';

    // 다리 3쌍
    ctx.strokeStyle = 'rgba(22, 20, 18, 0.85)';
    ctx.lineWidth = Math.max(1, L * 0.018);
    const legs: [number, number, number, number][] = [
      [0.25, 0.16, 0.6, 0.32],
      [0.02, 0.3, -0.04, 0.62],
      [-0.2, 0.26, -0.68, 0.46],
    ];
    for (const side of [-1, 1]) {
      for (const [jx, jy, ex, ey] of legs) {
        ctx.beginPath();
        ctx.moveTo(0.06 * L, 0);
        ctx.lineTo(jx * L, side * jy * L);
        ctx.lineTo(ex * L, side * ey * L);
        ctx.stroke();
      }
    }

    // 날개: 빠른 날갯짓을 잔상 두 장으로
    const flap = Math.sin(this.t * 2 * Math.PI * 23);
    for (const side of [-1, 1]) {
      for (const a of [0.25 + flap * 0.25, 0.75 - flap * 0.2]) {
        ctx.save();
        ctx.translate(-0.02 * L, side * 0.05 * L);
        ctx.rotate(Math.PI + side * a);
        ctx.fillStyle = 'rgba(210, 220, 230, 0.22)';
        ctx.beginPath();
        ctx.ellipse(0.3 * L, 0, 0.3 * L, 0.08 * L, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // 배: 흰줄숲모기 줄무늬
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(-0.3 * L, 0, 0.34 * L, 0.085 * L, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1b1917';
    ctx.fill();
    ctx.clip();
    ctx.strokeStyle = 'rgba(240, 240, 240, 0.85)';
    ctx.lineWidth = L * 0.025;
    for (const sx of [-0.1, -0.2, -0.3, -0.4, -0.5]) {
      ctx.beginPath();
      ctx.moveTo(sx * L, -0.1 * L);
      ctx.lineTo(sx * L, 0.1 * L);
      ctx.stroke();
    }
    ctx.restore();

    // 가슴 + 등의 흰 줄
    ctx.fillStyle = '#25211d';
    ctx.beginPath();
    ctx.ellipse(0.08 * L, 0, 0.13 * L, 0.1 * L, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(245, 245, 245, 0.9)';
    ctx.lineWidth = L * 0.02;
    ctx.beginPath();
    ctx.moveTo(0.0, 0);
    ctx.lineTo(0.17 * L, 0);
    ctx.stroke();

    // 머리 · 주둥이 · 더듬이
    ctx.fillStyle = '#1b1917';
    ctx.beginPath();
    ctx.arc(0.25 * L, 0, 0.06 * L, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1b1917';
    ctx.lineWidth = Math.max(1, L * 0.014);
    ctx.beginPath();
    ctx.moveTo(0.3 * L, 0);
    ctx.lineTo(0.58 * L, 0);
    ctx.moveTo(0.28 * L, -0.02 * L);
    ctx.lineTo(0.44 * L, -0.08 * L);
    ctx.moveTo(0.28 * L, 0.02 * L);
    ctx.lineTo(0.44 * L, 0.08 * L);
    ctx.stroke();

    ctx.restore();
  }

  private drawSplat(ctx: CanvasRenderingContext2D) {
    const d = this.dead!;
    const age = this.t - d.at;
    const L = d.size;
    ctx.save();
    ctx.globalAlpha = age > RESPAWN_SEC - 0.6 ? Math.max(0, (RESPAWN_SEC - age) / 0.6) : 1;
    ctx.translate(d.x, d.y);
    ctx.rotate(d.angle);
    ctx.lineCap = 'round';

    // 핏자국
    ctx.fillStyle = 'rgba(150, 18, 20, 0.75)';
    ctx.beginPath();
    ctx.ellipse(0.05 * L, 0.04 * L, 0.24 * L, 0.11 * L, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0.32 * L, -0.1 * L, 0.03 * L, 0, Math.PI * 2);
    ctx.arc(-0.26 * L, 0.14 * L, 0.02 * L, 0, Math.PI * 2);
    ctx.fill();

    // 납작해진 몸통과 부러진 다리
    ctx.fillStyle = '#1b1917';
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.26 * L, 0.06 * L, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(22, 20, 18, 0.8)';
    ctx.lineWidth = Math.max(1, L * 0.016);
    for (const [a, r, bend] of d.legs) {
      const mx = Math.cos(a) * r * 0.5 * L;
      const my = Math.sin(a) * r * 0.5 * L;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(mx, my);
      ctx.lineTo(mx + Math.cos(a + bend) * r * 0.5 * L, my + Math.sin(a + bend) * r * 0.5 * L);
      ctx.stroke();
    }
    ctx.restore();
  }
}
