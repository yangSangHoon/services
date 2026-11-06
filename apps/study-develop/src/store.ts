import { useSyncExternalStore } from 'react';
import { BADGES } from './data/badges';
import { LEVELS, MAX_LEVEL, RULES, levelMeta } from './data/levels';
import { itemById, type Slot } from './data/shop';
import type { Question } from './content/types';

/** 진행 상황 저장 — localStorage 한 키에 통째로. 서버 없음. */
const KEY = 'study-develop:save:v1';

export interface AnswerRec {
  correct: number;
  wrong: number;
  last: boolean;
}

export interface ExamRec {
  level: number; // 0 = 모의면접
  score: number;
  total: number;
  passed: boolean;
  at: string;
}

export interface Save {
  v: 1;
  name: string;
  avatar: string;
  level: number;
  xp: number; // 현재 레벨에서 모은 XP
  totalXp: number;
  coins: number;
  lessonsRead: string[];
  answers: Record<string, AnswerRec>;
  wrongNote: string[];
  noteCleared: number;
  sqlSolved: string[];
  exams: ExamRec[];
  perfectExams: number;
  bestInterview: number;
  owned: string[];
  purchased: number;
  equipped: Partial<Record<Slot, string>>;
  badges: string[];
  streak: { last: string; count: number; best: number };
  dailyDone: string;
  bestCombo: number;
  pendingRewards: number[];
  pos: { x: number; y: number };
}

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fresh = (): Save => ({
  v: 1,
  name: '',
  avatar: '🧑‍💻',
  level: 1,
  xp: 0,
  totalXp: 0,
  coins: 50,
  lessonsRead: [],
  answers: {},
  wrongNote: [],
  noteCleared: 0,
  sqlSolved: [],
  exams: [],
  perfectExams: 0,
  bestInterview: 0,
  owned: [],
  purchased: 0,
  equipped: {},
  badges: [],
  streak: { last: '', count: 0, best: 0 },
  dailyDone: '',
  bestCombo: 0,
  pendingRewards: [],
  pos: { x: 9, y: 8 },
});

function load(): Save {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...fresh(), ...JSON.parse(raw) };
  } catch {
    /* 사생활 보호 모드 등 — 새로 시작 */
  }
  return fresh();
}

let state: Save = load();
const listeners = new Set<() => void>();

function commit(next: Save) {
  // 새 배지 판정
  const earned = BADGES.filter((b) => !next.badges.includes(b.id) && b.test(next));
  if (earned.length) {
    next = { ...next, badges: [...next.badges, ...earned.map((b) => b.id)] };
    earned.forEach((b) => toast(`${b.emoji} 배지 획득: ${b.name}`, 'badge'));
  }
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* 저장 실패해도 게임은 계속 */
  }
  listeners.forEach((l) => l());
}

export const getSave = () => state;
export function useSave() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

// ───────── 토스트 (+XP, 배지 등)

export interface Toast {
  id: number;
  text: string;
  kind: 'xp' | 'coin' | 'badge' | 'info' | 'level';
}
let toasts: Toast[] = [];
const toastListeners = new Set<() => void>();
let toastSeq = 0;
export function toast(text: string, kind: Toast['kind'] = 'info') {
  const t = { id: ++toastSeq, text, kind };
  toasts = [...toasts, t].slice(-4);
  toastListeners.forEach((l) => l());
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== t.id);
    toastListeners.forEach((l) => l());
  }, 2600);
}
export function useToasts() {
  return useSyncExternalStore(
    (l) => {
      toastListeners.add(l);
      return () => toastListeners.delete(l);
    },
    () => toasts,
  );
}

// ───────── 액션

function gain(s: Save, xp: number, coins = 0): Save {
  if (xp) toast(`+${xp} XP`, 'xp');
  if (coins) toast(`+${coins} 🪙`, 'coin');
  return { ...s, xp: s.xp + xp, totalXp: s.totalXp + xp, coins: s.coins + coins };
}

export const examReady = (s: Save) => s.level < MAX_LEVEL && s.xp >= levelMeta(s.level).xpToExam;

export function setProfile(name: string, avatar: string) {
  commit({ ...state, name: name.trim().slice(0, 12) || '익명의 개발자', avatar });
}

export function setPos(x: number, y: number) {
  state = { ...state, pos: { x, y } };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* noop */
  }
}

/** 접속 시 출석 체크 — 연속 출석 스트릭 */
export function checkIn() {
  const t = today();
  if (state.streak.last === t) return;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
  const count = state.streak.last === yesterday ? state.streak.count + 1 : 1;
  commit({ ...state, streak: { last: t, count, best: Math.max(state.streak.best, count) } });
  if (count > 1) toast(`📅 ${count}일 연속 출석!`, 'info');
}

export function readLesson(id: string) {
  if (state.lessonsRead.includes(id)) return;
  commit(gain({ ...state, lessonsRead: [...state.lessonsRead, id] }, RULES.lessonXp));
}

let combo = 0;
export const getCombo = () => combo;

/** 문제 풀이 기록. mode='note' 이면 오답노트 복습(맞히면 노트에서 졸업) */
export function recordAnswer(q: Question, correct: boolean, mode: 'practice' | 'exam' | 'note' | 'daily' | 'interview') {
  const prev = state.answers[q.id] ?? { correct: 0, wrong: 0, last: false };
  const rec: AnswerRec = { correct: prev.correct + (correct ? 1 : 0), wrong: prev.wrong + (correct ? 0 : 1), last: correct };
  let s: Save = { ...state, answers: { ...state.answers, [q.id]: rec } };
  combo = correct ? combo + 1 : 0;
  if (combo > s.bestCombo) s.bestCombo = combo;
  if (correct) {
    let xp = prev.correct === 0 ? RULES.quizFirstCorrectXp : RULES.quizRepeatXp;
    if (mode === 'note' && s.wrongNote.includes(q.id)) {
      s = { ...s, wrongNote: s.wrongNote.filter((id) => id !== q.id), noteCleared: s.noteCleared + 1 };
      xp += RULES.wrongNoteClearXp;
    }
    if (combo > 0 && combo % 5 === 0) toast(`🔥 ${combo}연속 정답!`, 'info');
    s = gain(s, xp, RULES.correctCoins);
  } else if (!s.wrongNote.includes(q.id)) {
    s = { ...s, wrongNote: [...s.wrongNote, q.id] };
  }
  commit(s);
}

export function solveSql(id: string) {
  if (state.sqlSolved.includes(id)) {
    commit(gain(state, RULES.quizRepeatXp));
    return;
  }
  commit(gain({ ...state, sqlSolved: [...state.sqlSolved, id] }, RULES.sqlMissionXp, RULES.sqlMissionCoins));
}

/** 승급 시험 결과. 통과하면 레벨업 + 보상함에 보상 적립 */
export function finishExam(level: number, score: number, total: number): boolean {
  const passed = score / total >= RULES.examPassRate;
  let s: Save = { ...state, exams: [...state.exams, { level, score, total, passed, at: today() }] };
  if (passed && level === s.level) {
    s = { ...s, level: s.level + 1, xp: 0, pendingRewards: [...s.pendingRewards, level] };
    if (score === total) s.perfectExams += 1;
  }
  commit(s);
  return passed;
}

export function finishInterview(score: number, total: number) {
  commit({
    ...state,
    bestInterview: Math.max(state.bestInterview, score),
    exams: [...state.exams, { level: 0, score, total, passed: score >= 8, at: today() }],
  });
}

export function finishDaily() {
  if (state.dailyDone === today()) return;
  commit(gain({ ...state, dailyDone: today() }, RULES.dailyBonusXp, RULES.dailyBonusCoins));
}

export function claimReward(level: number) {
  if (!state.pendingRewards.includes(level)) return;
  const r = LEVELS[level - 1].reward;
  const owned = r.item && !state.owned.includes(r.item) ? [...state.owned, r.item] : state.owned;
  const item = r.item ? itemById(r.item) : undefined;
  const equipped = item && !state.equipped[item.slot] ? { ...state.equipped, [item.slot]: item.id } : state.equipped;
  commit({ ...state, coins: state.coins + r.coins, owned, equipped, pendingRewards: state.pendingRewards.filter((l) => l !== level) });
}

export function buy(id: string): string | null {
  const item = itemById(id);
  if (!item || item.price <= 0) return '살 수 없는 아이템이에요';
  if (state.owned.includes(id)) return '이미 가지고 있어요';
  if (state.level < item.minLevel) return `Lv.${item.minLevel} 부터 살 수 있어요`;
  if (state.coins < item.price) return '코인이 부족해요';
  commit({
    ...state,
    coins: state.coins - item.price,
    owned: [...state.owned, id],
    purchased: state.purchased + 1,
    equipped: { ...state.equipped, [item.slot]: id },
  });
  toast(`${item.emoji} ${item.name} 구매!`, 'info');
  return null;
}

export function equip(slot: Slot, id: string | null) {
  const equipped = { ...state.equipped };
  if (id) equipped[slot] = id;
  else delete equipped[slot];
  commit({ ...state, equipped });
}

export function resetAll() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
  state = fresh();
  combo = 0;
  listeners.forEach((l) => l());
}

/** 개발용: 콘솔에서 window.__sd 로 상태 조작 */
if (import.meta.env.DEV) {
  (window as unknown as { __sd: unknown }).__sd = {
    get: () => state,
    set: (patch: Partial<Save>) => commit({ ...state, ...patch }),
  };
}
