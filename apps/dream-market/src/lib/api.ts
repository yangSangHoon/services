import { supabase } from '@lab/core';
import type { Dream, DreamKind, Honesty, OwnedDream, Profile } from './types';

// 공유 DB라 모든 테이블/함수는 앱 접두사를 붙인다 (supabase/migrations/*_dream_market.sql)
const PREFIX = 'dream_market_';
const T = { profiles: `${PREFIX}profiles`, dreams: `${PREFIX}dreams` };
const fn = (name: string) => `${PREFIX}${name}`;

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
    .select('*')
    .eq('status', 'on_sale')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return data as Dream[];
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
  return data as Dream;
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

type Row = Dream & { dream_market_contents: { content: string } | { content: string }[] | null };

export async function fetchMyDreams(userId: string) {
  const { data, error } = await supabase
    .from(T.dreams)
    .select('*, dream_market_contents(content)')
    .or(`seller_id.eq.${userId},buyer_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as Row[]).map(({ dream_market_contents, ...d }): OwnedDream => {
    const c = Array.isArray(dream_market_contents) ? dream_market_contents[0] : dream_market_contents;
    return { ...d, content: c?.content ?? null };
  });
}
