import { useState } from 'react';
import { AVATARS, saveMyProfile, type Profile } from '../lib/social';

/** 공개 글을 처음 쓸 때 / 프로필 수정 */
export function ProfileEditor({ initial, reason, onDone, onClose }: { initial: Profile | null; reason?: string; onDone: (p: Profile) => void; onClose: () => void }) {
  const [nickname, setNickname] = useState(initial?.nickname ?? '');
  const [avatar, setAvatar] = useState(initial?.avatar ?? AVATARS[Math.floor(Math.random() * AVATARS.length)]);
  const [bio, setBio] = useState(initial?.bio ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return setError('다른 사람에게 보일 이름을 정해 주세요.');
    setBusy(true);
    try {
      onDone(await saveMyProfile({ nickname, avatar, bio }));
    } catch {
      setError('저장이 안 됐어요. 잠시 후 다시 시도해 주세요.');
      setBusy(false);
    }
  };

  return (
    <div className="sheet-backdrop top-layer" onClick={onClose}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={submit} noValidate>
        <div className="sheet-grip" />
        <h2 className="sheet-title">{initial ? '프로필 수정' : '🌏 공개 프로필 만들기'}</h2>
        {reason && <p className="muted small">{reason}</p>}
        <div className="avatar-big">{avatar}</div>
        <div className="avatar-pick">
          {AVATARS.map((a) => (
            <button type="button" key={a} className={a === avatar ? 'on' : ''} onClick={() => setAvatar(a)}>
              {a}
            </button>
          ))}
        </div>
        <label className="field">
          이름
          <input className="input" value={nickname} maxLength={20} onChange={(e) => setNickname(e.target.value)} placeholder="예: 웃음많은 두부" autoFocus={!initial} />
        </label>
        <label className="field">
          한 줄 소개 <span className="muted small">(선택)</span>
          <input className="input" value={bio} maxLength={80} onChange={(e) => setBio(e.target.value)} placeholder="예: 두 아이 아빠, 매일 웃긴 일 기록 중" />
        </label>
        {error && <p className="warn small">{error}</p>}
        <div className="row-btns">
          <button type="button" className="btn ghost" onClick={onClose}>
            취소
          </button>
          <button className="btn primary" disabled={busy}>
            {busy ? '…' : '저장'}
          </button>
        </div>
      </form>
    </div>
  );
}
