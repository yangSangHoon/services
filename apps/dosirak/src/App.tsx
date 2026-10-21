import { isConfigured, useSession } from '@lab/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Composer } from './components/Composer';
import { CrewBoard, Crews, Join } from './components/Crews';
import { Feed } from './components/Feed';
import { Me } from './components/Me';
import { PostDetail } from './components/PostDetail';
import { ProfileSheet } from './components/ProfileSheet';
import { UserPage } from './components/UserPage';
import { getMyProfile, type Profile } from './lib/api';
import { go, useRoute } from './lib/route';

export default function App() {
  const route = useRoute();
  const { session } = useSession();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [sheet, setSheet] = useState(false);
  const [justSaved, setJustSaved] = useState<number | null>(null);
  const waiter = useRef<((ok: boolean) => void) | null>(null);

  useEffect(() => {
    if (!isConfigured) return setProfile(null);
    getMyProfile(true)
      .then(setProfile)
      .catch(() => setProfile(null));
  }, [session?.user.id]);

  /** 글쓰기·맛있겠다·댓글·멤버 전에 프로필(닉네임+점심값) 한 번 */
  const needProfile = useCallback(async () => {
    if (profile) return true;
    setSheet(true);
    return new Promise<boolean>((r) => (waiter.current = r));
  }, [profile]);

  const closeSheet = (p: Profile | null) => {
    if (p) setProfile(p);
    setSheet(false);
    waiter.current?.(Boolean(p));
    waiter.current = null;
  };

  // 쓰기·내 도시락은 프로필이 있어야 열린다
  useEffect(() => {
    if ((route.name === 'new' || route.name === 'me') && profile === null) {
      needProfile().then((ok) => !ok && go('#/'));
    }
    if (route.name !== 'me') setJustSaved(null);
  }, [route.name, profile, needProfile]);

  const me = session?.user.id ?? null;
  const tab = route.name === 'me' ? 'me' : route.name === 'crews' || route.name === 'crew' || route.name === 'join' ? 'crew' : 'feed';

  let page: React.ReactNode;
  switch (route.name) {
    case 'new':
      page = profile ? (
        <Composer
          profile={profile}
          onSaved={(_id, saved) => {
            go('#/me');
            setTimeout(() => setJustSaved(saved), 0);
          }}
        />
      ) : null;
      break;
    case 'me':
      page = profile ? <Me profile={profile} justSaved={justSaved} onEdit={() => setSheet(true)} /> : null;
      break;
    case 'post':
      page = <PostDetail key={route.id} id={route.id} me={me} needProfile={needProfile} />;
      break;
    case 'user':
      page = <UserPage key={route.id} id={route.id} needProfile={needProfile} />;
      break;
    case 'crews':
      page = <Crews />;
      break;
    case 'crew':
      page = <CrewBoard key={route.id} id={route.id} me={me} needProfile={needProfile} />;
      break;
    case 'join':
      page = <Join code={route.code} />;
      break;
    default:
      page = (
        <div className="page">
          <header className="brand">
            <h1>
              싸왔어? <span>🍱</span>
            </h1>
            <p className="muted small">오늘 싸 온 도시락 자랑하고, 아낀 점심값 쌓기</p>
          </header>
          <Feed needProfile={needProfile} />
        </div>
      );
  }

  return (
    <div className="app">
      {!isConfigured && <p className="err center">.env 설정이 필요해요</p>}
      {page}
      {route.name !== 'new' && (
        <nav className="nav">
          <button className={tab === 'feed' ? 'on' : ''} onClick={() => go('#/')}>
            <span>🍱</span>자랑
          </button>
          <button className="fab" onClick={() => go('#/new')} aria-label="오늘 도시락 올리기">
            ＋
          </button>
          <button className={tab === 'crew' ? 'on' : ''} onClick={() => go('#/crew')}>
            <span>👥</span>멤버
          </button>
          <button className={tab === 'me' ? 'on' : ''} onClick={() => go('#/me')}>
            <span>💰</span>내 도시락
          </button>
        </nav>
      )}
      {sheet && <ProfileSheet initial={profile ?? null} onDone={closeSheet} onClose={() => closeSheet(null)} />}
    </div>
  );
}
