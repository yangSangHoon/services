import confetti from 'canvas-confetti';
import { useEffect, useState } from 'react';
import { buyDream } from '../lib/api';
import { interpret, KINDS } from '../lib/dreamMeta';
import { formatCoins, friendlyError, isGoneError } from '../lib/format';
import { announce } from '../lib/realtime';
import { toast } from '../lib/toast';
import type { Dream, Profile } from '../lib/types';

type Step = 'contract' | 'buying' | 'reveal';

interface Props {
  dream: Dream;
  profile: Profile;
  onClose: () => void;
  guest: boolean;
  onBought: (coins: number) => void;
  onSignup: () => void;
}

export default function BuyModal({ dream, profile, guest, onClose, onBought, onSignup }: Props) {
  const [step, setStep] = useState<Step>('contract');
  const [agreed, setAgreed] = useState(false);
  const [content, setContent] = useState('');
  const typed = useTypewriter(content);
  const kind = KINDS[dream.kind];
  const free = dream.price === 0;
  const canAfford = profile.coins >= dream.price;
  const { fortune, luck } = interpret(dream.id);

  const buy = async () => {
    setStep('buying');
    try {
      const [result] = await Promise.all([buyDream(dream.id), new Promise((r) => setTimeout(r, 1400))]);
      setContent(result.content);
      setStep('reveal');
      onBought(result.coins);
      announce({
        type: 'sold',
        dreamId: dream.id,
        title: dream.title,
        sellerId: dream.seller_id,
        price: dream.price,
        buyer: profile.nickname,
      });
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.4 }, scalar: 0.9 });
    } catch (err) {
      toast(friendlyError(err), 'error');
      if (isGoneError(err)) announce({ type: 'withdrawn', dreamId: dream.id });
      onClose();
    }
  };

  return (
    <div className="overlay" onClick={step === 'contract' ? onClose : undefined}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {step === 'contract' && (
          <>
            <p className="eyebrow">{free ? '🎁 무료 나눔 꿈' : '📜 꿈 매매 계약서'}</p>
            <div className="contract-head">
              <span className="kind-emoji big">{kind.emoji}</span>
              <div>
                <h2>{dream.title}</h2>
                <p className="muted small">판매자 {dream.seller_nickname}</p>
              </div>
            </div>
            {free ? (
              <p className="receipt muted small">공짜 꿈이에요. 감사 인사는 마음속으로 🙏</p>
            ) : (
            <dl className="receipt">
              <div>
                <dt>꿈 가격</dt>
                <dd>🪙 {formatCoins(dream.price)}</dd>
              </div>
              <div>
                <dt>내 잔고</dt>
                <dd>🪙 {formatCoins(profile.coins)}</dd>
              </div>
              <div className="total">
                <dt>구매 후</dt>
                <dd className={canAfford ? '' : 'danger'}>
                  {canAfford ? `🪙 ${formatCoins(profile.coins - dream.price)}` : '코인 부족 😵'}
                </dd>
              </div>
            </dl>
            )}
            {guest && !canAfford && (
              <p className="guest-note">👀 게스트는 코인이 없어서 무료 꿈만 받을 수 있어요. 가입하면 바로 1억 코인!</p>
            )}
            <label className="agree">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              <span>이 꿈이 지어낸 것일 수 있으며, 환불은 꿈에서만 가능함에 동의합니다.</span>
            </label>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={onClose}>
                안 살래요
              </button>
              {guest && !canAfford ? (
                <button className="btn-primary" onClick={onSignup}>
                  🎁 가입하고 1억 받기
                </button>
              ) : (
                <button className="btn-primary" disabled={!agreed || !canAfford} onClick={buy}>
                  {free ? '무료로 받기' : '꿈 사기'}
                </button>
              )}
            </div>
          </>
        )}

        {step === 'buying' && (
          <div className="buying">
            <div className="bubble-jar">🫙</div>
            <p>꿈을 병에 옮겨 담는 중…</p>
          </div>
        )}

        {step === 'reveal' && (
          <>
            <p className="eyebrow">🔓 봉인 해제!</p>
            <h2>
              {kind.emoji} {dream.title}
            </h2>
            <div className="dream-content">
              {typed}
              <span className="caret" />
            </div>
            <div className="fortune">
              <div>
                <strong>🔮 오늘의 해몽</strong>
                <p>{fortune}</p>
              </div>
              <div className="luck">
                <span>행운 지수</span>
                <strong>{luck}%</strong>
              </div>
            </div>
            <p className="muted small center">이 꿈은 이제 당신 것. 시장에서는 사라졌어요 💨</p>
            <button className="btn-primary btn-lg" onClick={onClose}>
              보관함에 넣기
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function useTypewriter(text: string, speed = 28) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (!text) return;
    const id = setInterval(() => {
      setN((v) => {
        if (v >= text.length) {
          clearInterval(id);
          return v;
        }
        return v + 1;
      });
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return text.slice(0, n);
}
