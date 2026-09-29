import { useState } from 'react';
import { resellDream, reviewDream } from '../lib/api';
import { REVIEW_VERDICTS } from '../lib/dreamMeta';
import { friendlyError } from '../lib/format';
import type { Dream, Review, ReviewVerdict, Reward } from '../lib/types';
import PricePicker from './PricePicker';

/** 산 꿈 후기 쓰기 (+50만) */
export function ReviewForm({ dream, onDone, onCancel }: { dream: Dream; onDone: (review: Review, reward: Reward) => void; onCancel: () => void }) {
  const [verdict, setVerdict] = useState<ReviewVerdict>('hit');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!body.trim()) return setError('한 줄이라도 남겨주세요.');
    setSaving(true);
    try {
      const { review, reward } = await reviewDream(dream.id, verdict, body);
      onDone(review, reward);
    } catch (err) {
      setError(friendlyError(err));
      setSaving(false);
    }
  };

  return (
    <div className="owned-form">
      <div className="label-row">이 꿈, 효과 있었나요?</div>
      <div className="pick-grid three">
        {(Object.keys(REVIEW_VERDICTS) as ReviewVerdict[]).map((v) => (
          <button
            key={v}
            className={`pick ${verdict === v ? 'on' : ''}`}
            style={verdict === v ? { background: REVIEW_VERDICTS[v].tint } : undefined}
            onClick={() => setVerdict(v)}
          >
            <span>{REVIEW_VERDICTS[v].emoji}</span>
            {REVIEW_VERDICTS[v].label}
          </button>
        ))}
      </div>
      <textarea
        className="input"
        value={body}
        maxLength={200}
        onChange={(e) => setBody(e.target.value)}
        placeholder="예) 산 다음 날 엘리베이터가 딱 맞춰 왔어요"
        style={{ minHeight: 80 }}
      />
      {error && <p className="err">{error}</p>}
      <div className="form-actions">
        <button className="btn btn-outline" onClick={onCancel}>
          취소
        </button>
        <button className="btn btn-butter" onClick={submit} disabled={saving}>
          {saving ? '남기는 중…' : '💬 후기 남기기'}
        </button>
      </div>
    </div>
  );
}

/** 산 꿈을 새 가격으로 되팔기 */
export function ResellForm({ dream, guest, onDone, onCancel }: { dream: Dream; guest: boolean; onDone: (d: Dream) => void; onCancel: () => void }) {
  const [price, setPrice] = useState(Math.max(dream.price * 2, 10_000));
  const [free, setFree] = useState(guest);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const finalPrice = guest || free ? 0 : price;
    if (!guest && !free && finalPrice === 0) return setError('가격을 올리거나 🎁 무료로 나눔을 눌러주세요.');
    setSaving(true);
    try {
      onDone(await resellDream(dream, finalPrice));
    } catch (err) {
      setError(friendlyError(err));
      setSaving(false);
    }
  };

  return (
    <div className="owned-form">
      <PricePicker guest={guest} price={price} free={free} onPrice={setPrice} onFree={setFree} />
      <p className="earn-note">🔁 되판 꿈은 시장에 새 매물로 올라가고, 원래 꿈꾼 사람 이름도 함께 표시돼요.</p>
      {error && <p className="err">{error}</p>}
      <div className="form-actions">
        <button className="btn btn-outline" onClick={onCancel}>
          취소
        </button>
        <button className="btn btn-candy" onClick={submit} disabled={saving}>
          {saving ? '올리는 중…' : '🔁 되팔기'}
        </button>
      </div>
    </div>
  );
}
