import { formatCoins } from '../lib/format';
import type { Profile } from '../lib/types';
import { useCountUp } from '../lib/useCountUp';

export type Tab = 'market' | 'mine';

interface Props {
  profile: Profile;
  guest: boolean;
  tab: Tab;
  onTab: (t: Tab) => void;
  onSignup: () => void;
}

export default function Header({ profile, guest, tab, onTab, onSignup }: Props) {
  const coins = useCountUp(profile.coins);
  return (
    <header className="header">
      <div className="header-top">
        <div className="brand">🌙 꿈사꿈팔</div>
        {guest ? (
          <button className="wallet guest" onClick={onSignup}>
            👀 게스트 · <strong>가입하고 1억 받기</strong>
          </button>
        ) : (
          <div className="wallet" title={`${profile.coins.toLocaleString('ko-KR')} 코인`}>
            <span className="coin">🪙</span>
            <strong>{formatCoins(coins)}</strong>
          </div>
        )}
      </div>
      <nav className="tabs">
        <button className={tab === 'market' ? 'active' : ''} onClick={() => onTab('market')}>
          🛍️ 꿈 시장
        </button>
        <button className={tab === 'mine' ? 'active' : ''} onClick={() => onTab('mine')}>
          🛏️ {profile.nickname}의 꿈
        </button>
      </nav>
    </header>
  );
}
