import { formatCoins } from '../lib/format';
import type { Profile } from '../lib/types';
import { useCountUp } from '../lib/useCountUp';

export type Tab = 'market' | 'mine';

export default function Header({ profile, tab, onTab }: { profile: Profile; tab: Tab; onTab: (t: Tab) => void }) {
  const coins = useCountUp(profile.coins);
  return (
    <header className="header">
      <div className="header-top">
        <div className="brand">🌙 꿈사꿈팔</div>
        <div className="wallet" title={`${profile.coins.toLocaleString('ko-KR')} 코인`}>
          <span className="coin">🪙</span>
          <strong>{formatCoins(coins)}</strong>
        </div>
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
