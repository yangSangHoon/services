import type { Save } from '../store';

/** 업적 배지 — 조건은 저장 상태만 보고 판정한다 */
export interface Badge {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  test: (s: Save) => boolean;
}

const correctCount = (s: Save) => Object.values(s.answers).filter((a) => a.correct > 0).length;

export const BADGES: Badge[] = [
  { id: 'first-lesson', emoji: '📖', name: '첫 페이지', desc: '레슨 1개 완독', test: (s) => s.lessonsRead.length >= 1 },
  { id: 'bookworm', emoji: '🐛', name: '책벌레', desc: '레슨 20개 완독', test: (s) => s.lessonsRead.length >= 20 },
  { id: 'first-correct', emoji: '✅', name: '첫 정답', desc: '문제 1개 정답', test: (s) => correctCount(s) >= 1 },
  { id: 'solver-50', emoji: '🧠', name: '문제 사냥꾼', desc: '서로 다른 문제 50개 정답', test: (s) => correctCount(s) >= 50 },
  { id: 'solver-150', emoji: '🦉', name: '척척박사', desc: '서로 다른 문제 150개 정답', test: (s) => correctCount(s) >= 150 },
  { id: 'combo-10', emoji: '🔥', name: '10연속 정답', desc: '한 번에 10문제 연속 정답', test: (s) => s.bestCombo >= 10 },
  { id: 'sql-first', emoji: '🗄️', name: '첫 쿼리', desc: 'SQL 미션 1개 해결', test: (s) => s.sqlSolved.length >= 1 },
  { id: 'sql-10', emoji: '🐬', name: 'SQL 장인', desc: 'SQL 미션 10개 해결', test: (s) => s.sqlSolved.length >= 10 },
  { id: 'perfect-exam', emoji: '💯', name: '만점 승급', desc: '승급 시험 만점', test: (s) => s.perfectExams > 0 },
  { id: 'streak-3', emoji: '📅', name: '작심삼일 돌파', desc: '3일 연속 출석', test: (s) => s.streak.best >= 3 },
  { id: 'streak-7', emoji: '🗓️', name: '일주일 개근', desc: '7일 연속 출석', test: (s) => s.streak.best >= 7 },
  { id: 'note-clear', emoji: '🩹', name: '오답 극복', desc: '오답노트 문제 10개 졸업', test: (s) => s.noteCleared >= 10 },
  { id: 'interview', emoji: '🤝', name: '면접 합격', desc: '모의 기술면접 8점 이상', test: (s) => s.bestInterview >= 8 },
  { id: 'hired', emoji: '🪪', name: '취업 성공', desc: '신입 백엔드(Lv.6) 달성', test: (s) => s.level >= 6 },
  { id: 'senior', emoji: '🌳', name: '시니어', desc: 'Lv.9 달성', test: (s) => s.level >= 9 },
  { id: 'legend', emoji: '🐉', name: '전설', desc: '모든 승급 시험 통과', test: (s) => s.level >= 11 },
  { id: 'shopper', emoji: '🛍️', name: '꾸미기 장인', desc: '상점 아이템 3개 구매', test: (s) => s.purchased >= 3 },
];
