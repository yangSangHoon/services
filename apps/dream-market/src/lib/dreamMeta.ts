import type { DreamKind, Honesty } from './types';

interface KindMeta {
  emoji: string;
  label: string;
  tint: string;
}

// 종류마다 파스텔 스티커 타일 색 (디자인 가이드)
export const KINDS: Record<DreamKind, KindMeta> = {
  dragon: { emoji: '🐉', label: '용꿈', tint: '#d4f3e6' },
  pig: { emoji: '🐷', label: '돼지꿈', tint: '#ffe0ec' },
  poop: { emoji: '💩', label: '똥꿈', tint: '#ffe6d1' },
  baby: { emoji: '👶', label: '태몽', tint: '#fff1c2' },
  love: { emoji: '💘', label: '연애꿈', tint: '#ffd6e6' },
  nightmare: { emoji: '👻', label: '악몽', tint: '#e3dbff' },
  dog: { emoji: '🐶', label: '개꿈', tint: '#d6ebff' },
};

export const KIND_KEYS = Object.keys(KINDS) as DreamKind[];

const NO_KIND: KindMeta = { emoji: '💭', label: '기타', tint: '#efe9ff' };

/** 종류를 고르지 않은 꿈은 '기타' */
export const kindMeta = (kind: DreamKind | null) => (kind ? KINDS[kind] : NO_KIND);

export const HONESTY: Record<Honesty, { emoji: string; label: string; tint: string }> = {
  real: { emoji: '😇', label: '진짜 꿨어요', tint: '#d4f3e6' },
  half: { emoji: '🤔', label: '반쯤 진짜', tint: '#fff1c2' },
  fake: { emoji: '🤥', label: '완전 지어냄', tint: '#ffe0ec' },
};

const FORTUNES = [
  '오늘 점심 메뉴 선택에 실패하지 않습니다.',
  '지갑을 두고 나왔다가 무사히 되찾습니다.',
  '3일 안에 모르는 사람에게 칭찬을 듣습니다.',
  '엘리베이터가 딱 맞춰 도착합니다.',
  '오랜만에 연락 온 친구가 밥을 삽니다.',
  '이번 주 로또는… 조용히 넘어가세요.',
  '퇴근길 신호등이 전부 초록불입니다.',
  '베개가 평소보다 폭신하게 느껴집니다.',
  '택배가 예상보다 하루 빨리 도착합니다.',
  '이 꿈을 산 사실을 3명에게 말하면 효과 2배 (근거 없음).',
  '월요일이 조금 덜 월요일 같을 예정입니다.',
  '주머니 속 잊고 있던 지폐를 발견할 운명입니다.',
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** 꿈마다 항상 같은 해몽이 나오도록 id로 고정. 행운 지수는 40~99% */
export function interpret(dreamId: string) {
  const h = hash(dreamId);
  return { fortune: FORTUNES[h % FORTUNES.length], luck: 40 + (h % 60) };
}

const ADJECTIVES = ['잠꼬대하는', '베개 뺏긴', '코 고는', '이불 차는', '늦잠 자는', '알람 끄는', '침 흘리는', '뒤척이는', '몽유병 걸린', '꿈속을 걷는'];
const NOUNS = ['양', '햄스터', '고래', '수달', '판다', '너구리', '부엉이', '나무늘보', '토끼', '고양이'];

export function randomNickname() {
  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
  return `${pick(ADJECTIVES)} ${pick(NOUNS)}`;
}
