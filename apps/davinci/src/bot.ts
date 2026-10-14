import { candidates, pileCount, type Action, type State } from './game';

/** 봇 한 수. 차례가 아니면 null */
export function botAction(s: State, p: number, rand = Math.random): Action | null {
  if (s.turn !== p || s.phase.k === 'over') return null;
  const me = s.players[p];

  if (s.phase.k === 'draw') {
    const b = pileCount(s, 'b');
    const w = pileCount(s, 'w');
    return { t: 'draw', c: rand() * (b + w) < b ? 'b' : 'w' };
  }

  if (s.phase.k === 'reveal') {
    // 공개해도 덜 아까운 것: 후보가 이미 적은(남들이 곧 맞힐) 타일
    const opts = candidates(s, -1, p);
    let best = -1;
    me.row.forEach((t, i) => {
      if (s.open.includes(t)) return;
      if (best < 0 || opts[i].length < opts[best].length) best = i;
    });
    return { t: 'reveal', idx: best };
  }

  // 추리: 후보가 가장 적은 숨은 타일을 노린다
  const drawn = s.phase.drawn;
  let pick: { target: number; idx: number; opts: number[] } | null = null;
  s.players.forEach((o, target) => {
    if (target === p || o.out) return;
    candidates(s, p, target, drawn).forEach((opts, idx) => {
      if (!opts.length) return;
      if (!pick || opts.length < pick.opts.length || (opts.length === pick.opts.length && rand() < 0.3)) pick = { target, idx, opts };
    });
  });
  if (!pick) return s.phase.streak > 0 ? { t: 'stop' } : null;
  const { target, idx, opts } = pick as { target: number; idx: number; opts: number[] };

  // 이미 하나 맞혔으면, 확실하거나 꽤 그럴듯할 때만 더 간다
  if (s.phase.streak > 0) {
    const go = opts.length === 1 || (opts.length === 2 && rand() < 0.45) || (opts.length === 3 && rand() < 0.15);
    if (!go) return { t: 'stop' };
  }
  return { t: 'guess', target, idx, n: opts[Math.floor(rand() * opts.length)] };
}
