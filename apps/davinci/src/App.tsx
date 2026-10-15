import { isConfigured } from '@lab/core';
import { SwapText, usePresence } from '@lab/core/motion';
import { track } from '@lab/core/track';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ERROR_TEXT, color, isOpen, num, pileCount, tileOf, type Action, type Color, type State } from './game';
import { createRoom, newRoomCode, saveName, savedName, useRoom, type Room } from './net';

const SEAT_COLORS = ['var(--p0)', 'var(--p1)', 'var(--p2)', 'var(--p3)'];
const buzz = (ms: number | number[] = 8) => navigator.vibrate?.(ms);

const go = (hash: string) => {
  location.hash = hash;
};
const readCode = () => {
  const m = /^r=([A-Z0-9]{4,10})$/.exec(location.hash.slice(1));
  return m ? m[1] : null;
};

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
    track('davinci', solo ? 'solo' : 'room');
    go(`r=${code}`);
  };

  return (
    <main className="page home">
      <div className="hero">
        <HeroTiles />
        <h1>다빈치 코드</h1>
        <p className="muted">상대가 숨긴 숫자 타일을 추리해서 맞혀요. 내 타일이 다 드러나면 탈락, 끝까지 남으면 승리!</p>
      </div>

      <label className="field">
        <span>내 이름</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={10} placeholder="예: 명탐정" />
      </label>

      <div className="choices">
        <button className="choice" onClick={() => open(true)} disabled={!ready}>
          <span className="choice-emoji">🤖</span>
          <span>
            <b>봇이랑 하기</b>
            <small>봇 1~3명과 바로 시작</small>
          </span>
        </button>
        <button className="choice" onClick={() => open(false)} disabled={!ready || !isConfigured}>
          <span className="choice-emoji">🔗</span>
          <span>
            <b>친구들과 하기</b>
            <small>방 만들고 링크 보내기 · 2~4명 · 빈 자리는 봇</small>
          </span>
        </button>
      </div>

      <div className="help-links">
        <button className="link" onClick={() => setRules((v) => !v)} aria-expanded={rules}>
          {rules ? '규칙 접기' : '규칙 보기'}
        </button>
        <a
          className="link yt-link"
          href={`https://www.youtube.com/results?search_query=${encodeURIComponent('다빈치코드 보드게임 하는 법')}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('davinci', 'howto-video')}
        >
          ▶ 유튜브로 배우기
        </a>
      </div>
      {rules && <Rules />}
    </main>
  );
}

function HeroTiles() {
  const tiles: [Color, number | null][] = [
    ['b', 1],
    ['w', null],
    ['b', null],
    ['w', 7],
    ['b', 11],
  ];
  return (
    <div className="hero-tiles" aria-hidden>
      {tiles.map(([c, n], i) => (
        <span key={i} className={`tile c-${c} ${n === null ? 'is-back' : ''}`} style={{ '--i': i } as CSSProperties}>
          {n ?? ''}
        </span>
      ))}
    </div>
  );
}

function Rules() {
  return (
    <ol className="rules card">
      <li>
        <b>타일</b> 검정·흰색 0~11, 모두 24장. 2~3명은 4장, 4명은 3장씩 받아요.
      </li>
      <li>
        <b>정렬</b> 내 줄은 작은 수 → 큰 수. 같은 숫자면 검정이 왼쪽. 타일 색은 모두에게 보여요.
      </li>
      <li>
        <b>차례</b> 더미에서 한 장 뽑고, 상대의 숨은 타일 하나를 골라 숫자를 말해요.
      </li>
      <li>
        <b>정답</b> 그 타일이 공개돼요. 한 번 더 추리하거나, 멈추고 뽑은 타일을 숨긴 채 내 줄에 넣어요.
      </li>
      <li>
        <b>오답</b> 뽑은 타일을 공개한 채로 내 줄에 넣어요(더미가 비었으면 내 타일 하나를 공개).
      </li>
      <li>
        <b>탈락</b> 내 타일이 전부 공개되면 탈락. 마지막까지 남은 사람이 승리!
      </li>
    </ol>
  );
}

// ───────── 방

function RoomGate({ code }: { code: string }) {
  const [name] = useState(savedName);
  if (!name) return <JoinName code={code} />;
  return <InRoom code={code} name={name} />;
}

function JoinName({ code }: { code: string }) {
  const [name, setName] = useState('');
  const join = () => {
    const n = name.trim().slice(0, 10);
    if (!n) return;
    saveName(n);
    location.reload();
  };
  return (
    <main className="page center">
      <div className="hero-emoji">🔢</div>
      <h1>다빈치 코드 초대</h1>
      <p className="muted">방 {code} 에 들어가려면 이름을 정해 주세요</p>
      <form
        className="name-form"
        onSubmit={(e) => {
          e.preventDefault();
          join();
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={10} placeholder="내 이름" autoFocus />
        <button className="primary" disabled={!name.trim()}>
          들어가기
        </button>
      </form>
    </main>
  );
}

function InRoom({ code, name }: { code: string; name: string }) {
  const net = useRoom(code, name);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 7000);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (net.me > 0) track('davinci', 'join');
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
    track('davinci', 'invite');
    if (navigator.share) {
      try {
        await navigator.share({ title: '다빈치 코드', text: '다빈치 코드 한 판 하자! 🔢 링크 누르고 들어와', url });
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
        <h1>{room.solo ? '봇이랑 하기' : '대기실'}</h1>
        {room.solo ? <span className="bar-pad" /> : <span className={`net ${net.connected ? 'is-on' : ''}`}>{net.connected ? '연결됨' : '연결 중…'}</span>}
      </header>

      {net.isHost && (
        <div className="seg">
          {([2, 3, 4] as const).map((n) => (
            <button key={n} className={room.size === n ? 'is-on' : ''} onClick={() => net.setSize(n)}>
              {n}명
            </button>
          ))}
        </div>
      )}

      <ul className="seats">
        {room.seats.slice(0, room.size).map((s, i) => (
          <li key={i} className="seat card" style={{ '--c': SEAT_COLORS[i] } as CSSProperties}>
            <span className="seat-dot" />
            <span className="seat-name">
              {s.id ? s.name : s.bot ? `🤖 ${s.name}` : <span className="muted">빈 자리</span>}
              {!room.solo && s.id && s.id === host.id && <small className="muted"> · 방장</small>}
              {i === net.me && <small className="muted"> · 나</small>}
            </span>
            {s.id && i !== net.me && <span className={`dot-online ${net.online(s.id) ? 'is-on' : ''}`} />}
            {net.isHost && !room.solo && !s.id && (
              <button className="soft small-btn" onClick={() => net.toggleBot(i)}>
                {s.bot ? '봇 빼기' : '봇 넣기'}
              </button>
            )}
          </li>
        ))}
      </ul>

      {!room.solo && (
        <div className="invite card">
          <p className="muted small">방 코드</p>
          <p className="code">{room.code.split('').join(' ')}</p>
          <button className="soft wide" onClick={share}>
            <SwapText text={copied ? '링크를 복사했어요' : '친구 초대하기'} />
          </button>
        </div>
      )}

      {net.isHost ? (
        <button
          className="primary wide"
          onClick={() => {
            track('davinci', 'start');
            net.start();
          }}
        >
          {filled < room.size ? '빈 자리는 봇으로 채우고 시작' : '시작하기'}
        </button>
      ) : (
        <p className="muted center-text">{net.me >= 0 ? '방장이 시작하길 기다리는 중…' : '자리가 다 찼어요. 구경만 할 수 있어요.'}</p>
      )}
    </main>
  );
}

// ───────── 게임

type Aim = { target: number; idx: number } | null;

function GameView({ net, room, game: s }: { net: Net; room: Room; game: State }) {
  const me = net.me;
  const myTurn = me >= 0 && s.turn === me && s.phase.k !== 'over';
  const [aim, setAim] = useState<Aim>(null);
  const [toast, setToast] = useState('');

  useEffect(() => setAim(null), [s.n]);

  useEffect(() => {
    if (!net.error) return;
    setToast(ERROR_TEXT[net.error.code] ?? '할 수 없어요');
    const t = setTimeout(() => setToast(''), 2000);
    return () => clearTimeout(t);
  }, [net.error]);

  // 맞힘·틀림 진동
  useEffect(() => {
    const l = s.last;
    if (!l || l.n !== s.n) return;
    if (l.t === 'hit') buzz(l.target === me ? [40, 40, 40] : [15, 30, 15]);
    if (l.t === 'miss' && l.by === me) buzz(60);
  }, [s.last, s.n, me]);

  // 내 차례가 되면 가운데 알림
  const [turnToast, setTurnToast] = useState(0);
  const prevTurn = useRef(s.turn);
  useEffect(() => {
    const changed = prevTurn.current !== s.turn;
    prevTurn.current = s.turn;
    if (changed && myTurn) {
      setTurnToast(s.n);
      buzz(20);
      const t = setTimeout(() => setTurnToast(0), 1100);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.turn]);

  const winner = s.winner;
  useEffect(() => {
    if (winner !== null && me >= 0) track('davinci', 'finish');
  }, [winner, me]);

  const act = (a: Action) => {
    buzz(8);
    net.act(a);
  };

  const ph = s.phase;
  const drawn = ph.k === 'guess' ? ph.drawn : null;
  const canGuess = myTurn && ph.k === 'guess';
  const turnName = s.players[s.turn]?.name ?? '';
  const latest = s.log[s.log.length - 1] ?? '';
  const others = s.players.map((_, i) => i).filter((i) => i !== me);
  const seen = new Set<number>([...s.open, ...(me >= 0 ? s.players[me].row : []), ...(myTurn && drawn !== null ? [drawn] : [])]);

  return (
    <main className="page game">
      <header className="bar">
        <button className="ghost-btn" onClick={() => go('')} aria-label="나가기">
          ←
        </button>
        <div className="log">
          <SwapText text={latest} />
        </div>
        {room.solo ? <span className="bar-pad" /> : <span className={`net ${net.connected ? 'is-on' : ''}`} title={net.connected ? '연결됨' : '연결 중'} />}
      </header>

      <section className="opponents">
        {others.map((p) => (
          <PlayerRow
            key={p}
            s={s}
            p={p}
            away={!room.solo && !!room.seats[p]?.id && !net.online(room.seats[p].id)}
            aim={aim}
            onTile={canGuess ? (idx) => setAim({ target: p, idx }) : undefined}
          />
        ))}
      </section>

      <Pile s={s} active={myTurn && ph.k === 'draw'} onDraw={(c) => act({ t: 'draw', c })} drawn={drawn} mine={myTurn} />

      {me >= 0 && (
        <section className={`mine ${s.turn === me && ph.k !== 'over' ? 'is-turn' : ''} ${s.players[me].out ? 'is-out' : ''}`}>
          <div className="row-head">
            <i className="seat-dot" style={{ background: SEAT_COLORS[me] }} />
            <b>내 타일</b>
            <small className="muted">{s.players[me].out ? '탈락' : '🔒 = 아직 숨긴 타일 · 남들 눈엔 안 보여요'}</small>
          </div>
          <div className="tiles big">
            {s.players[me].row.map((t, i) => (
              <Tile
                key={t}
                t={t}
                face
                open={isOpen(s, t)}
                mine
                last={s.last}
                n={s.n}
                onClick={myTurn && ph.k === 'reveal' && !isOpen(s, t) ? () => act({ t: 'reveal', idx: i }) : undefined}
              />
            ))}
          </div>
        </section>
      )}

      <div className="panel">
        {!myTurn ? (
          <p className="waiting">
            {ph.k === 'over' ? (
              '게임 끝!'
            ) : (
              <>
                <i className="turn-dot" style={{ background: SEAT_COLORS[s.turn] }} />
                {turnName} 차례{s.players[s.turn]?.bot ? ' 🤖' : ''} · {ph.k === 'draw' ? '타일 뽑는 중' : ph.k === 'reveal' ? '공개할 타일 고르는 중' : '추리하는 중'}…
              </>
            )}
          </p>
        ) : ph.k === 'draw' ? (
          <p className="hint">⬛ 또는 ⬜ 더미에서 한 장 뽑아요</p>
        ) : ph.k === 'reveal' ? (
          <p className="hint is-bad">❌ 틀렸어요! 공개할 내 타일을 하나 골라요</p>
        ) : ph.k === 'guess' && ph.streak > 0 ? (
          <div className="stack">
            <p className="hint is-good">🎯 정답! 한 번 더 추리하거나 멈출 수 있어요</p>
            <button className="soft wide" onClick={() => act({ t: 'stop' })}>
              ✋ 멈추기{drawn !== null ? ' · 새 타일 숨겨서 넣기' : ''}
            </button>
          </div>
        ) : (
          <p className="hint">🔍 상대의 숨은 타일을 눌러 숫자를 맞혀 보세요</p>
        )}
      </div>

      <Sheet open={!!aim && canGuess} onClose={() => setAim(null)} title={aim ? `${s.players[aim.target].name}의 ${aim.idx + 1}번째 타일은?` : ''}>
        {aim && (
          <GuessPad
            c={color(s.players[aim.target].row[aim.idx])}
            seen={seen}
            misses={s.misses[s.players[aim.target].row[aim.idx]] ?? []}
            onPick={(n) => {
              act({ t: 'guess', target: aim.target, idx: aim.idx, n });
              setAim(null);
            }}
          />
        )}
      </Sheet>

      <Sheet open={ph.k === 'over'} title="">
        <Result s={s} me={me} isHost={net.isHost} onRestart={net.restart} />
      </Sheet>

      {turnToast > 0 && (
        <div key={turnToast} className="turn-toast" style={{ background: SEAT_COLORS[me] }} role="status">
          내 차례!
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function PlayerRow({ s, p, away, aim, onTile }: { s: State; p: number; away: boolean; aim: Aim; onTile?: (idx: number) => void }) {
  const pl = s.players[p];
  const hidden = pl.row.filter((t) => !isOpen(s, t)).length;
  const turn = s.turn === p && s.phase.k !== 'over';
  const holding = turn && s.phase.k === 'guess' ? s.phase.drawn : null;
  return (
    <div className={`opp ${turn ? 'is-turn' : ''} ${pl.out ? 'is-out' : ''} ${s.winner === p ? 'is-winner' : ''}`} style={{ '--c': SEAT_COLORS[p] } as CSSProperties}>
      <div className="row-head">
        <i className="seat-dot" />
        <b>
          {pl.bot ? '🤖 ' : ''}
          {pl.name}
        </b>
        {away && <span className="away" title="연결 끊김" />}
        <small className="muted">{pl.out ? '💥 탈락' : s.winner === p ? '🏆 승리' : `숨은 타일 ${hidden}`}</small>
      </div>
      <div className="tiles">
        {pl.row.map((t, i) => {
          const open = isOpen(s, t);
          return (
            <Tile
              key={t}
              t={t}
              face={open || s.phase.k === 'over'}
              open={open}
              misses={open ? undefined : s.misses[t]}
              selected={aim?.target === p && aim.idx === i}
              last={s.last}
              n={s.n}
              onClick={onTile && !open && !pl.out ? () => onTile(i) : undefined}
            />
          );
        })}
        {holding !== null && <Tile t={holding} face={false} open={false} pending />}
      </div>
    </div>
  );
}

function Tile({
  t,
  face,
  open,
  mine,
  pending,
  selected,
  misses,
  last,
  n,
  onClick,
}: {
  t: number;
  face: boolean;
  open: boolean;
  mine?: boolean;
  pending?: boolean;
  selected?: boolean;
  misses?: number[];
  last?: State['last'];
  n?: number;
  onClick?: () => void;
}) {
  const fresh = last && last.n === n && last.tile === t ? last.t : null;
  const cls = [
    'tile',
    `c-${color(t)}`,
    face ? '' : 'is-back',
    open ? 'is-open' : '',
    mine && !open ? 'is-secret' : '',
    pending ? 'is-pending' : '',
    selected ? 'is-selected' : '',
    onClick ? 'is-pickable' : '',
    fresh ? `fx-${fresh}` : '',
  ].join(' ');
  const label = face ? `${color(t) === 'b' ? '검정' : '흰색'} ${num(t)}${open ? ' 공개' : ''}` : `${color(t) === 'b' ? '검정' : '흰색'} 숨은 타일`;
  const body = (
    <>
      <span className="tile-num">{face ? num(t) : pending ? '+' : ''}</span>
      {misses && misses.length > 0 && <span className="tile-miss">≠{misses.slice(-3).join(',')}</span>}
      {fresh === 'miss' && last?.t === 'miss' && <span className="tile-bubble">{last.guess}?</span>}
    </>
  );
  return onClick ? (
    <button className={cls} onClick={onClick} aria-label={`${label} 고르기`}>
      {body}
    </button>
  ) : (
    <span className={cls} aria-label={label}>
      {body}
    </span>
  );
}

function Pile({ s, active, onDraw, drawn, mine }: { s: State; active: boolean; onDraw: (c: Color) => void; drawn: number | null; mine: boolean }) {
  return (
    <section className="pile">
      {(['b', 'w'] as const).map((c) => {
        const n = pileCount(s, c);
        return (
          <button key={c} className={`stack-btn c-${c} ${active && n ? 'is-active' : ''}`} disabled={!active || !n} onClick={() => onDraw(c)} aria-label={`${c === 'b' ? '검정' : '흰색'} 더미에서 뽑기, ${n}장 남음`}>
            <span className="stack-tiles" aria-hidden>
              {Array.from({ length: Math.min(3, n) }, (_, i) => (
                <i key={i} className={`tile c-${c} is-back`} style={{ '--i': i } as CSSProperties} />
              ))}
            </span>
            <b>{n}</b>
          </button>
        );
      })}
      <div className="drawn">
        {mine && drawn !== null ? (
          <>
            <Tile t={drawn} face open={false} mine pending />
            <small>새 타일</small>
          </>
        ) : s.pile.length === 0 ? (
          <small className="muted">더미가 비었어요</small>
        ) : null}
      </div>
    </section>
  );
}

function GuessPad({ c, seen, misses, onPick }: { c: Color; seen: Set<number>; misses: number[]; onPick: (n: number) => void }) {
  return (
    <div className="pad">
      <p className="muted small">
        {c === 'b' ? '⬛ 검정' : '⬜ 흰색'} 타일이에요. 흐린 숫자는 이미 보이는 타일이거나 틀렸던 숫자예요.
      </p>
      <div className="pad-grid">
        {Array.from({ length: 12 }, (_, n) => {
          const dim = seen.has(tileOf(c, n)) || misses.includes(n);
          return (
            <button key={n} className={`tile c-${c} pad-btn ${dim ? 'is-dim' : ''}`} onClick={() => onPick(n)}>
              <span className="tile-num">{n}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Result({ s, me, isHost, onRestart }: { s: State; me: number; isHost: boolean; onRestart: () => void }) {
  const w = s.winner;
  const won = w === me;
  return (
    <div className="stack result">
      <div className="trophy" style={{ background: w !== null ? `color-mix(in srgb, ${SEAT_COLORS[w]} 18%, transparent)` : undefined }}>
        {won ? '🏆' : '🕵️'}
      </div>
      <h2>{won ? '내가 이겼어요!' : `${w !== null ? s.players[w].name : ''} 승리`}</h2>
      <p className="muted small">끝까지 숨긴 타일 {w !== null ? s.players[w].row.filter((t) => !isOpen(s, t)).length : 0}장</p>
      {isHost ? (
        <button
          className="primary wide"
          onClick={() => {
            track('davinci', 'rematch');
            onRestart();
          }}
        >
          한 판 더
        </button>
      ) : (
        <p className="muted small">방장이 다음 판을 시작할 수 있어요</p>
      )}
      <button className="link" onClick={() => go('')}>
        처음으로
      </button>
    </div>
  );
}

function Sheet({ open, onClose, title, children }: { open: boolean; onClose?: () => void; title: string; children: ReactNode }) {
  const p = usePresence(open, '--dropdown-close-dur');
  if (!p.mounted) return null;
  return (
    <div className={`sheet-backdrop ${p.className}`} onClick={onClose}>
      <div className={`sheet t-dropdown ${p.className}`} data-origin="bottom-center" onClick={(e) => e.stopPropagation()}>
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
