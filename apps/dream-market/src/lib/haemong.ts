import type { Dream } from './types';

const isMac = /Mac|iPhone|iPad/i.test(navigator.userAgent);
export const PASTE_KEY = isMac ? '⌘V' : 'Ctrl+V';
const GPT_URL = 'https://chatgpt.com/';

export function haemongPrompt(dream: Pick<Dream, 'title' | 'content'>) {
  return [
    '아래 꿈을 해몽해줘.',
    '한국 전통 해몽과 심리학적 관점을 섞어서 재미있게 풀어주고, 길몽/흉몽 판정 · 상징 풀이 · 오늘의 행운 팁 순서로 알려줘.',
    '',
    `[꿈 제목] ${dream.title}`,
    `[꿈 내용] ${dream.content ?? '(내용 없음)'}`,
  ].join('\n');
}

/** 클릭 순간 동기적으로 복사 (창이 열려 포커스가 넘어가기 전에 끝내야 해서) */
function copyNow(text: string) {
  const active = document.activeElement as HTMLElement | null;
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  ta.remove();
  active?.focus?.();
  return ok;
}

/**
 * 해몽 프롬프트를 클립보드에 복사하고 ChatGPT를 팝업으로 연다 (비용 없이 사용자가 직접 붙여넣기).
 * 팝업 차단을 피하려면 클릭 핸들러 안에서 바로(await 전에) 호출해야 한다.
 */
export function openHaemong(dream: Pick<Dream, 'title' | 'content'>) {
  const text = haemongPrompt(dream);
  const copiedNow = copyNow(text);
  const w = 460;
  const h = Math.min(820, screen.availHeight - 40);
  const left = Math.max(0, screen.availWidth - w - 24);
  const popup = window.open(GPT_URL, 'dream-market-gpt', `popup,width=${w},height=${h},left=${left},top=20`);
  // 동기 복사가 안 되는 브라우저면 Clipboard API로 한 번 더
  const copied = copiedNow
    ? Promise.resolve(true)
    : (navigator.clipboard?.writeText(text).then(
        () => true,
        () => false,
      ) ?? Promise.resolve(false));
  return { text, popupOpened: Boolean(popup), copied };
}
