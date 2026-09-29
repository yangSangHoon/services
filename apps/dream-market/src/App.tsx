import { isConfigured, isGuest, useSession } from '@lab/core';
import { useCallback, useEffect, useState } from 'react';
import { AuthPage, AuthScreen, NickPage, type AuthMode } from './components/Auth';
import { AppBackdrop } from './components/Backdrops';
import Header, { type View } from './components/Header';
import Market from './components/Market';
import MyDreams from './components/MyDreams';
import SellModal from './components/SellModal';
import Toaster from './components/Toaster';
import WelcomeBonus from './components/WelcomeBonus';
import { fetchProfile, joinDreamWorld } from './lib/api';
import { formatCoins, friendlyError } from './lib/format';
import { connectMarket, onMarket } from './lib/realtime';
import { toast } from './lib/toast';
import type { Profile } from './lib/types';

/** #u/<id> = 그 사람의 꿈 모아보기 (링크 공유·뒤로가기 가능) */
const readUserHash = () => location.hash.match(/^#u\/([0-9a-f-]{36})$/)?.[1] ?? null;

export default function App() {
  return (
    <>
      {isConfigured ? <DreamApp /> : <SetupNeeded />}
      <Toaster />
    </>
  );
}

function DreamApp() {
  const { session, loading } = useSession();
  // undefined = 불러오는 중, null = 아직 프로필 없음(닉네임 정하기)
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [view, setView] = useState<View>('market');
  const [selling, setSelling] = useState(false);
  const [signingUp, setSigningUp] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signup');
  const [userPage, setUserPage] = useState<string | null>(readUserHash);

  useEffect(() => {
    const sync = () => setUserPage(readUserHash());
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const openUser = (id: string) => {
    location.hash = `u/${id}`;
    window.scrollTo(0, 0);
  };
  const closeUser = () => {
    if (!userPage) return;
    history.pushState(null, '', location.pathname + location.search);
    setUserPage(null);
  };
  const navigate = (v: View) => {
    closeUser();
    setView(v);
    window.scrollTo(0, 0);
  };

  const guest = isGuest(session);
  const userId = session?.user.id;
  const metaNickname = session?.user.user_metadata?.nickname as string | undefined;

  useEffect(() => {
    setProfile(undefined);
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        let p = await fetchProfile(userId);
        // 가입/게스트 입장 때 적어둔 닉네임으로 자동 입장
        if (!p && metaNickname) p = await joinDreamWorld(metaNickname);
        if (!cancelled) setProfile(p);
      } catch (err) {
        toast(friendlyError(err), 'error');
        if (!cancelled) setProfile(null);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const refreshProfile = useCallback(async () => {
    if (userId) setProfile(await fetchProfile(userId));
  }, [userId]);

  const profileId = profile?.id;
  useEffect(() => {
    if (!profileId) return;
    connectMarket();
    return onMarket((e) => {
      if (e.type !== 'sold' || e.sellerId !== profileId) return;
      if (e.price === 0) {
        toast(`🎁 ${e.buyer}님이 내 꿈 「${e.title}」을(를) 받아갔어요`, 'success');
      } else {
        toast(`💰 ${e.buyer}님이 내 꿈 「${e.title}」을 샀어요 · +${formatCoins(e.price)}`, 'success');
        refreshProfile();
      }
    });
  }, [profileId, refreshProfile]);

  const setCoins = (coins: number) => setProfile((p) => (p ? { ...p, coins } : p));
  const openSignup = () => {
    setAuthMode('signup');
    setSigningUp(true);
  };

  if (loading) return <p className="boot">💤</p>;
  if (!session) return <AuthScreen />;
  if (profile === undefined) return <p className="boot">💤</p>;
  if (profile === null)
    return (
      <div className="app">
        <NickPage onSubmit={async (nickname) => setProfile(await joinDreamWorld(nickname))} />
      </div>
    );

  return (
    <div className="app">
      <AppBackdrop />
      <Header profile={profile} guest={guest} onNavigate={navigate} onSignup={openSignup} />
      {userPage ? (
        <Market
          key={userPage}
          sellerId={userPage}
          onBack={closeUser}
          profile={profile}
          guest={guest}
          onCoins={setCoins}
          onSignup={openSignup}
          onUser={openUser}
        />
      ) : view === 'market' ? (
        <Market profile={profile} guest={guest} onCoins={setCoins} onSignup={openSignup} onUser={openUser} />
      ) : (
        <MyDreams
          key={view}
          initialSection={view === 'bought' ? 'bought' : 'selling'}
          profile={profile}
          guest={guest}
          onBack={() => navigate('market')}
          onSignup={openSignup}
          onRenamed={setProfile}
          onCoins={setCoins}
        />
      )}
      {!selling && (
        <button className="btn fab" onClick={() => setSelling(true)}>
          {guest ? '🎁 꿈 나눔하기' : '✨ 꿈 팔기'}
        </button>
      )}
      {selling && <SellModal guest={guest} onClose={() => setSelling(false)} onCoins={setCoins} />}
      {signingUp && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, overflowY: 'auto' }}>
          <AuthPage mode={authMode} onMode={setAuthMode} upgrading={guest} onBack={() => setSigningUp(false)} onDone={() => setSigningUp(false)} />
        </div>
      )}
      {!guest && !profile.bonus_claimed && (
        <WelcomeBonus
          onDone={(coins) => {
            setProfile((p) => (p ? { ...p, coins: coins || p.coins, bonus_claimed: true } : p));
            if (coins) toast('🌙 첫 계시 완료! 마음껏 꿈을 사보세요');
          }}
        />
      )}
    </div>
  );
}

function SetupNeeded() {
  return (
    <main className="page">
      <div className="page-head">
        <div className="emoji">🔧</div>
        <h1>설정이 필요해요</h1>
        <p>
          <code>.env</code> 파일에 <code>VITE_SUPABASE_URL</code>과 <code>VITE_SUPABASE_ANON_KEY</code>를 넣어주세요.
        </p>
      </div>
    </main>
  );
}
