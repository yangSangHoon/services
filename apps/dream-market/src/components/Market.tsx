import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchMarket } from '../lib/api';
import { KIND_KEYS, KINDS } from '../lib/dreamMeta';
import { friendlyError } from '../lib/format';
import { onMarket } from '../lib/realtime';
import { toast } from '../lib/toast';
import type { Dream, DreamKind, Profile } from '../lib/types';
import BuyModal from './BuyModal';
import DreamCard from './DreamCard';

type Sort = 'new' | 'cheap' | 'pricey';
const VANISH_MS = 900;

export default function Market({ profile, onCoins }: { profile: Profile; onCoins: (coins: number) => void }) {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [loading, setLoading] = useState(true);
  const [vanishing, setVanishing] = useState<Set<string>>(new Set());
  const [kind, setKind] = useState<DreamKind | 'all'>('all');
  const [sort, setSort] = useState<Sort>('new');
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
        } else {
          vanish(e.dreamId);
          if (e.type === 'sold' && e.buyer !== profile.nickname) toast(`🛒 ${e.buyer}님이 「${e.title}」을(를) 낚아챘어요!`);
        }
      }),
    [vanish, profile.nickname],
  );

  const visible = useMemo(() => {
    const list = kind === 'all' ? dreams : dreams.filter((d) => d.kind === kind);
    if (sort === 'cheap') return [...list].sort((a, b) => a.price - b.price);
    if (sort === 'pricey') return [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [dreams, kind, sort]);

  const drawRandom = () => {
    const pool = dreams.filter((d) => d.seller_id !== profile.id && !vanishing.has(d.id));
    if (!pool.length) return toast('뽑을 꿈이 없어요. 직접 하나 팔아보는 건 어때요? 😴');
    setBuying(pool[Math.floor(Math.random() * pool.length)]);
  };

  return (
    <section className="market">
      <div className="market-bar">
        <div className="chips">
          <button className={kind === 'all' ? 'chip active' : 'chip'} onClick={() => setKind('all')}>
            전체
          </button>
          {KIND_KEYS.map((k) => (
            <button key={k} className={kind === k ? 'chip active' : 'chip'} onClick={() => setKind(k)}>
              {KINDS[k].emoji} {KINDS[k].label}
            </button>
          ))}
        </div>
        <div className="market-actions">
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="정렬">
            <option value="new">최신순</option>
            <option value="cheap">싼 꿈부터</option>
            <option value="pricey">비싼 꿈부터</option>
          </select>
          <button className="btn-gacha" onClick={drawRandom}>
            🎲 아무 꿈 뽑기
          </button>
        </div>
      </div>

      {loading ? (
        <p className="empty">꿈을 불러오는 중… 💤</p>
      ) : visible.length === 0 ? (
        <p className="empty">
          아직 이 시장엔 꿈이 없어요.
          <br />첫 번째 꿈 장수가 되어보세요!
        </p>
      ) : (
        <div className="grid">
          {visible.map((d, i) => (
            <DreamCard
              key={d.id}
              dream={d}
              index={i}
              isMine={d.seller_id === profile.id}
              vanishing={vanishing.has(d.id)}
              onBuy={setBuying}
            />
          ))}
        </div>
      )}

      {buying && <BuyModal dream={buying} profile={profile} onClose={() => setBuying(null)} onBought={onCoins} />}
    </section>
  );
}
