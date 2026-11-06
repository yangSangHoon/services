/** 작은 유틸 — 셔플, 날짜 시드 랜덤, 문제 고르기 */
import type { Question } from './content/types';
import type { Save } from './store';

export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const hashStr = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 연습용: 안 푼 문제 → 틀린 문제 → 맞힌 문제 순으로 우선 */
export function pickPractice(pool: Question[], save: Save, n: number): Question[] {
  const score = (q: Question) => {
    const a = save.answers[q.id];
    if (!a) return 0;
    if (!a.last) return 1;
    return 2;
  };
  const groups = [0, 1, 2].map((k) => shuffle(pool.filter((q) => score(q) === k)));
  return groups.flat().slice(0, n);
}

export const pct = (a: number, b: number) => (b <= 0 ? 0 : Math.round((a / b) * 100));
