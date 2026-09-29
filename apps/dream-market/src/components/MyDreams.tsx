import { signOut } from '@lab/core';
import { useCallback, useEffect, useState } from 'react';
import { fetchMyDreams, fetchTodayRewards, withdrawDream } from '../lib/api';
import { interpret, REVIEW_VERDICTS } from '../lib/dreamMeta';
import { formatCoins, friendlyError, rewardMessage } from '../lib/format';
import { announce, onMarket } from '../lib/realtime';
import { toast } from '../lib/toast';
import type { OwnedDream, Profile } from '../lib/types';
import NameCard from './NameCard';
import { ResellForm, ReviewForm } from './OwnedActions';

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

interface Props {
  profile: Profile;
  guest: boolean;
  onSignup: () => void;
  onRenamed: (p: Profile) => void;
  onCoins: (coins: number) => void;
}

export default function MyDreams({ profile, guest, onSignup, onRenamed, onCoins }: Props) {
  const [dreams, setDreams] = useState<OwnedDream[] | null>(null);
  const [section, setSection] = useState<Section>('bought');
  const [form, setForm] = useState<{ id: string; kind: 'review' | 'resell' } | null>(null);
  const [today, setToday] = useState({ write: 0, vote: 0, review: 0 });

  const load = useCallback(async () => {
    try {
      const [mine, counts] = await Promise.all([fetchMyDreams(profile.id), fetchTodayRewards(profile.id)]);
      setDreams(mine);
      setToday(counts);
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

  const reviewed = (d: OwnedDream, review: NonNullable<OwnedDream['review']>, reward: Parameters<typeof rewardMessage>[0]) => {
    setDreams((ds) => ds?.map((x) => (x.id === d.id ? { ...x, review } : x)) ?? null);
    setForm(null);
    if (reward.coins !== undefined) onCoins(reward.coins);
    if (reward.amount > 0) setToday((t) => ({ ...t, review: t.review + 1 }));
    toast(rewardMessage(reward, '후기') ?? '💬 후기를 남겼어요', 'success');
  };

  const resold = (d: OwnedDream) => {
    announce({ type: 'listed', dream: d });
    setForm(null);
    toast('🔁 꿈을 다시 시장에 올렸어요', 'success');
    load();
  };

  const bought = dreams?.filter((d) => d.buyer_id === profile.id) ?? [];
  const selling = dreams?.filter((d) => d.seller_id === profile.id && d.status === 'on_sale') ?? [];
  const sold = dreams?.filter((d) => d.seller_id === profile.id && d.status === 'sold') ?? [];
  const earned = sold.reduce((sum, d) => sum + d.price, 0);
  const list = { bought, selling, sold }[section];
  const [emptyEmoji, emptyTitle, emptySub] = EMPTY[section];

  return (
    <main className="content mine">
      <NameCard profile={profile} guest={guest} onRenamed={(p) => (onRenamed(p), load())} />
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

      {!guest && (
        <div className="earn">
          <div className="earn-title">💰 오늘의 코인 벌기</div>
          <div className="earn-row">
            <span>✍️ 꿈 쓰기</span>
            <b>+100만</b>
            <em>{Math.min(today.write, 3)}/3</em>
          </div>
          <div className="earn-row">
            <span>🗳️ 감정 투표</span>
            <b>+10만</b>
            <em>{Math.min(today.vote, 20)}/20</em>
          </div>
          <div className="earn-row">
            <span>💬 산 꿈 후기</span>
            <b>+50만</b>
            <em>건마다</em>
          </div>
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
            const { fortune, luck } = interpret(d.id);
            return (
              <article key={d.id} className="owned">
                <div className="owned-head">
                  <div>
                    <div className="owned-title">{d.title}</div>
                    <div className="owned-meta">
                      {section === 'bought' && `${d.seller_nickname}에게서 · ${priceText(d.price)}`}
                      {section === 'selling' && priceText(d.price)}
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
                {section === 'bought' && d.review && (
                  <p className="card-review" style={{ background: REVIEW_VERDICTS[d.review.verdict].tint }}>
                    <b>
                      {REVIEW_VERDICTS[d.review.verdict].emoji} {REVIEW_VERDICTS[d.review.verdict].label}
                    </b>
                    “{d.review.body}”
                  </p>
                )}
                {section === 'bought' && (
                  <div className="owned-fortune">
                    <span>🔮 {fortune}</span>
                    <strong>행운 {luck}%</strong>
                  </div>
                )}
                {section === 'bought' &&
                  (form?.id === d.id ? (
                    form.kind === 'review' ? (
                      <ReviewForm dream={d} onDone={(review, reward) => reviewed(d, review, reward)} onCancel={() => setForm(null)} />
                    ) : (
                      <ResellForm dream={d} guest={guest} onDone={resold} onCancel={() => setForm(null)} />
                    )
                  ) : (
                    <div className="owned-actions">
                      {!d.review && (
                        <button className="btn" onClick={() => setForm({ id: d.id, kind: 'review' })}>
                          ✍️ 후기 쓰기{!guest && <small>+50만</small>}
                        </button>
                      )}
                      {d.resold ? (
                        <span className="done">🔁 되팔기함</span>
                      ) : (
                        <button className="btn" onClick={() => setForm({ id: d.id, kind: 'resell' })}>
                          🔁 되팔기
                        </button>
                      )}
                    </div>
                  ))}
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
