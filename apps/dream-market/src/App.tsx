import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import Header, { type Tab } from './components/Header';
import Market from './components/Market';
import MyDreams from './components/MyDreams';
import NightSky from './components/NightSky';
import Onboarding from './components/Onboarding';
import SellModal from './components/SellModal';
import Toaster from './components/Toaster';
import WelcomeBonus from './components/WelcomeBonus';
import { fetchProfile } from './lib/api';
import { formatCoins, friendlyError } from './lib/format';
import { connectMarket, onMarket } from './lib/realtime';
import { isConfigured, supabase } from '@lab/core';
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
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [booting, setBooting] = useState(true);
  const [tab, setTab] = useState<Tab>('market');
  const [selling, setSelling] = useState(false);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        setSession(data.session);
        if (data.session) setProfile(await fetchProfile(data.session.user.id));
      })
      .catch((err) => toast(friendlyError(err), 'error'))
      .finally(() => setBooting(false));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session) setProfile(await fetchProfile(session.user.id));
  }, [session]);

  const profileId = profile?.id;
  useEffect(() => {
    if (!profileId) return;
    connectMarket();
    return onMarket((e) => {
      if (e.type === 'sold' && e.sellerId === profileId) {
        toast(`💰 「${e.title}」이(가) 팔렸어요! +${formatCoins(e.price)} 코인`, 'success');
        refreshProfile();
      }
    });
  }, [profileId, refreshProfile]);

  const setCoins = (coins: number) => setProfile((p) => (p ? { ...p, coins } : p));

  if (booting) return <p className="boot">💤</p>;
  if (!session || !profile) return <Onboarding onEnter={setProfile} />;

  return (
    <div className="app">
      <Header profile={profile} tab={tab} onTab={setTab} />
      <main className="content">
        {tab === 'market' ? <Market profile={profile} onCoins={setCoins} /> : <MyDreams profile={profile} />}
      </main>
      <button className="fab" onClick={() => setSelling(true)}>
        ✨ 꿈 팔기
      </button>
      {selling && <SellModal onClose={() => setSelling(false)} />}
      {!profile.bonus_claimed && (
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
