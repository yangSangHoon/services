/**
 * 쿼리도 규칙. 화면·네트워크와 무관한 순수 함수만 둔다.
 *
 * 좌표: [행, 열], 0..8. 0번 플레이어는 아래(8행)에서 출발해 0행으로, 1번은 위(0행)에서 8행으로.
 * 벽: `${방향}${행}${열}${놓은사람}` 4글자 문자열. 방향 h(가로)/v(세로), 행·열은 0..7.
 *   h r c → r행과 r+1행 사이를 c, c+1열에 걸쳐 막는다.
 *   v r c → c열과 c+1열 사이를 r, r+1행에 걸쳐 막는다.
 */

export type Player = 0 | 1;
export type Cell = [number, number];
export type Orient = 'h' | 'v';
export type Move =
  | { t: 'move'; r: number; c: number; ult?: true }
  | { t: 'wall'; o: Orient; r: number; c: number }
  /** 필살기 뽑기 (뽑는 쪽이 무작위로 정해 보낸다) */
  | { t: 'draw'; k: CardKind }
  /** 칸을 고를 필요 없는 필살기 카드 발동 */
  | { t: 'card' };

/**
 * 필살기 카드. 반은 좋고 반은 나쁘다. 뽑으면 그 턴에 무조건 써야 한다.
 * 'mixed'(자리 바꾸기)는 상황 따라 득도 실도 되는 복불복이라 좋은·나쁜 쪽 어디서든 나온다.
 */
export type CardKind = 'jump' | 'dash' | 'push' | 'again' | 'supply' | 'back' | 'confiscate' | 'nap' | 'oneway' | 'swap';
export type Tone = 'good' | 'bad' | 'mixed';
export const CARDS: Record<CardKind, { tone: Tone; emoji: string; name: string; desc: string; pick?: string }> = {
  jump: { tone: 'good', emoji: '⚡', name: '벽 넘기', desc: '바로 옆을 막은 벽을 넘어 한 칸 이동해요', pick: '넘어갈 칸을 눌러요' },
  dash: { tone: 'good', emoji: '💨', name: '질주', desc: '한 방향으로 2칸이나 3칸을 한 번에 달려요', pick: '달려갈 칸을 눌러요' },
  push: { tone: 'good', emoji: '👋', name: '밀치기', desc: '상대 말을 원하는 쪽으로 한 칸 옮겨요', pick: '상대 말을 보낼 칸을 눌러요' },
  again: { tone: 'good', emoji: '🔁', name: '한 번 더', desc: '이번 턴에 두 번 연달아 둘 수 있어요' },
  supply: { tone: 'good', emoji: '🧱', name: '벽 보급', desc: '벽을 3개 더 받아요' },
  back: { tone: 'bad', emoji: '🐢', name: '뒷걸음질', desc: '뒤로 한 칸 물러나야 해요', pick: '물러날 칸을 골라요' },
  confiscate: { tone: 'bad', emoji: '💥', name: '벽 압수', desc: '내 벽 2개를 잃어요' },
  nap: { tone: 'bad', emoji: '🧊', name: '얼음', desc: '꽁꽁 얼어서 이번 턴은 쉬어요' },
  oneway: { tone: 'bad', emoji: '🚫', name: '전진 금지', desc: '이번 턴엔 앞으로 못 가요. 옆이나 뒤로 가거나 벽을 세우세요' },
  swap: { tone: 'mixed', emoji: '🔄', name: '자리 바꾸기', desc: '상대 말과 내 말의 자리가 바뀌어요. 바뀐 자리에서 이어서 두세요' },
};

export type State = {
  pawns: [Cell, Cell];
  walls: string[];
  left: [number, number];
  /** 남은 필살기(벽 넘기) 횟수. 예전 저장본엔 없을 수 있다 */
  ult?: [number, number];
  /** 'ult' = 필살기 버전. 없으면 일반 버전 */
  variant?: Variant;
  /** 필살기 버전: 도착하면 필살기 1회를 얻는 🎁 칸 (먹으면 사라진다) */
  spots?: Cell[];
  /** 뽑았지만 아직 안 쓴 필살기 카드 (뽑은 사람 차례가 유지된다) */
  card?: { p: Player; k: CardKind } | null;
  /** 이번 판에 이미 나온 카드 (다시 안 나오게) */
  used?: CardKind[];
  /** '전진 금지' 카드: p 가 이번에 두는 한 번은 앞으로 못 간다 (CardKind 'oneway') */
  lock?: { p: Player; n: number } | null;
  /** '한 번 더' 카드로 한 번 더 두는 사람 */
  bonus?: Player | null;
  turn: Player;
  /** 이번 판에 먼저 둔 사람 (한 판 더 할 때 번갈아) */
  first: Player;
  winner: Player | null;
  moves: number;
  last: Move | null;
};

export const N = 9;
export const WALLS_EACH = 10;
export type Variant = 'classic' | 'ult';
/** 필살기 버전 🎁 칸 개수 */
export const SPOT_COUNT = 5;
const GOAL: [number, number] = [0, N - 1];
export const DIRS: Cell[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/**
 * 🎁 칸 5개: 한가운데 1개 + 판을 180° 돌렸을 때 겹치는 2쌍.
 * 양쪽에 똑같이 유리하도록 대칭으로 놓는다. 출발·도착 줄은 피한다.
 */
export function makeSpots(rand = Math.random): Cell[] {
  const mid = (N - 1) / 2;
  const out: Cell[] = [[mid, mid]];
  const used = new Set([`${mid}${mid}`]);
  while (out.length < SPOT_COUNT) {
    const r = 1 + Math.floor(rand() * (mid - 1)); // 1..3행 (상대 쪽 절반)
    const c = Math.floor(rand() * N);
    const mr = N - 1 - r;
    const mc = N - 1 - c;
    if (used.has(`${r}${c}`) || used.has(`${mr}${mc}`)) continue;
    // 서로 바로 붙어 있으면 몰려 보이니 피한다
    if (out.some(([a, b]) => Math.abs(a - r) + Math.abs(b - c) < 2)) continue;
    used.add(`${r}${c}`).add(`${mr}${mc}`);
    out.push([r, c], [mr, mc]);
  }
  return out;
}

export function newGame(first: Player = 0, variant: Variant = 'classic'): State {
  return {
    pawns: [
      [N - 1, 4],
      [0, 4],
    ],
    walls: [],
    left: [WALLS_EACH, WALLS_EACH],
    ult: [0, 0],
    variant,
    spots: variant === 'ult' ? makeSpots() : [],
    card: null,
    bonus: null,
    lock: null,
    used: [],
    turn: first,
    first,
    winner: null,
    moves: 0,
    last: null,
  };
}

export const goalRow = (p: Player) => GOAL[p];
export const parseWall = (w: string) => ({ o: w[0] as Orient, r: +w[1], c: +w[2], p: +w[3] as Player });
const keys = (walls: string[]) => new Set(walls.map((w) => w.slice(0, 3)));

function blocked(k: Set<string>, r: number, c: number, dr: number, dc: number) {
  if (dr === 1) return k.has(`h${r}${c}`) || k.has(`h${r}${c - 1}`);
  if (dr === -1) return k.has(`h${r - 1}${c}`) || k.has(`h${r - 1}${c - 1}`);
  if (dc === 1) return k.has(`v${r}${c}`) || k.has(`v${r - 1}${c}`);
  return k.has(`v${r}${c - 1}`) || k.has(`v${r - 1}${c - 1}`);
}

const inside = (r: number, c: number) => r >= 0 && r < N && c >= 0 && c < N;
const canStep = (k: Set<string>, r: number, c: number, dr: number, dc: number) =>
  inside(r + dr, c + dc) && !blocked(k, r, c, dr, dc);

/** 말이 갈 수 있는 칸. 마주 보면 뛰어넘고, 뒤가 막혔으면 대각선으로 */
export function pawnMoves(s: State, p: Player = s.turn): Cell[] {
  const k = keys(s.walls);
  const [r, c] = s.pawns[p];
  const [or, oc] = s.pawns[1 - p];
  const out: Cell[] = [];
  for (const [dr, dc] of DIRS) {
    if (!canStep(k, r, c, dr, dc)) continue;
    const nr = r + dr;
    const nc = c + dc;
    if (nr !== or || nc !== oc) {
      out.push([nr, nc]);
      continue;
    }
    if (canStep(k, or, oc, dr, dc)) {
      out.push([or + dr, oc + dc]);
      continue;
    }
    for (const [pr, pc] of dr ? DIRS.slice(2) : DIRS.slice(0, 2)) {
      if (canStep(k, or, oc, pr, pc)) out.push([or + pr, oc + pc]);
    }
  }
  return out;
}

export const ultLeft = (s: State, p: Player = s.turn) => (s.ult ?? [0, 0])[p];

/** 필살기: 바로 옆 칸 중 벽에 막힌 곳으로 벽을 넘어 한 칸 이동 */
export function ultMoves(s: State, p: Player = s.turn): Cell[] {
  const k = keys(s.walls);
  const [r, c] = s.pawns[p];
  const [or, oc] = s.pawns[1 - p];
  const out: Cell[] = [];
  for (const [dr, dc] of DIRS) {
    const nr = r + dr;
    const nc = c + dc;
    if (!inside(nr, nc) || !blocked(k, r, c, dr, dc) || (nr === or && nc === oc)) continue;
    out.push([nr, nc]);
  }
  return out;
}

/** 이번 차례에 말이 갈 수 있는 칸 ('전진 금지'에 걸려 있으면 목표 쪽으로 가까워지는 칸은 빼고) */
export function stepMoves(s: State, p: Player = s.turn): Cell[] {
  const all = pawnMoves(s, p);
  if (s.lock?.p !== p) return all;
  const from = Math.abs(s.pawns[p][0] - GOAL[p]);
  const ok = all.filter(([r]) => Math.abs(r - GOAL[p]) >= from);
  // 옆·뒤도 막혔고 벽도 없으면 꼼짝 못 하니 풀어 준다
  return ok.length || s.left[p] > 0 ? ok : all;
}

/** 뒷걸음질: 갈 수 있는 칸 중 목표에서 멀어지는 곳 */
export function backMoves(s: State, p: Player = s.turn): Cell[] {
  const from = Math.abs(s.pawns[p][0] - GOAL[p]);
  return pawnMoves(s, p).filter(([r]) => Math.abs(r - GOAL[p]) > from);
}

/** 질주: 한 방향으로 벽·상대 말에 막히지 않고 2칸 또는 3칸 */
export function dashMoves(s: State, p: Player = s.turn): Cell[] {
  const k = keys(s.walls);
  const [or, oc] = s.pawns[1 - p];
  const out: Cell[] = [];
  for (const [dr, dc] of DIRS) {
    let [r, c] = s.pawns[p];
    for (let step = 1; step <= 3; step++) {
      if (!canStep(k, r, c, dr, dc)) break;
      r += dr;
      c += dc;
      if (r === or && c === oc) break;
      if (step >= 2) out.push([r, c]);
    }
  }
  return out;
}

/** 밀치기: 상대 말이 한 칸 갈 수 있는 곳 (상대 도착 줄은 빼고) */
export function pushMoves(s: State, p: Player = s.turn): Cell[] {
  const o = (1 - p) as Player;
  const k = keys(s.walls);
  const [r, c] = s.pawns[o];
  const [mr, mc] = s.pawns[p];
  return DIRS.filter(([dr, dc]) => canStep(k, r, c, dr, dc))
    .map(([dr, dc]): Cell => [r + dr, c + dc])
    .filter(([nr, nc]) => (nr !== mr || nc !== mc) && nr !== GOAL[o]);
}

/** 지금 들고 있는 카드로 고를 수 있는 칸 */
export function cardMoves(s: State): Cell[] {
  const k = s.card?.k;
  if (k === 'jump') return ultMoves(s);
  if (k === 'dash') return dashMoves(s);
  if (k === 'push') return pushMoves(s);
  if (k === 'back') return backMoves(s);
  return [];
}

/** 뽑을 때 나올 수 있는 카드인지. 벽 넘기·자리 바꾸기는 상황 상관없이 나온다(벽 넘기는 못 쓰면 버린다) */
function usable(s: State, k: CardKind) {
  if (k === 'back') return backMoves(s).length > 0;
  if (k === 'dash') return dashMoves(s).length > 0;
  if (k === 'push') return pushMoves(s).length > 0;
  if (k === 'confiscate') return s.left[s.turn] > 0;
  return true;
}

/** 0 이상 1 미만 난수. 되도록 crypto 를 쓴다 */
const cryptoRandom = () =>
  typeof crypto !== 'undefined' && crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32 : Math.random();

/**
 * 50% 확률로 좋은 카드, 아니면 나쁜 카드 중 하나. 이번 판에 이미 나온 카드는 빼고 뽑는다.
 * 고른 쪽이 다 나왔으면 반대쪽에서, 그것도 다 나왔으면 처음부터 다시 섞는다.
 */
export function drawCard(s: State, rand = cryptoRandom): { k: CardKind } {
  const good = rand() < 0.5;
  const used = new Set(s.used ?? []);
  const side = (g: boolean, fresh: boolean) =>
    (Object.keys(CARDS) as CardKind[]).filter(
      (k) => (CARDS[k].tone === 'mixed' || (CARDS[k].tone === 'good') === g) && usable(s, k) && (!fresh || !used.has(k)),
    );
  const pool = [side(good, true), side(!good, true), side(good, false)].find((p) => p.length)!;
  return { k: pool[Math.floor(rand() * pool.length)] };
}

/** 벽만 고려한 목표까지 최단 칸 수. 길이 없으면 -1 */
export function distance(walls: string[] | Set<string>, from: Cell, goal: number): number {
  const k = walls instanceof Set ? walls : keys(walls);
  const seen = new Uint8Array(N * N);
  let frontier: Cell[] = [from];
  seen[from[0] * N + from[1]] = 1;
  for (let d = 0; frontier.length; d++) {
    const next: Cell[] = [];
    for (const [r, c] of frontier) {
      if (r === goal) return d;
      for (const [dr, dc] of DIRS) {
        if (!canStep(k, r, c, dr, dc)) continue;
        const i = (r + dr) * N + c + dc;
        if (seen[i]) continue;
        seen[i] = 1;
        next.push([r + dr, c + dc]);
      }
    }
    frontier = next;
  }
  return -1;
}

export type WallProblem = 'no-walls' | 'overlap' | 'trap' | null;

/** 벽을 놓을 수 있는지. 안 되면 이유를 돌려준다 */
export function wallProblem(s: State, o: Orient, r: number, c: number): WallProblem {
  if (s.left[s.turn] <= 0) return 'no-walls';
  if (r < 0 || r > N - 2 || c < 0 || c > N - 2) return 'overlap';
  const k = keys(s.walls);
  const clash =
    k.has(`${o}${r}${c}`) ||
    k.has(`${o === 'h' ? 'v' : 'h'}${r}${c}`) ||
    (o === 'h' ? k.has(`h${r}${c - 1}`) || k.has(`h${r}${c + 1}`) : k.has(`v${r - 1}${c}`) || k.has(`v${r + 1}${c}`));
  if (clash) return 'overlap';
  k.add(`${o}${r}${c}`);
  if (distance(k, s.pawns[0], GOAL[0]) < 0 || distance(k, s.pawns[1], GOAL[1]) < 0) return 'trap';
  return null;
}

/** 한 수를 마치고 차례를 넘긴다. '한 번 더' 중이면 한 번은 차례를 지킨다 */
function endAction(next: State, p: Player) {
  if (next.lock?.p === p) next.lock = next.lock.n > 1 ? { ...next.lock, n: next.lock.n - 1 } : null;
  if (next.bonus === p) {
    next.bonus = null;
    next.turn = p;
  } else {
    next.turn = (1 - p) as Player;
  }
}

const withPawn = (s: State, p: Player, r: number, c: number): [Cell, Cell] =>
  p === 0 ? [[r, c], s.pawns[1]] : [s.pawns[0], [r, c]];

/** 말을 옮기고, 🎁 칸에 닿았으면 그 칸을 먹고 필살기 1회를 얻는다 */
function movePawn(s: State, next: State, p: Player, r: number, c: number) {
  next.pawns = withPawn(s, p, r, c);
  const spots = s.spots ?? [];
  if (!spots.some(([a, b]) => a === r && b === c)) return;
  next.spots = spots.filter(([a, b]) => a !== r || b !== c);
  const u = s.ult ?? [0, 0];
  next.ult = p === 0 ? [u[0] + 1, u[1]] : [u[0], u[1] + 1];
}
const addWalls = (s: State, p: Player, d: number): [number, number] =>
  p === 0 ? [Math.max(0, s.left[0] + d), s.left[1]] : [s.left[0], Math.max(0, s.left[1] + d)];

/** 규칙에 맞으면 다음 상태, 아니면 null */
export function apply(s: State, m: Move): State | null {
  if (s.winner !== null) return null;
  const p = s.turn;
  const next: State = { ...s, moves: s.moves + 1, last: m };
  const card = s.card?.p === p ? s.card.k : null;

  // 카드를 들고 있으면 그 카드만 쓸 수 있다
  if (card) {
    next.card = null;
    if (m.t === 'move' && CARDS[card].pick) {
      if (!cardMoves(s).some(([r, c]) => r === m.r && c === m.c)) return null;
      next.last = card === 'back' ? { t: 'move', r: m.r, c: m.c } : { t: 'move', r: m.r, c: m.c, ult: true };
      if (card === 'push') {
        next.pawns = withPawn(s, (1 - p) as Player, m.r, m.c);
      } else {
        movePawn(s, next, p, m.r, m.c);
        if (m.r === GOAL[p]) next.winner = p;
      }
      endAction(next, p);
      return next;
    }
    if (m.t !== 'card') return null;
    if (CARDS[card].pick) {
      if (cardMoves(s).length) return null;
      return next; // 쓸 수 없는 카드 → 버리고 이번 턴은 평소처럼
    }
    if (card === 'again') {
      next.bonus = p; // 차례 유지, 이어서 두 번 둔다
      return next;
    }
    if (card === 'oneway') {
      next.lock = { p, n: 1 }; // 이번 턴 한 번만, 차례 유지
      return next;
    }
    if (card === 'swap') {
      // 자리만 바꾸고 차례는 그대로 — 바뀐 자리에서 이어서 둔다
      const o = (1 - p) as Player;
      next.pawns = [s.pawns[1], s.pawns[0]];
      if (next.pawns[o][0] === GOAL[o]) next.winner = o;
      return next;
    }
    if (card === 'supply') next.left = addWalls(s, p, 3);
    if (card === 'confiscate') next.left = addWalls(s, p, -2);
    endAction(next, p);
    return next;
  }

  if (m.t === 'draw') {
    if (ultLeft(s, p) <= 0 || !CARDS[m.k] || !usable(s, m.k)) return null;
    const u = s.ult ?? [0, 0];
    next.ult = p === 0 ? [u[0] - 1, u[1]] : [u[0], u[1] - 1];
    next.used = [...(s.used ?? []), m.k];
    next.card = { p, k: m.k };
    return next;
  }
  if (m.t === 'card') return null;
  if (m.t === 'move') {
    if (m.ult || !stepMoves(s, p).some(([r, c]) => r === m.r && c === m.c)) return null;
    movePawn(s, next, p, m.r, m.c);
    if (m.r === GOAL[p]) next.winner = p;
  } else {
    if (wallProblem(s, m.o, m.r, m.c)) return null;
    next.walls = [...s.walls, `${m.o}${m.r}${m.c}${p}`];
    next.left = addWalls(s, p, -1);
  }
  endAction(next, p);
  return next;
}
