import { MAP } from './map';

/**
 * 카탄 규칙 엔진 (기본판 규칙).
 * apply(state, 플레이어, 행동) → 새 state 또는 에러 코드 문자열. 화면·네트워크와 무관하다.
 * 주사위·카드 섞기에 Math.random 을 쓰므로 방장 브라우저에서만 실행한다.
 */

export const RES = ['wood', 'brick', 'sheep', 'wheat', 'ore'] as const;
export type Res = (typeof RES)[number];
export type Hand = Record<Res, number>;
export type Terrain = Res | 'desert';
export type DevKind = 'knight' | 'vp' | 'road' | 'plenty' | 'mono';
export type Harbor = Res | 'any';

export type PlayerState = {
  name: string;
  bot: boolean;
  hand: Hand;
  dev: { k: DevKind; fresh: boolean }[];
  knights: number;
};

export type Phase =
  | { k: 'setup'; i: number; step: 'settle' | 'road'; v: number }
  | { k: 'roll' }
  | { k: 'discard'; need: number[] }
  | { k: 'robber' }
  | { k: 'main' }
  | { k: 'roads'; left: number }
  | { k: 'over' };

export type Offer = { give: Hand; get: Hand; resp: ('yes' | 'no' | null)[] };

export type State = {
  terrain: Terrain[];
  nums: number[];
  harbors: Harbor[];
  robber: number;
  /** 꼭짓점별 건물: -1 없음, 아니면 p*2 + (도시면 1) */
  build: number[];
  /** 변별 길 주인 (-1 없음) */
  roads: number[];
  players: PlayerState[];
  turn: number;
  phase: Phase;
  rolled: boolean;
  devPlayed: boolean;
  dice: [number, number] | null;
  bank: Hand;
  deck: DevKind[];
  longest: { p: number; len: number } | null;
  army: { p: number; size: number } | null;
  offer: Offer | null;
  winner: number | null;
  log: string[];
  /** 행동마다 1씩. 화면 애니메이션 키로 쓴다 */
  n: number;
};

export type Action =
  | { t: 'settle'; v: number }
  | { t: 'road'; e: number }
  | { t: 'city'; v: number }
  | { t: 'roll' }
  | { t: 'discard'; cards: Hand }
  | { t: 'robber'; hex: number; victim: number | null }
  | { t: 'buyDev' }
  | { t: 'knight' }
  | { t: 'roadCard' }
  | { t: 'plenty'; a: Res; b: Res }
  | { t: 'mono'; r: Res }
  | { t: 'bank'; give: Res; get: Res }
  | { t: 'offer'; give: Hand; get: Hand }
  | { t: 'respond'; yes: boolean }
  | { t: 'accept'; with: number }
  | { t: 'cancelOffer' }
  | { t: 'endRoads' }
  | { t: 'end' };

export const COST: Record<'road' | 'settle' | 'city' | 'dev', Partial<Hand>> = {
  road: { wood: 1, brick: 1 },
  settle: { wood: 1, brick: 1, sheep: 1, wheat: 1 },
  city: { wheat: 2, ore: 3 },
  dev: { sheep: 1, wheat: 1, ore: 1 },
};
export const PIECES = { road: 15, settle: 5, city: 4 };
export const WIN_VP = 10;
export const RES_NAME: Record<Res, string> = { wood: '나무', brick: '벽돌', sheep: '양', wheat: '밀', ore: '철광석' };
export const RES_EMOJI: Record<Res, string> = { wood: '🌲', brick: '🧱', sheep: '🐑', wheat: '🌾', ore: '⛰️' };
export const DEV_NAME: Record<DevKind, string> = {
  knight: '기사',
  vp: '승점 1점',
  road: '길 건설',
  plenty: '풍년',
  mono: '독점',
};

export const emptyHand = (): Hand => ({ wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 });
export const handSize = (h: Hand) => RES.reduce((n, r) => n + h[r], 0);
const has = (h: Hand, c: Partial<Hand>) => RES.every((r) => h[r] >= (c[r] ?? 0));
const pay = (s: State, p: number, c: Partial<Hand>) => {
  for (const r of RES) {
    s.players[p].hand[r] -= c[r] ?? 0;
    s.bank[r] += c[r] ?? 0;
  }
};

function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ───────── 새 판

export function newGame(players: { name: string; bot: boolean }[]): State {
  const terrain = shuffle<Terrain>([
    ...Array<Terrain>(4).fill('wood'),
    ...Array<Terrain>(3).fill('brick'),
    ...Array<Terrain>(4).fill('sheep'),
    ...Array<Terrain>(4).fill('wheat'),
    ...Array<Terrain>(3).fill('ore'),
    'desert',
  ]);
  // 6·8 끼리 붙지 않게 될 때까지 다시 섞는다
  let nums: number[];
  do {
    const pool = shuffle([2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12]);
    nums = terrain.map((t) => (t === 'desert' ? 0 : pool.pop()!));
  } while (nums.some((n, i) => (n === 6 || n === 8) && MAP.hexes[i].adj.some((j) => nums[j] === 6 || nums[j] === 8)));

  return {
    terrain,
    nums,
    harbors: shuffle<Harbor>(['any', 'any', 'any', 'any', 'wood', 'brick', 'sheep', 'wheat', 'ore']),
    robber: terrain.indexOf('desert'),
    build: Array(MAP.vertices.length).fill(-1),
    roads: Array(MAP.edges.length).fill(-1),
    players: players.map((p) => ({ ...p, hand: emptyHand(), dev: [], knights: 0 })),
    turn: 0,
    phase: { k: 'setup', i: 0, step: 'settle', v: -1 },
    rolled: false,
    devPlayed: false,
    dice: null,
    bank: { wood: 19, brick: 19, sheep: 19, wheat: 19, ore: 19 },
    deck: shuffle<DevKind>([
      ...Array<DevKind>(14).fill('knight'),
      ...Array<DevKind>(5).fill('vp'),
      'road',
      'road',
      'plenty',
      'plenty',
      'mono',
      'mono',
    ]),
    longest: null,
    army: null,
    offer: null,
    winner: null,
    log: ['첫 마을과 길을 놓을 차례예요'],
    n: 0,
  };
}

/** 첫 배치 순서: 1→N, N→1 */
export const setupOrder = (n: number) => [...Array(n).keys(), ...[...Array(n).keys()].reverse()];

// ───────── 조회

export const owner = (b: number) => (b < 0 ? -1 : b >> 1);
export const isCity = (b: number) => b >= 0 && (b & 1) === 1;

/** 거리 규칙: 이웃 꼭짓점에 건물이 없어야 한다 */
const spacious = (s: State, v: number) => s.build[v] < 0 && MAP.vertices[v].adj.every((u) => s.build[u] < 0);

export function canSettle(s: State, p: number, v: number, setup = false) {
  if (!spacious(s, v)) return false;
  if (setup) return true;
  return MAP.vertices[v].edges.some((e) => s.roads[e] === p);
}

export function canRoad(s: State, p: number, e: number, from = -1) {
  if (s.roads[e] >= 0) return false;
  const { a, b } = MAP.edges[e];
  if (from >= 0) return a === from || b === from;
  // 내 건물에 붙거나, 남의 건물이 막지 않은 꼭짓점에서 내 길과 이어져야 한다
  return [a, b].some((v) => {
    const o = owner(s.build[v]);
    if (o === p) return true;
    if (o >= 0) return false;
    return MAP.vertices[v].edges.some((x) => x !== e && s.roads[x] === p);
  });
}

export const legalSettles = (s: State, p: number, setup = false) =>
  MAP.vertices.flatMap((_, v) => (canSettle(s, p, v, setup) ? [v] : []));
export const legalRoads = (s: State, p: number, from = -1) => MAP.edges.flatMap((_, e) => (canRoad(s, p, e, from) ? [e] : []));
export const legalCities = (s: State, p: number) => s.build.flatMap((b, v) => (b === p * 2 ? [v] : []));

export const piecesUsed = (s: State, p: number) => ({
  road: s.roads.filter((o) => o === p).length,
  settle: s.build.filter((b) => b === p * 2).length,
  city: s.build.filter((b) => b === p * 2 + 1).length,
});

/** 공개 점수(승점 카드 제외) */
export function publicVp(s: State, p: number) {
  const u = piecesUsed(s, p);
  return u.settle + u.city * 2 + (s.longest?.p === p ? 2 : 0) + (s.army?.p === p ? 2 : 0);
}
export const totalVp = (s: State, p: number) => publicVp(s, p) + s.players[p].dev.filter((d) => d.k === 'vp').length;

/** 항구 거래 비율 */
export function ratios(s: State, p: number): Record<Res, number> {
  const out = { wood: 4, brick: 4, sheep: 4, wheat: 4, ore: 4 };
  MAP.harbors.forEach((e, i) => {
    const { a, b } = MAP.edges[e];
    if (owner(s.build[a]) !== p && owner(s.build[b]) !== p) return;
    const h = s.harbors[i];
    if (h === 'any') for (const r of RES) out[r] = Math.min(out[r], 3);
    else out[h] = 2;
  });
  return out;
}

/** 내 길 중 가장 긴 한 줄. 남의 건물이 있는 꼭짓점에서는 끊긴다 */
export function roadLength(s: State, p: number) {
  const mine = s.roads.flatMap((o, e) => (o === p ? [e] : []));
  let best = 0;
  const used = new Set<number>();
  const walk = (v: number, len: number) => {
    best = Math.max(best, len);
    const o = owner(s.build[v]);
    if (len > 0 && o >= 0 && o !== p) return;
    for (const e of MAP.vertices[v].edges) {
      if (s.roads[e] !== p || used.has(e)) continue;
      used.add(e);
      const { a, b } = MAP.edges[e];
      walk(a === v ? b : a, len + 1);
      used.delete(e);
    }
  };
  for (const e of mine) {
    walk(MAP.edges[e].a, 0);
    walk(MAP.edges[e].b, 0);
  }
  return best;
}

function updateLongest(s: State) {
  const lens = s.players.map((_, p) => roadLength(s, p));
  const max = Math.max(...lens);
  const cur = s.longest;
  if (cur && lens[cur.p] === max && max >= 5) {
    s.longest = { p: cur.p, len: max };
    return;
  }
  const leaders = lens.flatMap((l, p) => (l === max ? [p] : []));
  const next = max >= 5 && leaders.length === 1 ? { p: leaders[0], len: max } : null;
  if (next && next.p !== cur?.p) s.log.push(`🛣️ ${s.players[next.p].name} 최장 교역로 (${max})`);
  s.longest = next;
}

// ───────── 행동

const say = (s: State, msg: string) => {
  s.log.push(msg);
  if (s.log.length > 40) s.log.splice(0, s.log.length - 40);
};

function produce(s: State, roll: number) {
  const owed = s.players.map(() => emptyHand());
  MAP.hexes.forEach((h, i) => {
    if (s.nums[i] !== roll || i === s.robber) return;
    const t = s.terrain[i] as Res;
    for (const v of h.v) {
      const b = s.build[v];
      if (b >= 0) owed[owner(b)][t] += isCity(b) ? 2 : 1;
    }
  });
  const got: string[] = [];
  for (const r of RES) {
    const takers = owed.flatMap((h, p) => (h[r] ? [p] : []));
    const total = takers.reduce((n, p) => n + owed[p][r], 0);
    if (!total) continue;
    // 은행이 모자라면: 받을 사람이 한 명이면 남은 만큼, 여럿이면 아무도 못 받는다
    if (total > s.bank[r] && takers.length > 1) {
      got.push(`${RES_NAME[r]} 부족`);
      continue;
    }
    for (const p of takers) {
      const n = Math.min(owed[p][r], s.bank[r]);
      s.bank[r] -= n;
      s.players[p].hand[r] += n;
      got.push(`${s.players[p].name} ${RES_EMOJI[r]}${n}`);
    }
  }
  return got;
}

function stealFrom(s: State, from: number, to: number) {
  const pool = RES.flatMap((r) => Array<Res>(s.players[from].hand[r]).fill(r));
  if (!pool.length) return null;
  const r = pool[Math.floor(Math.random() * pool.length)];
  s.players[from].hand[r]--;
  s.players[to].hand[r]++;
  return r;
}

export function robberVictims(s: State, hex: number, p: number) {
  const set = new Set<number>();
  for (const v of MAP.hexes[hex].v) {
    const o = owner(s.build[v]);
    if (o >= 0 && o !== p && handSize(s.players[o].hand) > 0) set.add(o);
  }
  return [...set];
}

const canPlayDev = (s: State, p: number, k: DevKind) =>
  !s.devPlayed && s.players[p].dev.some((d) => d.k === k && !d.fresh);

function takeDev(s: State, p: number, k: DevKind) {
  const i = s.players[p].dev.findIndex((d) => d.k === k && !d.fresh);
  s.players[p].dev.splice(i, 1);
  s.devPlayed = true;
}

function nextTurn(s: State) {
  for (const d of s.players[s.turn].dev) d.fresh = false;
  s.turn = (s.turn + 1) % s.players.length;
  s.phase = { k: 'roll' };
  s.rolled = false;
  s.devPlayed = false;
  s.dice = null;
  s.offer = null;
}

function checkWin(s: State) {
  if (s.winner === null && totalVp(s, s.turn) >= WIN_VP) {
    s.winner = s.turn;
    s.phase = { k: 'over' };
    say(s, `🏆 ${s.players[s.turn].name} 승리!`);
  }
}

export function apply(prev: State, p: number, a: Action): State | string {
  if (prev.phase.k === 'over') return 'OVER';
  const s: State = structuredClone(prev);
  const me = s.players[p];
  const ph = s.phase;
  const myTurn = s.turn === p;
  const name = me?.name ?? '';
  if (!me) return 'NO_PLAYER';

  // 버리기·거래 응답은 차례가 아니어도 한다
  if (a.t === 'discard') {
    if (ph.k !== 'discard' || !ph.need[p]) return 'NOT_NOW';
    if (handSize(a.cards) !== ph.need[p] || !has(me.hand, a.cards)) return 'BAD_DISCARD';
    pay(s, p, a.cards);
    ph.need[p] = 0;
    say(s, `${name} 카드 ${handSize(a.cards)}장 버림`);
    if (ph.need.every((n) => !n)) s.phase = { k: 'robber' };
    s.n++;
    return s;
  }
  if (a.t === 'respond') {
    if (!s.offer || myTurn) return 'NOT_NOW';
    if (a.yes && !has(me.hand, s.offer.get)) return 'NOT_ENOUGH';
    s.offer.resp[p] = a.yes ? 'yes' : 'no';
    s.n++;
    return s;
  }

  if (!myTurn) return 'NOT_YOUR_TURN';

  switch (a.t) {
    case 'settle': {
      if (ph.k === 'setup') {
        if (ph.step !== 'settle' || !canSettle(s, p, a.v, true)) return 'BAD_SPOT';
        s.build[a.v] = p * 2;
        // 두 번째 마을은 닿은 땅의 자원을 하나씩 받는다
        if (ph.i >= s.players.length) {
          for (const h of MAP.vertices[a.v].hexes) {
            const t = s.terrain[h];
            if (t !== 'desert') {
              me.hand[t]++;
              s.bank[t]--;
            }
          }
        }
        s.phase = { ...ph, step: 'road', v: a.v };
        say(s, `🏠 ${name} 마을`);
        break;
      }
      if (ph.k !== 'main') return 'NOT_NOW';
      if (!has(me.hand, COST.settle)) return 'NOT_ENOUGH';
      if (piecesUsed(s, p).settle >= PIECES.settle) return 'NO_PIECES';
      if (!canSettle(s, p, a.v)) return 'BAD_SPOT';
      pay(s, p, COST.settle);
      s.build[a.v] = p * 2;
      say(s, `🏠 ${name} 마을 건설`);
      updateLongest(s);
      break;
    }
    case 'road': {
      if (ph.k === 'setup') {
        if (ph.step !== 'road' || !canRoad(s, p, a.e, ph.v)) return 'BAD_SPOT';
        s.roads[a.e] = p;
        const order = setupOrder(s.players.length);
        if (ph.i + 1 >= order.length) {
          s.turn = 0;
          s.phase = { k: 'roll' };
          say(s, '🎲 본 게임 시작!');
        } else {
          s.turn = order[ph.i + 1];
          s.phase = { k: 'setup', i: ph.i + 1, step: 'settle', v: -1 };
        }
        break;
      }
      const free = ph.k === 'roads';
      if (ph.k !== 'main' && !free) return 'NOT_NOW';
      if (!free && !has(me.hand, COST.road)) return 'NOT_ENOUGH';
      if (piecesUsed(s, p).road >= PIECES.road) return 'NO_PIECES';
      if (!canRoad(s, p, a.e)) return 'BAD_SPOT';
      if (!free) pay(s, p, COST.road);
      s.roads[a.e] = p;
      updateLongest(s);
      if (ph.k === 'roads') {
        const left = ph.left - 1;
        s.phase =
          left > 0 && legalRoads(s, p).length && piecesUsed(s, p).road < PIECES.road
            ? { k: 'roads', left }
            : { k: s.rolled ? 'main' : 'roll' };
      }
      break;
    }
    case 'endRoads': {
      if (ph.k !== 'roads') return 'NOT_NOW';
      s.phase = { k: s.rolled ? 'main' : 'roll' };
      break;
    }
    case 'city': {
      if (ph.k !== 'main') return 'NOT_NOW';
      if (!has(me.hand, COST.city)) return 'NOT_ENOUGH';
      if (piecesUsed(s, p).city >= PIECES.city) return 'NO_PIECES';
      if (s.build[a.v] !== p * 2) return 'BAD_SPOT';
      pay(s, p, COST.city);
      s.build[a.v] = p * 2 + 1;
      say(s, `🏙️ ${name} 도시로 업그레이드`);
      break;
    }
    case 'roll': {
      if (ph.k !== 'roll') return 'NOT_NOW';
      const d: [number, number] = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
      const sum = d[0] + d[1];
      s.dice = d;
      s.rolled = true;
      if (sum === 7) {
        const need = s.players.map((pl) => (handSize(pl.hand) > 7 ? Math.floor(handSize(pl.hand) / 2) : 0));
        say(s, `🎲 ${name} 7! 도적이 나타났어요`);
        s.phase = need.some(Boolean) ? { k: 'discard', need } : { k: 'robber' };
      } else {
        const got = produce(s, sum);
        say(s, `🎲 ${name} ${sum}${got.length ? ` · ${got.join(', ')}` : ' · 아무도 못 받음'}`);
        s.phase = { k: 'main' };
      }
      break;
    }
    case 'robber': {
      if (ph.k !== 'robber') return 'NOT_NOW';
      if (a.hex === s.robber || a.hex < 0 || a.hex >= MAP.hexes.length) return 'BAD_SPOT';
      const victims = robberVictims(s, a.hex, p);
      if (victims.length && (a.victim === null || !victims.includes(a.victim))) return 'PICK_VICTIM';
      s.robber = a.hex;
      if (a.victim !== null && victims.includes(a.victim)) {
        const r = stealFrom(s, a.victim, p);
        say(s, `🦹 ${name} → ${s.players[a.victim].name} 카드 1장 훔침${r ? '' : ''}`);
      } else say(s, `🦹 ${name} 도적 이동`);
      s.phase = { k: s.rolled ? 'main' : 'roll' };
      break;
    }
    case 'buyDev': {
      if (ph.k !== 'main') return 'NOT_NOW';
      if (!s.deck.length) return 'NO_CARDS';
      if (!has(me.hand, COST.dev)) return 'NOT_ENOUGH';
      pay(s, p, COST.dev);
      me.dev.push({ k: s.deck.pop()!, fresh: true });
      say(s, `🃏 ${name} 발전 카드 구입`);
      break;
    }
    case 'knight': {
      if (ph.k !== 'main' && ph.k !== 'roll') return 'NOT_NOW';
      if (!canPlayDev(s, p, 'knight')) return 'NO_CARD';
      takeDev(s, p, 'knight');
      me.knights++;
      say(s, `⚔️ ${name} 기사 카드 사용`);
      if (me.knights >= 3 && (!s.army || (s.army.p !== p && me.knights > s.army.size))) {
        if (s.army?.p !== p) say(s, `🛡️ ${name} 최강 기사단`);
        s.army = { p, size: me.knights };
      } else if (s.army?.p === p) s.army.size = me.knights;
      s.phase = { k: 'robber' };
      break;
    }
    case 'roadCard': {
      if (ph.k !== 'main' && ph.k !== 'roll') return 'NOT_NOW';
      if (!canPlayDev(s, p, 'road')) return 'NO_CARD';
      takeDev(s, p, 'road');
      say(s, `🛣️ ${name} 길 건설 카드 사용`);
      s.phase = legalRoads(s, p).length ? { k: 'roads', left: 2 } : { k: s.rolled ? 'main' : 'roll' };
      break;
    }
    case 'plenty': {
      if (ph.k !== 'main' && ph.k !== 'roll') return 'NOT_NOW';
      if (!canPlayDev(s, p, 'plenty')) return 'NO_CARD';
      const want: Partial<Hand> = { [a.a]: 1 };
      want[a.b] = (want[a.b] ?? 0) + 1;
      if (!RES.every((r) => s.bank[r] >= (want[r] ?? 0))) return 'BANK_EMPTY';
      takeDev(s, p, 'plenty');
      for (const r of RES) {
        me.hand[r] += want[r] ?? 0;
        s.bank[r] -= want[r] ?? 0;
      }
      say(s, `🌈 ${name} 풍년: ${RES_EMOJI[a.a]}${RES_EMOJI[a.b]}`);
      break;
    }
    case 'mono': {
      if (ph.k !== 'main' && ph.k !== 'roll') return 'NOT_NOW';
      if (!canPlayDev(s, p, 'mono')) return 'NO_CARD';
      takeDev(s, p, 'mono');
      let n = 0;
      s.players.forEach((o, i) => {
        if (i === p) return;
        n += o.hand[a.r];
        o.hand[a.r] = 0;
      });
      me.hand[a.r] += n;
      say(s, `💰 ${name} 독점: ${RES_EMOJI[a.r]} ${n}장 싹쓸이`);
      break;
    }
    case 'bank': {
      if (ph.k !== 'main' || a.give === a.get) return 'NOT_NOW';
      const k = ratios(s, p)[a.give];
      if (me.hand[a.give] < k) return 'NOT_ENOUGH';
      if (s.bank[a.get] < 1) return 'BANK_EMPTY';
      me.hand[a.give] -= k;
      s.bank[a.give] += k;
      me.hand[a.get]++;
      s.bank[a.get]--;
      say(s, `🏦 ${name} ${RES_EMOJI[a.give]}${k} → ${RES_EMOJI[a.get]}1`);
      break;
    }
    case 'offer': {
      if (ph.k !== 'main') return 'NOT_NOW';
      if (!handSize(a.give) || !handSize(a.get) || !has(me.hand, a.give)) return 'BAD_OFFER';
      if (RES.some((r) => a.give[r] && a.get[r])) return 'BAD_OFFER';
      s.offer = { give: a.give, get: a.get, resp: s.players.map((_, i) => (i === p ? null : null)) };
      say(s, `🤝 ${name} 거래 제안`);
      break;
    }
    case 'accept': {
      const o = s.offer;
      if (ph.k !== 'main' || !o || o.resp[a.with] !== 'yes') return 'NOT_NOW';
      const them = s.players[a.with];
      if (!has(me.hand, o.give) || !has(them.hand, o.get)) return 'NOT_ENOUGH';
      for (const r of RES) {
        me.hand[r] += o.get[r] - o.give[r];
        them.hand[r] += o.give[r] - o.get[r];
      }
      say(s, `🤝 ${name} ↔ ${them.name} 거래 성사`);
      s.offer = null;
      break;
    }
    case 'cancelOffer': {
      s.offer = null;
      break;
    }
    case 'end': {
      if (ph.k !== 'main') return 'NOT_NOW';
      nextTurn(s);
      break;
    }
    default:
      return 'UNKNOWN';
  }

  checkWin(s);
  s.n++;
  return s;
}

export const ERROR_TEXT: Record<string, string> = {
  NOT_YOUR_TURN: '내 차례가 아니에요',
  NOT_NOW: '지금은 할 수 없어요',
  NOT_ENOUGH: '자원이 모자라요',
  NO_PIECES: '남은 말이 없어요',
  BAD_SPOT: '거기엔 놓을 수 없어요',
  PICK_VICTIM: '훔칠 사람을 골라 주세요',
  NO_CARDS: '발전 카드가 다 떨어졌어요',
  NO_CARD: '이번 차례엔 쓸 수 없어요',
  BANK_EMPTY: '은행에 그 자원이 없어요',
  BAD_OFFER: '주고받을 자원을 골라 주세요',
  BAD_DISCARD: '버릴 장수가 맞지 않아요',
};

/** 6·8 = 5점 … 2·12 = 1점. 주사위 확률 눈금 */
export const pips = (n: number) => (n ? 6 - Math.abs(7 - n) : 0);
