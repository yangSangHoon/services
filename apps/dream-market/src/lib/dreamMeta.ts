import type { DreamKind, Honesty } from './types';

export const KINDS: Record<DreamKind, { emoji: string; label: string; hint: string }> = {
  dragon: { emoji: '🐉', label: '용꿈', hint: '대박의 기운' },
  pig: { emoji: '🐷', label: '돼지꿈', hint: '재물운 상승' },
  poop: { emoji: '💩', label: '똥꿈', hint: '의외로 금전운' },
  baby: { emoji: '👶', label: '태몽', hint: '새로운 시작' },
  love: { emoji: '💘', label: '연애꿈', hint: '두근두근' },
  nightmare: { emoji: '👻', label: '악몽', hint: '액땜용' },
  dog: { emoji: '🐶', label: '개꿈', hint: '아무 의미 없음' },
};

export const KIND_KEYS = Object.keys(KINDS) as DreamKind[];

export const HONESTY: Record<Honesty, { emoji: string; label: string }> = {
  real: { emoji: '😇', label: '진짜 꿨어요' },
  half: { emoji: '🤔', label: '반쯤 진짜' },
  fake: { emoji: '🤥', label: '완전 지어냄' },
};

const FORTUNES = [
  '3일 안에 길에서 동전을 주울 확률이 0.3% 상승합니다.',
  '오늘 점심 메뉴 선택에 실패하지 않습니다.',
  '누군가 당신을 몰래 좋아하고 있을지도… 아닐 수도.',
  '이 꿈을 산 사실을 3명에게 말하면 효과 2배 (근거 없음).',
  '잠들기 전 물 한 잔이 행운을 부릅니다. 화장실은 책임 못 집니다.',
  '유통기한이 살짝 지났지만 아직 먹을 만한 꿈입니다.',
  '판매자의 기운이 너무 강해 약간의 부작용(졸림)이 예상됩니다.',
  '이번 주 엘리베이터가 당신을 기다려 줄 것입니다.',
  '택배가 예상보다 하루 빨리 도착합니다.',
  '이 꿈의 효력은 당신이 믿는 만큼입니다.',
  '월요일이 조금 덜 월요일 같을 예정입니다.',
  '주머니 속 잊고 있던 지폐를 발견할 운명입니다.',
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** 꿈마다 항상 같은 해몽이 나오도록 id로 고정 */
export function interpret(dreamId: string) {
  const h = hash(dreamId);
  return { fortune: FORTUNES[h % FORTUNES.length], luck: h % 101 };
}

const ADJECTIVES = ['졸린', '몽유병', '잠꼬대하는', '베개 뺏긴', '늦잠 자는', '꿈꾸는', '코 고는', '뒤척이는'];
const NOUNS = ['판다', '고양이', '너구리', '수달', '부엉이', '햄스터', '나무늘보', '양 세는 양'];

export function randomNickname() {
  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
  return `${pick(ADJECTIVES)} ${pick(NOUNS)}`;
}
