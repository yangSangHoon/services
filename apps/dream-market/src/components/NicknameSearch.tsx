import { useEffect, useRef, useState } from 'react';
import { searchNicknames } from '../lib/api';

/** 닉네임 검색: 입력하면 바로 후보가 뜨고, 누르면 그 사람의 꿈 모아보기 */
export default function NicknameSearch({ onPick }: { onPick: (userId: string) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<{ id: string; nickname: string }[] | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (!term) return setResults(null);
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const r = await searchNicknames(term);
        if (!cancelled) setResults(r);
      } catch {
        if (!cancelled) setResults([]);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const pick = (id: string) => {
    setOpen(false);
    setQ('');
    onPick(id);
  };

  return (
    <div className="nick-search" ref={ref}>
      <span className="icon" aria-hidden>
        🔍
      </span>
      <input
        type="search"
        value={q}
        onChange={(e) => (setQ(e.target.value), setOpen(true))}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
          if (e.key === 'Enter' && results?.[0]) pick(results[0].id);
        }}
        placeholder="닉네임으로 꿈쟁이 찾기"
        aria-label="닉네임 검색"
        maxLength={20}
      />
      {open && results && (
        <div className="nick-results" role="listbox">
          {results.length === 0 ? (
            <p className="none">「{q.trim()}」 꿈쟁이가 없어요 💤</p>
          ) : (
            results.map((r) => (
              <button key={r.id} role="option" onClick={() => pick(r.id)}>
                <span className="avatar sm">{Array.from(r.nickname)[0]}</span>
                {r.nickname}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
