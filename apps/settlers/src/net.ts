import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@lab/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { botAction } from './bot';
import { apply, newGame, type Action, type State } from './game';

/**
 * 방장 브라우저가 심판이다(DB 없음).
 * - 손님은 행동(act)만 보내고, 방장이 규칙으로 검사해서 적용한 뒤 방 상태(room)를 통째로 방송한다.
 * - 봇도 방장 브라우저에서 돈다.
 * - 각자 방 상태를 localStorage 에 두므로 새로고침해도 이어진다. 방장이 나가 있으면 게임이 멈춘다.
 * - 접속 표시는 ping(이 프로젝트에선 Realtime presence 를 켜면 채널이 죽는다).
 */

export type Seat = { id: string | null; name: string; bot: boolean };
export type Room = { code: string; host: string; size: 3 | 4; seats: Seat[]; game: State | null; seq: number };

type Msg =
  | { t: 'hello'; name: string }
  | { t: 'room'; room: Room }
  | { t: 'act'; a: Action }
  | { t: 'err'; to: string; code: string }
  | { t: 'ping' };

const PING_MS = 8000;
const AWAY_MS = 22000;
const BOT_NAMES = ['봇 감자', '봇 고구마', '봇 옥수수', '봇 당근'];

const store = {
  get<T>(k: string): T | null {
    try {
      const raw = localStorage.getItem(k);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* 저장 못 해도 진행 */
    }
  },
};

export const myId: string = (() => {
  const id = store.get<string>('settlers:id') ?? crypto.randomUUID();
  store.set('settlers:id', id);
  return id;
})();

export const savedName = () => store.get<string>('settlers:name') ?? '';
export const saveName = (n: string) => store.set('settlers:name', n);
const roomKey = (code: string) => `settlers:room:${code}`;

export function newRoomCode() {
  const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => abc[b % abc.length]).join('');
}

export function createRoom(code: string, name: string, solo: boolean) {
  const seats: Seat[] = [
    { id: myId, name, bot: false },
    ...[1, 2, 3].map((i) => (solo ? { id: null, name: BOT_NAMES[i], bot: true } : { id: null, name: '', bot: false })),
  ];
  store.set(roomKey(code), { code, host: myId, size: 4, seats, game: null, seq: 1 } satisfies Room);
}

export function useRoom(code: string, name: string) {
  const [room, setRoom] = useState<Room | null>(() => store.get<Room>(roomKey(code)));
  const [connected, setConnected] = useState(false);
  const [heard, setHeard] = useState<Record<string, number>>({});
  const [error, setError] = useState<{ code: string; at: number } | null>(null);
  const roomRef = useRef(room);
  const chRef = useRef<RealtimeChannel | null>(null);
  const nameRef = useRef(name);
  nameRef.current = name;

  const isHost = room?.host === myId;

  const send = useCallback((m: Msg) => {
    void chRef.current?.send({ type: 'broadcast', event: 'msg', payload: { ...m, from: myId } });
  }, []);

  const commit = useCallback(
    (next: Room, broadcast: boolean) => {
      roomRef.current = next;
      store.set(roomKey(next.code), next);
      setRoom(next);
      if (broadcast) send({ t: 'room', room: next });
    },
    [send],
  );

  /** 방장: 행동 적용 */
  const hostApply = useCallback(
    (from: string, a: Action) => {
      const r = roomRef.current;
      if (!r?.game) return;
      const p = r.seats.findIndex((s) => s.id === from);
      if (p < 0) return;
      const res = apply(r.game, p, a);
      if (typeof res === 'string') {
        if (from === myId) setError({ code: res, at: Date.now() });
        else send({ t: 'err', to: from, code: res });
        return;
      }
      commit({ ...r, game: res, seq: r.seq + 1 }, true);
    },
    [commit, send],
  );

  /** 방장: 손님 자리 배정 / 이름 갱신 */
  const hostSeat = useCallback(
    (from: string, who: string) => {
      const r = roomRef.current;
      if (!r) return;
      const at = r.seats.findIndex((s) => s.id === from);
      if (at >= 0) {
        if (who && r.seats[at].name !== who && !r.game) {
          const seats = r.seats.map((s, i) => (i === at ? { ...s, name: who } : s));
          commit({ ...r, seats, seq: r.seq + 1 }, true);
        } else send({ t: 'room', room: r });
        return;
      }
      const free = r.game ? -1 : r.seats.findIndex((s, i) => i < r.size && !s.id && !s.bot);
      if (free < 0) return send({ t: 'room', room: r });
      const seats = r.seats.map((s, i) => (i === free ? { id: from, name: who || `개척자 ${i + 1}`, bot: false } : s));
      commit({ ...r, seats, seq: r.seq + 1 }, true);
    },
    [commit, send],
  );

  useEffect(() => {
    const ch = supabase.channel(`settlers:${code}`, { config: { broadcast: { self: false } } });
    chRef.current = ch;

    ch.on('broadcast', { event: 'msg' }, ({ payload }) => {
      const m = payload as Msg & { from: string };
      if (m.from) setHeard((h) => ({ ...h, [m.from]: Date.now() }));
      const mine = roomRef.current;
      const hosting = mine?.host === myId;
      switch (m.t) {
        case 'hello':
          if (hosting) hostSeat(m.from, m.name);
          break;
        case 'room':
          if (m.room.code !== code) return;
          if (!mine || m.room.seq > mine.seq) commit(m.room, false);
          else if (hosting && m.room.seq < mine.seq) send({ t: 'room', room: mine });
          break;
        case 'act':
          if (hosting) hostApply(m.from, m.a);
          break;
        case 'err':
          if (m.to === myId) setError({ code: m.code, at: Date.now() });
          break;
      }
    });

    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setConnected(true);
        const r = roomRef.current;
        if (r?.host === myId) send({ t: 'room', room: r });
        else send({ t: 'hello', name: nameRef.current });
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        setConnected(false);
      }
    });

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const r = roomRef.current;
      if (r?.host === myId) send({ t: 'room', room: r });
      else send({ t: 'hello', name: nameRef.current });
    };
    document.addEventListener('visibilitychange', onVisible);
    const pinger = setInterval(() => {
      send({ t: 'ping' });
      setHeard((h) => ({ ...h }));
    }, PING_MS);

    return () => {
      clearInterval(pinger);
      document.removeEventListener('visibilitychange', onVisible);
      chRef.current = null;
      void supabase.removeChannel(ch);
    };
  }, [code, commit, hostApply, hostSeat, send]);

  // 방장: 봇 차례 돌리기
  useEffect(() => {
    if (!isHost || !room?.game) return;
    const g = room.game;
    for (let p = 0; p < room.seats.length; p++) {
      if (!room.seats[p].bot || p >= g.players.length) continue;
      const a = botAction(g, p);
      if (!a) continue;
      const quick = a.t === 'discard' || a.t === 'respond' || a.t === 'cancelOffer';
      const t = setTimeout(() => {
        const r = roomRef.current;
        if (!r?.game || r.game.n !== g.n) return;
        const res = apply(r.game, p, a);
        if (typeof res !== 'string') commit({ ...r, game: res, seq: r.seq + 1 }, true);
      }, quick ? 500 : g.phase.k === 'setup' ? 650 : 900);
      return () => clearTimeout(t);
    }
  }, [isHost, room, commit]);

  const act = useCallback(
    (a: Action) => {
      if (roomRef.current?.host === myId) hostApply(myId, a);
      else send({ t: 'act', a });
    },
    [hostApply, send],
  );

  // ── 방장 전용: 대기실 설정
  const update = (f: (r: Room) => Room) => {
    const r = roomRef.current;
    if (r && r.host === myId && !r.game) commit({ ...f(r), seq: r.seq + 1 }, true);
  };
  const setSize = (size: 3 | 4) => update((r) => ({ ...r, size }));
  const toggleBot = (i: number) =>
    update((r) => ({
      ...r,
      seats: r.seats.map((s, j) =>
        j !== i || s.id ? s : s.bot ? { id: null, name: '', bot: false } : { id: null, name: BOT_NAMES[i], bot: true },
      ),
    }));
  const start = () =>
    update((r) => {
      const seats = r.seats.slice(0, r.size).map((s, i) => (s.id || s.bot ? s : { id: null, name: BOT_NAMES[i], bot: true }));
      return { ...r, seats, game: newGame(seats.map((s) => ({ name: s.name, bot: s.bot }))) };
    });
  const restart = () => {
    const r = roomRef.current;
    if (!r || r.host !== myId) return;
    commit({ ...r, game: newGame(r.seats.map((s) => ({ name: s.name, bot: s.bot }))), seq: r.seq + 1 }, true);
  };

  const now = Date.now();
  const online = (id: string | null) => !!id && (id === myId || now - (heard[id] ?? 0) < AWAY_MS);

  return {
    room,
    connected,
    isHost,
    me: room ? room.seats.findIndex((s) => s.id === myId) : -1,
    online,
    error,
    act,
    setSize,
    toggleBot,
    start,
    restart,
  };
}
