import { track } from '@lab/core/track';
import { useCallback, useEffect, useState } from 'react';
import { loadHidden, saveHidden } from '../lib/store';
import { fetchFeed, fetchPeople, fetchStats, follow, getProfile, suggestPeople, type FeedItem, type Profile, type Stats } from '../lib/social';
import { usePhotoUrls } from '../lib/usePhotos';
import { FeedCard } from './FeedCard';

/**
 * 소셜 화면 (해시 라우트). 작성 화면과 분리돼 있어서 "바로 쓰기" 흐름은 그대로.
 *   #/explore            추천 피드 (랜덤)
 *   #/explore/following  구독 피드
 *   #/u/<userId>         프로필
 */
export type SocialRoute = { name: 'explore'; tab: 'discover' | 'following' } | { name: 'user'; id: string };

export const go = (hash: string) => {
  location.hash = hash;
};

/** 추천↔구독 전환은 뒤로가기 기록을 쌓지 않는다 */
const swap = (hash: string) => {
  history.replaceState(null, '', hash);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
};

export function parseRoute(hash: string): SocialRoute | null {
  if (hash.startsWith('#/explore')) return { name: 'explore', tab: hash === '#/explore/following' ? 'following' : 'discover' };
  const m = hash.match(/^#\/u\/([0-9a-f-]{36})$/);
  return m ? { name: 'user', id: m[1] } : null;
}

export function Social({ route, me, onEditProfile }: { route: SocialRoute; me: Profile | null; onEditProfile: () => void }) {
  const back = () => (history.length > 1 ? history.back() : go(''));
  return (
    <div className="social">
      <header className="top">
        <button className="back" onClick={back} aria-label="뒤로">
          ←
        </button>
        <span className="top-title">{route.name === 'explore' ? '🌏 다른 사람 찰나' : '프로필'}</span>
        <button className="me-btn" onClick={() => (me ? go(`#/u/${me.user_id}`) : onEditProfile())}>
          {me ? <span className="avatar sm">{me.avatar}</span> : '프로필 만들기'}
        </button>
      </header>
      {route.name === 'explore' ? <Explore tab={route.tab} /> : <ProfilePage key={route.id} userId={route.id} me={me} onEditProfile={onEditProfile} />}
    </div>
  );
}

function Explore({ tab }: { tab: 'discover' | 'following' }) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(true);
  const [error, setError] = useState('');
  const [people, setPeople] = useState<(Profile & { posts: number })[]>([]);
  const [hidden] = useState(loadHidden);
  const urls = usePhotoUrls(items.map((i) => i.photo_path));

  const load = useCallback(
    async (reset: boolean) => {
      setLoading(true);
      setError('');
      try {
        const prev = reset ? [] : items;
        const next =
          tab === 'discover'
            ? await fetchFeed('discover', { exclude: prev.map((i) => i.id) })
            : await fetchFeed('following', { before: prev[prev.length - 1]?.happened_at });
        setItems([...prev, ...next.filter((i) => !hidden.includes(i.user_id))]);
        setMore(next.length >= 20);
      } catch {
        setError('불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tab, items, hidden],
  );

  useEffect(() => {
    setItems([]);
    load(true);
    suggestPeople()
      .then((p) => setPeople(p.filter((x) => !hidden.includes(x.user_id))))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <main className="page">
      <div className="feed-tabs">
        <button className={tab === 'discover' ? 'on' : ''} onClick={() => swap('#/explore')}>
          ✨ 추천
        </button>
        <button className={tab === 'following' ? 'on' : ''} onClick={() => swap('#/explore/following')}>
          👥 구독
        </button>
        {tab === 'discover' && (
          <button className="shuffle" onClick={() => load(true)} disabled={loading}>
            🔀 새로 섞기
          </button>
        )}
      </div>

      {people.length > 0 && (tab === 'discover' || (!loading && items.length === 0)) && (
        <section className="people-strip">
          <h2>{tab === 'following' ? '이런 분들을 구독해 보세요' : '새로운 사람'}</h2>
          <div className="people-row">
            {people.map((p) => (
              <PersonChip key={p.user_id} person={p} sub={`찰나 ${p.posts}`} />
            ))}
          </div>
        </section>
      )}

      {error && <p className="warn center">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="muted center">
          {tab === 'following' ? '구독한 사람의 공개 찰나가 여기에 모여요.' : '아직 공개된 찰나가 없어요. 첫 번째가 되어 보세요!'}
        </p>
      )}

      <div className="feed-list">
        {items.map((i) => (
          <FeedCard key={i.id} item={i} photo={i.photo_path ? urls[i.photo_path] : undefined} onAuthor={(id) => go(`#/u/${id}`)} />
        ))}
      </div>

      {loading ? (
        <p className="muted center">불러오는 중…</p>
      ) : (
        more &&
        items.length > 0 && (
          <button className="btn ghost block" onClick={() => load(false)}>
            더 보기
          </button>
        )
      )}
    </main>
  );
}

function PersonChip({ person, sub }: { person: Profile; sub: string }) {
  const [on, setOn] = useState(false);
  return (
    <div className="person-chip">
      <button className="person-main" onClick={() => go(`#/u/${person.user_id}`)}>
        <span className="avatar lg">{person.avatar}</span>
        <b>{person.nickname}</b>
        <span className="muted small">{sub}</span>
      </button>
      <button
        className={`follow-btn sm ${on ? 'on' : ''}`}
        onClick={async () => {
          setOn(!on);
          await follow(person.user_id, !on).catch(() => setOn(on));
          if (!on) track('moments', 'follow');
        }}
      >
        {on ? '구독 중' : '구독'}
      </button>
    </div>
  );
}

function ProfilePage({ userId, me, onEditProfile }: { userId: string; me: Profile | null; onEditProfile: () => void }) {
  const isMe = me?.user_id === userId;
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [stats, setStats] = useState<Stats | null>(null);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [list, setList] = useState<'followers' | 'following' | null>(null);
  const [hidden, setHidden] = useState(() => loadHidden().includes(userId));
  const urls = usePhotoUrls(items.map((i) => i.photo_path));

  useEffect(() => {
    getProfile(userId).then(setProfile).catch(() => setProfile(null));
    fetchStats(userId).then(setStats).catch(() => undefined);
    fetchFeed('user', { user: userId, limit: 50 }).then(setItems).catch(() => undefined);
  }, [userId]);

  useEffect(() => {
    if (isMe && me) setProfile(me);
  }, [isMe, me]);

  const toggleFollow = async () => {
    if (!stats) return;
    const next = !stats.i_follow;
    setStats({ ...stats, i_follow: next, followers: stats.followers + (next ? 1 : -1) });
    try {
      await follow(userId, next);
      if (next) track('moments', 'follow');
    } catch {
      setStats(stats);
    }
  };

  const toggleHidden = () => {
    const ids = loadHidden();
    const next = !hidden;
    saveHidden(next ? [...ids, userId] : ids.filter((x) => x !== userId));
    setHidden(next);
  };

  if (profile === undefined) return <p className="muted center">불러오는 중…</p>;
  if (profile === null) return <p className="muted center">프로필을 찾을 수 없어요.</p>;

  return (
    <main className="page">
      <section className="profile-head">
        <span className="avatar xl">{profile.avatar}</span>
        <h1>{profile.nickname}</h1>
        {profile.bio && <p className="muted">{profile.bio}</p>}
        <div className="stats">
          <div>
            <b>{stats?.posts ?? '·'}</b>
            <span>공개 찰나</span>
          </div>
          <button onClick={() => setList('followers')}>
            <b>{stats?.followers ?? '·'}</b>
            <span>구독자</span>
          </button>
          <button onClick={() => setList('following')}>
            <b>{stats?.following ?? '·'}</b>
            <span>구독 중</span>
          </button>
        </div>
        {isMe ? (
          <button className="btn ghost block" onClick={onEditProfile}>
            ✏️ 프로필 수정
          </button>
        ) : (
          <div className="row-btns">
            <button className={`follow-btn ${stats?.i_follow ? 'on' : ''}`} onClick={toggleFollow} disabled={!stats}>
              {stats?.i_follow ? '구독 중 ✓' : '＋ 구독하기'}
            </button>
            <button className="btn ghost" onClick={toggleHidden}>
              {hidden ? '다시 보기' : '🚫 안 보기'}
            </button>
          </div>
        )}
      </section>

      {isMe && <p className="muted small center-tight">내 보관함에서 🌏 공개로 바꾼 찰나만 여기에 보여요.</p>}

      <div className="feed-list">
        {items.map((i) => (
          <FeedCard key={i.id} item={i} photo={i.photo_path ? urls[i.photo_path] : undefined} />
        ))}
      </div>
      {items.length === 0 && <p className="muted center">공개한 찰나가 아직 없어요.</p>}

      {list && <PeopleSheet userId={userId} kind={list} onClose={() => setList(null)} />}
    </main>
  );
}

function PeopleSheet({ userId, kind, onClose }: { userId: string; kind: 'followers' | 'following'; onClose: () => void }) {
  const [people, setPeople] = useState<Profile[] | null>(null);
  useEffect(() => {
    fetchPeople(userId, kind)
      .then(setPeople)
      .catch(() => setPeople([]));
  }, [userId, kind]);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <h2 className="sheet-title">{kind === 'followers' ? '구독자' : '구독 중'}</h2>
        {people === null ? (
          <p className="muted center">불러오는 중…</p>
        ) : people.length === 0 ? (
          <p className="muted center">아직 없어요.</p>
        ) : (
          <ul className="people-list">
            {people.map((p) => (
              <li key={p.user_id}>
                <button
                  onClick={() => {
                    onClose();
                    go(`#/u/${p.user_id}`);
                  }}
                >
                  <span className="avatar">{p.avatar}</span>
                  <span>
                    <b>{p.nickname}</b>
                    {p.bio && <small className="muted">{p.bio}</small>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
