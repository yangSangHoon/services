export const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/** 로컬(한국) 날짜 → YYYY-MM-DD */
export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const today = () => ymd(new Date());
export const parseDay = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
export const dayLabel = (s: string) => {
  const d = parseDay(s);
  const diff = Math.round((parseDay(today()).getTime() - d.getTime()) / 86_400_000);
  if (diff === 0) return '오늘';
  if (diff === 1) return '어제';
  return `${d.getMonth() + 1}/${d.getDate()} (${WEEK[d.getDay()]})`;
};
export const weekday = (s: string) => WEEK[parseDay(s).getDay()];

export function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return '방금';
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}일 전`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** 연속 도시락 일수. 주말은 안 싸도 끊기지 않고, 오늘 아직 안 쌌어도 어제까지 이어지면 유지 */
export function streak(days: Set<string>) {
  let n = 0;
  const d = new Date();
  if (!days.has(ymd(d))) d.setDate(d.getDate() - 1);
  for (let i = 0; i < 400; i++) {
    const key = ymd(d);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    if (days.has(key)) n++;
    else if (!weekend) break;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

/** 이번 주 월~금 */
export function weekDays(offset = 0) {
  const d = new Date();
  const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7) + offset * 7);
  return Array.from({ length: 5 }, (_, i) => ymd(new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i)));
}

export const TAGS = ['⏱ 15분컷', '❄️ 식어도 맛있음', '🔥 전자레인지 OK', '🧊 보냉 필요', '🍚 밀프렙', '💪 고단백', '🥗 다이어트', '💸 3천원 이하'];
export const AVATARS = ['🍙', '🍱', '🥪', '🍳', '🥗', '🍜', '🍛', '🥟', '🍤', '🌮', '🐻', '🐰', '🦊', '🐱', '🐶', '🐥'];
const ADJ = ['든든한', '부지런한', '알뜰한', '배고픈', '야무진', '손빠른', '맛있는', '꼼꼼한'];
const NOUN = ['주먹밥', '계란말이', '김밥', '유부초밥', '볶음밥', '샌드위치', '도시락통', '젓가락'];
export const randomNick = () => `${ADJ[Math.floor(Math.random() * ADJ.length)]} ${NOUN[Math.floor(Math.random() * NOUN.length)]}`;
