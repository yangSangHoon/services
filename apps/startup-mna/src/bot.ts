import {
  BUY_MAX,
  COS,
  LOOSE,
  actor,
  bank,
  bonuses,
  neighbors,
  playable,
  price,
  sizes,
  type Action,
  type State,
} from './game';

/** 이 회사에서 내가 최대주주를 노릴 만한지 (높을수록 좋다) */
function stake(g: State, p: number, co: number) {
  const mine = g.players[p].shares[co];
  const best = Math.max(...g.players.map((q, i) => (i === p ? 0 : q.shares[co])));
  return mine - best;
}

function scoreTile(g: State, p: number, t: number) {
  const s = sizes(g);
  const cos = new Set<number>();
  let loose = 0;
  for (const nb of neighbors(t)) {
    const v = g.board[nb];
    if (v >= 0) cos.add(v);
    else if (v === LOOSE) loose++;
  }
  const list = [...cos];
  if (!list.length) return loose ? 30 : 1 + Math.random();
  if (list.length === 1) {
    const c = list[0];
    return 5 + stake(g, p, c) * 4 + g.players[p].shares[c];
  }
  // 인수합병: 피인수 회사에서 받을 보너스를 본다
  const max = Math.max(...list.map((c) => s[c]));
  let gain = 0;
  for (const c of list) if (s[c] < max) gain += bonuses(g, c)[p];
  return 10 + gain / 200;
}

function buyPlan(g: State, p: number): number[] {
  const s = sizes(g);
  const me = g.players[p];
  const reserve = 1200;
  let cash = me.cash;
  const left = COS.map((_, c) => bank(g, c));
  const picks: number[] = [];
  const ranked = COS.map((_, c) => c)
    .filter((c) => s[c] > 0)
    .map((c) => {
      const st = stake(g, p, c);
      // 최대주주 경쟁이 가능한 곳, 아직 작아서 성장 여지가 큰 곳을 선호
      const contest = st >= -2 && st <= 3 ? 10 - Math.abs(st - 1) * 2 : st > 3 ? 2 : -5;
      return { c, v: contest + (s[c] < 11 ? 3 : 0) - price(c, s[c]) / 400 + Math.random() };
    })
    .sort((a, b) => b.v - a.v);
  for (const { c, v } of ranked) {
    if (v < 0) break;
    while (picks.length < BUY_MAX && left[c] > 0 && cash - price(c, s[c]) >= reserve) {
      picks.push(c);
      left[c]--;
      cash -= price(c, s[c]);
      if (picks.filter((x) => x === c).length >= 2) break;
    }
  }
  return picks.slice(0, BUY_MAX);
}

export function botAction(g: State, p: number): Action | null {
  if (actor(g) !== p) return null;
  const ph = g.phase;
  switch (ph.k) {
    case 'place': {
      const ok = playable(g, p);
      if (!ok.length) return { t: 'pass' };
      ok.sort((a, b) => scoreTile(g, p, b) - scoreTile(g, p, a));
      return { t: 'place', tile: ok[0] };
    }
    case 'found': {
      const s = sizes(g);
      const free = COS.map((_, c) => c).filter((c) => s[c] === 0);
      // 비싼(딥테크) 회사부터: 보너스가 크다
      free.sort((a, b) => COS[b].tier - COS[a].tier || Math.random() - 0.5);
      return { t: 'found', co: free[0] };
    }
    case 'survivor': {
      const best = [...ph.options].sort((a, b) => g.players[p].shares[b] - g.players[p].shares[a]);
      return { t: 'survivor', co: best[0] };
    }
    case 'merge': {
      const d = ph.queue[0];
      const held = g.players[p].shares[d];
      const s = sizes(g);
      const canTrade = Math.min(Math.floor(held / 2), bank(g, ph.survivor)) * 2;
      // 살아남는 회사 1주가 피인수 회사 2주 값보다 낫거나 엇비슷하면 스왑
      const survivorPrice = price(ph.survivor, s[ph.survivor] + s[d] + 1);
      const trade = survivorPrice >= price(d, s[d]) * 1.6 ? canTrade : 0;
      return { t: 'dispose', sell: held - trade, trade };
    }
    case 'buy':
      return { t: 'buy', cos: buyPlan(g, p) };
    default:
      return null;
  }
}
