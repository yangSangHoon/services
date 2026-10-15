import { track } from '@lab/core/track';
import { formatCoins } from './format';
import type { Dream } from './types';

/** #d/<id> = 꿈 하나만 보는 공유 링크 */
export const dreamLink = (id: string) => `${location.origin}${location.pathname}#d/${id}`;

function shareText(dream: Pick<Dream, 'title' | 'price' | 'status'>) {
  if (dream.status === 'sold') return `💭 「${dream.title}」 — 꿈사꿈팔에서 이미 팔려버린 꿈이에요`;
  return dream.price === 0
    ? `💭 「${dream.title}」 — 꿈사꿈팔에서 무료로 나눔 중인 꿈이에요`
    : `💭 「${dream.title}」 — 꿈사꿈팔에서 ${formatCoins(dream.price)}에 팔리는 꿈, 사러 갈래요?`;
}

/**
 * 공유 시트(모바일)를 열고, 없거나 막히면 링크를 클립보드에 복사한다.
 * 'shared' | 'copied' | 'cancel' | 'failed'
 */
export async function shareDream(dream: Pick<Dream, 'id' | 'title' | 'price' | 'status'>) {
  const url = dreamLink(dream.id);
  const text = shareText(dream);
  track('dream-market', 'share');
  if (navigator.share) {
    try {
      await navigator.share({ title: '꿈사꿈팔', text, url });
      return 'shared';
    } catch (err) {
      // 사용자가 닫은 건 그대로 끝
      if ((err as Error).name === 'AbortError') return 'cancel';
    }
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}
