import { FOODS, RULES, type Food, type Rule, type Verdict } from './data';

export const FOOD_BY_ID = new Map(FOODS.map((f) => [f.id, f]));

// ───────── 검색 (부분 일치 + 초성)

const CHOSUNG = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const toChosung = (s: string) =>
  [...s].map((ch) => {
    const code = ch.charCodeAt(0) - 0xac00;
    return code >= 0 && code < 11172 ? CHOSUNG[Math.floor(code / 588)] : ch;
  }).join('');
const isChosungOnly = (s: string) => /^[ㄱ-ㅎ]+$/.test(s);
const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();

export function searchFoods(query: string): Food[] {
  const q = norm(query);
  if (!q) return [];
  const names = (f: Food) => [f.name, ...(f.aliases ?? [])].map(norm);
  const score = (f: Food) => {
    const ns = names(f);
    if (ns.some((n) => n === q)) return 0;
    if (ns.some((n) => n.startsWith(q))) return 1;
    if (ns.some((n) => n.includes(q))) return 2;
    if (isChosungOnly(q) && ns.some((n) => toChosung(n).includes(q))) return 3;
    return -1;
  };
  return FOODS.map((f) => [f, score(f)] as const)
    .filter(([, s]) => s >= 0)
    .sort((a, b) => a[1] - b[1] || a[0].name.localeCompare(b[0].name))
    .map(([f]) => f);
}

// ───────── 궁합 판정

const matches = (side: string, food: Food) =>
  side.startsWith('#') ? Boolean(food.tags?.includes(side.slice(1))) : side === food.id;

export type PairResult = { a: Food; b: Food; rule: Rule };

/** 두 음식 사이에 걸리는 규칙들 */
export function rulesBetween(x: Food, y: Food): Rule[] {
  return RULES.filter((r) => (matches(r.a, x) && matches(r.b, y)) || (matches(r.a, y) && matches(r.b, x)));
}

const ORDER: Record<Verdict, number> = { bad: 0, good: 1, myth: 2 };

/** 담은 음식 전체에서 모든 쌍의 궁합. 주의 → 찰떡 → 속설 순 */
export function evaluate(foods: Food[]): PairResult[] {
  const out: PairResult[] = [];
  for (let i = 0; i < foods.length; i++)
    for (let j = i + 1; j < foods.length; j++)
      for (const rule of rulesBetween(foods[i], foods[j])) out.push({ a: foods[i], b: foods[j], rule });
  return out.sort((p, q) => ORDER[p.rule.verdict] - ORDER[q.rule.verdict]);
}

/** 이 음식과 궁합 정보가 있는 다른 음식 수 (검색 결과 뱃지용) */
export function partnerCount(food: Food) {
  return FOODS.filter((f) => f.id !== food.id && rulesBetween(food, f).length > 0).length;
}

/** 담은 음식 중 이 음식과 걸리는 판정 (검색 결과에서 미리 보여주기용) */
export function previewWith(food: Food, table: Food[]): Verdict | null {
  const verdicts = table.filter((t) => t.id !== food.id).flatMap((t) => rulesBetween(food, t).map((r) => r.verdict));
  if (!verdicts.length) return null;
  return verdicts.sort((a, b) => ORDER[a] - ORDER[b])[0];
}
