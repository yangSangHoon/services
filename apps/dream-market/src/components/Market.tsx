import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchMarket, fetchMyVotes, fetchPublicProfile, voteDream } from '../lib/api';
import { friendlyError, rewardMessage } from '../lib/format';
import { onMarket } from '../lib/realtime';
import { toast } from '../lib/toast';
import type { Dream, Profile, Verdict } from '../lib/types';
import BuyModal from './BuyModal';
import DreamCard from './DreamCard';
import NicknameSearch from './NicknameSearch';

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
  /** 닉네임을 누르거나 검색해서 그 사람의 꿈 모아보기로 */
  onUser: (userId: string) => void;
  /** 있으면 이 사람이 올린 꿈만 모아 보는 화면 */
  sellerId?: string;
  onBack?: () => void;
}

export default function Market({ profile, guest, onCoins, onSignup, onUser, sellerId, onBack }: Props) {
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
  const [seller, setSeller] = useState<{ nickname: string; created_at: string } | null | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      const [list, votes] = await Promise.all([fetchMarket(sellerId), fetchMyVotes(profile.id)]);
      setDreams(list);
      setMyVotes(votes);
    } catch (err) {
      toast(friendlyError(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [profile.id, sellerId]);

  useEffect(() => {
    if (sellerId) fetchPublicProfile(sellerId).then(setSeller, () => setSeller(null));
  }, [sellerId]);

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
          if (sellerId && e.dream.seller_id !== sellerId) return;
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
    [vanish, markSold, profile.id, profile.nickname, sellerId],
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


  const onlySaleToggle = (
    <label className={`check ${onlyOnSale ? 'on' : ''}`}>
      <input type="checkbox" checked={onlyOnSale} onChange={(e) => toggleOnlyOnSale(e.target.checked)} />
      <span className="box">{onlyOnSale ? '✓' : ''}</span>
      안팔린 꿈만 보기
    </label>
  );

  return (
    <main className="content">
      {sellerId ? (
        <>
          <button className="back-link" onClick={onBack}>
            ← 꿈 시장으로
          </button>
          <div className="user-head">
            <span className="avatar lg">{seller ? Array.from(seller.nickname)[0] : '💭'}</span>
            <div>
              <div className="kicker">✦ 꿈쟁이 {sellerId === profile.id && '(나)'}</div>
              <h1>{seller === undefined ? '…' : (seller?.nickname ?? '사라진 꿈쟁이')}</h1>
              <p className="muted small">
                올린 꿈 {dreams.length}개 · 판매 중 {onSale.length}개 · 팔린 꿈 {dreams.filter((d) => d.status === 'sold').length}개
              </p>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="market-head">
            <div>
              <div className="kicker">✦ 오늘 밤 올라온 꿈</div>
              <h1>
                판매 중인 꿈 <em>{onSale.length}</em>개
              </h1>
            </div>
            <div className="head-actions">
              <NicknameSearch onPick={onUser} />
              {onlySaleToggle}
            </div>
          </div>
        </>
      )}

      <div className="filter-row">
        {sellerId && onlySaleToggle}
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
          <p className="title">
            {sellerId ? '아직 올린 꿈이 없어요' : onlyOnSale && dreams.length ? '안팔린 꿈이 없어요' : '시장에 남은 꿈이 없어요'}
          </p>
          <p className="sub">{sellerId ? '오늘 밤엔 꿈을 꾸려나 봐요 💤' : '오늘 밤 누군가 꾸면 다시 올라와요. 먼저 하나 올려볼까요?'}</p>
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
              onUser={sellerId ? undefined : onUser}
            />
          ))}
        </div>
      )}

      {buying && <BuyModal dream={buying} profile={profile} onClose={() => setBuying(null)} onBought={onCoins} onStale={load} />}
    </main>
  );
}
