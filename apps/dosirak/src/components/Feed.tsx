import { useEffect, useState } from 'react';
import { fetchFeed, type FeedMode, type Post } from '../lib/api';
import { TAGS } from '../lib/format';
import { PostCard } from './PostCard';

const TABS: { key: FeedMode; label: string }[] = [
  { key: 'popular', label: '🔥 이번 주 인기' },
  { key: 'latest', label: '🆕 최신' },
  { key: 'recipe', label: '📖 레시피' },
];

export function Feed({ needProfile, mode: fixed, user, crew, empty }: { needProfile: () => Promise<boolean>; mode?: FeedMode; user?: string; crew?: string; empty?: string }) {
  const [mode, setMode] = useState<FeedMode>(fixed ?? 'popular');
  const [tag, setTag] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState('');

  const load = async (reset: boolean) => {
    setLoading(true);
    setError('');
    try {
      const prev = reset ? [] : posts;
      const next = await fetchFeed(mode, { user, crew, tag, before: mode === 'popular' ? undefined : prev[prev.length - 1]?.created_at });
      // 인기순은 커서가 없어서 한 번에 50개
      setPosts(mode === 'popular' ? next : [...prev, ...next]);
      setMore(mode !== 'popular' && next.length >= 20);
    } catch {
      setError('불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, tag, user, crew]);

  return (
    <>
      {!fixed && (
        <>
          <div className="tabs">
            {TABS.map((t) => (
              <button key={t.key} className={mode === t.key ? 'on' : ''} onClick={() => setMode(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="chips scroll">
            {TAGS.map((t) => (
              <button key={t} className={`chip ${tag === t ? 'on' : ''}`} onClick={() => setTag(tag === t ? null : t)}>
                {t}
              </button>
            ))}
          </div>
        </>
      )}
      {error && <p className="err center">{error}</p>}
      <div className="posts">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} needProfile={needProfile} />
        ))}
      </div>
      {loading && <p className="muted center">🍱 불러오는 중…</p>}
      {!loading && !error && posts.length === 0 && <p className="muted center">{empty ?? (mode === 'popular' ? '이번 주 도시락이 아직 없어요. 첫 자랑을 해 보세요!' : '아직 도시락이 없어요.')}</p>}
      {!loading && more && (
        <button className="btn ghost block" onClick={() => load(false)}>
          더 보기
        </button>
      )}
    </>
  );
}
