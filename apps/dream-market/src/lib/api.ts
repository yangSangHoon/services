import { supabase } from '@lab/core';
import type { Dream, Honesty, Profile, Review, ReviewVerdict, Reward, Verdict } from './types';

// 공유 DB라 모든 테이블/함수는 앱 접두사를 붙인다 (supabase/migrations/*_dream_market.sql)
const PREFIX = 'dream_market_';
const T = { profiles: `${PREFIX}profiles`, dreams: `${PREFIX}dreams` };
const fn = (name: string) => `${PREFIX}${name}`;

type OneOrMany<T> = T | T[] | null;
type Row = Omit<Dream, 'content' | 'review'> & {
  dream_market_contents: OneOrMany<{ content: string }>;
  dream_market_reviews: OneOrMany<Review>;
};
const DREAM_SELECT = '*, dream_market_contents(content), dream_market_reviews(verdict, body, user_nickname)';

/** 1:1 관계라 객체로 오지만, 배열로 오는 경우도 대비 */
const one = <T,>(v: OneOrMany<T>) => (Array.isArray(v) ? (v[0] ?? null) : v);

function toDream({ dream_market_contents: c, dream_market_reviews: r, ...d }: Row): Dream {
  return { ...d, content: one(c)?.content ?? null, review: one(r) };
}

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase.from(T.profiles).select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function joinDreamWorld(nickname: string) {
  const { data, error } = await supabase.rpc(fn('join'), { p_nickname: nickname });
  if (error) throw error;
  return data as Profile;
}

export async function renameMe(nickname: string) {
  const { data, error } = await supabase.rpc(fn('rename'), { p_nickname: nickname });
  if (error) throw error;
  return data as Profile;
}

export async function claimWelcomeBonus() {
  const { data, error } = await supabase.rpc(fn('claim_bonus'));
  if (error) throw error;
  return data as number;
}

export async function fetchMarket() {
  const { data, error } = await supabase
    .from(T.dreams)
    .select(DREAM_SELECT)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data as Row[]).map(toDream);
}

/** 꿈 올리기 + 쓰기 보상 */
export async function listDream(input: { title: string; content: string; honesty: Honesty; price: number }) {
  const { data, error } = await supabase.rpc(fn('list'), {
    p_title: input.title,
    p_content: input.content,
    p_honesty: input.honesty,
    p_price: input.price,
  });
  if (error) throw error;
  const { dream, reward } = data as { dream: Omit<Dream, 'content' | 'review'>; reward: Reward };
  return { dream: { ...dream, content: input.content.trim(), review: null } as Dream, reward };
}

export async function voteDream(dreamId: string, verdict: Verdict) {
  const { data, error } = await supabase.rpc(fn('vote'), { p_dream_id: dreamId, p_verdict: verdict });
  if (error) throw error;
  return data as { real: number; fake: number; verdict: Verdict; reward: Reward };
}

export async function fetchMyVotes(userId: string) {
  const { data, error } = await supabase.from(`${PREFIX}votes`).select('dream_id, verdict').eq('user_id', userId);
  if (error) throw error;
  return new Map((data as { dream_id: string; verdict: Verdict }[]).map((v) => [v.dream_id, v.verdict]));
}

export async function reviewDream(dreamId: string, verdict: ReviewVerdict, body: string) {
  const { data, error } = await supabase.rpc(fn('review'), { p_dream_id: dreamId, p_verdict: verdict, p_body: body });
  if (error) throw error;
  return data as { review: Review; reward: Reward };
}

/** 산 꿈을 새 매물로 되팔기 */
export async function resellDream(dream: Dream, price: number) {
  const { data, error } = await supabase.rpc(fn('resell'), { p_dream_id: dream.id, p_price: price });
  if (error) throw error;
  return { ...(data as Omit<Dream, 'content' | 'review'>), content: dream.content, review: null } as Dream;
}

/** 오늘(한국 시간) 받은 보상 횟수 */
export async function fetchTodayRewards(userId: string) {
  const kst = new Date(Date.now() + 9 * 3600_000);
  const startOfDay = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) - 9 * 3600_000);
  const { data, error } = await supabase
    .from(`${PREFIX}rewards`)
    .select('kind')
    .eq('user_id', userId)
    .gte('created_at', startOfDay.toISOString());
  if (error) throw error;
  const count = { write: 0, vote: 0, review: 0 };
  for (const r of data as { kind: keyof typeof count }[]) count[r.kind]++;
  return count;
}

export async function buyDream(dreamId: string) {
  const { data, error } = await supabase.rpc(fn('buy'), { p_dream_id: dreamId });
  if (error) throw error;
  return data as { content: string; coins: number };
}

export async function withdrawDream(dreamId: string) {
  const { error } = await supabase.rpc(fn('withdraw'), { p_dream_id: dreamId });
  if (error) throw error;
}


export async function fetchMyDreams(userId: string) {
  const { data, error } = await supabase
    .from(T.dreams)
    .select(DREAM_SELECT)
    .or(`seller_id.eq.${userId},buyer_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as Row[]).map(toDream);
}
