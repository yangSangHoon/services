/** 메타버스 캠퍼스 맵 — 타일 좌표계(열 x, 행 y) */
export type RoomId = 'study' | 'exam' | 'office' | 'cafe' | 'roadmap' | 'reward' | 'shop' | 'home';

export interface Place {
  id: RoomId;
  name: string;
  emoji: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  desc: string;
}

export const COLS = 20;
export const ROWS = 14;
export const START = { x: 9, y: 7 };

export const PLACES: Place[] = [
  { id: 'study', name: '공부방', emoji: '📚', x: 1, y: 1, w: 4, h: 3, color: '#5b7cfa', desc: '개념 카드 · 오답노트' },
  { id: 'exam', name: '시험장', emoji: '📝', x: 8, y: 1, w: 4, h: 3, color: '#f2704e', desc: '연습 · 승급 시험 · 모의면접' },
  { id: 'office', name: '실무실', emoji: '💻', x: 15, y: 1, w: 4, h: 3, color: '#22a06b', desc: 'SQL 미션 · 실무 퀴즈' },
  { id: 'cafe', name: '자바 카페', emoji: '☕', x: 1, y: 8, w: 3, h: 2, color: '#a0703c', desc: '오늘의 퀴즈' },
  { id: 'roadmap', name: '로드맵', emoji: '🗺️', x: 5, y: 9, w: 2, h: 2, color: '#7c5cd6', desc: '전체 레벨 과정' },
  { id: 'reward', name: '보상함', emoji: '🎁', x: 9, y: 9, w: 2, h: 2, color: '#e0a100', desc: '승급 보상 받기' },
  { id: 'shop', name: '굿즈샵', emoji: '🛍️', x: 12, y: 8, w: 3, h: 2, color: '#d6457a', desc: '아바타 꾸미기' },
  { id: 'home', name: '내 방', emoji: '🏠', x: 16, y: 8, w: 3, h: 2, color: '#4a8fa8', desc: '프로필 · 배지 · 통계' },
];

export const doorOf = (p: Place) => ({ x: p.x + Math.floor(p.w / 2), y: p.y + p.h });

/** 막힌 장식(나무·분수) */
export const DECOR: { x: number; y: number; emoji: string; block: boolean }[] = [
  { x: 6, y: 1, emoji: '🌳', block: true },
  { x: 6, y: 3, emoji: '🌲', block: true },
  { x: 13, y: 1, emoji: '🌳', block: true },
  { x: 13, y: 3, emoji: '🌲', block: true },
  { x: 15, y: 6, emoji: '⛲', block: true },
  { x: 4, y: 6, emoji: '🌳', block: true },
  { x: 1, y: 12, emoji: '🌲', block: true },
  { x: 18, y: 12, emoji: '🌳', block: true },
  { x: 7, y: 12, emoji: '🌷', block: false },
  { x: 12, y: 12, emoji: '🌼', block: false },
  { x: 2, y: 5, emoji: '🌷', block: false },
  { x: 17, y: 5, emoji: '🌼', block: false },
  { x: 11, y: 6, emoji: '🪧', block: true },
];

export interface Npc {
  id: string;
  name: string;
  emoji: string;
  x: number;
  y: number;
  wander: boolean;
  lines: string[];
}

export const MENTOR = { id: 'mentor', name: '김멘토', emoji: '🧑‍🏫', x: 7, y: 6 };

/** 돌아다니는 다른 '학생'들 — 메타버스 분위기용 */
export const WANDERERS: Npc[] = [
  { id: 'w1', name: '코린이', emoji: '🧑‍🎓', x: 3, y: 11, wander: true, lines: ['NullPointerException 또 났다…', '== 랑 equals 헷갈려 ㅠ', '오늘은 스트림 정복한다!'] },
  { id: 'w2', name: '자바왕', emoji: '🦸', x: 14, y: 11, wander: true, lines: ['N+1 잡았다 ㅋㅋ', 'final 은 재할당만 막아요', '@Transactional 은 프록시!'] },
  { id: 'w3', name: '야근요정', emoji: '🧚', x: 17, y: 5, wander: true, lines: ['금요일 배포는 참아요…', '로그에 개인정보 찍지 마요', 'git push -f 는 신중하게'] },
  { id: 'cat', name: '서버고양이', emoji: '🐈‍⬛', x: 10, y: 12, wander: true, lines: ['냐옹 (200 OK)', '냥 (404 Not Found)', '골골 (GC 중)'] },
];

export const SIGN = { x: 11, y: 6, text: '🪧 자바 캠퍼스 — 건물 앞 문(🚪)으로 들어가세요. 화면을 탭하면 그곳으로 걸어가요.' };

/** 걷기 가능 여부 */
export function buildGrid(): boolean[][] {
  const g = Array.from({ length: ROWS }, (_, y) => Array.from({ length: COLS }, (_, x) => x > 0 && y > 0 && x < COLS - 1 && y < ROWS - 1));
  for (const p of PLACES) for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) g[y][x] = false;
  for (const d of DECOR) if (d.block) g[d.y][d.x] = false;
  g[MENTOR.y][MENTOR.x] = false;
  return g;
}

/** BFS 최단 경로 (시작 제외, 도착 포함) */
export function findPath(grid: boolean[][], from: { x: number; y: number }, to: { x: number; y: number }) {
  if (!grid[to.y]?.[to.x]) return null;
  const key = (x: number, y: number) => y * COLS + x;
  const prev = new Map<number, number>();
  const q = [from];
  prev.set(key(from.x, from.y), -1);
  while (q.length) {
    const c = q.shift()!;
    if (c.x === to.x && c.y === to.y) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = c.x + dx;
      const ny = c.y + dy;
      if (!grid[ny]?.[nx] || prev.has(key(nx, ny))) continue;
      prev.set(key(nx, ny), key(c.x, c.y));
      q.push({ x: nx, y: ny });
    }
  }
  if (!prev.has(key(to.x, to.y))) return null;
  const path: { x: number; y: number }[] = [];
  let k = key(to.x, to.y);
  while (k !== key(from.x, from.y)) {
    path.unshift({ x: k % COLS, y: Math.floor(k / COLS) });
    k = prev.get(k)!;
  }
  return path;
}
