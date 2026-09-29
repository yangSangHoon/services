import { authErrorMessage } from '@lab/core';
import type { Reward } from './types';

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
  INVALID_NICKNAME: '이름은 1~20자로 지어주세요.',
  INVALID_REVIEW: '후기는 1~200자로 남겨주세요.',
  ALREADY_REVIEWED: '이 꿈엔 이미 후기를 남겼어요.',
  NOT_BUYER: '내가 산 꿈만 할 수 있어요.',
  ALREADY_RESOLD: '이미 되팔기한 꿈이에요.',
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

/** 보상 결과 → 토스트 문구 (보여줄 게 없으면 null) */
export function rewardMessage(reward: Reward, what: string) {
  if (reward.amount > 0) {
    const cap = reward.cap && reward.cap < 1000 ? ` · 오늘 ${reward.today}/${reward.cap}` : '';
    return `💰 ${what} +${formatCoins(reward.amount)} 코인${cap}`;
  }
  switch (reward.reason) {
    case 'guest':
      return `👀 게스트는 ${what} 코인을 못 받아요. 가입하면 받을 수 있어요!`;
    case 'daily_cap':
      return `오늘 ${what} 보상은 다 받았어요. 내일 또 만나요 🌙`;
    case 'too_short':
      return '꿈 내용이 10자 이상이면 +100만 코인을 받아요';
    default:
      return null;
  }
}
