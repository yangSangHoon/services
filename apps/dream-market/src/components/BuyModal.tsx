import { useEffect, useRef, useState } from 'react';
import { buyDream } from '../lib/api';
import { interpret } from '../lib/dreamMeta';
import { formatCoins, friendlyError, isGoneError } from '../lib/format';
import { announce } from '../lib/realtime';
import { toast } from '../lib/toast';
import type { Dream, Profile } from '../lib/types';
import { Burst, CloseIcon } from './Backdrops';
import HaemongButton from './HaemongButton';

type Step = 'contract' | 'stamp' | 'loading' | 'won';
const STAMP_MS = 950;
const MIN_TOTAL_MS = 2900; // 도장 + 병 담기 연출이 끝날 때까지는 기다린다

interface Props {
  dream: Dream;
  profile: Profile;
  onClose: () => void;
  onBought: (coins: number) => void;
  /** 이미 팔렸거나 거둬진 꿈이었을 때 목록 새로고침 */
  onStale: () => void;
}

export default function BuyModal({ dream, profile, onClose, onBought, onStale }: Props) {
  const [step, setStep] = useState<Step>('contract');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [luckShown, setLuckShown] = useState(0);
  const [showFortune, setShowFortune] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const free = dream.price === 0;
  const after = profile.coins - dream.price;
  const { fortune, luck } = interpret(dream.id);
  const busy = step === 'stamp' || step === 'loading';
  const close = () => !busy && onClose();

  const buy = async () => {
    if (!agreed) return setError('동의 체크가 필요해요. 꿈에도 약관은 있어요.');
    if (after < 0) return setError('잔고가 부족해요. 꿈을 팔아서 벌어오세요 🥲');
    setError('');
    setStep('stamp');
    timers.current.push(window.setTimeout(() => setStep('loading'), STAMP_MS));
    try {
      const [result] = await Promise.all([buyDream(dream.id), new Promise((r) => setTimeout(r, MIN_TOTAL_MS))]);
      onBought(result.coins);
      announce({ type: 'sold', dreamId: dream.id, title: dream.title, sellerId: dream.seller_id, price: dream.price, buyer: profile.nickname });
      setStep('won');
      countLuck();
    } catch (err) {
      toast(friendlyError(err), 'error');
      if (isGoneError(err)) onStale();
      onClose();
    }
  };

  // 축하 연출 뒤(700ms) 해몽이 나오고 행운 지수가 0에서 차오름
  const countLuck = () => {
    const start = window.setTimeout(() => {
      setShowFortune(true);
      let v = 0;
      const id = window.setInterval(() => {
        v = Math.min(luck, v + 2);
        setLuckShown(v);
        if (v >= luck) clearInterval(id);
      }, 18);
      timers.current.push(id);
    }, 700);
    timers.current.push(start);
  };

  const finish = () => {
    toast('🫙 꿈 보관함에 담았어요');
    onClose();
  };

  return (
    <div className="backdrop" onClick={close}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        <div className="sheet-head">
          <div>
            <div className="k">{dream.seller_nickname}</div>
            <div className="t">{dream.title}</div>
          </div>
          <button className="close-btn" onClick={close} disabled={busy} aria-label="닫기">
            <CloseIcon />
          </button>
        </div>

        {(step === 'contract' || step === 'stamp') && (
          <>
            <div className="contract">
              <div className="h">📜 꿈 매매 계약서</div>
              <div className="r">
                <span>꿈 가격</span>
                <span>{free ? '무료' : `${formatCoins(dream.price)} 코인`}</span>
              </div>
              <div className="r">
                <span>지금 잔고</span>
                <span>{formatCoins(profile.coins)} 코인</span>
              </div>
              <div className="r total">
                <span>구매 후 잔고</span>
                <span className={after < 0 ? 'neg' : ''}>
                  {after < 0 ? '-' : ''}
                  {formatCoins(Math.abs(after))} 코인
                </span>
              </div>
              {step === 'stamp' && (
                <div className="stamp">
                  <b>계약</b>
                  {profile.nickname.split(' ').pop()}
                </div>
              )}
            </div>
            <button className={`agree ${agreed ? 'on' : ''}`} onClick={() => (setAgreed(!agreed), setError(''))} disabled={busy}>
              <span className="box">{agreed ? '✓' : ''}</span>
              환불은 꿈에서만 가능함에 동의합니다
            </button>
            {error && <p className="err">{error}</p>}
            <button className="btn btn-butter btn-block" onClick={buy} disabled={busy}>
              {free ? '🎁 무료로 받기' : '🖋️ 도장 찍고 사기'}
            </button>
            <p className="foot-note">산 꿈은 시장에 '팔림'으로 남고, 내 보관함에도 담겨요.</p>
          </>
        )}

        {step === 'loading' && (
          <div className="jar-step">
            <div className="jar">
              <div className="cork" />
              <div className="neck" />
              <div className="body">
                <div className="liquid" />
                <span className="tw" style={{ left: 30, bottom: 30, fontSize: 14 }}>
                  ✦
                </span>
                <span className="tw" style={{ right: 26, bottom: 60, fontSize: 10, animationDuration: '1.4s', animationDelay: '.3s' }}>
                  ✦
                </span>
              </div>
            </div>
            <p style={{ fontFamily: 'var(--dm-font-display)', fontSize: 18 }}>꿈을 병에 옮겨 담는 중…</p>
            <p className="sub">흘리지 않게 조심조심</p>
          </div>
        )}

        {step === 'won' && (
          <div className="won">
            <div className="celebrate">
              <Burst />
              <span className="party">🎉</span>
              <div className="t">거래 성사!</div>
              <div className="s">
                「{dream.title}」은 이제 {profile.nickname}님의 꿈이에요
              </div>
            </div>
            {showFortune && (
              <>
            <div className="fortune">
              <span className="i">🔮</span>
              <div>
                <div className="l">오늘의 해몽</div>
                <div className="v">{fortune}</div>
              </div>
            </div>
            <div className="luck">
              <div className="top">
                <span>🍀 행운 지수</span>
                <strong>{luckShown}%</strong>
              </div>
              <div className="bar">
                <div style={{ width: `${luckShown}%` }} />
              </div>
            </div>
            <HaemongButton dream={dream} className="wide" label="🔮 AI에게 진짜 해몽 받아보기 (무료)" />
            <button className="btn btn-lav btn-block" onClick={finish}>
              🫙 꿈 보관함에 넣기
            </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
