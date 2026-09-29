import { authErrorMessage } from '@lab/core';

const UNITS = [
  ['조', 1_000_000_000_000],
  ['억', 100_000_000],
  ['만', 10_000],
] as const;

/** 123456789 → "1억 2,345만 6,789" */
export function formatCoins(n: number) {
  let rest = Math.max(0, Math.floor(n));
  if (rest === 0) return '0';
  const parts: string[] = [];
  for (const [unit, value] of UNITS) {
    const q = Math.floor(rest / value);
    if (q) {
      parts.push(`${q.toLocaleString('ko-KR')}${unit}`);
      rest -= q * value;
    }
  }
  if (rest) parts.push(rest.toLocaleString('ko-KR'));
  return parts.join(' ');
}

export function timeAgo(iso: string) {
  const sec = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return '방금';
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}시간 전`;
  return `${Math.floor(sec / 86400)}일 전`;
}

const ERRORS: Record<string, string> = {
  NOT_ENOUGH_COINS: '코인이 부족해요. 꿈은 공짜로 꿀 수 있지만 사는 건 아니에요 💸',
  ALREADY_SOLD: '앗, 한발 늦었어요! 이미 누가 사갔어요 🏃',
  OWN_DREAM: '자기 꿈은 살 수 없어요. 이미 당신 거예요!',
  ALREADY_CLAIMED: '첫 계시는 한 번뿐이에요 🙏',
  DREAM_NOT_FOUND: '꿈이 증발했어요… (판매가 취소됐나 봐요)',
  NO_PROFILE: '닉네임부터 정해 주세요',
  NOT_AUTHENTICATED: '다시 입장해 주세요',
  SIGNUP_REQUIRED: '1억 코인은 회원만 받을 수 있어요 🎁',
  GUEST_FREE_ONLY: '게스트는 무료 나눔만 할 수 있어요. 가입하면 가격을 매길 수 있어요!',
};

export function friendlyError(e: unknown) {
  const auth = authErrorMessage(e);
  if (auth) return auth;
  const msg = (e as { message?: string })?.message ?? String(e);
  const key = Object.keys(ERRORS).find((k) => msg.includes(k));
  return key ? ERRORS[key] : `꿈이 잠깐 깨졌어요: ${msg}`;
}

export function isGoneError(e: unknown) {
  const msg = (e as { message?: string })?.message ?? '';
  return msg.includes('ALREADY_SOLD') || msg.includes('DREAM_NOT_FOUND');
}
