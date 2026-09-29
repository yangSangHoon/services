import { useState } from 'react';
import { listDream } from '../lib/api';
import { HONESTY } from '../lib/dreamMeta';
import { friendlyError, rewardMessage } from '../lib/format';
import { announce } from '../lib/realtime';
import { toast } from '../lib/toast';
import type { Honesty } from '../lib/types';
import { CloseIcon } from './Backdrops';
import PricePicker from './PricePicker';

interface Props {
  guest: boolean;
  onClose: () => void;
  onCoins: (coins: number) => void;
}

export default function SellModal({ guest, onClose, onCoins }: Props) {
  const [honesty, setHonesty] = useState<Honesty>('real');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [price, setPrice] = useState(10_000);
  const [free, setFree] = useState(guest);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim()) return setError('제목이 있어야 팔 수 있어요.');
    if (!content.trim()) return setError('꿈 내용이 비어 있어요.');
    const finalPrice = guest || free ? 0 : price;
    if (!guest && !free && finalPrice === 0) return setError('가격을 올리거나 🎁 무료로 나눔을 눌러주세요.');
    setError('');
    setSaving(true);
    try {
      const { dream, reward } = await listDream({ title, content, honesty, price: finalPrice });
      announce({ type: 'listed', dream });
      if (reward.coins !== undefined) onCoins(reward.coins);
      toast(rewardMessage(reward, '꿈 쓰기') ?? '🌙 시장에 올라갔어요!', 'success');
      onClose();
    } catch (err) {
      setError(friendlyError(err));
      setSaving(false);
    }
  };

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        <div className="sheet-head">
          <h2>{guest ? '🎁 꿈 나눔하기' : '✨ 꿈 팔기'}</h2>
          <button className="close-btn" onClick={onClose} aria-label="닫기">
            <CloseIcon />
          </button>
        </div>

        <label className="field">
          제목
          <input className="input" value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} placeholder="예) 용이 물속에서 나타남" />
        </label>
        <label className="field">
          꿈 내용 <span className="hint">시장에서 누구나 볼 수 있어요. 카드에는 4줄까지 보여요</span>
          <textarea className="input" value={content} maxLength={2000} onChange={(e) => setContent(e.target.value)} placeholder="어젯밤 꿈을 자세히 적어주세요" />
        </label>

        <div>
          <div className="label-row">진실 서약</div>
          <div className="pick-grid three">
            {(Object.keys(HONESTY) as Honesty[]).map((h) => (
              <button
                key={h}
                className={`pick ${honesty === h ? 'on' : ''}`}
                style={honesty === h ? { background: HONESTY[h].tint } : undefined}
                onClick={() => setHonesty(h)}
              >
                <span>{HONESTY[h].emoji}</span>
                {HONESTY[h].label}
              </button>
            ))}
          </div>
        </div>

        <PricePicker guest={guest} price={price} free={free} onPrice={setPrice} onFree={setFree} />

        {!guest && <p className="earn-note">✍️ 꿈을 올리면 <b>+100만 코인</b> (하루 3번, 내용 10자 이상)</p>}
        {error && <p className="err">{error}</p>}
        <button className="btn btn-candy btn-block" onClick={submit} disabled={saving}>
          {saving ? '포장 중…' : '🌙 시장에 올리기'}
        </button>
      </div>
    </div>
  );
}
