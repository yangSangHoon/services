import { signOut } from '@lab/core';
import { useEffect, useRef, useState } from 'react';
import { formatCoins } from '../lib/format';
import type { Profile } from '../lib/types';
import { useCountUp } from '../lib/useCountUp';

export type View = 'market' | 'bought' | 'selling';

interface Props {
  profile: Profile;
  guest: boolean;
  onNavigate: (v: View) => void;
  onSignup: () => void;
}

export default function Header({ profile, guest, onNavigate, onSignup }: Props) {
  const [open, setOpen] = useState(false);
  const coins = useCountUp(profile.coins);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const go = (v: View) => {
    setOpen(false);
    onNavigate(v);
  };

  return (
    <header className="header">
      <div className="header-top">
        <button className="brand-btn" onClick={() => go('market')} aria-label="꿈 시장으로">
          <span className="mini-moon" />
          <span className="brand">꿈사꿈팔</span>
        </button>
        <div className="profile" ref={ref}>
          <button className={`avatar ${open ? 'on' : ''}`} onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} aria-label="내 프로필">
            {Array.from(profile.nickname.trim())[0] ?? '🌙'}
            {guest && <span className="avatar-tag">게스트</span>}
          </button>
          {open && (
            <div className="profile-menu" role="menu">
              <div className="pm-head">
                <div className="pm-name">{profile.nickname}</div>
                {guest ? (
                  <button className="btn btn-butter pm-join" onClick={() => (setOpen(false), onSignup())}>
                    🎁 가입하고 1억 받기
                  </button>
                ) : (
                  <div className="pm-coins" title={`${profile.coins.toLocaleString('ko-KR')} 코인`}>
                    <span className="coin">꿈</span>
                    <span>
                      <small>보유 코인</small>
                      {formatCoins(coins)}
                    </span>
                  </div>
                )}
              </div>
              <button role="menuitem" className="pm-item" onClick={() => go('bought')}>
                🫙 내가 산 꿈
              </button>
              <button role="menuitem" className="pm-item" onClick={() => go('selling')}>
                🏷️ 내가 올린 꿈
              </button>
              <button role="menuitem" className="pm-item muted" onClick={() => signOut()}>
                🌙 {guest ? '게스트 나가기' : '로그아웃'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
