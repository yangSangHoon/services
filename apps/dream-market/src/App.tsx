import { isConfigured, isGuest, useSession } from '@lab/core';
import { useCallback, useEffect, useState } from 'react';
import { AuthScreen, NicknameStep, SignupForm } from './components/Auth';
import Header, { type Tab } from './components/Header';
import Market from './components/Market';
import MyDreams from './components/MyDreams';
import NightSky from './components/NightSky';
import SellModal from './components/SellModal';
import Toaster from './components/Toaster';
import WelcomeBonus from './components/WelcomeBonus';
import { fetchProfile, joinDreamWorld } from './lib/api';
import { formatCoins, friendlyError } from './lib/format';
import { connectMarket, onMarket } from './lib/realtime';
import { toast } from './lib/toast';
import type { Profile } from './lib/types';

export default function App() {
  return (
    <>
      <NightSky />
      {isConfigured ? <DreamApp /> : <SetupNeeded />}
      <Toaster />
    </>
  );
}

function DreamApp() {
  const { session, loading } = useSession();
  // undefined = 불러오는 중, null = 아직 프로필 없음(닉네임 정하기)
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>('market');
  const [selling, setSelling] = useState(false);
  const [signingUp, setSigningUp] = useState(false);

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
        // 이메일 가입 시 적어둔 닉네임으로 자동 입장
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
        toast(`💰 「${e.title}」이(가) 팔렸어요! +${formatCoins(e.price)} 코인`, 'success');
        refreshProfile();
      }
    });
  }, [profileId, refreshProfile]);

  const setCoins = (coins: number) => setProfile((p) => (p ? { ...p, coins } : p));
  const openSignup = () => setSigningUp(true);

  if (loading) return <p className="boot">💤</p>;
  if (!session) return <AuthScreen />;
  if (profile === undefined) return <p className="boot">💤</p>;
  if (profile === null) return <NicknameStep guest={guest} onDone={setProfile} />;

  return (
    <div className="app">
      <Header profile={profile} guest={guest} tab={tab} onTab={setTab} onSignup={openSignup} />
      <main className="content">
        {tab === 'market' ? (
          <Market profile={profile} guest={guest} onCoins={setCoins} onSignup={openSignup} />
        ) : (
          <MyDreams profile={profile} guest={guest} />
        )}
      </main>
      <button className="fab" onClick={() => setSelling(true)}>
        {guest ? '🎁 꿈 나눔하기' : '✨ 꿈 팔기'}
      </button>
      {selling && <SellModal guest={guest} onClose={() => setSelling(false)} />}
      {signingUp && (
        <div className="overlay" onClick={() => setSigningUp(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <p className="eyebrow">🎁 회원가입</p>
            <h2>가입하면 바로 1억 코인!</h2>
            <p className="muted small">게스트로 올린 꿈과 닉네임은 그대로 이어져요.</p>
            <SignupForm onDone={() => setSigningUp(false)} />
          </div>
        </div>
      )}
      {!guest && !profile.bonus_claimed && (
        <WelcomeBonus
          nickname={profile.nickname}
          onDone={(coins) => setProfile((p) => (p ? { ...p, coins: coins || p.coins, bonus_claimed: true } : p))}
        />
      )}
    </div>
  );
}

function SetupNeeded() {
  return (
    <main className="onboarding">
      <div className="moon">🔧</div>
      <h1 className="brand-title">설정이 필요해요</h1>
      <p className="tagline">
        <code>.env</code> 파일에 <code>VITE_SUPABASE_URL</code>과 <code>VITE_SUPABASE_ANON_KEY</code>를 넣어주세요.
      </p>
    </main>
  );
}
