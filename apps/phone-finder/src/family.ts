import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@lab/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { rpc } from './db';
import { loadMembers, saveMembers, type Me, type Member } from './lib';

/**
 * 가족 채널.
 * - 실시간: Realtime broadcast (presence 는 이 프로젝트에서 채널을 죽이므로 안 씀)
 *   here  : 내 위치·상태 알림 (켜져 있는 동안 10초마다 + 요청받을 때)
 *   hello : "다들 위치 알려줘"
 *   find  : 특정 폰에게 새 위치 요청 (ring=true 면 소리도 울림)
 *   stop  : 소리 끄기 / found : "찾았어요" (울리던 폰이 보냄)
 * - 마지막 위치: phone_finder_report/list RPC. 마이그레이션이 아직 없으면 조용히 건너뛴다.
 */

type Here = Omit<Member, 'seen'>;
type Msg =
  | { t: 'here'; m: Here }
  | { t: 'hello' }
  | { t: 'find'; target: string; ring: boolean; by: string }
  | { t: 'stop'; target: string }
  | { t: 'found'; by: string };

export type Pos = { lat: number; lng: number; acc: number; at: number };
export type GeoState = 'idle' | 'asking' | 'ok' | 'denied' | 'unavailable';

const PING_MS = 10_000;
const DB_MIN_GAP_MS = 30_000;

type Row = {
  device: string;
  name: string;
  emoji: string;
  lat: number | null;
  lng: number | null;
  acc: number | null;
  battery: number | null;
  updated_at: string;
};

async function batteryLevel(): Promise<number | undefined> {
  try {
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number }> };
    if (!nav.getBattery) return undefined;
    return Math.round((await nav.getBattery()).level * 100);
  } catch {
    return undefined;
  }
}

export function useFamily(code: string, me: Me, handlers: { onRing: (by: string) => void; onStop: () => void; onFound: (by: string) => void }) {
  const [members, setMembers] = useState<Record<string, Member>>(() => loadMembers(code));
  const [pos, setPos] = useState<Pos | null>(null);
  const [geo, setGeo] = useState<GeoState>('idle');
  const [connected, setConnected] = useState(false);
  const [waiting, setWaiting] = useState<Record<string, number>>({});

  const chRef = useRef<RealtimeChannel | null>(null);
  const posRef = useRef(pos);
  const meRef = useRef(me);
  const handlersRef = useRef(handlers);
  const lastDbRef = useRef(0);
  posRef.current = pos;
  meRef.current = me;
  handlersRef.current = handlers;

  const merge = useCallback(
    (list: Member[]) => {
      setMembers((prev) => {
        const next = { ...prev };
        for (const m of list) {
          if (m.id === meRef.current.id) continue;
          const old = next[m.id];
          // 더 오래된 위치로 덮어쓰지 않는다
          const newer = !old?.at || (m.at ?? 0) >= old.at;
          next[m.id] = {
            ...old,
            ...m,
            lat: newer ? (m.lat ?? old?.lat) : old.lat,
            lng: newer ? (m.lng ?? old?.lng) : old.lng,
            acc: newer ? (m.acc ?? old?.acc) : old.acc,
            at: newer ? (m.at ?? old?.at) : old.at,
            seen: Math.max(old?.seen ?? 0, m.seen ?? 0) || undefined,
          };
        }
        saveMembers(code, next);
        return next;
      });
    },
    [code],
  );

  const send = useCallback((msg: Msg) => {
    void chRef.current?.send({ type: 'broadcast', event: 'msg', payload: msg });
  }, []);

  /** 내 상태를 가족에게 알리고(실시간) DB 에도 남긴다 */
  const announce = useCallback(
    async (force = false) => {
      const p = posRef.current;
      const battery = await batteryLevel();
      const here: Here = { ...meRef.current, lat: p?.lat, lng: p?.lng, acc: p?.acc, at: p?.at, battery };
      send({ t: 'here', m: here });
      const now = Date.now();
      if (force || now - lastDbRef.current > DB_MIN_GAP_MS) {
        lastDbRef.current = now;
        rpc('report', {
          p_family: code,
          p_device: here.id,
          p_name: here.name,
          p_emoji: here.emoji,
          p_lat: here.lat ?? null,
          p_lng: here.lng ?? null,
          p_acc: here.acc ?? null,
          p_battery: battery ?? null,
        }).catch(() => {});
      }
    },
    [code, send],
  );

  /** 지금 위치를 정확하게 한 번 재고 알린다 */
  const freshFix = useCallback(() => {
    if (!('geolocation' in navigator)) return void announce(true);
    navigator.geolocation.getCurrentPosition(
      (g) => {
        const p = { lat: g.coords.latitude, lng: g.coords.longitude, acc: g.coords.accuracy, at: Date.now() };
        posRef.current = p;
        setPos(p);
        void announce(true);
      },
      () => void announce(true),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  }, [announce]);

  // 위치 추적 (앱이 열려 있는 동안)
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGeo('unavailable');
      return;
    }
    setGeo('asking');
    let first = true;
    const id = navigator.geolocation.watchPosition(
      (g) => {
        setGeo('ok');
        const p = { lat: g.coords.latitude, lng: g.coords.longitude, acc: g.coords.accuracy, at: Date.now() };
        posRef.current = p;
        setPos(p);
        if (first) {
          first = false;
          void announce(true);
        }
      },
      (e) => setGeo(e.code === e.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [announce]);

  // DB 에 남은 마지막 위치 불러오기
  const refreshFromDb = useCallback(() => {
    rpc<Row[]>('list', { p_family: code })
      .then((rows) =>
        merge(
          rows.map((r) => ({
            id: r.device,
            name: r.name,
            emoji: r.emoji,
            lat: r.lat ?? undefined,
            lng: r.lng ?? undefined,
            acc: r.acc ?? undefined,
            battery: r.battery ?? undefined,
            at: r.lat != null ? Date.parse(r.updated_at) : undefined,
          })),
        ),
      )
      .catch(() => {});
  }, [code, merge]);

  useEffect(() => refreshFromDb(), [refreshFromDb]);

  // 실시간 채널
  useEffect(() => {
    const ch = supabase.channel(`phone-finder:${code}`, { config: { broadcast: { self: false } } });
    ch.on('broadcast', { event: 'msg' }, ({ payload }) => {
      const msg = payload as Msg;
      const myId = meRef.current.id;
      if (msg.t === 'here') {
        merge([{ ...msg.m, seen: Date.now() }]);
        setWaiting((w) => {
          if (!w[msg.m.id]) return w;
          const { [msg.m.id]: _, ...rest } = w;
          return rest;
        });
      } else if (msg.t === 'hello') {
        void announce();
      } else if (msg.t === 'find' && msg.target === myId) {
        freshFix();
        if (msg.ring) handlersRef.current.onRing(msg.by);
      } else if (msg.t === 'stop' && msg.target === myId) {
        handlersRef.current.onStop();
      } else if (msg.t === 'found') {
        handlersRef.current.onFound(msg.by);
      }
    });
    ch.subscribe((status) => {
      setConnected(status === 'SUBSCRIBED');
      if (status === 'SUBSCRIBED') {
        send({ t: 'hello' });
        void announce(true);
      }
    });
    chRef.current = ch;
    return () => {
      chRef.current = null;
      void supabase.removeChannel(ch);
    };
  }, [code, merge, announce, freshFix, send]);

  // 켜져 있는 동안 주기적으로 알림. 다시 화면에 돌아오면 바로 알림
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') void announce();
    };
    const t = setInterval(tick, PING_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        send({ t: 'hello' });
        void announce(true);
        refreshFromDb();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [announce, send, refreshFromDb]);

  const find = useCallback(
    (target: string, ring: boolean) => {
      setWaiting((w) => ({ ...w, [target]: Date.now() }));
      send({ t: 'find', target, ring, by: meRef.current.id });
    },
    [send],
  );
  const stopRing = useCallback((target: string) => send({ t: 'stop', target }), [send]);
  const sayFound = useCallback(() => send({ t: 'found', by: meRef.current.id }), [send]);

  const remove = useCallback(
    (id: string) => {
      setMembers((prev) => {
        const { [id]: _, ...rest } = prev;
        saveMembers(code, rest);
        return rest;
      });
      rpc('remove', { p_family: code, p_device: id }).catch(() => {});
    },
    [code],
  );

  return { members, pos, geo, connected, waiting, find, stopRing, sayFound, remove, announce };
}
