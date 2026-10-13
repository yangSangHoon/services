import { isConfigured } from '@lab/core';
import { PopNumber, SwapText, usePresence } from '@lab/core/motion';
import { track } from '@lab/core/track';
import { useEffect, useState, type ReactNode } from 'react';
import Board, { type Ghost } from './Board';
import { WALLS_EACH, apply, distance, goalRow, newGame, wallProblem, type Move, type Orient, type Player, type State } from './game';
import { createRoom, newRoomCode, useRoom } from './online';

const COLOR_NAME = ['파랑', '주황'] as const;
const PROBLEM = {
  'no-walls': '벽을 다 썼어요',
  overlap: '다른 벽과 겹쳐요',
  trap: '길을 완전히 막을 수는 없어요',
} as const;

const buzz = (ms = 8) => navigator.vibrate?.(ms);

// ───────── 라우팅: #local · #r=CODE · 처음 화면

type Route = { name: 'home' } | { name: 'local' } | { name: 'online'; code: string };

function readRoute(): Route {
  const h = location.hash.slice(1);
  if (h === 'local') return { name: 'local' };
  const m = /^r=([A-Z0-9]{4,10})$/.exec(h);
  return m ? { name: 'online', code: m[1] } : { name: 'home' };
}

const go = (hash: string) => {
  location.hash = hash;
};

export default function App() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const on = () => setRoute(readRoute());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  if (route.name === 'local') return <LocalGame />;
  if (route.name === 'online') return <OnlineGame key={route.code} code={route.code} />;
  return <Home />;
}

// ───────── 처음 화면

function Home() {
  const [rules, setRules] = useState(false);

  const startOnline = () => {
    const code = newRoomCode();
    createRoom(code);
    track('quoridor', 'online');
    go(`r=${code}`);
  };

  return (
    <main className="page home">
      <div className="hero">
        <MiniBoard />
        <h1>쿼리도 한판</h1>
        <p className="muted">벽을 세워 상대를 돌아가게 만들고, 먼저 반대편 끝에 닿으면 승리!</p>
      </div>

      <div className="choices">
        <button
          className="choice"
          onClick={() => {
            track('quoridor', 'local');
            go('local');
          }}
        >
          <span className="choice-emoji">📱</span>
          <span>
            <b>한 폰으로 둘이서</b>
            <small>번갈아 가며 두기</small>
          </span>
        </button>
        <button className="choice" onClick={startOnline} disabled={!isConfigured}>
          <span className="choice-emoji">🔗</span>
          <span>
            <b>친구와 온라인 대결</b>
            <small>링크를 보내면 바로 시작</small>
          </span>
        </button>
      </div>

      <button className="link" onClick={() => setRules((v) => !v)} aria-expanded={rules}>
        {rules ? '규칙 접기' : '규칙 보기'}
      </button>
      {rules && <Rules />}
    </main>
  );
}

function Rules() {
  return (
    <ol className="rules card">
      <li>
        <b>목표</b> 내 말을 맞은편 끝줄 아무 칸에 먼저 보내면 이겨요.
      </li>
      <li>
        <b>내 차례엔 둘 중 하나</b> 말을 상하좌우로 한 칸 옮기거나, 벽을 하나 세워요.
      </li>
      <li>
        <b>벽</b> 한 사람당 {WALLS_EACH}개. 두 칸 길이로 칸 사이 홈에 세워요. 상대가 아예 못 가게 막는 건 안 돼요.
      </li>
      <li>
        <b>뛰어넘기</b> 말끼리 마주 보면 넘어갈 수 있어요. 뒤가 막혀 있으면 옆 대각선으로.
      </li>
    </ol>
  );
}

/** 처음 화면 장식용 작은 판 */
function MiniBoard() {
  return (
    <svg className="mini" viewBox="0 0 54 54" aria-hidden>
      {Array.from({ length: 25 }, (_, i) => (
        <rect key={i} x={(i % 5) * 11} y={Math.floor(i / 5) * 11} width={10} height={10} rx={2} className="cell" />
      ))}
      <rect x={10} y={21} width={21} height={1.6} rx={0.8} className="wall p0" />
      <rect x={32} y={11} width={1.6} height={21} rx={0.8} className="wall p1" />
      <circle cx={27} cy={49} r={3.4} className="mini-pawn p0" />
      <circle cx={27} cy={5} r={3.4} className="mini-pawn p1" />
    </svg>
  );
}

// ───────── 판 + 조작 (로컬·온라인 공용)

type Seat = { name: string; me?: boolean };

function Match({
  state,
  seats,
  flip,
  canPlay,
  onMove,
  status,
  tools,
  onRematch,
  onExit,
}: {
  state: State;
  seats: [Seat, Seat];
  flip: boolean;
  canPlay: boolean;
  onMove: (m: Move) => boolean;
  status: ReactNode;
  tools?: ReactNode;
  onRematch: () => void;
  onExit: () => void;
}) {
  const [mode, setMode] = useState<'move' | 'wall'>('move');
  const [ghost, setGhost] = useState<Ghost>(null);
  const [hint, setHint] = useState('');

  // 차례가 바뀌면 조작 상태 초기화
  useEffect(() => {
    setMode('move');
    setGhost(null);
    setHint('');
  }, [state.moves, state.turn]);

  const left = state.left[state.turn];
  const bottom: Player = flip ? 1 : 0;
  const top = (1 - bottom) as Player;

  const aim = (o: Orient, r: number, c: number) => {
    const problem = wallProblem(state, o, r, c);
    setGhost({ o, r, c, ok: !problem });
    setHint(problem ? PROBLEM[problem] : '');
  };

  const placeWall = () => {
    if (!ghost?.ok) return;
    if (onMove({ t: 'wall', o: ghost.o, r: ghost.r, c: ghost.c })) buzz(15);
  };

  const sheet = usePresence(state.winner !== null, '--dropdown-close-dur');

  return (
    <main className="page match">
      <header className="bar">
        <button className="ghost-btn" onClick={onExit} aria-label="처음으로">
          ←
        </button>
        <div className="status">{status}</div>
        <div className="bar-tools">{tools}</div>
      </header>

      <PlayerCard state={state} p={top} seat={seats[top]} />

      <div className="board-wrap">
        <Board
          state={state}
          flip={flip}
          mode={mode}
          active={canPlay}
          ghost={canPlay && mode === 'wall' ? ghost : null}
          onCell={(r, c) => onMove({ t: 'move', r, c }) && buzz()}
          onAim={aim}
        />
      </div>

      <PlayerCard state={state} p={bottom} seat={seats[bottom]} />

      <div className={`controls ${canPlay ? '' : 'is-waiting'}`}>
        <div className="seg" role="tablist" aria-label="할 일">
          <button role="tab" aria-selected={mode === 'move'} className={mode === 'move' ? 'is-on' : ''} onClick={() => setMode('move')} disabled={!canPlay}>
            🚶 말 옮기기
          </button>
          <button
            role="tab"
            aria-selected={mode === 'wall'}
            className={mode === 'wall' ? 'is-on' : ''}
            onClick={() => {
              setMode('wall');
              setHint(left ? '판에서 벽 세울 홈을 누르거나 끌어 보세요' : PROBLEM['no-walls']);
            }}
            disabled={!canPlay}
          >
            🧱 벽 세우기 <span className="count">{left}</span>
          </button>
        </div>
        {mode === 'wall' && canPlay && (
          <div className="wall-actions">
            <p className={`hint ${ghost && !ghost.ok ? 'is-bad' : ''}`}>
              <SwapText text={hint || (ghost ? '여기에 세울까요?' : ' ')} />
            </p>
            <div className="row">
              <button className="soft" onClick={() => ghost && aim(ghost.o === 'h' ? 'v' : 'h', ghost.r, ghost.c)} disabled={!ghost}>
                ↻ 돌리기
              </button>
              <button className="primary" onClick={placeWall} disabled={!ghost?.ok}>
                세우기
              </button>
            </div>
          </div>
        )}
      </div>

      {sheet.mounted && state.winner !== null && (
        <div className={`sheet-backdrop ${sheet.className}`}>
          <div className={`sheet t-dropdown ${sheet.className}`} data-origin="top-center">
            <div className={`trophy p${state.winner}`}>🏆</div>
            <h2>{seats[state.winner].me ? '이겼어요!' : `${seats[state.winner].name} 승리!`}</h2>
            <p className="muted">
              {state.moves}수 만에 · 남은 벽 {state.left[state.winner]}개
            </p>
            <button className="primary wide" onClick={onRematch}>
              한 판 더
            </button>
            <button className="link" onClick={onExit}>
              처음으로
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function PlayerCard({ state, p, seat }: { state: State; p: Player; seat: Seat }) {
  const dist = distance(state.walls, state.pawns[p], goalRow(p));
  const turn = state.turn === p && state.winner === null;
  return (
    <div className={`player p${p} ${turn ? 'is-turn' : ''}`}>
      <span className="dot" />
      <b className="name">{seat.name}</b>
      <span className="meta">
        목표까지 <PopNumber value={dist} />칸
      </span>
      <span className="pips" aria-label={`남은 벽 ${state.left[p]}개`}>
        {Array.from({ length: WALLS_EACH }, (_, i) => (
          <i key={i} className={i < state.left[p] ? 'on' : ''} />
        ))}
      </span>
    </div>
  );
}

// ───────── 한 폰으로 둘이서

const LOCAL_KEY = 'quoridor:local';

function loadLocal(): State {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {
    /* 새 판으로 */
  }
  return newGame(0);
}

function LocalGame() {
  const [history, setHistory] = useState<State[]>(() => [loadLocal()]);
  const state = history[history.length - 1];

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
    } catch {
      /* 저장 못 해도 게임은 된다 */
    }
  }, [state]);

  const move = (m: Move) => {
    const next = apply(state, m);
    if (!next) return false;
    setHistory((h) => [...h, next]);
    if (next.winner !== null) track('quoridor', 'finish');
    return true;
  };

  return (
    <Match
      state={state}
      seats={[{ name: COLOR_NAME[0] }, { name: COLOR_NAME[1] }]}
      flip={false}
      canPlay={state.winner === null}
      onMove={move}
      status={
        <span className={`turn-label p${state.turn}`}>
          <SwapText text={`${COLOR_NAME[state.turn]} 차례`} />
        </span>
      }
      tools={
        <button className="ghost-btn" onClick={() => setHistory((h) => h.slice(0, -1))} disabled={history.length < 2} aria-label="무르기">
          ↩
        </button>
      }
      onRematch={() => setHistory([newGame((1 - state.first) as Player)])}
      onExit={() => go('')}
    />
  );
}

// ───────── 온라인 1:1

function OnlineGame({ code }: { code: string }) {
  const { room, role, connected, peerOnline, play, rematch } = useRoom(code);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 7000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (role === 1) track('quoridor', 'join');
  }, [role]);

  const winner = room?.game.winner ?? null;
  useEffect(() => {
    if (winner !== null && role !== null) track('quoridor', 'finish');
  }, [winner, role]);

  if (!room) {
    return (
      <main className="page center">
        <div className="spinner" aria-hidden />
        <p>방에 들어가는 중…</p>
        {slow && (
          <p className="muted small">
            방을 찾지 못하고 있어요. 링크를 보낸 친구가 방 화면을 켜 두고 있어야 들어갈 수 있어요.
          </p>
        )}
        <button className="link" onClick={() => go('')}>
          처음으로
        </button>
      </main>
    );
  }

  const g = room.game;
  const ready = room.players[1] !== null;
  const spectator = role === null;
  const me = role ?? 0;
  const seats: [Seat, Seat] = spectator
    ? [{ name: COLOR_NAME[0] }, { name: COLOR_NAME[1] }]
    : me === 0
      ? [{ name: '나', me: true }, { name: '친구' }]
      : [{ name: '친구' }, { name: '나', me: true }];

  const status = !connected ? (
    <span className="muted">연결 중…</span>
  ) : !ready ? (
    <span className="muted">친구를 기다리는 중</span>
  ) : spectator ? (
    <span className="muted">관전 중</span>
  ) : g.winner !== null ? (
    <span>끝!</span>
  ) : (
    <span className={`turn-label p${g.turn}`}>
      <SwapText text={g.turn === me ? '내 차례' : '친구 차례…'} />
    </span>
  );

  return (
    <>
      <Match
        state={g}
        seats={seats}
        flip={role === 1}
        canPlay={ready && !spectator && g.turn === me && g.winner === null}
        onMove={play}
        status={status}
        tools={
          ready && !spectator ? (
            <span className={`presence ${peerOnline ? 'is-on' : ''}`} title={peerOnline ? '친구 접속 중' : '친구가 잠시 나갔어요'}>
              {peerOnline ? '친구 접속 중' : '친구 자리 비움'}
            </span>
          ) : null
        }
        onRematch={rematch}
        onExit={() => go('')}
      />
      {!ready && role === 0 && <Invite code={code} />}
      {!ready && role !== 0 && connected && (
        <div className="invite card">
          <p>자리를 잡는 중이에요…</p>
        </div>
      )}
      {spectator && ready && (
        <div className="toast">이미 두 사람이 두고 있는 방이라 구경만 할 수 있어요.</div>
      )}
    </>
  );
}

function Invite({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${location.origin}${location.pathname}#r=${code}`;

  const share = async () => {
    track('quoridor', 'invite');
    if (navigator.share) {
      try {
        await navigator.share({ title: '쿼리도 한판', text: '쿼리도 한 판 하자! 🧱 링크 누르면 바로 시작이야', url });
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      prompt('이 링크를 친구에게 보내 주세요', url);
    }
  };

  return (
    <div className="invite card">
      <p className="invite-title">친구에게 링크를 보내면 바로 시작해요</p>
      <p className="code">{code.split('').join(' ')}</p>
      <button className="primary wide" onClick={share}>
        <SwapText text={copied ? '링크를 복사했어요' : '친구 초대하기'} />
      </button>
      <p className="muted small">친구가 들어올 때까지 이 화면을 켜 두세요. 먼저 두는 건 나예요.</p>
    </div>
  );
}
