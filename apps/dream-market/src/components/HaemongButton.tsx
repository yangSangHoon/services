import { useState } from 'react';
import { openHaemong, PASTE_KEY } from '../lib/haemong';
import { toast } from '../lib/toast';
import type { Dream } from '../lib/types';

/** 🔮 AI 해몽: 프롬프트 복사 + ChatGPT 팝업. 복사가 막히면 직접 복사할 수 있게 보여준다 */
export default function HaemongButton({ dream, className = '', label = '🔮 AI 해몽' }: { dream: Pick<Dream, 'title' | 'content'>; className?: string; label?: string }) {
  const [fallback, setFallback] = useState<string | null>(null);

  const click = async () => {
    const { text, popupOpened, copied } = openHaemong(dream);
    if (!(await copied)) return setFallback(text);
    toast(
      popupOpened
        ? `📋 해몽 요청을 복사했어요! ChatGPT 창에 ${PASTE_KEY}로 붙여넣고 보내세요`
        : `📋 복사했어요! 팝업이 막혀서 chatgpt.com을 직접 열고 ${PASTE_KEY}로 붙여넣어 주세요`,
      'success',
    );
  };

  return (
    <>
      <button type="button" className={`haemong-btn ${className}`} onClick={click} title="ChatGPT로 무료 해몽 (프롬프트 복사 + 창 열기)">
        {label}
      </button>
      {fallback && (
        <div className="backdrop" onClick={() => setFallback(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="grabber" />
            <div className="sheet-head">
              <h2>🔮 해몽 요청 복사하기</h2>
            </div>
            <p className="muted small" style={{ margin: 0 }}>
              자동 복사가 막혔어요. 아래 글을 전부 선택해서 복사한 뒤, ChatGPT 창에 {PASTE_KEY}로 붙여넣어 주세요.
            </p>
            <textarea className="input" readOnly value={fallback} rows={8} onFocus={(e) => e.currentTarget.select()} autoFocus />
            <button className="btn btn-lav btn-block" onClick={() => setFallback(null)}>
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
}
