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
export type Move = { t: 'move'; r: number; c: number; ult?: true } | { t: 'wall'; o: Orient; r: number; c: number };

export type State = {
  pawns: [Cell, Cell];
  walls: string[];
  left: [number, number];
  /** 남은 필살기(벽 넘기) 횟수. 예전 저장본엔 없을 수 있다 */
  ult?: [number, number];
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
  if (ultLeft(s, p) <= 0) return [];
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

/** 규칙에 맞으면 다음 상태, 아니면 null */
export function apply(s: State, m: Move): State | null {
  if (s.winner !== null) return null;
  const p = s.turn;
  const next: State = { ...s, turn: (1 - p) as Player, moves: s.moves + 1, last: m };
  if (m.t === 'move') {
    const options = m.ult ? ultMoves(s, p) : pawnMoves(s, p);
    if (!options.some(([r, c]) => r === m.r && c === m.c)) return null;
    if (m.ult) {
      const u = s.ult ?? [ULT_EACH, ULT_EACH];
      next.ult = p === 0 ? [u[0] - 1, u[1]] : [u[0], u[1] - 1];
    }
    next.pawns = p === 0 ? [[m.r, m.c], s.pawns[1]] : [s.pawns[0], [m.r, m.c]];
    if (m.r === GOAL[p]) next.winner = p;
  } else {
    if (wallProblem(s, m.o, m.r, m.c)) return null;
    next.walls = [...s.walls, `${m.o}${m.r}${m.c}${p}`];
    next.left = p === 0 ? [s.left[0] - 1, s.left[1]] : [s.left[0], s.left[1] - 1];
  }
  return next;
}
