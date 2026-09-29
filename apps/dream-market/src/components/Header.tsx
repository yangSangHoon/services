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
        <span className="mini-moon" />
        <span className="brand">꿈사꿈팔</span>
        {guest ? (
          <button className="btn btn-butter btn-join-mini" onClick={onSignup}>
            🎁 가입하고 1억
          </button>
        ) : (
          <div className="wallet" title={`${profile.coins.toLocaleString('ko-KR')} 코인`}>
            <span className="coin">꿈</span>
            {formatCoins(coins)}
          </div>
        )}
      </div>
      <nav>
        <div className="seg">
          <button className={tab === 'market' ? 'on' : ''} onClick={() => onTab('market')}>
            🛍️ 꿈 시장
          </button>
          <button className={tab === 'mine' ? 'on' : ''} onClick={() => onTab('mine')}>
            🛏️ {profile.nickname}의 꿈
          </button>
        </div>
      </nav>
    </header>
  );
}
