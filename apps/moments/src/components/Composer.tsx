import { useEffect, useMemo, useRef, useState } from 'react';
import { MOODS } from '../lib/moods';
import { loadDraft, saveDraft } from '../lib/store';
import { nowLabel, WHEN } from '../lib/time';

export interface Draft {
  body: string;
  mood: string | null;
  photo: Blob | null;
  happenedAt: Date;
}

const PROMPTS = [
  '방금 무슨 일이 있었나요?',
  '왜 그렇게 웃었는지, 한 줄만',
  '오늘 제일 좋았던 순간은?',
  '나중에 꺼내 보고 싶은 장면',
  '그때 누가 뭐라고 했더라?',
];

/**
 * 첫 화면 = 작성 화면. 10초 안에 끝내기 위한 규칙:
 * - 들어오자마자 입력창에 커서 (메뉴·로그인 없음)
 * - 글 / 사진 / 감정 중 하나만 있어도 저장 (감정만 = 2번 탭)
 * - 시간·날짜는 자동, 필요할 때만 "언제" 칩을 톡톡
 * - 저장하면 바로 빈 화면 → 다음 순간을 이어서 적을 수 있게
 */
export function Composer({ initial, onSave }: { initial: Partial<Draft> | null; onSave: (d: Draft) => Promise<void> }) {
  const [body, setBody] = useState(() => initial?.body || loadDraft());
  const [mood, setMood] = useState<string | null>(initial?.mood ?? null);
  const [photo, setPhoto] = useState<Blob | null>(initial?.photo ?? null);
  const [when, setWhen] = useState(0);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [burst, setBurst] = useState(0);
  const text = useRef<HTMLTextAreaElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const album = useRef<HTMLInputElement>(null);
  const prompt = useMemo(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)], []);
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    // 데스크톱·안드로이드는 바로 키보드. iOS 는 탭해야 뜨지만 입력창이 크게 있어서 한 번이면 된다
    text.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => saveDraft(body), [body]);

  const canSave = Boolean(body.trim() || photo || mood) && !saving;

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({ body, mood, photo, happenedAt: new Date(Date.now() - WHEN[when].ago) });
      setBody('');
      setMood(null);
      setPhoto(null);
      setWhen(0);
      setBurst((n) => n + 1);
      saveDraft('');
    } finally {
      setSaving(false);
    }
  };

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setPhoto(f);
    e.target.value = '';
    text.current?.focus({ preventScroll: true });
  };

  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="composer-meta">
        <span>{nowLabel(now)}</span>
        <button type="button" className={`when ${when ? 'on' : ''}`} onClick={() => setWhen((w) => (w + 1) % WHEN.length)}>
          🕒 {WHEN[when].label}
        </button>
      </div>

      <div className={`paper ${burst ? 'saved' : ''}`} key={burst}>
        {preview && (
          <div className="photo-preview">
            <img src={preview} alt="" />
            <button type="button" className="x" onClick={() => setPhoto(null)} aria-label="사진 빼기">
              ✕
            </button>
          </div>
        )}
        <textarea
          ref={text}
          className="body-input"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={prompt}
          rows={4}
          maxLength={2000}
          enterKeyHint="enter"
        />
        <div className="photo-row">
          <button type="button" className="tool" onClick={() => camera.current?.click()}>
            📷 <span>찍기</span>
          </button>
          <button type="button" className="tool" onClick={() => album.current?.click()}>
            🖼️ <span>앨범</span>
          </button>
          <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={pick} />
          <input ref={album} type="file" accept="image/*" hidden onChange={pick} />
        </div>
      </div>

      <div className="moods" role="radiogroup" aria-label="그때 기분">
        {MOODS.map((m) => (
          <button
            key={m.key}
            type="button"
            role="radio"
            aria-checked={mood === m.key}
            className={`mood ${mood === m.key ? 'on' : ''}`}
            style={{ '--mood': m.color } as React.CSSProperties}
            onClick={() => setMood((cur) => (cur === m.key ? null : m.key))}
          >
            <span className="mood-emoji">{m.emoji}</span>
            <span className="mood-label">{m.label}</span>
          </button>
        ))}
      </div>

      <button className="save-btn" disabled={!canSave}>
        {saving ? '보관하는 중…' : '이 순간 남기기'}
      </button>
    </form>
  );
}
