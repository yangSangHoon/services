import { useState } from 'react';
import { sellDream } from '../lib/api';
import { HONESTY } from '../lib/dreamMeta';
import { formatCoins, friendlyError } from '../lib/format';
import { announce } from '../lib/realtime';
import { toast } from '../lib/toast';
import type { Honesty } from '../lib/types';
import { CloseIcon } from './Backdrops';

const PRICE_STEPS: [string, number][] = [
  ['+1천', 1_000],
  ['+1만', 10_000],
  ['+10만', 100_000],
  ['+100만', 1_000_000],
  ['+1000만', 10_000_000],
];
const MAX_PRICE = 1_000_000_000_000;

export default function SellModal({ guest, onClose }: { guest: boolean; onClose: () => void }) {
  const [honesty, setHonesty] = useState<Honesty>('real');
  const [title, setTitle] = useState('');
  const [teaser, setTeaser] = useState('');
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
      const dream = await sellDream({ title, teaser, content, kind: null, honesty, price: finalPrice });
      announce({ type: 'listed', dream });
      toast('🌙 시장에 올라갔어요!', 'success');
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
          맛보기 한 줄 <span className="hint">선택</span>
          <input className="input" value={teaser} maxLength={80} onChange={(e) => setTeaser(e.target.value)} placeholder="예) 근데 그 용이…" />
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

        {guest ? (
          <div className="mint-box">
            <div className="t">🎁 가격: 무료 나눔</div>
            <div className="s">게스트는 코인이 없어서 무료로만 나눌 수 있어요. 가입하면 1억 코인을 받고 꿈을 팔 수 있어요.</div>
          </div>
        ) : (
          <div className="price-box">
            <div className="top">
              <span>가격</span>
              <button className={`free-toggle ${free ? 'on' : ''}`} onClick={() => setFree(!free)}>
                🎁 무료로 나눔
              </button>
            </div>
            <div className="price-val">{free ? '🎁 무료' : `${formatCoins(price)} 코인`}</div>
            {!free && (
              <div className="price-chips">
                {PRICE_STEPS.map(([label, v]) => (
                  <button key={label} onClick={() => setPrice((p) => Math.min(MAX_PRICE, p + v))}>
                    {label}
                  </button>
                ))}
                <button className="reset" onClick={() => setPrice(0)}>
                  초기화
                </button>
              </div>
            )}
          </div>
        )}

        {error && <p className="err">{error}</p>}
        <button className="btn btn-candy btn-block" onClick={submit} disabled={saving}>
          {saving ? '포장 중…' : '🌙 시장에 올리기'}
        </button>
      </div>
    </div>
  );
}
