/**
 * 스타트업 M&A — 규칙 엔진 (순수 함수, 방장 브라우저에서 심판).
 *
 * 도시 12×9 격자. 부지 타일을 놓아 이어진 덩어리에 스타트업을 세우고,
 * 지분을 사 모으고, 스타트업끼리 맞닿으면 큰 쪽이 작은 쪽을 인수한다.
 * 게임이 끝났을 때 현금이 가장 많은 사람이 이긴다.
 */

export const W = 12;
export const H = 9;
export const N = W * H;
export const MAX_SHARES = 25;
export const HAND = 6;
export const BUY_MAX = 3;
export const SAFE = 11; // 유니콘: 이 크기 이상은 인수당하지 않는다
export const END_SIZE = 41;
export const START_CASH = 6000;

export const EMPTY = -2;
export const LOOSE = -1;

export type Co = { name: string; emoji: string; color: string; tier: 0 | 1 | 2 };
export const COS: Co[] = [
  { name: '배달곰', emoji: '🛵', color: '#f08c2e', tier: 0 },
  { name: '멍냥톡', emoji: '🐾', color: '#e8559a', tier: 0 },
  { name: '핏짐', emoji: '💪', color: '#2fae5f', tier: 1 },
  { name: '여행콕', emoji: '✈️', color: '#14a7c4', tier: 1 },
  { name: '머니핀', emoji: '💳', color: '#3d6be0', tier: 1 },
  { name: '로봇랩', emoji: '🤖', color: '#8a5ad8', tier: 2 },
  { name: 'AI두뇌', emoji: '🧠', color: '#e0483e', tier: 2 },
];
export const TIER_NAME = ['초기', '성장', '딥테크'];

export type Player = { name: string; bot: boolean; cash: number; shares: number[]; hand: number[] };

export type Phase =
  | { k: 'place' }
  | { k: 'found'; tile: number }
  | { k: 'survivor'; tile: number; options: number[]; cos: number[] }
  | { k: 'merge'; tile: number; survivor: number; queue: number[]; deciders: number[] }
  | { k: 'buy' }
  | { k: 'over'; ranking: { p: number; cash: number }[] };

export type State = {
  n: number;
  players: Player[];
  board: number[];
  bag: number[];
  turn: number;
  phase: Phase;
  log: string[];
  last: number | null;
  /** 마지막 이벤트(애니메이션용) */
  flash: { kind: 'found' | 'merge' | 'grow'; co: number; n: number } | null;
};

export type Action =
  | { t: 'place'; tile: number }
  | { t: 'pass' }
  | { t: 'found'; co: number }
  | { t: 'survivor'; co: number }
  | { t: 'dispose'; sell: number; trade: number }
  | { t: 'buy'; cos: number[] };

export const ERROR_TEXT: Record<string, string> = {
  NOT_YOUR_TURN: '지금은 내 차례가 아니에요',
  BAD_PHASE: '지금 할 수 없는 행동이에요',
  NOT_IN_HAND: '내 부지가 아니에요',
  DEAD_TILE: '유니콘 두 곳을 잇는 부지는 놓을 수 없어요',
  BLOCKED_TILE: '세울 수 있는 스타트업이 없어서 지금은 못 놓아요',
  HAS_PLAYABLE: '놓을 수 있는 부지가 있어요',
  CO_ACTIVE: '이미 있는 스타트업이에요',
  BAD_CHOICE: '고를 수 없는 회사예요',
  BAD_AMOUNT: '수량이 맞지 않아요',
  NO_STOCK: '남은 지분이 없어요',
  NO_CASH: '현금이 부족해요',
  TOO_MANY: `한 턴에 ${BUY_MAX}주까지 살 수 있어요`,
};

// ───────── 좌표

export const label = (t: number) => `${(t % W) + 1}${'ABCDEFGHI'[Math.floor(t / W)]}`;
export function neighbors(t: number) {
  const r = Math.floor(t / W);
  const c = t % W;
  const out: number[] = [];
  if (r > 0) out.push(t - W);
  if (r < H - 1) out.push(t + W);
  if (c > 0) out.push(t - 1);
  if (c < W - 1) out.push(t + 1);
  return out;
}

// ───────── 시세

export const sizeOf = (g: State, co: number) => g.board.reduce((n, v) => (v === co ? n + 1 : n), 0);
export const sizes = (g: State) => {
  const s = COS.map(() => 0);
  for (const v of g.board) if (v >= 0) s[v]++;
  return s;
};
export function price(co: number, size: number) {
  if (size < 2) return 0;
  const base = size <= 5 ? size * 100 : size <= 10 ? 600 : size <= 20 ? 700 : size <= 30 ? 800 : size <= 40 ? 900 : 1000;
  return base + COS[co].tier * 100;
}
export const bank = (g: State, co: number) => MAX_SHARES - g.players.reduce((n, p) => n + p.shares[co], 0);
export const fmt = (n: number) => `${n.toLocaleString()}만`;

/** 최대주주·2대주주 보너스 계산 (지급은 하지 않음) */
export function bonuses(g: State, co: number, size = sizeOf(g, co)) {
  const pr = price(co, size);
  const maj = pr * 10;
  const min = pr * 5;
  const pay = g.players.map(() => 0);
  const holders = g.players.map((p, i) => ({ i, n: p.shares[co] })).filter((h) => h.n > 0);
  if (!holders.length) return pay;
  const ceil100 = (x: number) => Math.ceil(x / 100) * 100;
  const top = Math.max(...holders.map((h) => h.n));
  const tops = holders.filter((h) => h.n === top);
  if (tops.length > 1) {
    for (const h of tops) pay[h.i] = ceil100((maj + min) / tops.length);
    return pay;
  }
  pay[tops[0].i] = maj;
  const rest = holders.filter((h) => h.n < top);
  if (!rest.length) {
    pay[tops[0].i] += min;
    return pay;
  }
  const second = Math.max(...rest.map((h) => h.n));
  const seconds = rest.filter((h) => h.n === second);
  for (const h of seconds) pay[h.i] = ceil100(min / seconds.length);
  return pay;
}

// ───────── 부지 판정

export type TileStatus = 'ok' | 'dead' | 'blocked';
function around(g: State, t: number) {
  const cos = new Set<number>();
  let loose = false;
  for (const nb of neighbors(t)) {
    const v = g.board[nb];
    if (v >= 0) cos.add(v);
    else if (v === LOOSE) loose = true;
  }
  return { cos: [...cos], loose };
}
export function tileStatus(g: State, t: number): TileStatus {
  const { cos, loose } = around(g, t);
  const s = sizes(g);
  if (cos.filter((c) => s[c] >= SAFE).length >= 2) return 'dead';
  if (!cos.length && loose && !COS.some((_, c) => s[c] === 0)) return 'blocked';
  return 'ok';
}
/** 놓으면 무슨 일이 생기는지 (손패 미리보기용) */
export function tileEffect(g: State, t: number): string {
  const st = tileStatus(g, t);
  if (st === 'dead') return '못 놓음';
  if (st === 'blocked') return '대기';
  const { cos, loose } = around(g, t);
  if (cos.length >= 2) return 'M&A!';
  if (cos.length === 1) return `${COS[cos[0]].emoji} 성장`;
  if (loose) return '창업!';
  return '';
}
export const playable = (g: State, p: number) => g.players[p].hand.filter((t) => tileStatus(g, t) === 'ok');

/** 지금 결정을 내려야 하는 사람 */
export function actor(g: State): number {
  if (g.phase.k === 'merge') return g.phase.deciders[0];
  if (g.phase.k === 'over') return -1;
  return g.turn;
}

// ───────── 시작

function shuffle<T>(a: T[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function newGame(seats: { name: string; bot: boolean }[]): State {
  const bag = shuffle(Array.from({ length: N }, (_, i) => i));
  const board = Array<number>(N).fill(EMPTY);
  // 순서 정하기: 한 장씩 뽑아 도시에 깔고, 1A에 가장 가까운 사람이 먼저
  const first = seats.map(() => bag.pop()!);
  for (const t of first) board[t] = LOOSE;
  const order = first.indexOf(Math.min(...first));
  const players: Player[] = seats.map((s) => ({
    name: s.name,
    bot: s.bot,
    cash: START_CASH,
    shares: COS.map(() => 0),
    hand: bag.splice(-HAND),
  }));
  return {
    n: 0,
    players,
    board,
    bag,
    turn: order,
    phase: { k: 'place' },
    log: [`${players[order].name}님이 1A에 가장 가까운 부지를 뽑아 먼저 시작해요`],
    last: null,
    flash: null,
  };
}

// ───────── 행동 적용

const clone = (g: State): State => structuredClone(g);
const say = (g: State, s: string) => {
  g.log = [...g.log.slice(-40), s];
};

function flood(g: State, from: number, co: number) {
  const stack = [from];
  const seen = new Set<number>();
  while (stack.length) {
    const t = stack.pop()!;
    if (seen.has(t)) continue;
    seen.add(t);
    g.board[t] = co;
    for (const nb of neighbors(t)) if (g.board[nb] !== EMPTY && !seen.has(nb)) stack.push(nb);
  }
}

/** 차례 순서대로(현재 차례부터) */
const fromTurn = (g: State) => g.players.map((_, i) => (g.turn + i) % g.players.length);

function payBonus(g: State, co: number) {
  const pay = bonuses(g, co);
  pay.forEach((v, i) => {
    if (!v) return;
    g.players[i].cash += v;
    say(g, `💰 ${g.players[i].name} ${COS[co].name} 주주 보너스 +${fmt(v)}`);
  });
}

function nextDefunct(g: State, tile: number, survivor: number, queue: number[]): State {
  while (queue.length) {
    const d = queue[0];
    payBonus(g, d);
    const deciders = fromTurn(g).filter((i) => g.players[i].shares[d] > 0);
    if (deciders.length) {
      g.phase = { k: 'merge', tile, survivor, queue, deciders };
      return g;
    }
    queue = queue.slice(1);
  }
  flood(g, tile, survivor);
  g.phase = { k: 'buy' };
  return g;
}

function startMerge(g: State, tile: number, survivor: number, cos: number[]): State {
  const s = sizes(g);
  const queue = cos.filter((c) => c !== survivor).sort((a, b) => s[b] - s[a]);
  say(g, `🤝 ${COS[survivor].name}이(가) ${queue.map((c) => COS[c].name).join('·')}을(를) 인수합병!`);
  g.flash = { kind: 'merge', co: survivor, n: g.n };
  return nextDefunct(g, tile, survivor, queue);
}

function endTurn(g: State): State {
  const me = g.players[g.turn];
  // 영영 못 놓는 부지는 버리고 새로 뽑기
  me.hand = me.hand.filter((t) => tileStatus(g, t) !== 'dead');
  while (me.hand.length < HAND && g.bag.length) me.hand.push(g.bag.pop()!);

  const s = sizes(g);
  const active = s.filter((v) => v > 0);
  const big = active.length > 0 && (active.some((v) => v >= END_SIZE) || active.every((v) => v >= SAFE));
  const stuck = !g.bag.length && g.players.every((_, i) => playable(g, i).length === 0);
  if (big || stuck) return finish(g, big ? (active.some((v) => v >= END_SIZE) ? `${END_SIZE}칸짜리 거대 기업 탄생!` : '모든 스타트업이 유니콘!') : '더 놓을 부지가 없어요');

  g.turn = (g.turn + 1) % g.players.length;
  g.phase = { k: 'place' };
  return g;
}

function finish(g: State, why: string): State {
  say(g, `🏁 게임 끝 — ${why}`);
  const s = sizes(g);
  COS.forEach((_, c) => {
    if (!s[c]) return;
    payBonus(g, c);
    const pr = price(c, s[c]);
    for (const p of g.players) {
      p.cash += p.shares[c] * pr;
      p.shares[c] = 0;
    }
  });
  const ranking = g.players.map((p, i) => ({ p: i, cash: p.cash })).sort((a, b) => b.cash - a.cash);
  g.phase = { k: 'over', ranking };
  return g;
}

export function apply(prev: State, p: number, a: Action): State | string {
  if (prev.phase.k === 'over') return 'BAD_PHASE';
  if (actor(prev) !== p) return 'NOT_YOUR_TURN';
  const g = clone(prev);
  g.n++;
  const me = g.players[p];

  switch (a.t) {
    case 'place': {
      if (g.phase.k !== 'place') return 'BAD_PHASE';
      if (!me.hand.includes(a.tile)) return 'NOT_IN_HAND';
      const st = tileStatus(g, a.tile);
      if (st === 'dead') return 'DEAD_TILE';
      if (st === 'blocked') return 'BLOCKED_TILE';
      const { cos, loose } = around(g, a.tile);
      me.hand = me.hand.filter((t) => t !== a.tile);
      g.board[a.tile] = LOOSE;
      g.last = a.tile;
      g.flash = null;
      say(g, `${me.name}: ${label(a.tile)} 부지`);
      if (!cos.length) {
        g.phase = loose ? { k: 'found', tile: a.tile } : { k: 'buy' };
        return g;
      }
      if (cos.length === 1) {
        flood(g, a.tile, cos[0]);
        g.flash = { kind: 'grow', co: cos[0], n: g.n };
        g.phase = { k: 'buy' };
        return g;
      }
      const s = sizes(g);
      const max = Math.max(...cos.map((c) => s[c]));
      const tied = cos.filter((c) => s[c] === max);
      if (tied.length > 1) {
        g.phase = { k: 'survivor', tile: a.tile, options: tied, cos };
        return g;
      }
      return startMerge(g, a.tile, tied[0], cos);
    }
    case 'pass': {
      if (g.phase.k !== 'place') return 'BAD_PHASE';
      if (playable(g, p).length) return 'HAS_PLAYABLE';
      say(g, `${me.name}: 놓을 부지가 없어 건너뜀`);
      g.phase = { k: 'buy' };
      return g;
    }
    case 'found': {
      if (g.phase.k !== 'found') return 'BAD_PHASE';
      if (!COS[a.co]) return 'BAD_CHOICE';
      if (sizeOf(g, a.co) > 0) return 'CO_ACTIVE';
      flood(g, g.phase.tile, a.co);
      const free = bank(g, a.co) > 0;
      if (free) me.shares[a.co]++;
      g.flash = { kind: 'found', co: a.co, n: g.n };
      say(g, `🚀 ${me.name}이(가) ${COS[a.co].emoji} ${COS[a.co].name} 창업!${free ? ' (창업자 지분 1주)' : ''}`);
      g.phase = { k: 'buy' };
      return g;
    }
    case 'survivor': {
      if (g.phase.k !== 'survivor') return 'BAD_PHASE';
      if (!g.phase.options.includes(a.co)) return 'BAD_CHOICE';
      return startMerge(g, g.phase.tile, a.co, g.phase.cos);
    }
    case 'dispose': {
      if (g.phase.k !== 'merge') return 'BAD_PHASE';
      const { survivor, queue, deciders, tile } = g.phase;
      const d = queue[0];
      const held = me.shares[d];
      const { sell, trade } = a;
      if (![sell, trade].every((v) => Number.isInteger(v) && v >= 0)) return 'BAD_AMOUNT';
      if (sell + trade > held || trade % 2) return 'BAD_AMOUNT';
      if (trade / 2 > bank(g, survivor)) return 'NO_STOCK';
      const pr = price(d, sizeOf(g, d));
      me.shares[d] -= sell + trade;
      me.cash += sell * pr;
      me.shares[survivor] += trade / 2;
      const keep = held - sell - trade;
      const parts = [sell && `엑시트 ${sell}주`, trade && `스왑 ${trade}→${trade / 2}주`, keep && `보유 ${keep}주`].filter(Boolean);
      say(g, `${me.name}: ${COS[d].name} ${parts.join(' · ') || '정리 없음'}`);
      const rest = deciders.slice(1);
      if (rest.length) {
        g.phase = { k: 'merge', tile, survivor, queue, deciders: rest };
        return g;
      }
      return nextDefunct(g, tile, survivor, queue.slice(1));
    }
    case 'buy': {
      if (g.phase.k !== 'buy') return 'BAD_PHASE';
      if (a.cos.length > BUY_MAX) return 'TOO_MANY';
      const s = sizes(g);
      for (const c of a.cos) {
        if (!COS[c] || !s[c]) return 'BAD_CHOICE';
        if (bank(g, c) <= 0) return 'NO_STOCK';
        const pr = price(c, s[c]);
        if (me.cash < pr) return 'NO_CASH';
        me.cash -= pr;
        me.shares[c]++;
      }
      if (a.cos.length) {
        const count = new Map<number, number>();
        for (const c of a.cos) count.set(c, (count.get(c) ?? 0) + 1);
        say(g, `${me.name}: ${[...count].map(([c, n]) => `${COS[c].name} ${n}주`).join(', ')} 투자`);
      }
      return endTurn(g);
    }
  }
}

/** 지분 가치까지 합친 순자산(보너스 제외) */
export function worth(g: State, p: number) {
  const s = sizes(g);
  return g.players[p].cash + COS.reduce((sum, _, c) => sum + g.players[p].shares[c] * price(c, s[c]), 0);
}
