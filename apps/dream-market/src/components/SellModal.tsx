import { useState } from 'react';
import { sellDream } from '../lib/api';
import { HONESTY, KIND_KEYS, KINDS } from '../lib/dreamMeta';
import { formatCoins, formatPrice, friendlyError } from '../lib/format';
import { announce } from '../lib/realtime';
import { toast } from '../lib/toast';
import type { DreamKind, Honesty } from '../lib/types';

const PRICE_STEPS = [1_000, 10_000, 100_000, 1_000_000, 10_000_000];
const MAX_PRICE = 1_000_000_000_000;

export default function SellModal({ guest, onClose }: { guest: boolean; onClose: () => void }) {
  const [kind, setKind] = useState<DreamKind | null>(null);
  const [honesty, setHonesty] = useState<Honesty>('real');
  const [title, setTitle] = useState('');
  const [teaser, setTeaser] = useState('');
  const [content, setContent] = useState('');
  const [price, setPrice] = useState(guest ? 0 : 10_000);
  const [saving, setSaving] = useState(false);

  const valid = title.trim() && content.trim() && price >= 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    try {
      const dream = await sellDream({ title, teaser, content, kind, honesty, price });
      announce({ type: 'listed', dream });
      toast('꿈이 시장에 둥실 떠올랐어요 🫧', 'success');
      onClose();
    } catch (err) {
      toast(friendlyError(err), 'error');
      setSaving(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <form className="modal sell" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <p className="eyebrow">{guest ? '🎁 꿈 나눔' : '✨ 꿈 팔기'}</p>
        <h2>{guest ? '어젯밤 꿈, 나눠볼까요?' : '어젯밤 무슨 꿈 꿨어요?'}</h2>

        <fieldset>
          <legend>꿈 종류 (선택)</legend>
          <div className="kind-grid">
            {KIND_KEYS.map((k) => (
              <button
                type="button"
                key={k}
                className={`kind-option ${kind === k ? 'active' : ''}`}
                onClick={() => setKind((cur) => (cur === k ? null : k))}
                title={KINDS[k].hint}
              >
                <span>{KINDS[k].emoji}</span>
                <small>{KINDS[k].label}</small>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="field">
          <span>제목 (공개)</span>
          <input value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} placeholder="황금 돼지가 내 방에 들어옴" />
        </label>

        <label className="field">
          <span>맛보기 한 줄 (공개, 선택)</span>
          <input value={teaser} maxLength={80} onChange={(e) => setTeaser(e.target.value)} placeholder="근데 그 돼지가 말을 했음…" />
        </label>

        <label className="field">
          <span>🔒 봉인될 꿈 내용 (산 사람만 볼 수 있어요)</span>
          <textarea
            value={content}
            maxLength={2000}
            rows={4}
            onChange={(e) => setContent(e.target.value)}
            placeholder="꿈 내용을 최대한 생생하게!"
          />
        </label>

        <fieldset>
          <legend>진실 서약</legend>
          <div className="segmented">
            {(Object.keys(HONESTY) as Honesty[]).map((h) => (
              <button type="button" key={h} className={honesty === h ? 'active' : ''} onClick={() => setHonesty(h)}>
                {HONESTY[h].emoji} {HONESTY[h].label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>가격</legend>
          <div className="price-display">{formatPrice(price)}</div>
          {guest ? (
            <p className="guest-note">👀 게스트는 코인을 벌 수 없어서 무료 나눔만 가능해요. 가입하면 가격을 매길 수 있어요!</p>
          ) : (
          <div className="price-steps">
            {PRICE_STEPS.map((s) => (
              <button type="button" key={s} onClick={() => setPrice((p) => Math.min(MAX_PRICE, p + s))}>
                +{formatCoins(s)}
              </button>
            ))}
            <button type="button" className="reset" onClick={() => setPrice(0)}>
              🎁 무료로
            </button>
          </div>
          )}
        </fieldset>

        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>
            취소
          </button>
          <button className="btn-primary" disabled={!valid || saving}>
            {saving ? '포장 중…' : '시장에 내놓기'}
          </button>
        </div>
      </form>
    </div>
  );
}
