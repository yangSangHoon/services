import { isConfigured } from '@lab/core';
import { PopNumber, SwapText, usePresence } from '@lab/core/motion';
import { track } from '@lab/core/track';
import { Component, Suspense, lazy, useEffect, useMemo, useState, type ReactNode } from 'react';
import Board, { COLORS, type BoardProps, type Pick } from './Board';
import { MAP } from './map';
import {
  COST,
  DEV_NAME,
  ERROR_TEXT,
  PIECES,
  RES,
  RES_EMOJI,
  RES_NAME,
  WIN_VP,
  emptyHand,
  handSize,
  legalCities,
  legalRoads,
  legalSettles,
  piecesUsed,
  publicVp,
  ratios,
  robberVictims,
  totalVp,
  type Action,
  type DevKind,
  type Hand,
  type Res,
  type State,
} from './game';
import { createRoom, newRoomCode, saveName, savedName, useRoom, type Room } from './net';

const go = (hash: string) => {
  location.hash = hash;
};

function readCode() {
  const m = /^r=([A-Z0-9]{4,10})$/.exec(location.hash.slice(1));
  return m ? m[1] : null;
}

const Board3D = lazy(() => import('./Board3D'));

/** WebGL을 못 쓰는 기기면 평면(SVG) 지도로 */
class Fallback extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const webgl = (() => {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
})();

function GameBoard(props: BoardProps) {
  const flat = <Board {...props} />;
  if (!webgl) return flat;
  return (
    <Fallback fallback={flat}>
      <Suspense fallback={flat}>
        <Board3D {...props} />
      </Suspense>
    </Fallback>
  );
}

export default function App() {
  const [code, setCode] = useState(readCode);
  useEffect(() => {
    const on = () => setCode(readCode());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return code ? <RoomGate key={code} code={code} /> : <Home />;
}

// ───────── 처음 화면

function Home() {
  const [name, setName] = useState(savedName);
  const [rules, setRules] = useState(false);
  const ready = name.trim().length > 0;

  const open = (solo: boolean) => {
    const n = name.trim().slice(0, 10);
    saveName(n);
    const code = newRoomCode();
    createRoom(code, n, solo);
    track('settlers', solo ? 'solo' : 'room');
    go(`r=${code}`);
  };

  return (
    <main className="page home">
      <div className="hero">
        <MiniIsland />
        <h1>개척의 섬</h1>
        <p className="muted">주사위 굴려 자원 모으고, 길 내고 마을 짓기. 먼저 {WIN_VP}점 내면 승리!</p>
      </div>

      <label className="field">
        <span>내 이름</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={10} placeholder="예: 감자왕" />
      </label>

      <div className="choices">
        <button className="choice" onClick={() => open(false)} disabled={!ready || !isConfigured}>
          <span className="choice-emoji">🔗</span>
          <span>
            <b>친구들과 하기</b>
            <small>방 만들고 링크 보내기 · 빈 자리는 봇</small>
          </span>
        </button>
        <button className="choice" onClick={() => open(true)} disabled={!ready || !isConfigured}>
          <span className="choice-emoji">🤖</span>
          <span>
            <b>봇이랑 혼자 하기</b>
            <small>봇 3명과 바로 시작</small>
          </span>
        </button>
      </div>

      <button className="link" onClick={() => setRules((v) => !v)} aria-expanded={rules}>
        {rules ? '규칙 접기' : '규칙 보기'}
      </button>
      {rules && <Rules />}
      <p className="muted small center-text">카탄 기본판 규칙을 따르는 팬메이드 게임이에요.</p>
    </main>
  );
}

function Rules() {
  return (
    <ol className="rules card">
      <li>
        <b>시작</b> 마을 2개와 길 2개를 차례로 놓아요(1→4, 4→1 순서). 두 번째 마을 옆 땅의 자원을 하나씩 받아요.
      </li>
      <li>
        <b>주사위</b> 나온 숫자의 땅에 붙은 마을은 1장, 도시는 2장 자원을 받아요.
      </li>
      <li>
        <b>짓기</b> 길 🌲🧱 · 마을 🌲🧱🐑🌾 · 도시 🌾🌾⛰️⛰️⛰️ · 발전 카드 🐑🌾⛰️. 마을끼리는 한 칸 이상 떨어져야 해요.
      </li>
      <li>
        <b>7</b> 도적 등장! 카드가 8장 이상이면 절반을 버리고, 굴린 사람이 도적을 옮겨 한 장 훔쳐요.
      </li>
      <li>
        <b>거래</b> 은행과 4:1, 항구가 있으면 3:1 또는 2:1. 다른 사람과는 자유롭게 제안해요.
      </li>
      <li>
        <b>점수</b> 마을 1 · 도시 2 · 최장 교역로(5개 이상) 2 · 최강 기사단(기사 3장 이상) 2 · 승점 카드 1. {WIN_VP}점이면 승리.
      </li>
    </ol>
  );
}

function MiniIsland() {
  const tiles = ['#3f8f4a', '#c8643b', '#9bd06b', '#e8c547', '#8d97a5', '#e8c547', '#3f8f4a'];
  const pos = [
    [0, 0],
    [1.732, 0],
    [-1.732, 0],
    [0.866, 1.5],
    [-0.866, 1.5],
    [0.866, -1.5],
    [-0.866, -1.5],
  ];
  const pts = (x: number, y: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = ((60 * i - 90) * Math.PI) / 180;
      return `${x + Math.cos(a) * 0.95},${y + Math.sin(a) * 0.95}`;
    }).join(' ');
  return (
    <svg className="mini" viewBox="-3.4 -3.4 6.8 6.8" aria-hidden>
      <circle r={3.3} fill="var(--sea)" />
      {pos.map(([x, y], i) => (
        <polygon key={i} points={pts(x, y)} fill={tiles[i]} />
      ))}
      <path d="M0.55 -0.62 V-0.82 L0.75 -1.02 L0.95 -0.82 V-0.62 Z" fill="var(--p0)" stroke="#fff" strokeWidth={0.06} />
    </svg>
  );
}

// ───────── 방

function RoomGate({ code }: { code: string }) {
  const [name, setName] = useState(savedName);
  const [draft, setDraft] = useState('');
  if (!name) {
    return (
      <main className="page center">
        <div className="hero-emoji">🏝️</div>
        <h2>개척의 섬에 초대받았어요</h2>
        <form
          className="name-form"
          onSubmit={(e) => {
            e.preventDefault();
            const n = draft.trim().slice(0, 10);
            if (!n) return;
            saveName(n);
            setName(n);
          }}
        >
          <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={10} placeholder="내 이름" autoFocus />
          <button className="primary" disabled={!draft.trim()}>
            입장
          </button>
        </form>
      </main>
    );
  }
  return <RoomView code={code} name={name} />;
}

function RoomView({ code, name }: { code: string; name: string }) {
  const net = useRoom(code, name);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 7000);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (net.me > 0) track('settlers', 'join');
  }, [net.me]);

  if (!net.room) {
    return (
      <main className="page center">
        <div className="spinner" aria-hidden />
        <p>방에 들어가는 중…</p>
        {slow && <p className="muted small">방을 찾지 못하고 있어요. 방을 만든 사람이 화면을 켜 두고 있어야 들어갈 수 있어요.</p>}
        <button className="link" onClick={() => go('')}>
          처음으로
        </button>
      </main>
    );
  }
  if (!net.room.game) return <Lobby net={net} room={net.room} />;
  return <GameView net={net} room={net.room} game={net.room.game} />;
}

type Net = ReturnType<typeof useRoom>;

function Lobby({ net, room }: { net: Net; room: Room }) {
  const [copied, setCopied] = useState(false);
  const url = `${location.origin}${location.pathname}#r=${room.code}`;
  const host = room.seats[0];
  const filled = room.seats.slice(0, room.size).filter((s) => s.id || s.bot).length;

  const share = async () => {
    track('settlers', 'invite');
    if (navigator.share) {
      try {
        await navigator.share({ title: '개척의 섬', text: '개척의 섬 한 판 하자! 🏝️ 링크 누르고 들어와', url });
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
    <main className="page lobby">
      <header className="bar">
        <button className="ghost-btn" onClick={() => go('')} aria-label="나가기">
          ←
        </button>
        <h1>대기실</h1>
        <span className={`net ${net.connected ? 'is-on' : ''}`}>{net.connected ? '연결됨' : '연결 중…'}</span>
      </header>

      {net.isHost && (
        <div className="seg">
          {([3, 4] as const).map((n) => (
            <button key={n} className={room.size === n ? 'is-on' : ''} onClick={() => net.setSize(n)}>
              {n}명
            </button>
          ))}
        </div>
      )}

      <ul className="seats">
        {room.seats.slice(0, room.size).map((s, i) => (
          <li key={i} className="seat card" style={{ '--c': COLORS[i] } as React.CSSProperties}>
            <span className="seat-dot" />
            <span className="seat-name">
              {s.id ? s.name : s.bot ? `🤖 ${s.name}` : <span className="muted">빈 자리</span>}
              {s.id && s.id === host.id && <small className="muted"> · 방장</small>}
              {i === net.me && <small className="muted"> · 나</small>}
            </span>
            {s.id && i !== net.me && <span className={`dot-online ${net.online(s.id) ? 'is-on' : ''}`} />}
            {net.isHost && !s.id && (
              <button className="soft small-btn" onClick={() => net.toggleBot(i)}>
                {s.bot ? '봇 빼기' : '봇 넣기'}
              </button>
            )}
          </li>
        ))}
      </ul>

      <div className="invite card">
        <p className="muted small">방 코드</p>
        <p className="code">{room.code.split('').join(' ')}</p>
        <button className="soft wide" onClick={share}>
          <SwapText text={copied ? '링크를 복사했어요' : '친구 초대하기'} />
        </button>
      </div>

      {net.isHost ? (
        <button
          className="primary wide"
          onClick={() => {
            track('settlers', 'start');
            net.start();
          }}
        >
          {filled < room.size ? `빈 자리는 봇으로 채우고 시작` : '시작하기'}
        </button>
      ) : (
        <p className="muted center-text">{net.me >= 0 ? '방장이 시작하길 기다리는 중…' : '자리가 다 찼어요. 구경만 할 수 있어요.'}</p>
      )}
    </main>
  );
}

// ───────── 게임

type Tool = null | 'road' | 'settle' | 'city';
type Sheet = null | 'trade' | 'dev';

function GameView({ net, room, game: s }: { net: Net; room: Room; game: State }) {
  const me = net.me;
  const myTurn = me >= 0 && s.turn === me && s.phase.k !== 'over';
  const [tool, setTool] = useState<Tool>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [robberHex, setRobberHex] = useState<number | null>(null);
  const [toast, setToast] = useState('');

  // 차례·단계가 바뀌면 조작 상태 정리
  useEffect(() => {
    setTool(null);
    setRobberHex(null);
  }, [s.turn, s.phase.k]);
  useEffect(() => {
    if (s.phase.k !== 'main' || !myTurn) setSheet(null);
  }, [s.phase.k, myTurn]);

  useEffect(() => {
    if (!net.error) return;
    setToast(ERROR_TEXT[net.error.code] ?? '할 수 없어요');
    const t = setTimeout(() => setToast(''), 2000);
    return () => clearTimeout(t);
  }, [net.error]);

  const winner = s.winner;
  useEffect(() => {
    if (winner !== null && me >= 0) track('settlers', 'finish');
  }, [winner, me]);

  const act = (a: Action) => {
    navigator.vibrate?.(8);
    net.act(a);
  };

  const pick: Pick = useMemo(() => {
    if (!myTurn) return null;
    const ph = s.phase;
    if (ph.k === 'setup') {
      return ph.step === 'settle' ? { kind: 'vertex', ids: legalSettles(s, me, true) } : { kind: 'edge', ids: legalRoads(s, me, ph.v) };
    }
    if (ph.k === 'robber') return robberHex === null ? { kind: 'hex', ids: MAP.hexes.map((_, i) => i).filter((i) => i !== s.robber) } : null;
    if (ph.k === 'roads') return { kind: 'edge', ids: legalRoads(s, me) };
    if (ph.k === 'main' && tool) {
      if (tool === 'road') return { kind: 'edge', ids: legalRoads(s, me) };
      if (tool === 'settle') return { kind: 'vertex', ids: legalSettles(s, me) };
      return { kind: 'vertex', ids: legalCities(s, me) };
    }
    return null;
  }, [s, me, myTurn, tool, robberHex]);

  const onPick = (id: number) => {
    const ph = s.phase;
    if (ph.k === 'setup') return act(ph.step === 'settle' ? { t: 'settle', v: id } : { t: 'road', e: id });
    if (ph.k === 'robber') {
      const victims = robberVictims(s, id, me);
      if (victims.length > 1) return setRobberHex(id);
      return act({ t: 'robber', hex: id, victim: victims[0] ?? null });
    }
    if (ph.k === 'roads') return act({ t: 'road', e: id });
    if (tool === 'road') act({ t: 'road', e: id });
    else if (tool === 'settle') act({ t: 'settle', v: id });
    else if (tool === 'city') act({ t: 'city', v: id });
    setTool(null);
  };

  const discardNeed = s.phase.k === 'discard' && me >= 0 ? s.phase.need[me] : 0;
  const offerForMe = s.offer && me >= 0 && !myTurn && s.offer.resp[me] === null;
  const turnName = s.players[s.turn]?.name;
  const latest = s.log[s.log.length - 1] ?? '';

  return (
    <main className="page game">
      <header className="bar">
        <button className="ghost-btn" onClick={() => go('')} aria-label="나가기">
          ←
        </button>
        <div className="log">
          <SwapText text={latest} />
        </div>
        <span className={`net ${net.connected ? 'is-on' : ''}`} title={net.connected ? '연결됨' : '연결 중'} />
      </header>

      <Players s={s} room={room} me={me} online={net.online} />

      <div className="board-wrap">
        <GameBoard state={s} pick={pick} onPick={onPick} />
        {s.dice && <Dice key={`${s.turn}-${s.dice.join('')}`} d={s.dice} />}
      </div>

      {me >= 0 && <MyHand s={s} me={me} />}

      <ol className="history" aria-label="최근 기록">
        {s.log
          .slice(-6, -1)
          .reverse()
          .map((l, i) => (
            <li key={`${s.n}-${i}`}>{l}</li>
          ))}
      </ol>

      <div className="panel">
        {!myTurn ? (
          <p className="waiting">
            {s.phase.k === 'discard' && !discardNeed ? (
              '7! 카드가 많은 사람이 버리는 중…'
            ) : (
              <>
                <i className="turn-dot" style={{ background: COLORS[s.turn] }} />
                {turnName} 차례{s.players[s.turn]?.bot ? ' 🤖' : ''}…
              </>
            )}
          </p>
        ) : s.phase.k === 'setup' ? (
          <p className="hint">{s.phase.step === 'settle' ? '🏠 첫 마을 자리를 골라 주세요' : '🛣️ 마을에 붙은 길을 골라 주세요'}</p>
        ) : s.phase.k === 'roll' ? (
          <div className="row">
            <DevButton s={s} me={me} onClick={() => setSheet('dev')} />
            <button className="primary grow" onClick={() => act({ t: 'roll' })}>
              🎲 주사위 굴리기
            </button>
          </div>
        ) : s.phase.k === 'robber' ? (
          <p className="hint">🦹 도적을 옮길 땅을 골라 주세요</p>
        ) : s.phase.k === 'discard' ? (
          <p className="hint">다른 사람이 카드를 버리는 중…</p>
        ) : s.phase.k === 'roads' ? (
          <div className="row">
            <p className="hint grow">🛣️ 무료 길 {s.phase.left}개를 놓아 주세요</p>
            <button className="soft" onClick={() => act({ t: 'endRoads' })}>
              그만
            </button>
          </div>
        ) : s.phase.k === 'main' && tool ? (
          <div className="row">
            <p className="hint grow">{tool === 'road' ? '🛣️ 길 놓을 곳' : tool === 'settle' ? '🏠 마을 지을 곳' : '🏙️ 도시로 바꿀 마을'}을 골라 주세요</p>
            <button className="soft" onClick={() => setTool(null)}>
              취소
            </button>
          </div>
        ) : s.phase.k === 'main' ? (
          <>
            <BuildRow s={s} me={me} onTool={setTool} onDev={() => act({ t: 'buyDev' })} />
            <div className="row">
              <button className="soft" onClick={() => setSheet('trade')}>
                🤝 거래
              </button>
              <DevButton s={s} me={me} onClick={() => setSheet('dev')} />
              <button className="primary grow" onClick={() => act({ t: 'end' })}>
                턴 끝내기 ▶
              </button>
            </div>
          </>
        ) : null}
      </div>

      <CostGuide hand={me >= 0 ? s.players[me].hand : null} />

      {s.offer && myTurn && <MyOffer s={s} onAccept={(w) => act({ t: 'accept', with: w })} onCancel={() => act({ t: 'cancelOffer' })} />}

      <Sheet open={sheet === 'trade' && myTurn && s.phase.k === 'main' && !s.offer} onClose={() => setSheet(null)} title="거래">
        <Trade s={s} me={me} act={(a) => (act(a), a.t === 'offer' && setSheet(null))} />
      </Sheet>
      <Sheet open={sheet === 'dev' && myTurn} onClose={() => setSheet(null)} title="발전 카드">
        <DevCards s={s} me={me} act={(a) => (act(a), setSheet(null))} />
      </Sheet>
      <Sheet open={discardNeed > 0} title={`카드 ${discardNeed}장을 버려 주세요`}>
        <Discard s={s} me={me} need={discardNeed} act={act} />
      </Sheet>
      <Sheet open={robberHex !== null} onClose={() => setRobberHex(null)} title="누구 카드를 훔칠까요?">
        <div className="victims">
          {robberHex !== null &&
            robberVictims(s, robberHex, me).map((v) => (
              <button key={v} className="soft wide" onClick={() => act({ t: 'robber', hex: robberHex, victim: v })}>
                <i className="turn-dot" style={{ background: COLORS[v] }} /> {s.players[v].name} · 카드 {handSize(s.players[v].hand)}장
              </button>
            ))}
        </div>
      </Sheet>
      <Sheet open={!!offerForMe} title={`${turnName}의 거래 제안`}>
        {s.offer && me >= 0 && <OfferReply s={s} me={me} act={act} />}
      </Sheet>
      <Sheet open={s.phase.k === 'over'} title="">
        <Result s={s} me={me} isHost={net.isHost} onRestart={net.restart} />
      </Sheet>

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function Dice({ d }: { d: [number, number] }) {
  const face = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  return (
    <div className={`dice ${d[0] + d[1] === 7 ? 'is-seven' : ''}`} aria-label={`주사위 ${d[0] + d[1]}`}>
      <span>{face[d[0]]}</span>
      <span>{face[d[1]]}</span>
      <b>{d[0] + d[1]}</b>
    </div>
  );
}

function Players({ s, room, me, online }: { s: State; room: Room; me: number; online: (id: string | null) => boolean }) {
  return (
    <ul className="players">
      {s.players.map((p, i) => {
        const vp = i === me ? totalVp(s, i) : publicVp(s, i);
        const seat = room.seats[i];
        return (
          <li key={i} className={`pl ${s.turn === i && s.phase.k !== 'over' ? 'is-turn' : ''}`} style={{ '--c': COLORS[i] } as React.CSSProperties}>
            <div className="pl-top">
              <b className="pl-name">
                {p.bot ? '🤖 ' : ''}
                {i === me ? '나' : p.name}
              </b>
              {!p.bot && i !== me && seat?.id && !online(seat.id) && <span className="away" title="자리 비움" />}
            </div>
            <div className="pl-vp">
              <PopNumber value={vp} />
              <small>점</small>
            </div>
            <div className="pl-meta">
              🃏{handSize(p.hand)} {p.dev.length ? `📜${p.dev.length}` : ''} {p.knights ? `⚔️${p.knights}` : ''}
            </div>
            <div className="pl-badges">
              {s.longest?.p === i && <span title="최장 교역로">🛣️</span>}
              {s.army?.p === i && <span title="최강 기사단">🛡️</span>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function MyHand({ s, me }: { s: State; me: number }) {
  const h = s.players[me].hand;
  return (
    <div className="hand">
      {RES.map((r) => (
        <div key={r} className={`res r-${r} ${h[r] ? '' : 'is-zero'}`}>
          <span className="res-emoji">{RES_EMOJI[r]}</span>
          <b>
            <PopNumber value={h[r]} />
          </b>
        </div>
      ))}
    </div>
  );
}

const canAfford = (h: Hand, c: Partial<Hand>) => RES.every((r) => h[r] >= (c[r] ?? 0));
const costText = (c: Partial<Hand>) => RES.flatMap((r) => Array<string>(c[r] ?? 0).fill(RES_EMOJI[r])).join('');

const GUIDE: { key: keyof typeof COST; emoji: string; label: string; note: string }[] = [
  { key: 'road', emoji: '🛣️', label: '길', note: '마을·길에 이어서' },
  { key: 'settle', emoji: '🏠', label: '마을', note: '+1점 · 2칸 띄워서' },
  { key: 'city', emoji: '🏙️', label: '도시', note: '마을을 올림 · 2점' },
  { key: 'dev', emoji: '🃏', label: '발전 카드', note: '기사·승점 등' },
];
const GUIDE_KEY = 'settlers:guide-hidden';

/** 무엇을 지으려면 어떤 자원이 필요한지 늘 보여 주는 카드. 내 손패로 지을 수 있는 건 강조 */
function CostGuide({ hand }: { hand: Hand | null }) {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(GUIDE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const toggle = () => {
    setHidden((v) => {
      try {
        localStorage.setItem(GUIDE_KEY, v ? '0' : '1');
      } catch {
        /* 저장 못 해도 화면만 바뀌면 됨 */
      }
      return !v;
    });
  };

  if (hidden)
    return (
      <button className="guide-show" onClick={toggle} aria-expanded={false}>
        📋 건설 비용 보기
      </button>
    );

  return (
    <section className="guide card" aria-label="건설 비용">
      <header className="guide-head">
        <b>📋 건설 비용</b>
        <button className="guide-hide" onClick={toggle} aria-expanded>
          감추기
        </button>
      </header>
      <ul>
        {GUIDE.map((g) => {
          const cost = COST[g.key];
          const ok = !!hand && canAfford(hand, cost);
          return (
            <li key={g.key} className={ok ? 'is-ok' : ''}>
              <span className="guide-name">
                {g.emoji} <b>{g.label}</b>
              </span>
              <span className="guide-cost">
                {RES.flatMap((r) =>
                  Array.from({ length: cost[r] ?? 0 }, (_, k) => (
                    <i key={`${r}${k}`} className={hand && hand[r] > k ? 'have' : ''} title={RES_NAME[r]}>
                      {RES_EMOJI[r]}
                    </i>
                  )),
                )}
              </span>
              <small>{ok ? '지금 지을 수 있어요' : g.note}</small>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function BuildRow({ s, me, onTool, onDev }: { s: State; me: number; onTool: (t: Tool) => void; onDev: () => void }) {
  const h = s.players[me].hand;
  const used = piecesUsed(s, me);
  const items = [
    { key: 'road' as const, label: '길', ok: canAfford(h, COST.road) && used.road < PIECES.road && legalRoads(s, me).length > 0, cost: COST.road },
    { key: 'settle' as const, label: '마을', ok: canAfford(h, COST.settle) && used.settle < PIECES.settle && legalSettles(s, me).length > 0, cost: COST.settle },
    { key: 'city' as const, label: '도시', ok: canAfford(h, COST.city) && used.city < PIECES.city && legalCities(s, me).length > 0, cost: COST.city },
  ];
  return (
    <div className="build">
      {items.map((it) => (
        <button key={it.key} className="build-btn" disabled={!it.ok} onClick={() => onTool(it.key)}>
          <b>{it.label}</b>
          <small>{costText(it.cost)}</small>
        </button>
      ))}
      <button className="build-btn" disabled={!canAfford(h, COST.dev) || !s.deck.length} onClick={onDev}>
        <b>카드</b>
        <small>{costText(COST.dev)}</small>
      </button>
    </div>
  );
}

function DevButton({ s, me, onClick }: { s: State; me: number; onClick: () => void }) {
  const n = s.players[me].dev.length;
  return (
    <button className="soft" onClick={onClick} disabled={!n}>
      📜 {n}
    </button>
  );
}

// ───────── 시트

function Sheet({ open, onClose, title, children }: { open: boolean; onClose?: () => void; title: string; children: ReactNode }) {
  const p = usePresence(open, '--dropdown-close-dur');
  if (!p.mounted) return null;
  return (
    <div className={`sheet-backdrop ${p.className}`} onClick={onClose}>
      <div className={`sheet t-dropdown ${p.className}`} data-origin="top-center" onClick={(e) => e.stopPropagation()}>
        {(title || onClose) && (
          <div className="sheet-head">
            <h2>{title}</h2>
            {onClose && (
              <button className="ghost-btn" onClick={onClose} aria-label="닫기">
                ✕
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

function Stepper({ value, max, onChange, r }: { value: number; max: number; onChange: (n: number) => void; r: Res }) {
  return (
    <div className="stepper">
      <span className="res-emoji">{RES_EMOJI[r]}</span>
      <button onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0} aria-label={`${RES_NAME[r]} 빼기`}>
        −
      </button>
      <b>{value}</b>
      <button onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`${RES_NAME[r]} 더하기`}>
        +
      </button>
    </div>
  );
}

function Discard({ s, me, need, act }: { s: State; me: number; need: number; act: (a: Action) => void }) {
  const [cards, setCards] = useState<Hand>(emptyHand);
  const h = s.players[me].hand;
  const total = handSize(cards);
  return (
    <div className="stack">
      <p className="muted small">카드가 8장 이상이라 절반을 버려야 해요.</p>
      {RES.map((r) => (
        <Stepper key={r} r={r} value={cards[r]} max={Math.min(h[r], cards[r] + need - total)} onChange={(n) => setCards({ ...cards, [r]: n })} />
      ))}
      <button className="primary wide" disabled={total !== need} onClick={() => act({ t: 'discard', cards })}>
        {total}/{need} 버리기
      </button>
    </div>
  );
}

function Trade({ s, me, act }: { s: State; me: number; act: (a: Action) => void }) {
  const [tab, setTab] = useState<'bank' | 'player'>('bank');
  const [give, setGive] = useState<Res | null>(null);
  const [getR, setGetR] = useState<Res | null>(null);
  const [offerGive, setOfferGive] = useState<Hand>(emptyHand);
  const [offerGet, setOfferGet] = useState<Hand>(emptyHand);
  const h = s.players[me].hand;
  const k = ratios(s, me);

  return (
    <div className="stack">
      <div className="seg">
        <button className={tab === 'bank' ? 'is-on' : ''} onClick={() => setTab('bank')}>
          🏦 은행·항구
        </button>
        <button className={tab === 'player' ? 'is-on' : ''} onClick={() => setTab('player')}>
          👥 다른 사람
        </button>
      </div>
      {tab === 'bank' ? (
        <>
          <p className="label">줄 것</p>
          <div className="res-pick">
            {RES.map((r) => (
              <button key={r} className={give === r ? 'is-on' : ''} disabled={h[r] < k[r]} onClick={() => setGive(r)}>
                {RES_EMOJI[r]}
                <small>{k[r]}:1</small>
              </button>
            ))}
          </div>
          <p className="label">받을 것</p>
          <div className="res-pick">
            {RES.map((r) => (
              <button key={r} className={getR === r ? 'is-on' : ''} disabled={r === give || !s.bank[r]} onClick={() => setGetR(r)}>
                {RES_EMOJI[r]}
                <small>{RES_NAME[r]}</small>
              </button>
            ))}
          </div>
          <button
            className="primary wide"
            disabled={!give || !getR || give === getR || h[give] < k[give]}
            onClick={() => {
              if (give && getR) act({ t: 'bank', give, get: getR });
              setGetR(null);
              if (give && h[give] - k[give] < k[give]) setGive(null);
            }}
          >
            {give && getR ? `${RES_EMOJI[give]}${k[give]}장 → ${RES_EMOJI[getR]}1장` : '바꾸기'}
          </button>
        </>
      ) : (
        <>
          <p className="label">내가 줄 것</p>
          {RES.map((r) => (
            <Stepper key={r} r={r} value={offerGive[r]} max={h[r]} onChange={(n) => setOfferGive({ ...offerGive, [r]: n })} />
          ))}
          <p className="label">받고 싶은 것</p>
          {RES.map((r) => (
            <Stepper key={r} r={r} value={offerGet[r]} max={offerGive[r] ? 0 : 9} onChange={(n) => setOfferGet({ ...offerGet, [r]: n })} />
          ))}
          <button
            className="primary wide"
            disabled={!handSize(offerGive) || !handSize(offerGet)}
            onClick={() => {
              track('settlers', 'offer');
              act({ t: 'offer', give: offerGive, get: offerGet });
            }}
          >
            모두에게 제안하기
          </button>
        </>
      )}
    </div>
  );
}

const handText = (h: Hand) => RES.filter((r) => h[r]).map((r) => `${RES_EMOJI[r]}${h[r]}`).join(' ');

function MyOffer({ s, onAccept, onCancel }: { s: State; onAccept: (p: number) => void; onCancel: () => void }) {
  const o = s.offer!;
  return (
    <div className="offer card">
      <p>
        <b>내 제안</b> 줄게 {handText(o.give)} · 줘 {handText(o.get)}
      </p>
      <ul>
        {s.players.map((p, i) =>
          i === s.turn ? null : (
            <li key={i}>
              <i className="turn-dot" style={{ background: COLORS[i] }} />
              <span className="grow">{p.name}</span>
              {o.resp[i] === 'yes' ? (
                <button className="primary small-btn" onClick={() => onAccept(i)}>
                  거래하기
                </button>
              ) : (
                <span className="muted small">{o.resp[i] === 'no' ? '거절' : '고민 중…'}</span>
              )}
            </li>
          ),
        )}
      </ul>
      <button className="link" onClick={onCancel}>
        제안 취소
      </button>
    </div>
  );
}

function OfferReply({ s, me, act }: { s: State; me: number; act: (a: Action) => void }) {
  const o = s.offer!;
  const can = canAfford(s.players[me].hand, o.get);
  return (
    <div className="stack">
      <div className="offer-view">
        <div>
          <small className="muted">받을 것</small>
          <p>{handText(o.give)}</p>
        </div>
        <span>⇄</span>
        <div>
          <small className="muted">줄 것</small>
          <p>{handText(o.get)}</p>
        </div>
      </div>
      {!can && <p className="muted small">줄 자원이 모자라요.</p>}
      <div className="row">
        <button className="soft grow" onClick={() => act({ t: 'respond', yes: false })}>
          거절
        </button>
        <button className="primary grow" disabled={!can} onClick={() => act({ t: 'respond', yes: true })}>
          좋아요
        </button>
      </div>
    </div>
  );
}

const DEV_DESC: Record<DevKind, string> = {
  knight: '도적을 옮기고 한 장 훔쳐요. 3장 이상 쓰면 최강 기사단 경쟁.',
  vp: '갖고만 있어도 1점. 다른 사람에겐 안 보여요.',
  road: '길 2개를 무료로 놓아요.',
  plenty: '은행에서 원하는 자원 2장을 받아요.',
  mono: '자원 하나를 골라 모두에게서 전부 가져와요.',
};

function DevCards({ s, me, act }: { s: State; me: number; act: (a: Action) => void }) {
  const [picker, setPicker] = useState<null | 'plenty' | 'mono'>(null);
  const [chosen, setChosen] = useState<Res[]>([]);
  const p = s.players[me];
  const kinds = (['knight', 'road', 'plenty', 'mono', 'vp'] as DevKind[]).filter((k) => p.dev.some((d) => d.k === k));
  const usable = (k: DevKind) => k !== 'vp' && !s.devPlayed && p.dev.some((d) => d.k === k && !d.fresh) && (s.phase.k === 'main' || s.phase.k === 'roll');

  if (picker) {
    const mono = picker === 'mono';
    const pickRes = (r: Res) => {
      if (mono) return act({ t: 'mono', r });
      const next = [...chosen, r];
      if (next.length === 2) act({ t: 'plenty', a: next[0], b: next[1] });
      else setChosen(next);
    };
    return (
      <div className="stack">
        <p>{mono ? '모두에게서 가져올 자원' : `받을 자원 고르기 (${chosen.length + 1}/2)`}</p>
        <div className="res-pick">
          {RES.map((r) => (
            <button key={r} onClick={() => pickRes(r)} disabled={!mono && !s.bank[r]}>
              {RES_EMOJI[r]}
              <small>{RES_NAME[r]}</small>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <ul className="devs">
      {kinds.map((k) => {
        const n = p.dev.filter((d) => d.k === k).length;
        const fresh = p.dev.filter((d) => d.k === k && d.fresh).length;
        return (
          <li key={k} className="dev card">
            <div className="grow">
              <b>
                {DEV_NAME[k]} {n > 1 ? `×${n}` : ''}
              </b>
              <p className="muted small">
                {DEV_DESC[k]}
                {fresh && k !== 'vp' ? ' (이번 차례에 산 카드는 다음 차례부터)' : ''}
              </p>
            </div>
            {k !== 'vp' && (
              <button
                className="primary small-btn"
                disabled={!usable(k)}
                onClick={() => {
                  if (k === 'knight') act({ t: 'knight' });
                  else if (k === 'road') act({ t: 'roadCard' });
                  else setPicker(k === 'plenty' ? 'plenty' : 'mono');
                }}
              >
                쓰기
              </button>
            )}
          </li>
        );
      })}
      {s.devPlayed && <p className="muted small">발전 카드는 한 차례에 한 장만 쓸 수 있어요.</p>}
    </ul>
  );
}

function Result({ s, me, isHost, onRestart }: { s: State; me: number; isHost: boolean; onRestart: () => void }) {
  const w = s.winner ?? 0;
  const rank = s.players.map((_, i) => i).sort((a, b) => totalVp(s, b) - totalVp(s, a));
  return (
    <div className="stack result">
      <div className="trophy" style={{ background: COLORS[w] }}>
        🏆
      </div>
      <h2>{w === me ? '이겼어요!' : `${s.players[w].name} 승리!`}</h2>
      <ul className="ranks">
        {rank.map((i) => (
          <li key={i}>
            <i className="turn-dot" style={{ background: COLORS[i] }} />
            <span className="grow">{s.players[i].name}</span>
            <b>{totalVp(s, i)}점</b>
          </li>
        ))}
      </ul>
      {isHost ? (
        <button className="primary wide" onClick={onRestart}>
          새 지도로 한 판 더
        </button>
      ) : (
        <p className="muted small">방장이 새 판을 열면 바로 이어져요.</p>
      )}
      <button className="link" onClick={() => go('')}>
        처음으로
      </button>
    </div>
  );
}
