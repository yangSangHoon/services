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

/** 필살기 카드. 반은 좋고 반은 나쁘다. 뽑으면 그 턴에 무조건 써야 한다 */
export type CardKind = 'jump' | 'again' | 'supply' | 'back' | 'confiscate' | 'nap';
export const CARDS: Record<CardKind, { good: boolean; emoji: string; name: string; desc: string; pick?: true }> = {
  jump: { good: true, emoji: '⚡', name: '벽 넘기', desc: '바로 옆을 막은 벽을 넘어 한 칸 이동해요', pick: true },
  again: { good: true, emoji: '🔁', name: '한 번 더', desc: '이번 턴에 두 번 연달아 둘 수 있어요' },
  supply: { good: true, emoji: '🧱', name: '벽 보급', desc: '벽을 3개 더 받아요' },
  back: { good: false, emoji: '🐢', name: '뒷걸음질', desc: '뒤로 한 칸 물러나야 해요', pick: true },
  confiscate: { good: false, emoji: '💥', name: '벽 압수', desc: '내 벽 2개를 잃어요' },
  nap: { good: false, emoji: '😴', name: '낮잠', desc: '이번 턴은 아무것도 못 하고 쉬어요' },
};

export type State = {
  pawns: [Cell, Cell];
  walls: string[];
  left: [number, number];
  /** 남은 필살기(벽 넘기) 횟수. 예전 저장본엔 없을 수 있다 */
  ult?: [number, number];
  /** 뽑았지만 아직 안 쓴 필살기 카드 (뽑은 사람 차례가 유지된다) */
  card?: { p: Player; k: CardKind } | null;
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
export const ULT_EACH = 1;
const GOAL: [number, number] = [0, N - 1];
const DIRS: Cell[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

export function newGame(first: Player = 0): State {
  return {
    pawns: [
      [N - 1, 4],
      [0, 4],
    ],
    walls: [],
    left: [WALLS_EACH, WALLS_EACH],
    ult: [ULT_EACH, ULT_EACH],
    card: null,
    bonus: null,
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

export const ultLeft = (s: State, p: Player = s.turn) => (s.ult ?? [ULT_EACH, ULT_EACH])[p];

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

/** 뒷걸음질: 갈 수 있는 칸 중 목표에서 멀어지는 곳 */
export function backMoves(s: State, p: Player = s.turn): Cell[] {
  const from = Math.abs(s.pawns[p][0] - GOAL[p]);
  return pawnMoves(s, p).filter(([r]) => Math.abs(r - GOAL[p]) > from);
}

/** 지금 들고 있는 카드로 고를 수 있는 칸 */
export function cardMoves(s: State): Cell[] {
  const k = s.card?.k;
  return k === 'jump' ? ultMoves(s) : k === 'back' ? backMoves(s) : [];
}

/** 지금 판에서 실제로 쓸 수 있는 카드인지 (못 쓰는 카드는 안 나오게) */
function usable(s: State, k: CardKind) {
  if (k === 'jump') return ultMoves(s).length > 0;
  if (k === 'back') return backMoves(s).length > 0;
  if (k === 'confiscate') return s.left[s.turn] > 0;
  return true;
}

/** 50% 확률로 좋은 카드, 아니면 나쁜 카드 중 하나 */
export function drawCard(s: State, rand = Math.random): CardKind {
  const good = rand() < 0.5;
  const pool = (Object.keys(CARDS) as CardKind[]).filter((k) => CARDS[k].good === good && usable(s, k));
  return pool[Math.floor(rand() * pool.length)];
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
  if (next.bonus === p) {
    next.bonus = null;
    next.turn = p;
  } else {
    next.turn = (1 - p) as Player;
  }
}

const withPawn = (s: State, p: Player, r: number, c: number): [Cell, Cell] =>
  p === 0 ? [[r, c], s.pawns[1]] : [s.pawns[0], [r, c]];
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
      next.pawns = withPawn(s, p, m.r, m.c);
      next.last = card === 'jump' ? { t: 'move', r: m.r, c: m.c, ult: true } : { t: 'move', r: m.r, c: m.c };
      if (m.r === GOAL[p]) next.winner = p;
      endAction(next, p);
      return next;
    }
    if (m.t !== 'card' || CARDS[card].pick) return null;
    if (card === 'again') {
      next.bonus = p; // 차례 유지, 이어서 두 번 둔다
      return next;
    }
    if (card === 'supply') next.left = addWalls(s, p, 3);
    if (card === 'confiscate') next.left = addWalls(s, p, -2);
    endAction(next, p);
    return next;
  }

  if (m.t === 'draw') {
    if (ultLeft(s, p) <= 0 || !CARDS[m.k] || !usable(s, m.k)) return null;
    const u = s.ult ?? [ULT_EACH, ULT_EACH];
    next.ult = p === 0 ? [u[0] - 1, u[1]] : [u[0], u[1] - 1];
    next.card = { p, k: m.k };
    return next;
  }
  if (m.t === 'card') return null;
  if (m.t === 'move') {
    if (m.ult || !pawnMoves(s, p).some(([r, c]) => r === m.r && c === m.c)) return null;
    next.pawns = withPawn(s, p, m.r, m.c);
    if (m.r === GOAL[p]) next.winner = p;
  } else {
    if (wallProblem(s, m.o, m.r, m.c)) return null;
    next.walls = [...s.walls, `${m.o}${m.r}${m.c}${p}`];
    next.left = addWalls(s, p, -1);
  }
  endAction(next, p);
  return next;
}
