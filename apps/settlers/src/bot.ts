import { MAP } from './map';
import {
  COST,
  PIECES,
  RES,
  apply,
  emptyHand,
  handSize,
  legalCities,
  legalRoads,
  legalSettles,
  owner,
  pips,
  piecesUsed,
  ratios,
  robberVictims,
  totalVp,
  type Action,
  type Hand,
  type Res,
  type State,
} from './game';

/**
 * 간단한 봇. 욕심껏 짓고, 모자라면 은행과 바꾸고, 길은 좋은 빈 땅 쪽으로 낸다.
 * 사람이 이기기 어렵지 않은 정도로만.
 */

/** 꼭짓점 가치: 닿은 땅의 확률 합 + 처음 보는 자원이면 가산 */
function spotValue(s: State, v: number, p: number) {
  const mine = new Set<Res>();
  s.build.forEach((b, u) => {
    if (owner(b) === p) for (const h of MAP.vertices[u].hexes) if (s.terrain[h] !== 'desert') mine.add(s.terrain[h] as Res);
  });
  let val = 0;
  for (const h of MAP.vertices[v].hexes) {
    const t = s.terrain[h];
    if (t === 'desert') continue;
    val += pips(s.nums[h]) * (h === s.robber ? 0.4 : 1);
    if (!mine.has(t)) val += 1.5;
    if (t === 'wheat' || t === 'ore') val += 0.3;
  }
  return val;
}

const best = <T,>(xs: T[], f: (x: T) => number) => xs.reduce<T | undefined>((m, x) => (m === undefined || f(x) > f(m) ? x : m), undefined);

const affordable = (h: Hand, c: Partial<Hand>) => RES.every((r) => h[r] >= (c[r] ?? 0));

/** 길 하나를 놓으면 닿게 되는 가장 좋은 빈 꼭짓점 가치 */
function roadValue(s: State, p: number, e: number) {
  const { a, b } = MAP.edges[e];
  let v = 0;
  for (const end of [a, b]) {
    if (owner(s.build[end]) === p) continue;
    const near = [end, ...MAP.vertices[end].adj];
    for (const u of near) {
      if (s.build[u] >= 0 || MAP.vertices[u].adj.some((w) => s.build[w] >= 0)) continue;
      v = Math.max(v, spotValue(s, u, p) - (u === end ? 0 : 1));
    }
  }
  return v + Math.random() * 0.3;
}

/** 목표 비용을 맞추려고 남는 자원을 은행에 바꿀 거래 하나 */
function bankFor(s: State, p: number, goal: Partial<Hand>): Action | null {
  const h = s.players[p].hand;
  const k = ratios(s, p);
  const missing = RES.find((r) => h[r] < (goal[r] ?? 0) && s.bank[r] > 0);
  if (!missing) return null;
  const give = RES.find((r) => r !== missing && h[r] - (goal[r] ?? 0) >= k[r]);
  return give ? { t: 'bank', give, get: missing } : null;
}

function discardFor(h: Hand, n: number): Hand {
  const left = { ...h };
  const out = emptyHand();
  for (let i = 0; i < n; i++) {
    const r = RES.reduce((m, x) => (left[x] > left[m] ? x : m), RES[0]);
    left[r]--;
    out[r]++;
  }
  return out;
}

function robberMove(s: State, p: number): Action {
  const leader = (q: number) => totalVp(s, q);
  const hex = best(
    MAP.hexes.map((_, i) => i).filter((i) => i !== s.robber),
    (i) =>
      MAP.hexes[i].v.reduce((n, v) => {
        const o = owner(s.build[v]);
        if (o < 0) return n;
        const w = pips(s.nums[i]) * (s.build[v] & 1 ? 2 : 1);
        return o === p ? n - w * 3 : n + w * (1 + leader(o) * 0.15);
      }, 0) + Math.random() * 0.1,
  )!;
  const victims = robberVictims(s, hex, p);
  const victim = best(victims, (q) => handSize(s.players[q].hand) + leader(q)) ?? null;
  return { t: 'robber', hex, victim };
}

/** 이 봇이 지금 할 행동. 할 게 없으면 null */
export function botAction(s: State, p: number): Action | null {
  const ph = s.phase;
  const me = s.players[p];
  if (ph.k === 'over') return null;

  if (ph.k === 'discard') return ph.need[p] ? { t: 'discard', cards: discardFor(me.hand, ph.need[p]) } : null;

  if (s.offer && s.turn !== p && s.offer.resp[p] === null) {
    const o = s.offer;
    const ok =
      affordable(me.hand, o.get) &&
      handSize(o.give) >= handSize(o.get) &&
      RES.every((r) => !o.get[r] || me.hand[r] - o.get[r] >= 1) &&
      totalVp(s, s.turn) < 8;
    return { t: 'respond', yes: ok };
  }

  if (s.turn !== p) return null;

  if (ph.k === 'setup') {
    if (ph.step === 'settle') return { t: 'settle', v: best(legalSettles(s, p, true), (v) => spotValue(s, v, p) + Math.random() * 0.2)! };
    return { t: 'road', e: best(legalRoads(s, p, ph.v), (e) => roadValue(s, p, e))! };
  }

  // 도적이 내 땅 위에 있으면 굴리기 전에 기사
  const canKnight = !s.devPlayed && me.dev.some((d) => d.k === 'knight' && !d.fresh);
  const robbedMe = MAP.hexes[s.robber].v.some((v) => owner(s.build[v]) === p);

  if (ph.k === 'roll') return canKnight && robbedMe ? { t: 'knight' } : { t: 'roll' };
  if (ph.k === 'robber') return robberMove(s, p);
  if (ph.k === 'roads') {
    const e = best(legalRoads(s, p), (x) => roadValue(s, p, x));
    return e === undefined ? { t: 'endRoads' } : { t: 'road', e };
  }
  if (ph.k !== 'main') return null;

  if (s.offer) return { t: 'cancelOffer' };

  const h = me.hand;
  const used = piecesUsed(s, p);
  const spots = legalSettles(s, p);
  const try_ = (a: Action) => (typeof apply(s, p, a) === 'string' ? null : a);

  // 쓸 수 있는 카드
  if (!s.devPlayed) {
    for (const d of me.dev) {
      if (d.fresh) continue;
      if (d.k === 'knight' && robbedMe) return { t: 'knight' };
      if (d.k === 'road' && legalRoads(s, p).length >= 2) return { t: 'roadCard' };
      if (d.k === 'plenty') {
        const need = RES.filter((r) => h[r] < (COST.city[r] ?? COST.settle[r] ?? 0));
        return { t: 'plenty', a: need[0] ?? 'ore', b: need[1] ?? need[0] ?? 'wheat' };
      }
      if (d.k === 'mono') {
        const r = best([...RES], (x) => s.players.reduce((n, o, i) => (i === p ? n : n + o.hand[x]), 0))!;
        if (s.players.reduce((n, o, i) => (i === p ? n : n + o.hand[r]), 0) >= 3) return { t: 'mono', r };
      }
    }
  }

  if (used.city < PIECES.city && affordable(h, COST.city)) {
    const v = best(legalCities(s, p), (x) => spotValue(s, x, p));
    if (v !== undefined) return { t: 'city', v };
  }
  if (spots.length && used.settle < PIECES.settle && affordable(h, COST.settle)) {
    return { t: 'settle', v: best(spots, (v) => spotValue(s, v, p))! };
  }
  if (!spots.length && used.road < PIECES.road && affordable(h, COST.road)) {
    const e = best(legalRoads(s, p), (x) => roadValue(s, p, x));
    if (e !== undefined) return { t: 'road', e };
  }

  // 목표에 맞춰 은행 거래
  const goal = spots.length && used.settle < PIECES.settle ? COST.settle : legalCities(s, p).length ? COST.city : COST.road;
  const trade = bankFor(s, p, goal);
  if (trade && try_(trade)) return trade;

  if (affordable(h, COST.dev) && s.deck.length && handSize(h) >= 5) return { t: 'buyDev' };
  // 길이 아직 짧으면 하나 더
  if (used.road < 8 && affordable(h, COST.road) && handSize(h) >= 4) {
    const e = best(legalRoads(s, p), (x) => roadValue(s, p, x));
    if (e !== undefined) return { t: 'road', e };
  }
  return { t: 'end' };
}
