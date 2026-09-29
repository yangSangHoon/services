import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchMarket, fetchMyVotes, voteDream } from '../lib/api';
import { friendlyError, rewardMessage } from '../lib/format';
import { onMarket } from '../lib/realtime';
import { toast } from '../lib/toast';
import type { Dream, Profile, Verdict } from '../lib/types';
import BuyModal from './BuyModal';
import DreamCard from './DreamCard';

type Sort = 'new' | 'cheap' | 'pricey';
const VANISH_MS = 1350;
const POOF_MS = 1300;
const ONLY_ON_SALE_KEY = 'dream-market:only-on-sale';

function readOnlyOnSale() {
  try {
    return localStorage.getItem(ONLY_ON_SALE_KEY) === '1';
  } catch {
    return false;
  }
}

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
  const [poofing, setPoofing] = useState<Set<string>>(new Set());
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<Sort>('new');
  const [onlyOnSale, setOnlyOnSale] = useState(readOnlyOnSale);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [buying, setBuying] = useState<Dream | null>(null);
  const [myVotes, setMyVotes] = useState<Map<string, Verdict>>(new Map());

  const load = useCallback(async () => {
    try {
      const [list, votes] = await Promise.all([fetchMarket(), fetchMyVotes(profile.id)]);
      setDreams(list);
      setMyVotes(votes);
    } catch (err) {
      toast(friendlyError(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [profile.id]);

  const without = (set: Set<string>, id: string) => {
    const next = new Set(set);
    next.delete(id);
    return next;
  };

  /** 거둬진 꿈: 증발하며 목록에서 빠짐 */
  const vanish = useCallback((id: string) => {
    setVanishing((s) => new Set(s).add(id));
    setTimeout(() => {
      setDreams((ds) => ds.filter((d) => d.id !== id));
      setVanishing((s) => without(s, id));
    }, VANISH_MS);
  }, []);

  /** 팔린 꿈: 방울·말풍선이 터지고 흐린 카드로 남음 */
  const markSold = useCallback((id: string, buyer: string) => {
    setDreams((ds) => ds.map((d) => (d.id === id ? { ...d, status: 'sold', buyer_nickname: buyer } : d)));
    setPoofing((s) => new Set(s).add(id));
    setTimeout(() => setPoofing((s) => without(s, id)), POOF_MS);
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
        } else if (e.type === 'sold') {
          markSold(e.dreamId, e.buyer);
          if (e.buyer !== profile.nickname) toast(`💨 ${e.buyer}님이 「${e.title}」을(를) 낚아챘어요!`);
        } else {
          vanish(e.dreamId);
        }
      }),
    [vanish, markSold, profile.id, profile.nickname],
  );

  const toggleOnlyOnSale = (v: boolean) => {
    setOnlyOnSale(v);
    try {
      localStorage.setItem(ONLY_ON_SALE_KEY, v ? '1' : '0');
    } catch {
      /* 저장 못 해도 동작에는 지장 없음 */
    }
  };

  const onSale = dreams.filter((d) => d.status === 'on_sale' && !vanishing.has(d.id));

  const visible = useMemo(() => {
    // 방금 팔린 카드는 연출이 끝날 때까지는 보여준다
    const list = onlyOnSale ? dreams.filter((d) => d.status === 'on_sale' || poofing.has(d.id)) : dreams;
    if (sort === 'cheap') return [...list].sort((a, b) => a.price - b.price);
    if (sort === 'pricey') return [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [dreams, sort, onlyOnSale, poofing]);

  const open = (d: Dream) => {
    if (d.status !== 'on_sale') return;
    if (guest && d.price > 0) {
      toast('유료 꿈은 가입하고 살 수 있어요. 1억 받으러 가요!');
      return onSignup();
    }
    setHighlight(null);
    setBuying(d);
  };

  const vote = async (d: Dream, verdict: Verdict) => {
    try {
      const r = await voteDream(d.id, verdict);
      setDreams((ds) => ds.map((x) => (x.id === d.id ? { ...x, votes_real: r.real, votes_fake: r.fake } : x)));
      setMyVotes((m) => new Map(m).set(d.id, r.verdict));
      if (r.reward.coins !== undefined) onCoins(r.reward.coins);
      const msg = rewardMessage(r.reward, '감정 투표');
      if (msg) toast(msg, 'success');
      else if (r.reward.reason === 'changed') toast('감정을 바꿨어요 (보상은 처음 한 번만)');
    } catch (err) {
      toast(friendlyError(err), 'error');
    }
  };

  const drawRandom = () => {
    const pool = onSale.filter((d) => d.seller_id !== profile.id && (!guest || d.price === 0));
    if (!pool.length) return toast('뽑을 꿈이 없어요 😴');
    const d = pool[Math.floor(Math.random() * pool.length)];
    setHighlight(d.id);
    setTimeout(() => open(d), 900);
  };

  return (
    <main className="content">
      <div className="market-head">
        <div>
          <div className="kicker">✦ 오늘 밤 올라온 꿈</div>
          <h1>
            판매 중인 꿈 <em>{onSale.length}</em>개
          </h1>
        </div>
        <button className="btn btn-gacha" onClick={drawRandom}>
          🎲 아무 꿈 뽑기
        </button>
      </div>

      <div className="filter-row">
        <label className={`check ${onlyOnSale ? 'on' : ''}`}>
          <input type="checkbox" checked={onlyOnSale} onChange={(e) => toggleOnlyOnSale(e.target.checked)} />
          <span className="box">{onlyOnSale ? '✓' : ''}</span>
          안팔린 꿈만 보기
        </label>
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
          <p className="title">{onlyOnSale && dreams.length ? '안팔린 꿈이 없어요' : '시장에 남은 꿈이 없어요'}</p>
          <p className="sub">오늘 밤 누군가 꾸면 다시 올라와요. 먼저 하나 올려볼까요?</p>
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
              poofing={poofing.has(d.id)}
              fresh={fresh.has(d.id)}
              highlighted={highlight === d.id}
              myVote={myVotes.get(d.id)}
              onBuy={open}
              onVote={vote}
            />
          ))}
        </div>
      )}

      {buying && <BuyModal dream={buying} profile={profile} onClose={() => setBuying(null)} onBought={onCoins} onStale={load} />}
    </main>
  );
}
