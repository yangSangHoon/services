import { supabase } from '@lab/core';
import type { Dream, DreamKind, Honesty, Profile } from './types';

// 공유 DB라 모든 테이블/함수는 앱 접두사를 붙인다 (supabase/migrations/*_dream_market.sql)
const PREFIX = 'dream_market_';
const T = { profiles: `${PREFIX}profiles`, dreams: `${PREFIX}dreams` };
const fn = (name: string) => `${PREFIX}${name}`;

type Row = Omit<Dream, 'content'> & { dream_market_contents: { content: string } | { content: string }[] | null };

/** 1:1 관계라 객체로 오지만, 배열로 오는 경우도 대비 */
function withContent({ dream_market_contents: c, ...d }: Row): Dream {
  const row = Array.isArray(c) ? c[0] : c;
  return { ...d, content: row?.content ?? null };
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

export async function claimWelcomeBonus() {
  const { data, error } = await supabase.rpc(fn('claim_bonus'));
  if (error) throw error;
  return data as number;
}

export async function fetchMarket() {
  const { data, error } = await supabase
    .from(T.dreams)
    .select('*, dream_market_contents(content)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data as Row[]).map(withContent);
}

export async function sellDream(input: {
  title: string;
  teaser: string;
  content: string;
  kind: DreamKind | null;
  honesty: Honesty;
  price: number;
}) {
  const { data, error } = await supabase.rpc(fn('sell'), {
    p_title: input.title,
    p_teaser: input.teaser,
    p_content: input.content,
    p_kind: input.kind,
    p_honesty: input.honesty,
    p_price: input.price,
  });
  if (error) throw error;
  return { ...(data as Omit<Dream, 'content'>), content: input.content.trim() };
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
    .select('*, dream_market_contents(content)')
    .or(`seller_id.eq.${userId},buyer_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as Row[]).map(withContent);
}
