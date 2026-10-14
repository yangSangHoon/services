/**
 * 다빈치 코드 규칙 엔진 (조커 없는 기본판).
 * apply(state, 플레이어, 행동) → 새 state 또는 에러 코드 문자열. 화면·네트워크와 무관하다.
 * 더미 섞기에 Math.random 을 쓰므로 방장(또는 혼자 하기) 브라우저에서만 실행한다.
 *
 * 타일 id 0~23: 0~11 검정, 12~23 흰색. 숫자는 id % 12.
 * 줄은 작은 수 → 큰 수, 같은 수면 검정이 왼쪽. 타일 색은 모두에게 보인다.
 */

export type Color = 'b' | 'w';
export const color = (t: number): Color => (t < 12 ? 'b' : 'w');
export const num = (t: number) => t % 12;
export const tileOf = (c: Color, n: number) => (c === 'b' ? n : 12 + n);
/** 줄 정렬 기준 */
export const key = (t: number) => num(t) * 2 + (color(t) === 'w' ? 1 : 0);

export type PlayerState = {
  name: string;
  bot: boolean;
  /** 줄(정렬됨) */
  row: number[];
  out: boolean;
};

export type Phase =
  | { k: 'draw' }
  /** drawn: 이번 턴에 뽑은 타일(더미가 비었으면 null), streak: 이번 턴에 맞힌 수 */
  | { k: 'guess'; drawn: number | null; streak: number }
  /** 더미가 비어 있을 때 틀리면 자기 타일 하나를 공개 */
  | { k: 'reveal' }
  | { k: 'over' };

export type Last =
  | { t: 'hit' | 'miss'; by: number; target: number; tile: number; guess: number; n: number }
  | { t: 'place'; by: number; tile: number; open: boolean; n: number }
  | { t: 'reveal'; by: number; tile: number; n: number };

export type State = {
  players: PlayerState[];
  pile: number[];
  /** 공개된 타일 */
  open: number[];
  /** 공개 정보: 타일별로 틀렸던 추리 숫자 */
  misses: Record<number, number[]>;
  turn: number;
  phase: Phase;
  winner: number | null;
  last: Last | null;
  log: string[];
  /** 행동마다 1씩 */
  n: number;
};

export type Action =
  | { t: 'draw'; c: Color }
  | { t: 'guess'; target: number; idx: number; n: number }
  | { t: 'stop' }
  | { t: 'reveal'; idx: number };

export const ERROR_TEXT: Record<string, string> = {
  NOT_YOUR_TURN: '내 차례가 아니에요',
  WRONG_PHASE: '지금은 할 수 없어요',
  NO_TILE: '그 색 타일이 더미에 없어요',
  BAD_TARGET: '그 타일은 고를 수 없어요',
  NEED_GUESS: '한 번은 추리해야 해요',
};

const shuffle = <T>(a: T[]) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const sortRow = (row: number[]) => [...row].sort((a, b) => key(a) - key(b));

export function newGame(players: { name: string; bot: boolean }[]): State {
  const pile = shuffle([...Array(24).keys()]);
  const each = players.length >= 4 ? 3 : 4;
  return {
    players: players.map((p) => ({ ...p, row: sortRow(pile.splice(0, each)), out: false })),
    pile,
    open: [],
    misses: {},
    turn: Math.floor(Math.random() * players.length),
    phase: { k: 'draw' },
    winner: null,
    last: null,
    log: ['게임 시작! 타일을 한 장 뽑고 추리하세요'],
    n: 0,
  };
}

export const isOpen = (s: State, t: number) => s.open.includes(t);
export const hiddenLeft = (s: State, p: number) => s.players[p].row.filter((t) => !isOpen(s, t)).length;
export const pileCount = (s: State, c: Color) => s.pile.filter((t) => color(t) === c).length;
export const alive = (s: State) => s.players.flatMap((p, i) => (p.out ? [] : [i]));

const clone = (s: State): State => structuredClone(s);
const say = (s: State, m: string) => {
  s.log = [...s.log.slice(-30), m];
};

/** 줄 안에 타일을 넣고 그 자리를 돌려준다 */
function insert(p: PlayerState, t: number) {
  p.row = sortRow([...p.row, t]);
}

/** 모든 타일이 공개된 사람은 탈락, 한 명 남으면 끝 */
function settle(s: State) {
  s.players.forEach((p, i) => {
    // 차례인 사람이 뽑아 둔 타일은 아직 숨은 타일이라 살아 있다
    const holding = i === s.turn && s.phase.k === 'guess' && s.phase.drawn !== null;
    if (!p.out && !holding && p.row.length > 0 && p.row.every((t) => isOpen(s, t))) {
      p.out = true;
      say(s, `💥 ${p.name} 탈락!`);
    }
  });
  const left = alive(s);
  if (left.length === 1) {
    if (s.phase.k === 'guess' && s.phase.drawn !== null) insert(s.players[s.turn], s.phase.drawn);
    s.winner = left[0];
    s.phase = { k: 'over' };
    say(s, `🏆 ${s.players[left[0]].name} 승리!`);
    return true;
  }
  return false;
}

function nextTurn(s: State) {
  const n = s.players.length;
  for (let k = 1; k <= n; k++) {
    const p = (s.turn + k) % n;
    if (!s.players[p].out) {
      s.turn = p;
      break;
    }
  }
  s.phase = { k: 'draw' };
  if (s.pile.length === 0) s.phase = { k: 'guess', drawn: null, streak: 0 };
}

export function apply(prev: State, p: number, a: Action): State | string {
  if (prev.phase.k === 'over') return 'WRONG_PHASE';
  if (p !== prev.turn) return 'NOT_YOUR_TURN';
  const s = clone(prev);
  const me = s.players[p];
  const ph = s.phase;

  switch (a.t) {
    case 'draw': {
      if (ph.k !== 'draw') return 'WRONG_PHASE';
      const i = s.pile.findIndex((t) => color(t) === a.c);
      if (i < 0) return 'NO_TILE';
      const [t] = s.pile.splice(i, 1);
      s.phase = { k: 'guess', drawn: t, streak: 0 };
      say(s, `${me.name}: ${a.c === 'b' ? '⬛' : '⬜'} 타일을 뽑았어요`);
      break;
    }
    case 'guess': {
      if (ph.k !== 'guess') return 'WRONG_PHASE';
      const target = s.players[a.target];
      if (!target || a.target === p || target.out) return 'BAD_TARGET';
      const t = target.row[a.idx];
      if (t === undefined || isOpen(s, t) || a.n < 0 || a.n > 11) return 'BAD_TARGET';
      const label = `${target.name}의 ${color(t) === 'b' ? '⬛' : '⬜'}${a.idx + 1}번째`;
      if (num(t) === a.n) {
        s.open.push(t);
        s.last = { t: 'hit', by: p, target: a.target, tile: t, guess: a.n, n: s.n + 1 };
        say(s, `🎯 ${me.name}: ${label} = ${a.n} 정답!`);
        s.phase = { k: 'guess', drawn: ph.drawn, streak: ph.streak + 1 };
        settle(s);
      } else {
        s.misses[t] = [...(s.misses[t] ?? []), a.n];
        s.last = { t: 'miss', by: p, target: a.target, tile: t, guess: a.n, n: s.n + 1 };
        say(s, `❌ ${me.name}: ${label} ≠ ${a.n}`);
        if (ph.drawn !== null) {
          insert(me, ph.drawn);
          s.open.push(ph.drawn);
          say(s, `${me.name}의 새 타일 ${num(ph.drawn)} 공개`);
          s.phase = { k: 'draw' }; // 뽑은 타일을 줄에 붙였으니 탈락 검사 대상
          if (!settle(s)) nextTurn(s);
        } else if (hiddenLeft(s, p) > 0) {
          s.phase = { k: 'reveal' };
        } else if (!settle(s)) nextTurn(s);
      }
      break;
    }
    case 'stop': {
      if (ph.k !== 'guess') return 'WRONG_PHASE';
      if (ph.streak === 0) return 'NEED_GUESS';
      if (ph.drawn !== null) {
        insert(me, ph.drawn);
        s.last = { t: 'place', by: p, tile: ph.drawn, open: false, n: s.n + 1 };
      }
      say(s, `✋ ${me.name} 멈춤`);
      nextTurn(s);
      break;
    }
    case 'reveal': {
      if (ph.k !== 'reveal') return 'WRONG_PHASE';
      const t = me.row[a.idx];
      if (t === undefined || isOpen(s, t)) return 'BAD_TARGET';
      s.open.push(t);
      s.last = { t: 'reveal', by: p, tile: t, n: s.n + 1 };
      say(s, `${me.name}: 자기 타일 ${num(t)} 공개`);
      if (!settle(s)) nextTurn(s);
      break;
    }
  }
  s.n++;
  return s;
}

/**
 * 관찰자 p 가 아는 정보로, target 줄의 각 숨은 자리에 올 수 있는 숫자 후보.
 * (색·정렬 순서·이미 본 타일·틀렸던 추리로 좁힌다. 공개된 자리는 빈 배열)
 */
export function candidates(s: State, p: number, target: number, drawn: number | null = null): number[][] {
  const row = s.players[target].row;
  const seen = new Set<number>([...s.open, ...(p >= 0 ? s.players[p].row : []), ...(drawn !== null ? [drawn] : [])]);
  const opts = row.map((t) => {
    if (isOpen(s, t)) return [key(t)];
    const c = color(t);
    const miss = s.misses[t] ?? [];
    return Array.from({ length: 12 }, (_, n) => tileOf(c, n))
      .filter((x) => !seen.has(x) && !miss.includes(num(x)))
      .map(key);
  });
  // 정렬 순서로 앞뒤 범위 좁히기
  const lo: number[] = [];
  const hi: number[] = [];
  opts.forEach((o, i) => {
    const min = i ? lo[i - 1] : -1;
    lo[i] = Math.min(...o.filter((k) => k > min), Infinity);
  });
  for (let i = opts.length - 1; i >= 0; i--) {
    const max = i < opts.length - 1 ? hi[i + 1] : Infinity;
    hi[i] = Math.max(...opts[i].filter((k) => k < max), -Infinity);
  }
  return row.map((t, i) => (isOpen(s, t) ? [] : opts[i].filter((k) => k >= lo[i] && k <= hi[i]).map((k) => k >> 1)));
}
