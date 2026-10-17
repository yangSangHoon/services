const DAY = 86_400_000;
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

export const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

function partOfDay(h: number) {
  if (h < 5) return '새벽';
  if (h < 12) return '오전';
  if (h < 18) return '오후';
  return '저녁';
}

export function clock(d: Date) {
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${partOfDay(h)} ${h % 12 || 12}:${m}`;
}

export function dateLabel(d: Date, now = new Date()) {
  const diff = Math.round((startOfDay(now) - startOfDay(d)) / DAY);
  if (diff === 0) return '오늘';
  if (diff === 1) return '어제';
  const sameYear = d.getFullYear() === now.getFullYear();
  return `${sameYear ? '' : `${d.getFullYear()}년 `}${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEK[d.getDay()]}요일`;
}

/** 작성 화면 상단: "10월 17일 금요일 · 저녁 8:12" */
export function nowLabel(d: Date) {
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEK[d.getDay()]}요일 · ${clock(d)}`;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "언제 일이었나요" 칩. 누를 때마다 다음 값으로 */
export const WHEN = [
  { label: '지금', ago: 0 },
  { label: '30분 전', ago: 30 * 60_000 },
  { label: '1시간 전', ago: 60 * 60_000 },
  { label: '3시간 전', ago: 3 * 60 * 60_000 },
  { label: '어제', ago: DAY },
] as const;
