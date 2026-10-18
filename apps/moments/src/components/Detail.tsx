import { track } from '@lab/core/track';
import { useEffect, useState } from 'react';
import { MOODS, moodOf } from '../lib/moods';
import type { Entry } from '../lib/store';
import { clock, dateLabel } from '../lib/time';

/** 순간 하나 크게 보기 · 고치기 · 지우기 · 아내에게 보내기 */
export function Detail({
  entry,
  photo,
  onClose,
  onUpdate,
  onDelete,
  requireProfile,
}: {
  entry: Entry;
  photo?: string;
  onClose: () => void;
  onUpdate: (e: Entry) => Promise<void>;
  onDelete: (e: Entry) => Promise<void>;
  /** 공개 전환 전에 프로필 확인. false 면 취소 */
  requireProfile: () => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(entry.body);
  const [mood, setMood] = useState(entry.mood);
  const [confirmDel, setConfirmDel] = useState(false);
  const m = moodOf(editing ? mood : entry.mood);
  const d = new Date(entry.happened_at);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = async () => {
    if (!body.trim() && !mood && !entry.photo_path && !photo) return;
    await onUpdate({ ...entry, body: body.trim(), mood });
    setEditing(false);
  };

  const isPublic = entry.visibility === 'public';
  const toggleVisibility = async () => {
    if (!isPublic && !(await requireProfile())) return;
    await onUpdate({ ...entry, visibility: isPublic ? 'private' : 'public' });
    if (!isPublic) track('moments', 'publish');
  };

  const share = async () => {
    const text = `${entry.body}${entry.body ? '\n\n' : ''}— ${dateLabel(d)} ${clock(d)}${m ? ` ${m.emoji}` : ''} · 찰나에서`;
    try {
      const files: File[] = [];
      if (photo) {
        const blob = await fetch(photo).then((r) => r.blob());
        files.push(new File([blob], 'moment.jpg', { type: 'image/jpeg' }));
      }
      if (files.length && navigator.canShare?.({ files })) await navigator.share({ text, files });
      else if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
      track('moments', 'share');
    } catch {
      /* 공유 창을 닫은 경우 */
    }
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <article className="sheet detail" onClick={(e) => e.stopPropagation()} style={m ? ({ '--mood': m.color } as React.CSSProperties) : undefined}>
        <div className="sheet-grip" />
        {photo && <img className="detail-photo" src={photo} alt="" />}
        <div className="detail-meta">
          {m && <span className="sticker static">{m.emoji}</span>}
          <span>
            {dateLabel(d)} · {clock(d)}
          </span>
          {!editing && (
            <button className={`vis-toggle ${isPublic ? 'on' : ''}`} onClick={toggleVisibility}>
              {isPublic ? '🌏 공개 중' : '🔒 나만 보기'}
            </button>
          )}
        </div>

        {editing ? (
          <>
            <textarea className="body-input boxed" value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={2000} autoFocus />
            <div className="moods compact">
              {MOODS.map((x) => (
                <button
                  key={x.key}
                  type="button"
                  className={`mood ${mood === x.key ? 'on' : ''}`}
                  style={{ '--mood': x.color } as React.CSSProperties}
                  onClick={() => setMood(mood === x.key ? null : x.key)}
                >
                  <span className="mood-emoji">{x.emoji}</span>
                </button>
              ))}
            </div>
            <div className="row-btns">
              <button className="btn ghost" onClick={() => setEditing(false)}>
                취소
              </button>
              <button className="btn primary" onClick={save}>
                고치기
              </button>
            </div>
          </>
        ) : (
          <>
            {entry.body && <p className="detail-body">{entry.body}</p>}
            <div className="row-btns">
              <button className="btn primary" onClick={share}>
                💌 보내기
              </button>
              <button className="btn ghost" onClick={() => setEditing(true)}>
                ✏️ 고치기
              </button>
              <button className={`btn ghost ${confirmDel ? 'danger' : ''}`} onClick={() => (confirmDel ? onDelete(entry) : setConfirmDel(true))}>
                {confirmDel ? '정말 지울까요?' : '🗑️'}
              </button>
            </div>
          </>
        )}
      </article>
    </div>
  );
}
