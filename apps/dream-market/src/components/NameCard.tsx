import { useState } from 'react';
import { renameMe } from '../lib/api';
import { randomNickname } from '../lib/dreamMeta';
import { friendlyError } from '../lib/format';
import { toast } from '../lib/toast';
import type { Profile } from '../lib/types';

/** 내 꿈 화면 맨 위 출입증: 닉네임 보기 · 바꾸기 */
export default function NameCard({ profile, guest, onRenamed }: { profile: Profile; guest: boolean; onRenamed: (p: Profile) => void }) {
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(profile.nickname);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const start = () => {
    setNickname(profile.nickname);
    setError('');
    setEditing(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = nickname.trim();
    if (!next) return setError('이름이 있어야 시장에 들어갈 수 있어요.');
    if (next === profile.nickname) return setEditing(false);
    setSaving(true);
    try {
      onRenamed(await renameMe(next));
      toast(`🪪 이제부터 「${next}」(으)로 불려요`);
      setEditing(false);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="pass name-card" onSubmit={save}>
      <span className="pass-label">✦ 꿈 시장 {guest ? '임시 출입증' : '주민증'}</span>
      {editing ? (
        <>
          <input value={nickname} maxLength={20} onChange={(e) => setNickname(e.target.value)} autoFocus autoComplete="off" aria-label="새 닉네임" />
          {error && <p className="err">{error}</p>}
          <div className="name-actions">
            <button type="button" onClick={() => setNickname(randomNickname())}>
              🎲 굴리기
            </button>
            <span className="grow" />
            <button type="button" className="ghost" onClick={() => setEditing(false)}>
              취소
            </button>
            <button type="submit" className="save" disabled={saving}>
              {saving ? '바꾸는 중…' : '저장'}
            </button>
          </div>
        </>
      ) : (
        <div className="name-row">
          <strong>{profile.nickname}</strong>
          <button type="button" onClick={start}>
            ✏️ 이름 바꾸기
          </button>
        </div>
      )}
    </form>
  );
}
