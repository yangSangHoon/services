import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchMarket } from '../lib/api';
import { KIND_KEYS, KINDS, kindMeta } from '../lib/dreamMeta';
import { friendlyError } from '../lib/format';
import { onMarket } from '../lib/realtime';
import { toast } from '../lib/toast';
import type { Dream, DreamKind, Profile } from '../lib/types';
import BuyModal from './BuyModal';
import DreamCard from './DreamCard';

type Sort = 'new' | 'cheap' | 'pricey';
type Filter = DreamKind | 'none' | 'all';
const VANISH_MS = 1350;

const CHIPS: { id: Filter; emoji: string; label: string }[] = [
  { id: 'all', emoji: '✨', label: '전체' },
  ...KIND_KEYS.map((k) => ({ id: k, emoji: KINDS[k].emoji, label: KINDS[k].label })),
  { id: 'none', emoji: kindMeta(null).emoji, label: kindMeta(null).label },
];

interface Props {
  profile: Profile;
  guest: boolean;
  onCoins: (coins: number) => void;
  onSignup: () => void;
}

export default function Market({ profile, guest, onCoins, onSignup }: Props) {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [loading, setLoading] = useState(true);
  const [vanishing, setVanishing] = useState<Set<string>>(new Set());
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('new');
  const [highlight, setHighlight] = useState<string | null>(null);
  const [buying, setBuying] = useState<Dream | null>(null);

  const load = useCallback(async () => {
    try {
      setDreams(await fetchMarket());
    } catch (err) {
      toast(friendlyError(err), 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const vanish = useCallback((id: string) => {
    setVanishing((s) => new Set(s).add(id));
    setTimeout(() => {
      setDreams((ds) => ds.filter((d) => d.id !== id));
      setVanishing((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }, VANISH_MS);
  }, []);

  useEffect(() => {
    load();
    const refetch = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', refetch);
    return () => document.removeEventListener('visibilitychange', refetch);
  }, [load]);

  useEffect(
    () =>
      onMarket((e) => {
        if (e.type === 'listed') {
          setDreams((ds) => (ds.some((d) => d.id === e.dream.id) ? ds : [e.dream, ...ds]));
          setFresh((s) => new Set(s).add(e.dream.id));
          if (e.dream.seller_id !== profile.id) toast(`${e.dream.seller_nickname}님이 새 꿈을 올렸어요 ✨`);
          return;
        }
        vanish(e.dreamId);
        if (e.type === 'sold' && e.buyer !== profile.nickname) toast(`💨 ${e.buyer}님이 「${e.title}」을(를) 낚아챘어요!`);
      }),
    [vanish, profile.id, profile.nickname],
  );

  const visible = useMemo(() => {
    const list = filter === 'all' ? dreams : dreams.filter((d) => (d.kind ?? 'none') === filter);
    if (sort === 'cheap') return [...list].sort((a, b) => a.price - b.price);
    if (sort === 'pricey') return [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [dreams, filter, sort]);

  const open = (d: Dream) => {
    if (guest && d.price > 0) {
      toast('유료 꿈은 가입하고 살 수 있어요. 1억 받으러 가요!');
      return onSignup();
    }
    setHighlight(null);
    setBuying(d);
  };

  const drawRandom = () => {
    const pool = dreams.filter((d) => d.seller_id !== profile.id && !vanishing.has(d.id) && (!guest || d.price === 0));
    if (!pool.length) return toast('뽑을 꿈이 없어요 😴');
    const d = pool[Math.floor(Math.random() * pool.length)];
    setFilter('all');
    setHighlight(d.id);
    setTimeout(() => open(d), 900);
  };

  const live = dreams.length - vanishing.size;

  return (
    <main className="content">
      <div className="market-head">
        <div>
          <div className="kicker">✦ 오늘 밤 올라온 꿈</div>
          <h1>
            시장에 뜬 꿈 <em>{Math.max(0, live)}</em>개
          </h1>
        </div>
        <button className="btn btn-gacha" onClick={drawRandom}>
          🎲 아무 꿈 뽑기
        </button>
      </div>

      <div className="chips">
        {CHIPS.map((c) => (
          <button key={c.id} className={`chip ${filter === c.id ? 'on' : ''}`} onClick={() => setFilter(c.id)}>
            <span>{c.emoji}</span>
            {c.label}
          </button>
        ))}
      </div>
      <div className="sort-row">
        <select className="sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="정렬">
          <option value="new">🕐 최신순</option>
          <option value="cheap">🪙 싼 꿈부터</option>
          <option value="pricey">💎 비싼 꿈부터</option>
        </select>
      </div>

      {loading ? (
        <div className="empty">
          <div className="emoji">💤</div>
          <p className="title">꿈을 불러오는 중…</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty">
          <div className="emoji">🌫️</div>
          <p className="title">{dreams.length === 0 ? '아직 올라온 꿈이 없어요' : '이 종류 꿈은 다 팔렸어요'}</p>
          <p className="sub">{dreams.length === 0 ? '첫 번째 꿈 장수가 되어보세요!' : '오늘 밤 누군가 꾸면 다시 올라와요.'}</p>
        </div>
      ) : (
        <div className="grid">
          {visible.map((d, i) => (
            <DreamCard
              key={d.id}
              dream={d}
              index={i}
              isMine={d.seller_id === profile.id}
              guest={guest}
              vanishing={vanishing.has(d.id)}
              fresh={fresh.has(d.id)}
              highlighted={highlight === d.id}
              onBuy={open}
            />
          ))}
        </div>
      )}

      {buying && <BuyModal dream={buying} profile={profile} onClose={() => setBuying(null)} onBought={onCoins} />}
    </main>
  );
}
