import { useState } from 'react';
import { dreamLink, shareDream } from '../lib/share';
import { toast } from '../lib/toast';
import type { Dream } from '../lib/types';

/** 🔗 공유: 공유 시트 또는 링크 복사. 복사도 막히면 직접 복사할 수 있게 보여준다 */
export default function ShareButton({ dream, className = '', label = '🔗 공유' }: { dream: Pick<Dream, 'id' | 'title' | 'price' | 'status'>; className?: string; label?: string }) {
  const [fallback, setFallback] = useState<string | null>(null);

  const click = async () => {
    const r = await shareDream(dream);
    if (r === 'copied') toast('🔗 꿈 링크를 복사했어요! 친구에게 붙여넣어 보내세요', 'success');
    else if (r === 'failed') setFallback(dreamLink(dream.id));
  };

  return (
    <>
      <button type="button" className={`share-btn ${className}`} onClick={click} title="이 꿈 링크 공유하기">
        {label}
      </button>
      {fallback && (
        <div className="backdrop" onClick={() => setFallback(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="grabber" />
            <div className="sheet-head">
              <h2>🔗 꿈 링크 복사하기</h2>
            </div>
            <p className="muted small" style={{ margin: 0 }}>
              자동 복사가 막혔어요. 아래 링크를 길게 눌러 복사해 주세요.
            </p>
            <input className="input" readOnly value={fallback} onFocus={(e) => e.currentTarget.select()} autoFocus />
            <button className="btn btn-lav btn-block" onClick={() => setFallback(null)}>
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
}
