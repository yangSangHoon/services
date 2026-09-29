import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@lab/core';
import type { Dream } from './types';

/**
 * 팔린 꿈은 RLS상 다른 사람에게 안 보이기 때문에 postgres_changes로는 "사라짐"을 받을 수 없음.
 * 그래서 거래 결과를 broadcast로 알린다.
 */
export type MarketEvent =
  | { type: 'listed'; dream: Dream }
  | { type: 'sold'; dreamId: string; title: string; sellerId: string; price: number; buyer: string }
  | { type: 'withdrawn'; dreamId: string };

const listeners = new Set<(e: MarketEvent) => void>();
let channel: RealtimeChannel | null = null;

export function connectMarket() {
  if (channel) return;
  channel = supabase
    .channel('dream-market', { config: { broadcast: { self: false } } })
    .on('broadcast', { event: 'market' }, ({ payload }) => {
      listeners.forEach((l) => l(payload as MarketEvent));
    })
    .subscribe();
}

export function onMarket(listener: (e: MarketEvent) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 다른 접속자에게 방송하고, 내 화면에도 즉시 반영 */
export function announce(e: MarketEvent) {
  listeners.forEach((l) => l(e));
  channel?.send({ type: 'broadcast', event: 'market', payload: e });
}
