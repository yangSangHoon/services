import { useCallback, useEffect, useState } from 'react';
import { fetchMyDreams, withdrawDream } from '../lib/api';
import { interpret, KINDS } from '../lib/dreamMeta';
import { formatCoins, friendlyError, timeAgo } from '../lib/format';
import { announce, onMarket } from '../lib/realtime';
import { toast } from '../lib/toast';
import type { OwnedDream, Profile } from '../lib/types';

type Section = 'bought' | 'selling' | 'sold';

export default function MyDreams({ profile }: { profile: Profile }) {
  const [dreams, setDreams] = useState<OwnedDream[] | null>(null);
  const [section, setSection] = useState<Section>('bought');

  const load = useCallback(async () => {
    try {
      setDreams(await fetchMyDreams(profile.id));
    } catch (err) {
      toast(friendlyError(err), 'error');
    }
  }, [profile.id]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => onMarket((e) => e.type === 'sold' && e.sellerId === profile.id && load()), [load, profile.id]);

  const withdraw = async (d: OwnedDream) => {
    try {
      await withdrawDream(d.id);
      announce({ type: 'withdrawn', dreamId: d.id });
      toast('꿈을 다시 베개 밑에 넣었어요 🛏️');
      load();
    } catch (err) {
      toast(friendlyError(err), 'error');
    }
  };

  const bought = dreams?.filter((d) => d.buyer_id === profile.id) ?? [];
  const selling = dreams?.filter((d) => d.seller_id === profile.id && d.status === 'on_sale') ?? [];
  const sold = dreams?.filter((d) => d.seller_id === profile.id && d.status === 'sold') ?? [];
  const earned = sold.reduce((sum, d) => sum + d.price, 0);
  const list = { bought, selling, sold }[section];

  return (
    <section className="mine">
      <div className="stats">
        <div>
          <strong>{bought.length}</strong>
          <span>산 꿈</span>
        </div>
        <div>
          <strong>{selling.length}</strong>
          <span>판매 중</span>
        </div>
        <div>
          <strong>🪙 {formatCoins(earned)}</strong>
          <span>꿈 팔아 번 돈</span>
        </div>
      </div>

      <div className="segmented">
        <button className={section === 'bought' ? 'active' : ''} onClick={() => setSection('bought')}>
          🫙 꿈 보관함
        </button>
        <button className={section === 'selling' ? 'active' : ''} onClick={() => setSection('selling')}>
          🏷️ 판매 중
        </button>
        <button className={section === 'sold' ? 'active' : ''} onClick={() => setSection('sold')}>
          💰 팔린 꿈
        </button>
      </div>

      {dreams === null ? (
        <p className="empty">뒤척이는 중… 💤</p>
      ) : list.length === 0 ? (
        <p className="empty">{EMPTY[section]}</p>
      ) : (
        <ul className="owned-list">
          {list.map((d) => (
            <li key={d.id} className="owned">
              <div className="owned-head">
                <span className="kind-emoji">{KINDS[d.kind].emoji}</span>
                <div>
                  <h3>{d.title}</h3>
                  <p className="muted small">
                    {section === 'bought' && `${d.seller_nickname}에게서 구매 · 🪙 ${formatCoins(d.price)}`}
                    {section === 'selling' && `🪙 ${formatCoins(d.price)} · ${timeAgo(d.created_at)} 등록`}
                    {section === 'sold' && `${d.buyer_nickname ?? '누군가'}님이 🪙 ${formatCoins(d.price)}에 사갔어요`}
                  </p>
                </div>
                {section === 'selling' && (
                  <button className="btn-ghost small" onClick={() => withdraw(d)}>
                    거두기
                  </button>
                )}
              </div>
              {d.content && <p className="dream-content">{d.content}</p>}
              {section === 'bought' && <p className="fortune-line">🔮 {interpret(d.id).fortune}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const EMPTY: Record<Section, string> = {
  bought: '아직 산 꿈이 없어요. 시장에 가서 하나 골라보세요 🛍️',
  selling: '판매 중인 꿈이 없어요. 어젯밤 꿈, 팔아보세요!',
  sold: '아직 팔린 꿈이 없어요. 가격을 좀 내려볼까요? 😏',
};
