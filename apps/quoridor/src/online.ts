import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@lab/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apply, newGame, type Move, type Player, type State } from './game';

/**
 * 온라인 1:1. DB 없이 Realtime broadcast 로 방 상태 전체를 주고받는다.
 *
 * - 방 상태(Room)는 작아서(1KB 미만) 변할 때마다 통째로 보낸다. seq 가 큰 쪽이 이긴다.
 * - 같은 seq 로 갈라지면(둘이 동시에 '한 판 더') JSON 문자열이 큰 쪽으로 모두 맞춘다.
 * - 각자 localStorage 에 방을 저장해 두므로 새로고침하거나 한쪽이 나갔다 와도 이어서 둔다.
 * - 자리 배정은 방장(players[0])만 한다. 늦게 들어온 사람은 claim 을 보내고 방장이 채워 준다.
 * - 접속 표시는 presence 대신 ping 으로 한다(이 프로젝트에서 presence 를 켜면 채널이 죽는다).
 */

export type Room = { code: string; players: [string, string | null]; seq: number; game: State };

type Msg = ({ t: 'state'; room: Room } | { t: 'hello' } | { t: 'claim'; id: string } | { t: 'ping' }) & { from?: string };

const PING_MS = 8000;
const AWAY_MS = 20000;

const ID_KEY = 'quoridor:id';
const roomKey = (code: string) => `quoridor:room:${code}`;

export const myId = (() => {
  try {
    let id = localStorage.getItem(ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ID_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
})();

function load(code: string): Room | null {
  try {
    const raw = localStorage.getItem(roomKey(code));
    return raw ? (JSON.parse(raw) as Room) : null;
  } catch {
    return null;
  }
}

function save(room: Room) {
  try {
    localStorage.setItem(roomKey(room.code), JSON.stringify(room));
  } catch {
    /* 저장 실패해도 진행은 된다 */
  }
}

/** 헷갈리는 글자(0/O, 1/I/L)를 뺀 6자리 */
export function newRoomCode() {
  const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => abc[b % abc.length]).join('');
}

export function createRoom(code: string) {
  save({ code, players: [myId, null], seq: 1, game: newGame(0) });
}

const newer = (a: Room, b: Room) => a.seq > b.seq || (a.seq === b.seq && JSON.stringify(a) > JSON.stringify(b));

export function useRoom(code: string) {
  const [room, setRoom] = useState<Room | null>(() => load(code));
  const [peerOnline, setPeerOnline] = useState(false);
  const [connected, setConnected] = useState(false);
  const roomRef = useRef(room);
  const chRef = useRef<RealtimeChannel | null>(null);

  const send = useCallback((msg: Msg) => {
    void chRef.current?.send({ type: 'broadcast', event: 'msg', payload: { ...msg, from: myId } });
  }, []);

  const commit = useCallback(
    (next: Room, broadcast = true) => {
      roomRef.current = next;
      save(next);
      setRoom(next);
      if (broadcast) send({ t: 'state', room: next });
    },
    [send],
  );

  useEffect(() => {
    const ch = supabase.channel(`quoridor:${code}`, {
      config: { broadcast: { self: false } },
    });
    chRef.current = ch;
    let heardAt = 0;

    const claimIfNeeded = () => {
      const r = roomRef.current;
      if (r && !r.players.includes(myId) && r.players[1] === null) send({ t: 'claim', id: myId });
    };

    ch.on('broadcast', { event: 'msg' }, ({ payload }) => {
      const msg = payload as Msg;
      const mine = roomRef.current;
      if (msg.from && msg.from !== myId) {
        heardAt = Date.now();
        setPeerOnline(true);
      }
      if (msg.t === 'hello') {
        if (mine) send({ t: 'state', room: mine });
      } else if (msg.t === 'state') {
        if (msg.room.code !== code) return;
        if (!mine || newer(msg.room, mine)) {
          commit(msg.room, false);
          claimIfNeeded();
        } else if (newer(mine, msg.room)) {
          // 상대가 옛날 상태를 들고 있으면 최신을 알려 준다
          send({ t: 'state', room: mine });
        }
      } else if (msg.t === 'claim') {
        if (!mine || mine.players[0] !== myId) return;
        if (mine.players[1] === null) commit({ ...mine, players: [myId, msg.id], seq: mine.seq + 1 });
        else send({ t: 'state', room: mine });
      }
    });

    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setConnected(true);
        send({ t: 'hello' });
        if (roomRef.current) send({ t: 'state', room: roomRef.current });
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        setConnected(false);
      }
    });

    // 폰이 잠들었다 깨면 소켓이 끊겼을 수 있으니 최신 상태를 다시 묻는다
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        send({ t: 'hello' });
        if (roomRef.current) send({ t: 'state', room: roomRef.current });
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    const pinger = setInterval(() => {
      send({ t: 'ping' });
      if (Date.now() - heardAt > AWAY_MS) setPeerOnline(false);
    }, PING_MS);

    return () => {
      clearInterval(pinger);
      document.removeEventListener('visibilitychange', onVisible);
      chRef.current = null;
      void supabase.removeChannel(ch);
    };
  }, [code, commit, send]);

  const role: Player | null = room ? (room.players[0] === myId ? 0 : room.players[1] === myId ? 1 : null) : null;

  const play = useCallback(
    (m: Move) => {
      const r = roomRef.current;
      if (!r || role === null || r.game.turn !== role || !r.players[1]) return false;
      const game = apply(r.game, m);
      if (!game) return false;
      commit({ ...r, game, seq: r.seq + 1 });
      return true;
    },
    [commit, role],
  );

  const rematch = useCallback(() => {
    const r = roomRef.current;
    if (!r) return;
    commit({ ...r, game: newGame((1 - r.game.first) as Player), seq: r.seq + 1 });
  }, [commit]);

  return { room, role, connected, peerOnline, play, rematch };
}
