import { useState } from 'react';
import { enterDreamWorld } from '../lib/api';
import { randomNickname } from '../lib/dreamMeta';
import { friendlyError } from '../lib/format';
import { toast } from '../lib/toast';
import type { Profile } from '../lib/types';

export default function Onboarding({ onEnter }: { onEnter: (p: Profile) => void }) {
  const [nickname, setNickname] = useState(randomNickname);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    setLoading(true);
    try {
      onEnter(await enterDreamWorld(nickname.trim()));
    } catch (err) {
      toast(friendlyError(err), 'error');
      setLoading(false);
    }
  };

  return (
    <main className="onboarding">
      <div className="moon">🌙</div>
      <h1 className="brand-title">꿈사꿈팔</h1>
      <p className="tagline">
        남의 꿈을 사고, 내 꿈을 파는 시장.
        <br />
        <small>진짜 꿨는지는 아무도 몰라요 🤫</small>
      </p>
      <form className="onboarding-form" onSubmit={submit}>
        <label htmlFor="nickname">꿈나라에서 쓸 이름</label>
        <div className="input-row">
          <input
            id="nickname"
            value={nickname}
            maxLength={20}
            onChange={(e) => setNickname(e.target.value)}
            autoComplete="off"
          />
          <button type="button" className="btn-ghost" onClick={() => setNickname(randomNickname())} title="랜덤 이름">
            🎲
          </button>
        </div>
        <button className="btn-primary btn-lg" disabled={loading || !nickname.trim()}>
          {loading ? '잠드는 중… 💤' : '꿈나라 입장하기'}
        </button>
      </form>
    </main>
  );
}
