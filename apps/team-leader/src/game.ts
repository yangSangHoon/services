// 버텨라, 팀장님 — 캔버스 게임 엔진 (React 와 분리된 순수 TS)

export type KindId = 'complain' | 'late' | 'slack' | 'customer' | 'order' | 'layoff' | 'good';
type Source = 'member' | 'boss' | 'ceo' | 'phone';

interface KindDef {
  name: string;
  cause: string; // 퇴사 사유 문구
  source: Source;
  icon: string;
  texts: string[];
  speed: number; // 기준 필드 반지름 200px 일 때 px/s
  dmg: number;
  fill: string;
  ink: string;
}

export const KINDS: Record<KindId, KindDef> = {
  complain: {
    name: '팀원 불만',
    cause: '팀원들의 불만 폭주',
    source: 'member',
    icon: '😤',
    texts: ['이걸 왜 제가요?', '회의 너무 많아요', '연봉 얘기 좀…', '단톡 그만요', '저만 일해요', '평가 납득 안 돼요', '자리 바꿔주세요'],
    speed: 105,
    dmg: 9,
    fill: '#ffe1b8',
    ink: '#7a3d00',
  },
  late: {
    name: '지각',
    cause: '끝없는 지각',
    source: 'member',
    icon: '⏰',
    texts: ['차가 막혀서요', '알람이 안 울렸어요', '병원 들렀다 갈게요', '5분만요!', '지하철 고장이요'],
    speed: 55,
    dmg: 9,
    fill: '#fff3a8',
    ink: '#6b5600',
  },
  slack: {
    name: '업무 태만',
    cause: '업무 떠넘기기',
    source: 'member',
    icon: '🛋️',
    texts: ['팀장님이 해주세요', '저 그거 몰라요', '내일 할게요', '쇼핑 중', '유튜브 잠깐'],
    speed: 150,
    dmg: 5,
    fill: '#e3e0ff',
    ink: '#3b2f99',
  },
  customer: {
    name: '고객 컴플레인',
    cause: '고객 컴플레인',
    source: 'phone',
    icon: '☎️',
    texts: ['책임자 나와!', '환불해 주세요!!', '별점 1개요', '본사에 말할게요', '이게 최선이에요?'],
    speed: 175,
    dmg: 11,
    fill: '#ffd0d0',
    ink: '#8a1010',
  },
  order: {
    name: '불합리한 지시',
    cause: '상사의 무리한 지시',
    source: 'boss',
    icon: '📋',
    texts: ['내일까지 다시', '주말에 잠깐만', '어제 말한 거 반대로', '대표님 취향으로', '예산은 없어', '왜 아직이야?'],
    speed: 100,
    dmg: 13,
    fill: '#d6ecff',
    ink: '#0b4a85',
  },
  layoff: {
    name: '희망퇴직 압박',
    cause: '희망퇴직 압박',
    source: 'ceo',
    icon: '📉',
    texts: ['희망퇴직 면담', '자리 재배치', '후배가 팀장으로', '임원 면담 좀', '조직 슬림화'],
    speed: 62,
    dmg: 26,
    fill: '#3a3a44',
    ink: '#ffffff',
  },
  good: {
    name: '응원',
    cause: '',
    source: 'member',
    icon: '☕',
    texts: ['☕ 커피 드세요', '🍗 치킨 쐈어요', '👍 팀장님 최고', '🍩 간식이요', '💌 감사해요'],
    speed: 95,
    dmg: -8,
    fill: '#cff5d6',
    ink: '#0d6b26',
  },
};

export const ATTACK_KINDS: KindId[] = ['complain', 'late', 'slack', 'customer', 'order', 'layoff'];

interface YearDef {
  title: string;
  desc: string;
  mix: Partial<Record<KindId, number>>;
}

export const START_AGE = 45;
export const RETIRE_AGE = 60;
const YEAR_LEN = 20;

const YEARS: YearDef[] = [
  { title: '팀장 승진', desc: '축하합니다! 오늘부터 불만은 전부 팀장 몫', mix: { complain: 1, good: 0.25 } },
  { title: '신입 입사', desc: '알람이 안 울렸대요. 매일요.', mix: { complain: 0.8, late: 0.8, good: 0.25 } },
  { title: '클레임 시즌', desc: '고객 전화는 어디서 올지 몰라요', mix: { complain: 0.6, late: 0.4, customer: 0.9, good: 0.25 } },
  { title: '새 상무님 부임', desc: '지시가 이리저리 흔들립니다', mix: { complain: 0.5, late: 0.3, customer: 0.4, order: 1, good: 0.25 } },
  { title: '조용한 퇴사 유행', desc: '일이 한꺼번에 떠넘겨집니다', mix: { complain: 0.5, late: 0.3, customer: 0.3, order: 0.5, slack: 0.9, good: 0.25 } },
  { title: '구조조정 바람', desc: '사장님이 자리에 앉았습니다. 묵직한 건 두 번 막으세요', mix: { complain: 0.5, late: 0.3, customer: 0.3, order: 0.5, slack: 0.4, layoff: 0.45, good: 0.25 } },
  { title: '연봉 동결', desc: '불만이 두 배로', mix: { complain: 1.3, late: 0.3, customer: 0.3, order: 0.4, slack: 0.4, layoff: 0.2, good: 0.2 } },
  { title: '신사업 TF 차출', desc: '본업도 TF도 다 팀장 책임', mix: { complain: 0.4, customer: 0.4, order: 1.2, slack: 0.4, layoff: 0.2, good: 0.25 } },
  { title: '조직개편', desc: '누가 뭘 할지 아무도 몰라요', mix: { complain: 0.6, late: 0.4, customer: 0.5, order: 0.6, slack: 0.6, layoff: 0.3, good: 0.25 } },
  { title: 'MZ 신입 대거 입사', desc: '출근 시간은 각자의 해석', mix: { complain: 0.5, late: 1, slack: 0.8, customer: 0.3, order: 0.4, layoff: 0.2, good: 0.35 } },
  { title: '임금피크제', desc: '월급은 줄고 일은 그대로', mix: { complain: 0.6, late: 0.4, customer: 0.6, order: 0.7, slack: 0.5, layoff: 0.4, good: 0.25 } },
  { title: '후배가 상무로', desc: '어제의 후배가 오늘의 지시를', mix: { complain: 0.4, late: 0.3, customer: 0.4, order: 1.3, slack: 0.4, layoff: 0.4, good: 0.25 } },
  { title: '희망퇴직 2차', desc: '사장님 면담 요청이 쏟아집니다', mix: { complain: 0.5, late: 0.3, customer: 0.4, order: 0.6, slack: 0.4, layoff: 0.8, good: 0.3 } },
  { title: '마지막 대형 프로젝트', desc: '모두가 동시에 달려옵니다', mix: { complain: 0.7, late: 0.5, customer: 0.6, order: 0.7, slack: 0.6, layoff: 0.4, good: 0.3 } },
  { title: '정년 D-1년', desc: '마지막 한 해. 끝까지 버티세요!', mix: { complain: 0.7, late: 0.5, customer: 0.7, order: 0.8, slack: 0.6, layoff: 0.6, good: 0.35 } },
];

export function yearInfo(age: number) {
  return YEARS[Math.min(YEARS.length - 1, Math.max(0, age - START_AGE))];
}

// ---------- 특전 (연말 인사평가) ----------
export type PerkId = 'wide' | 'back' | 'yoga' | 'coffee' | 'oneonone' | 'mute' | 'line' | 'zen';
export interface PerkDef {
  id: PerkId;
  emoji: string;
  name: string;
  desc: string;
  once?: boolean;
}
export const PERKS: PerkDef[] = [
  { id: 'wide', emoji: '🛡️', name: '더 넓은 방패', desc: '방패가 20% 넓어져요' },
  { id: 'back', emoji: '🔙', name: '등 뒤 방패', desc: '등 뒤에 작은 방패가 하나 더', once: true },
  { id: 'yoga', emoji: '🧘', name: '아침 요가', desc: '최대 멘탈 +20, 멘탈 40 회복' },
  { id: 'coffee', emoji: '☕', name: '커피머신 도입', desc: '팀원 응원이 더 자주 오고 회복량 +50%' },
  { id: 'oneonone', emoji: '🗣️', name: '1on1 면담', desc: '팀원 공격이 15% 느려져요' },
  { id: 'mute', emoji: '📵', name: '퇴근 후 알림 끄기', desc: '고객 컴플레인 피해 -40%' },
  { id: 'line', emoji: '🤝', name: '라인 잘 타기', desc: '상사·사장 공격 피해 -30%' },
  { id: 'zen', emoji: '🍵', name: '평정심', desc: '가만히 있어도 멘탈이 조금씩 회복' },
];

export function rollPerks(taken: Record<string, number>, n = 3): PerkDef[] {
  const pool = PERKS.filter((p) => !(p.once && taken[p.id]));
  const out: PerkDef[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}

// ---------- 결과 ----------
export interface RunResult {
  retired: boolean;
  age: number;
  cause: string;
  blocked: Record<KindId, number>;
  hits: Record<KindId, number>;
  totalBlocked: number;
  bestStreak: number;
}

export type SoundName = 'block' | 'hit' | 'heal' | 'heavy' | 'warn' | 'year' | 'over';

export interface GameCallbacks {
  onYearEnd: (age: number) => void;
  onEnd: (r: RunResult) => void;
  onSound: (s: SoundName) => void;
  onHit: (big: boolean) => void;
}

// ---------- 엔티티 ----------
interface Avatar {
  source: Source;
  emoji: string;
  name: string;
  angle: number;
  wind: number; // 예고 남은 시간
  pending: KindId | null;
}

interface Proj {
  kind: KindId;
  text: string;
  base: number; // 진행 방향 각도 (중심 기준)
  theta: number; // 현재 각도 (흔들림 반영)
  dist: number;
  start: number;
  speed: number;
  t: number;
  phase: number;
  hp: number;
  dashing: boolean;
  dead: boolean;
  w?: number;
  bounce?: number; // 막혀서 튕겨 나가는 연출 시간
}

interface Floater {
  x: number;
  y: number;
  text: string;
  color: string;
  t: number;
  life: number;
  size: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  color: string;
}

interface Phone {
  angle: number;
  t: number;
  kind: KindId;
}

const TAU = Math.PI * 2;
const wrap = (a: number) => {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
};
const deg = (d: number) => (d * Math.PI) / 180;
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const zeroCounts = (): Record<KindId, number> => ({ complain: 0, late: 0, slack: 0, customer: 0, order: 0, layoff: 0, good: 0 });

const WIND = 0.6;

export class Game {
  // 화면
  w = 0;
  h = 0;
  cx = 0;
  cy = 0;
  fieldR = 200;
  s = 1; // fieldR / 200
  dark = false;

  // 상태
  age = START_AGE;
  yearT = 0;
  introT = 0;
  maxMental = 100;
  mental = 100;
  shield = -Math.PI / 2;
  target = -Math.PI / 2;
  keyDir = 0;
  spawnT = 1;
  streak = 0;
  bestStreak = 0;
  shake = 0;
  hurtT = 0;
  blockFlash = 0;
  ended = false;
  waiting = false; // 연말 인사평가 대기
  endT = 0;
  lastHit: KindId = 'complain';
  perks: Record<string, number> = {};
  blocked = zeroCounts();
  hits = zeroCounts();
  time = 0;

  avatars: Avatar[] = [];
  projs: Proj[] = [];
  floaters: Floater[] = [];
  sparks: Spark[] = [];
  phones: Phone[] = [];
  queue: { at: number; kind: KindId; base: number }[] = [];

  constructor(private cb: GameCallbacks) {
    const members: [string, string][] = [
      ['🧑‍💻', '김대리'],
      ['👩‍💼', '이과장'],
      ['👨‍💻', '박주임'],
      ['🧑‍🎨', '최사원'],
      ['👩‍🔬', '정인턴'],
    ];
    const angles = [-12, 38, 90, 142, 192];
    members.forEach(([emoji, name], i) =>
      this.avatars.push({ source: 'member', emoji, name, angle: deg(angles[i]), wind: 0, pending: null }),
    );
    this.avatars.push({ source: 'boss', emoji: '🤵', name: '상무', angle: deg(-128), wind: 0, pending: null });
    this.avatars.push({ source: 'ceo', emoji: '🧓', name: '사장', angle: deg(-62), wind: 0, pending: null });
    this.startYear();
  }

  // ---------- 외부 입력 ----------
  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
    const top = 74; // HUD 높이
    this.cx = w / 2;
    this.cy = top + (h - top) / 2;
    this.fieldR = Math.max(120, Math.min(w / 2 - 8, (h - top) / 2 - 8, 330));
    this.s = this.fieldR / 200;
  }

  pointer(x: number, y: number) {
    const dx = x - this.cx;
    const dy = y - this.cy;
    if (dx * dx + dy * dy < 9) return;
    this.target = Math.atan2(dy, dx);
  }

  get leaderR() {
    return 26 * this.s;
  }
  get shieldR() {
    return 62 * this.s;
  }
  get arc() {
    return deg(62) * Math.pow(1.2, this.perks.wide ?? 0);
  }

  applyPerk(id: PerkId) {
    this.perks[id] = (this.perks[id] ?? 0) + 1;
    if (id === 'yoga') {
      this.maxMental += 20;
      this.mental = Math.min(this.maxMental, this.mental + 40);
    }
  }

  nextYear() {
    this.waiting = false;
    this.age += 1;
    this.startYear();
  }

  private startYear() {
    this.yearT = 0;
    this.introT = 2.2;
    this.spawnT = 2.4;
    this.projs = [];
    this.queue = [];
    this.phones = [];
    for (const a of this.avatars) {
      a.wind = 0;
      a.pending = null;
    }
  }

  get yearIndex() {
    return this.age - START_AGE;
  }

  get ceoPresent() {
    return this.age >= START_AGE + 5;
  }

  // ---------- 업데이트 ----------
  update(dt: number) {
    dt = Math.min(dt, 0.05);
    this.time += dt;

    // 방패 회전
    if (this.keyDir) this.target = this.shield + this.keyDir * 0.5;
    const diff = wrap(this.target - this.shield);
    const maxStep = (this.keyDir ? 5.5 : 22) * dt;
    this.shield = wrap(this.shield + Math.max(-maxStep, Math.min(maxStep, diff)));

    this.shake = Math.max(0, this.shake - dt * 2.5);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.blockFlash = Math.max(0, this.blockFlash - dt * 4);
    this.introT = Math.max(0, this.introT - dt);

    for (const f of this.floaters) {
      f.t += dt;
      f.y -= 28 * dt;
    }
    this.floaters = this.floaters.filter((f) => f.t < f.life);
    for (const p of this.sparks) {
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
    }
    this.sparks = this.sparks.filter((p) => p.t < 0.5);

    if (this.waiting) return;
    if (this.ended) {
      this.endT += dt;
      // 남은 공격들은 계속 흘러가게
      for (const p of this.projs) this.moveProj(p, dt);
      return;
    }

    if (this.perks.zen) this.mental = Math.min(this.maxMental, this.mental + 0.4 * this.perks.zen * dt);

    if (this.introT <= 0) this.yearT += dt;
    const yearOver = this.yearT >= YEAR_LEN;

    // 스폰
    if (!yearOver && this.introT <= 0) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        const rate = 0.8 + this.yearIndex * 0.1;
        this.spawnT = (1 / rate) * (0.7 + Math.random() * 0.6);
        this.spawn();
      }
    }

    // 예고 → 발사
    for (const a of this.avatars) {
      if (!a.pending) continue;
      a.wind -= dt;
      if (a.wind <= 0) {
        this.launch(a.pending, a.angle);
        a.pending = null;
      }
    }
    for (const ph of this.phones) {
      ph.t -= dt;
      if (ph.t <= 0) this.launch(ph.kind, ph.angle);
    }
    this.phones = this.phones.filter((p) => p.t > 0);
    for (const q of this.queue) {
      q.at -= dt;
      if (q.at <= 0) this.launch(q.kind, q.base, true);
    }
    this.queue = this.queue.filter((q) => q.at > 0);

    for (const p of this.projs) this.moveProj(p, dt);
    this.projs = this.projs.filter((p) => !p.dead);

    if (this.mental <= 0) {
      this.mental = 0;
      this.ended = true;
      this.cb.onSound('over');
      setTimeout(() => this.cb.onEnd(this.result(false)), 1100);
      return;
    }

    const busy = this.projs.length || this.queue.length || this.phones.length || this.avatars.some((a) => a.pending);
    if (yearOver && !busy) {
      if (this.age + 1 >= RETIRE_AGE) {
        this.ended = true;
        this.age = RETIRE_AGE;
        this.cb.onSound('year');
        this.cb.onEnd(this.result(true));
      } else {
        this.waiting = true;
        this.hurtT = 0;
        this.shake = 0;
        this.floaters = [];
        this.cb.onSound('year');
        this.cb.onYearEnd(this.age);
      }
    }
  }

  private result(retired: boolean): RunResult {
    return {
      retired,
      age: this.age,
      cause: KINDS[this.lastHit].cause,
      blocked: { ...this.blocked },
      hits: { ...this.hits },
      totalBlocked: ATTACK_KINDS.reduce((s, k) => s + this.blocked[k], 0),
      bestStreak: this.bestStreak,
    };
  }

  private spawn() {
    const mix = { ...yearInfo(this.age).mix };
    if (mix.good) mix.good *= 1 + 0.6 * (this.perks.coffee ?? 0);
    const entries = Object.entries(mix) as [KindId, number][];
    let r = Math.random() * entries.reduce((s, [, v]) => s + v, 0);
    let kind: KindId = entries[0][0];
    for (const [k, v] of entries) {
      r -= v;
      if (r <= 0) {
        kind = k;
        break;
      }
    }
    const src = KINDS[kind].source;
    if (src === 'phone') {
      this.phones.push({ angle: Math.random() * TAU - Math.PI, t: WIND, kind });
      this.cb.onSound('warn');
      return;
    }
    const cands = this.avatars.filter((a) => a.source === src && !a.pending);
    if (!cands.length) return;
    const a = pick(cands);
    a.pending = kind;
    a.wind = kind === 'layoff' ? WIND * 1.4 : WIND;
  }

  private launch(kind: KindId, angle: number, fromQueue = false) {
    const def = KINDS[kind];
    if (kind === 'slack' && !fromQueue) {
      // 업무 떠넘기기: 3연속
      this.queue.push({ at: 0.22, kind, base: angle + deg(8) }, { at: 0.44, kind, base: angle - deg(8) });
    }
    let speed = def.speed * (1 + this.yearIndex * 0.045);
    if (def.source === 'member' && kind !== 'good') speed *= Math.pow(0.85, this.perks.oneonone ?? 0);
    const start = this.fieldR - 34 * this.s;
    this.projs.push({
      kind,
      text: pick(def.texts),
      base: angle,
      theta: angle,
      dist: start,
      start,
      speed: speed * this.s,
      t: 0,
      phase: Math.random() * TAU,
      hp: kind === 'layoff' ? 2 : 1,
      dashing: false,
      dead: false,
    });
  }

  private moveProj(p: Proj, dt: number) {
    p.t += dt;
    if (p.bounce !== undefined) {
      p.bounce += dt;
      p.dist += 260 * this.s * dt;
      if (p.bounce > 0.35) p.dead = true;
      return;
    }
    let v = p.speed;
    if (p.kind === 'late') {
      if (!p.dashing && p.dist < p.start * 0.62) p.dashing = true;
      if (p.dashing) v *= 4.2;
    }
    p.dist -= v * dt;
    p.theta = p.base;
    if (p.kind === 'order') {
      const k = Math.max(0, (p.dist - this.leaderR) / (p.start - this.leaderR));
      p.theta = p.base + Math.sin(p.t * 3.6 + p.phase) * 0.55 * k;
    }
    if (this.ended) {
      if (p.dist < this.leaderR) p.dead = true;
      return;
    }

    // 방패 판정
    const shR = this.shieldR;
    if (p.dist <= shR + 4 * this.s && p.dist > shR - 14 * this.s) {
      if (this.covered(p.theta)) {
        this.onBlock(p);
        return;
      }
    }
    if (p.dist <= this.leaderR) this.onHit(p);
  }

  private covered(theta: number) {
    const tol = 0.1;
    if (Math.abs(wrap(theta - this.shield)) <= this.arc / 2 + tol) return true;
    if (this.perks.back && Math.abs(wrap(theta - this.shield - Math.PI)) <= (this.arc * 0.55) / 2 + tol) return true;
    return false;
  }

  private pos(theta: number, dist: number) {
    return { x: this.cx + Math.cos(theta) * dist, y: this.cy + Math.sin(theta) * dist };
  }

  private onBlock(p: Proj) {
    const { x, y } = this.pos(p.theta, p.dist);
    if (p.kind === 'good') {
      p.bounce = 0;
      this.float(x, y, '앗, 내 커피…', '#2a8a45', 13);
      this.cb.onSound('block');
      return;
    }
    p.hp -= 1;
    this.blockFlash = 1;
    this.burst(x, y, KINDS[p.kind].ink === '#ffffff' ? '#888' : KINDS[p.kind].ink, 8);
    if (p.hp > 0) {
      // 희망퇴직: 한 번 밀려났다가 다시 온다
      p.dist = Math.min(p.start, p.dist + 85 * this.s);
      p.speed *= 0.9;
      p.base = p.theta;
      this.shake = 0.35;
      this.float(x, y, '아직 안 끝났어요', '#555', 13);
      this.cb.onSound('heavy');
      return;
    }
    p.bounce = 0;
    this.blocked[p.kind] += 1;
    this.streak += 1;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    this.float(x, y, p.kind === 'layoff' ? '버텼다!' : '막음!', '#5b4bdb', p.kind === 'layoff' ? 18 : 14);
    if (this.streak % 10 === 0) {
      this.mental = Math.min(this.maxMental, this.mental + 3);
      this.float(this.cx, this.cy - 50 * this.s, `${this.streak}연속 방어! 멘탈 +3`, '#0d8a3a', 15);
    }
    this.cb.onSound(p.kind === 'layoff' ? 'heavy' : 'block');
  }

  private onHit(p: Proj) {
    p.dead = true;
    const def = KINDS[p.kind];
    if (p.kind === 'good') {
      const heal = Math.round(-def.dmg * (1 + 0.5 * (this.perks.coffee ?? 0)));
      this.mental = Math.min(this.maxMental, this.mental + heal);
      this.hits.good += 1;
      this.float(this.cx, this.cy - 40 * this.s, `멘탈 +${heal}`, '#0d8a3a', 16);
      this.burst(this.cx, this.cy, '#3cc46a', 10);
      this.cb.onSound('heal');
      return;
    }
    let dmg = def.dmg;
    if (p.kind === 'customer') dmg *= Math.pow(0.6, this.perks.mute ?? 0);
    if (def.source === 'boss' || def.source === 'ceo') dmg *= Math.pow(0.7, this.perks.line ?? 0);
    dmg = Math.round(dmg);
    this.mental -= dmg;
    this.hits[p.kind] += 1;
    this.lastHit = p.kind;
    this.streak = 0;
    this.hurtT = 0.45;
    this.shake = p.kind === 'layoff' ? 1 : 0.5;
    this.float(this.cx, this.cy - 44 * this.s, `${def.icon} 멘탈 -${dmg}`, '#d02a2a', 16);
    this.cb.onSound(p.kind === 'layoff' ? 'heavy' : 'hit');
    this.cb.onHit(p.kind === 'layoff');
  }

  private float(x: number, y: number, text: string, color: string, size: number) {
    this.floaters.push({ x, y, text, color, t: 0, life: 1, size });
  }

  private burst(x: number, y: number, color: string, n: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const sp = (80 + Math.random() * 140) * this.s;
      this.sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, color });
    }
  }

  // ---------- 그리기 ----------
  draw(ctx: CanvasRenderingContext2D) {
    const { w, h, cx, cy, fieldR, s } = this;
    const C = this.dark
      ? { floor: '#1d1c24', floor2: '#26242f', ring: '#34313f', desk: '#3a3646', text: '#ecebf3', muted: '#9a98a8', bar: '#2d2b36' }
      : { floor: '#f4f1ea', floor2: '#ebe6db', ring: '#ddd6c6', desk: '#c9b896', text: '#1d1d1f', muted: '#76716a', bar: '#e4dfd4' };

    ctx.save();
    ctx.clearRect(0, 0, w, h);
    if (this.shake > 0) {
      const m = this.shake * 7 * s;
      ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
    }

    // 바닥
    const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, fieldR);
    g.addColorStop(0, C.floor);
    g.addColorStop(1, C.floor2);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, fieldR, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = C.ring;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.arc(cx, cy, this.shieldR, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);

    // 피격 붉은 비네트
    if (this.hurtT > 0) {
      ctx.fillStyle = `rgba(230,40,40,${this.hurtT * 0.35})`;
      ctx.beginPath();
      ctx.arc(cx, cy, fieldR, 0, TAU);
      ctx.fill();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 공격자
    const avR = fieldR - 20 * s;
    for (const a of this.avatars) {
      if (a.source === 'ceo' && !this.ceoPresent) continue;
      let { x, y } = this.pos(a.angle, avR);
      if (a.pending) {
        x += Math.sin(this.time * 60) * 2.5 * s;
      }
      ctx.fillStyle = C.desk;
      roundRect(ctx, x - 20 * s, y - 6 * s, 40 * s, 14 * s, 4 * s);
      ctx.fill();
      ctx.font = `${26 * s}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      ctx.fillText(a.emoji, x, y - 8 * s);
      ctx.font = `600 ${10 * s}px system-ui, sans-serif`;
      ctx.fillStyle = C.muted;
      ctx.fillText(a.name, x, y + 16 * s);
      if (a.pending) {
        const big = a.pending === 'layoff';
        const good = a.pending === 'good';
        ctx.fillStyle = good ? '#22a04b' : big ? '#222' : '#e23b3b';
        ctx.beginPath();
        ctx.arc(x + 15 * s, y - 24 * s, (big ? 10 : 8) * s, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `800 ${(big ? 13 : 11) * s}px system-ui, sans-serif`;
        ctx.fillText(good ? '♥' : big ? '!!' : '!', x + 15 * s, y - 23.5 * s);
      }
    }

    // 고객 전화 예고
    for (const ph of this.phones) {
      const { x, y } = this.pos(ph.angle, avR);
      const k = 1 + Math.sin(this.time * 40) * 0.12;
      ctx.font = `${24 * s * k}px system-ui, "Apple Color Emoji", sans-serif`;
      ctx.fillText('☎️', x, y);
      ctx.strokeStyle = 'rgba(226,59,59,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 18 * s * (1.4 - ph.t / WIND), 0, TAU);
      ctx.stroke();
    }

    // 팀장
    const leader = this.hurtT > 0 ? '😵' : this.ended && this.mental <= 0 ? '😵' : this.age >= 55 ? '👴' : this.age >= 50 ? '👨‍💼' : '🧑‍💼';
    ctx.fillStyle = C.desk;
    roundRect(ctx, cx - 30 * s, cy + 10 * s, 60 * s, 16 * s, 5 * s);
    ctx.fill();
    ctx.font = `${40 * s}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.fillText(leader, cx, cy - 2 * s);
    ctx.font = `700 ${10 * s}px system-ui, sans-serif`;
    ctx.fillStyle = C.muted;
    ctx.fillText('팀장', cx, cy + 34 * s);
    if (this.streak >= 3 && !this.ended) {
      ctx.fillStyle = '#5b4bdb';
      ctx.font = `800 ${12 * s}px system-ui, sans-serif`;
      ctx.fillText(`🔥 ${this.streak}연속 방어`, cx, cy + 48 * s);
    }

    // 방패
    if (!(this.ended && this.mental <= 0)) {
      this.drawShield(ctx, this.shield, this.arc, 1);
      if (this.perks.back) this.drawShield(ctx, this.shield + Math.PI, this.arc * 0.55, 0.75);
    }

    // 말풍선
    for (const p of this.projs) this.drawProj(ctx, p);

    // 파티클
    for (const p of this.sparks) {
      ctx.globalAlpha = 1 - p.t / 0.5;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 2 * s, p.y - 2 * s, 4 * s, 4 * s);
    }
    ctx.globalAlpha = 1;

    // 플로터
    for (const f of this.floaters) {
      ctx.globalAlpha = 1 - f.t / f.life;
      ctx.font = `800 ${f.size * s}px system-ui, sans-serif`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = this.dark ? '#111' : '#fff';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    this.drawHud(ctx, C);

    // 연도 인트로 배너
    if (this.introT > 0 && !this.ended) {
      const a = Math.min(1, this.introT / 0.4, (2.2 - this.introT) / 0.3);
      const info = yearInfo(this.age);
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = this.dark ? 'rgba(20,19,26,0.92)' : 'rgba(255,255,255,0.94)';
      const bw = Math.min(w - 32, 340);
      roundRect(ctx, cx - bw / 2, cy - 62, bw, 112, 18);
      ctx.fill();
      ctx.fillStyle = '#5b4bdb';
      ctx.font = '700 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${this.age}세 · ${this.yearIndex + 1}년차 팀장`, cx, cy - 34);
      ctx.fillStyle = C.text;
      ctx.font = '800 26px system-ui, sans-serif';
      ctx.fillText(info.title, cx, cy - 4);
      ctx.fillStyle = C.muted;
      ctx.font = '500 13px system-ui, sans-serif';
      wrapText(ctx, info.desc, cx, cy + 26, bw - 32, 17);
      ctx.globalAlpha = 1;
    }
  }

  private drawShield(ctx: CanvasRenderingContext2D, ang: number, arc: number, alpha: number) {
    const { cx, cy, s } = this;
    const r = this.shieldR;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    if (this.blockFlash > 0) {
      ctx.strokeStyle = `rgba(157,146,255,${this.blockFlash * 0.6})`;
      ctx.lineWidth = 22 * s;
      ctx.beginPath();
      ctx.arc(cx, cy, r, ang - arc / 2, ang + arc / 2);
      ctx.stroke();
    }
    ctx.strokeStyle = '#4a3cc9';
    ctx.lineWidth = 12 * s;
    ctx.beginPath();
    ctx.arc(cx, cy, r, ang - arc / 2, ang + arc / 2);
    ctx.stroke();
    ctx.strokeStyle = '#8f83ff';
    ctx.lineWidth = 4 * s;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 1 * s, ang - arc / 2 + 0.04, ang + arc / 2 - 0.04);
    ctx.stroke();
    ctx.restore();
  }

  private drawProj(ctx: CanvasRenderingContext2D, p: Proj) {
    const def = KINDS[p.kind];
    const { s } = this;
    const { x, y } = this.pos(p.theta, p.dist);
    const big = p.kind === 'layoff';
    const fs = (big ? 13 : 11.5) * s;
    ctx.font = `700 ${fs}px system-ui, sans-serif`;
    const label = p.kind === 'good' ? p.text : `${def.icon} ${p.text}`;
    p.w ??= ctx.measureText(label).width;
    const bw = p.w + 14 * s;
    const bh = fs + (big ? 14 : 10) * s;
    ctx.save();
    if (p.bounce !== undefined) ctx.globalAlpha = Math.max(0, 1 - p.bounce / 0.35);
    ctx.translate(x, y);
    if (p.kind === 'late' && p.dashing) ctx.rotate(Math.sin(p.t * 30) * 0.08);
    if (big) ctx.scale(1 + Math.sin(p.t * 6) * 0.04, 1 + Math.sin(p.t * 6) * 0.04);
    ctx.fillStyle = def.fill;
    ctx.strokeStyle = def.ink;
    ctx.lineWidth = big ? 2.5 : 1.5;
    roundRect(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2);
    ctx.fill();
    ctx.stroke();
    if (big && p.hp > 1) {
      ctx.strokeStyle = '#ff5a5a';
      ctx.lineWidth = 2;
      roundRect(ctx, -bw / 2 - 4, -bh / 2 - 4, bw + 8, bh + 8, bh / 2 + 4);
      ctx.stroke();
    }
    ctx.fillStyle = def.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 0.5);
    ctx.restore();
  }

  private drawHud(ctx: CanvasRenderingContext2D, C: Record<string, string>) {
    const { w } = this;
    const pad = 16;
    const right = w - pad - 44; // 일시정지 버튼 자리
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = C.text;
    ctx.font = '800 18px system-ui, sans-serif';
    ctx.fillText(`${this.age}세`, pad, 30);
    const ageW = ctx.measureText(`${this.age}세`).width;
    ctx.fillStyle = C.muted;
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText(`· ${yearInfo(this.age).title} · 정년까지 ${RETIRE_AGE - this.age}년`, pad + ageW + 6, 30);

    // 연도 진행
    const yw = right - pad;
    ctx.fillStyle = C.bar;
    roundRect(ctx, pad, 38, yw, 4, 2);
    ctx.fill();
    ctx.fillStyle = '#5b4bdb';
    roundRect(ctx, pad, 38, yw * Math.min(1, this.yearT / YEAR_LEN), 4, 2);
    ctx.fill();

    // 멘탈
    const ratio = Math.max(0, this.mental / this.maxMental);
    ctx.fillStyle = C.bar;
    roundRect(ctx, pad, 50, yw, 14, 7);
    ctx.fill();
    ctx.fillStyle = ratio > 0.5 ? '#3cc46a' : ratio > 0.25 ? '#f0a020' : '#e23b3b';
    roundRect(ctx, pad, 50, Math.max(14, yw * ratio), 14, 7);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '800 10px system-ui, sans-serif';
    ctx.fillText(`멘탈 ${Math.ceil(this.mental)} / ${this.maxMental}`, pad + 8, 61);
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lh;
    } else line = test;
  }
  ctx.fillText(line, x, yy);
}
