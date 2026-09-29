import { signOut } from '@lab/core';
import { useCallback, useEffect, useState } from 'react';
import { fetchMyDreams, withdrawDream } from '../lib/api';
import { interpret, kindMeta } from '../lib/dreamMeta';
import { formatCoins, friendlyError } from '../lib/format';
import { announce, onMarket } from '../lib/realtime';
import { toast } from '../lib/toast';
import type { OwnedDream, Profile } from '../lib/types';

type Section = 'bought' | 'selling' | 'sold';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'bought', label: '🫙 보관함' },
  { id: 'selling', label: '🏷️ 판매 중' },
  { id: 'sold', label: '💰 팔린 꿈' },
];

const EMPTY: Record<Section, [string, string, string]> = {
  bought: ['🫙', '보관함이 비어 있어요', '시장에서 마음에 드는 꿈을 골라보세요.'],
  selling: ['🏷️', '판매 중인 꿈이 없어요', '어젯밤 꾼 꿈, 기억날 때 팔아보세요.'],
  sold: ['💤', '아직 팔린 꿈이 없어요', '누가 사가면 여기서 알려드려요.'],
};

const priceText = (n: number) => (n === 0 ? '무료' : `${formatCoins(n)} 코인`);

export default function MyDreams({ profile, guest, onSignup }: { profile: Profile; guest: boolean; onSignup: () => void }) {
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
  const [emptyEmoji, emptyTitle, emptySub] = EMPTY[section];

  return (
    <main className="content mine">
      <div className="stats">
        <div className="stat" style={{ background: 'var(--dm-lav-50)' }}>
          <span>🫙</span>
          <span className="v">{bought.length}</span>
          <span className="l">산 꿈</span>
        </div>
        <div className="stat" style={{ background: 'var(--dm-pink-50)' }}>
          <span>🏷️</span>
          <span className="v">{selling.length}</span>
          <span className="l">판매 중</span>
        </div>
        <div className="stat" style={{ background: '#fff6d6' }}>
          <span>💰</span>
          <span className="v sm">{formatCoins(earned)}</span>
          <span className="l">꿈 팔아 번 코인</span>
        </div>
      </div>

      {guest && (
        <div className="join-banner">
          <span className="orb-emoji">🔮</span>
          <p className="t">
            가입하면 1억 코인이
            <br />
            쏟아져요
          </p>
          <p className="s">게스트로 주고받은 꿈은 그대로 이어져요.</p>
          <button className="btn btn-butter" onClick={onSignup}>
            🎁 가입하고 1억 받기
          </button>
        </div>
      )}

      <div className="seg">
        {SECTIONS.map((s) => (
          <button key={s.id} className={section === s.id ? 'on' : ''} onClick={() => setSection(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="owned-list">
        {dreams === null ? (
          <div className="empty">
            <div className="emoji">💤</div>
            <p className="title">뒤척이는 중…</p>
          </div>
        ) : list.length === 0 ? (
          <div className="empty">
            <div className="emoji">{emptyEmoji}</div>
            <p className="title">{emptyTitle}</p>
            <p className="sub">{emptySub}</p>
          </div>
        ) : (
          list.map((d) => {
            const kind = kindMeta(d.kind);
            const { fortune, luck } = interpret(d.id);
            return (
              <article key={d.id} className="owned">
                <div className="owned-head">
                  <div className="tile tile-sm" style={{ background: kind.tint }}>
                    {kind.emoji}
                  </div>
                  <div>
                    <div className="owned-title">{d.title}</div>
                    <div className="owned-meta">
                      {section === 'bought' && `${d.seller_nickname}에게서 · ${priceText(d.price)}`}
                      {section === 'selling' && `${priceText(d.price)}${d.teaser ? ` · “${d.teaser}”` : ''}`}
                      {section === 'sold' && `${d.buyer_nickname ?? '누군가'}님이 가져감`}
                    </div>
                  </div>
                  {section === 'selling' && (
                    <button className="owned-badge" onClick={() => withdraw(d)}>
                      거두기
                    </button>
                  )}
                  {section === 'sold' && (
                    <span className="owned-badge" style={{ background: '#d4f3e6' }}>
                      {d.price ? `+${formatCoins(d.price)}` : '나눔 완료'}
                    </span>
                  )}
                </div>
                {section === 'bought' && d.content && <div className="owned-content">{d.content}</div>}
                {section === 'bought' && (
                  <div className="owned-fortune">
                    <span>🔮 {fortune}</span>
                    <strong>행운 {luck}%</strong>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      <button className="btn btn-outline" onClick={() => signOut()}>
        🌙 {guest ? '게스트 나가기' : '로그아웃'}
      </button>
    </main>
  );
}
