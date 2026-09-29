import { useEffect, useRef, useState } from 'react';
import { claimWelcomeBonus } from '../lib/api';
import { friendlyError } from '../lib/format';
import { toast } from '../lib/toast';
import { Burst, CoinRain, Stars } from './Backdrops';

type Phase = 'idle' | 'burst' | 'done';
const BONUS = 100_000_000;
const COUNT_MS = 2600;

/** 첫 계시: 구슬을 누르면 별·방울이 터지고 "꿈" 코인이 쏟아지며 0 → 1억 카운트 */
export default function WelcomeBonus({ onDone }: { onDone: (coins: number) => void }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [count, setCount] = useState(0);
  const total = useRef(0);
  const raf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const tap = async () => {
    if (phase !== 'idle') return;
    setPhase('burst');
    // 카운트는 바로 시작하고, 보상 지급은 뒤에서 확정
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / COUNT_MS);
      setCount(Math.round((p === 1 ? 1 : 1 - Math.pow(2, -10 * p)) * BONUS));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    try {
      const [coins] = await Promise.all([claimWelcomeBonus(), new Promise((r) => setTimeout(r, COUNT_MS))]);
      total.current = coins;
      setPhase('done');
    } catch (err) {
      cancelAnimationFrame(raf.current);
      toast(friendlyError(err), 'error');
      onDone(0);
    }
  };

  return (
    <div className="dawn reveal">
      <Stars />
      {phase !== 'idle' && <CoinRain />}
      <div className="reveal-inner">
        <span className="chip-glass" style={{ color: '#fff' }}>
          ✦ 첫 계시 이벤트
        </span>
        <h2>{phase === 'done' ? '계시가 내려왔어요!' : '수정구슬이 당신을\n부르고 있어요'}</h2>
        <div className="spacer" />
        <div className="orb-wrap">
          {phase !== 'idle' && <Burst />}
          <button className={`orb ${phase === 'burst' ? 'popped' : phase === 'done' ? 'glow' : ''}`} onClick={tap} aria-label="수정구슬">
            <span>✨</span>
          </button>
          <div className="orb-stand" />
        </div>
        {phase === 'idle' ? (
          <p className="tap-hint">👆 구슬을 톡 눌러보세요</p>
        ) : (
          <div className="count">
            <div className="n">{count.toLocaleString('ko-KR')}</div>
            <div className="u">코인</div>
          </div>
        )}
        <div className="spacer" />
        {phase === 'done' && (
          <div className="reveal-done">
            <p>1억 코인이 입금됐어요. 현실에선 한 푼도 못 써요 😌</p>
            <button className="btn btn-butter btn-block" onClick={() => onDone(total.current)}>
              꿈 사러 가기 →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
