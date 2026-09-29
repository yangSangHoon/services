import confetti from 'canvas-confetti';
import { useState } from 'react';
import { claimWelcomeBonus } from '../lib/api';
import { formatCoins, friendlyError } from '../lib/format';
import { toast } from '../lib/toast';
import { useCountUp } from '../lib/useCountUp';

type Step = 'sealed' | 'opening' | 'opened';

export default function WelcomeBonus({ nickname, onDone }: { nickname: string; onDone: (coins: number) => void }) {
  const [step, setStep] = useState<Step>('sealed');
  const [coins, setCoins] = useState(0);
  const shown = useCountUp(coins, 2200);

  const open = async () => {
    if (step !== 'sealed') return;
    setStep('opening');
    try {
      const [total] = await Promise.all([claimWelcomeBonus(), new Promise((r) => setTimeout(r, 1200))]);
      setStep('opened');
      setCoins(total);
      confetti({ particleCount: 160, spread: 90, origin: { y: 0.6 } });
      setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 70, origin: { x: 0 } }), 400);
      setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 70, origin: { x: 1 } }), 700);
    } catch (err) {
      toast(friendlyError(err), 'error');
      onDone(0);
    }
  };

  return (
    <div className="overlay">
      <div className="modal welcome">
        {step !== 'opened' ? (
          <>
            <p className="eyebrow">🎉 입장 기념 이벤트</p>
            <h2>
              {nickname}님께
              <br />
              첫 계시가 도착했습니다
            </h2>
            <button className={`crystal ${step === 'opening' ? 'crystal-opening' : ''}`} onClick={open}>
              🔮
            </button>
            <p className="muted">{step === 'opening' ? '계시를 해독하는 중…' : '수정구슬을 눌러 계시를 받으세요'}</p>
          </>
        ) : (
          <>
            <p className="eyebrow">✨ 계시 ✨</p>
            <h2>하늘에서 코인이 쏟아집니다</h2>
            <div className="bonus-amount">
              <span className="coin">🪙</span> {formatCoins(shown)}
            </div>
            <p className="muted">이 코인으로 남의 꿈을 사보세요. 현실에선 못 쓰는 게 함정.</p>
            <button className="btn-primary btn-lg" onClick={() => onDone(coins)} disabled={shown < coins}>
              꿈 쇼핑하러 가기 →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
