import { useState } from 'react';
import { friendlyError, saveMyProfile, type Profile } from '../lib/api';
import { AVATARS, randomNick, won } from '../lib/format';

const PRICES = [9000, 10000, 12000, 15000];

/** 처음 쓰기 전 한 번: 닉네임 + 회사 근처 점심값(아낀 돈 계산 기준) */
export function ProfileSheet({ initial, onDone, onClose }: { initial: Profile | null; onDone: (p: Profile) => void; onClose: () => void }) {
  const [nickname, setNickname] = useState(initial?.nickname ?? randomNick);
  const [avatar, setAvatar] = useState(initial?.avatar ?? AVATARS[Math.floor(Math.random() * AVATARS.length)]);
  const [price, setPrice] = useState(initial?.lunch_price ?? 12000);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return setError('닉네임을 정해 주세요.');
    setBusy(true);
    try {
      onDone(await saveMyProfile({ nickname, avatar, lunch_price: price }));
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  };

  return (
    <div className="backdrop" onClick={onClose}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={submit} noValidate>
        <div className="grip" />
        <h2>{initial ? '내 정보 수정' : '🍱 반가워요! 딱 두 가지만'}</h2>
        <div className="avatar-big">{avatar}</div>
        <div className="avatar-pick">
          {AVATARS.map((a) => (
            <button type="button" key={a} className={a === avatar ? 'on' : ''} onClick={() => setAvatar(a)}>
              {a}
            </button>
          ))}
        </div>
        <label className="field">
          닉네임
          <div className="row">
            <input className="input" value={nickname} maxLength={20} onChange={(e) => setNickname(e.target.value)} />
            <button type="button" className="btn ghost sm" onClick={() => setNickname(randomNick())}>
              🎲
            </button>
          </div>
        </label>
        <label className="field">
          회사 근처 점심 한 끼 가격
          <div className="chips">
            {PRICES.map((p) => (
              <button type="button" key={p} className={`chip ${price === p ? 'on' : ''}`} onClick={() => setPrice(p)}>
                {won(p)}
              </button>
            ))}
          </div>
          <input className="input" type="number" inputMode="numeric" value={price} min={0} max={100000} step={500} onChange={(e) => setPrice(Math.max(0, Math.min(100000, Number(e.target.value) || 0)))} />
          <small className="muted">도시락을 쌀 때마다 이 금액 − 재료비 = 아낀 돈으로 쌓여요</small>
        </label>
        {error && <p className="err">{error}</p>}
        <button className="btn primary block" disabled={busy}>
          {busy ? '…' : initial ? '저장' : '시작하기'}
        </button>
      </form>
    </div>
  );
}
