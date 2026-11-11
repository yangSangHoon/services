import { isConfigured } from '@lab/core';
import { PopNumber, SwapText } from '@lab/core/motion';
import { track } from '@lab/core/track';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  BUY_MAX,
  COS,
  END_SIZE,
  ERROR_TEXT,
  HAND,
  LOOSE,
  MAX_SHARES,
  N,
  SAFE,
  START_CASH,
  TIER_NAME,
  W,
  actor,
  bank,
  bonuses,
  fmt,
  label,
  playable,
  price,
  sizes,
  tileEffect,
  tileStatus,
  type State,
} from './game';
import { createRoom, newRoomCode, saveName, savedName, useRoom, type Room, type Size } from './net';

const SLUG = 'startup-mna';
const P_COLORS = ['#e0453f', '#2f6fe0', '#f0a31c', '#1f9e6a', '#9b4fd6', '#e0569c'];

const go = (hash: string) => {
  location.hash = hash;
};
function readCode() {
  const m = /^r=([A-Z0-9]{4,10})$/.exec(location.hash.slice(1));
  return m ? m[1] : null;
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
    track(SLUG, solo ? 'solo' : 'room');
    go(`r=${code}`);
  };

  return (
    <main className="page home">
      <div className="hero">
        <MiniCity />
        <h1>스타트업 M&amp;A</h1>
        <p className="muted">
          부지를 깔아 스타트업을 세우고, 될 놈에 투자하고, 인수합병으로 한몫 챙기기.
          <br />
          게임이 끝났을 때 현금이 가장 많은 사람이 이겨요.
        </p>
      </div>

      <label className="field">
        <span>내 이름</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={10} placeholder="예: 김대표" />
      </label>

      <div className="choices">
        <button className="choice" onClick={() => open(false)} disabled={!ready || !isConfigured}>
          <span className="choice-emoji">🔗</span>
          <span>
            <b>친구들과 하기</b>
            <small>방 만들고 링크 보내기 · 2~6명 · 빈 자리는 봇</small>
          </span>
        </button>
        <button className="choice" onClick={() => open(true)} disabled={!ready}>
          <span className="choice-emoji">🤖</span>
          <span>
            <b>봇이랑 혼자 하기</b>
            <small>봇 3명과 바로 시작</small>
          </span>
        </button>
      </div>

      <div className="help-links">
        <button className="link" onClick={() => setRules((v) => !v)} aria-expanded={rules}>
          {rules ? '규칙 접기' : '규칙 보기'}
        </button>
      </div>
      {rules && <Rules />}
    </main>
  );
}

function Rules() {
  return (
    <ol className="rules card">
      <li>
        <b>내 차례</b> ① 부지 1장 놓기 → ② 지분 최대 {BUY_MAX}주 사기 → ③ 부지 새로 뽑기. 시작 현금 {fmt(START_CASH)}, 부지는 {HAND}장 들고 있어요.
      </li>
      <li>
        <b>창업</b> 부지가 다른 빈 부지와 이어지면 스타트업 7곳 중 하나를 세워요. 창업자는 지분 1주를 공짜로 받아요.
      </li>
      <li>
        <b>성장</b> 스타트업 옆에 부지를 놓으면 커지고, 클수록 주가가 올라요. 딥테크 &gt; 성장 &gt; 초기 순으로 비싸요.
      </li>
      <li>
        <b>M&amp;A</b> 두 스타트업이 맞닿으면 큰 쪽이 작은 쪽을 인수해요. 인수당하는 회사의 최대주주는 주가×10, 2대주주는 주가×5 보너스를 받아요.
      </li>
      <li>
        <b>지분 정리</b> 인수당한 회사 지분은 엑시트(현재가에 팔기), 스왑(2주 → 인수한 회사 1주), 보유(나중에 다시 창업되길 기대) 중에 골라요.
      </li>
      <li>
        <b>유니콘</b> {SAFE}칸 이상이면 인수당하지 않아요. 유니콘 둘을 잇는 부지는 못 놓고 버려져요.
      </li>
      <li>
        <b>끝</b> {END_SIZE}칸짜리 회사가 생기거나 모든 회사가 유니콘이 되면 끝. 남은 회사들도 보너스를 주고 지분을 다 현금으로 바꿔 순위를 매겨요.
      </li>
    </ol>
  );
}

function MiniCity() {
  const cells = [
    [0, 0, 6], [1, 0, 6], [2, 0, -1], [4, 0, 2],
    [0, 1, 6], [3, 1, 2], [4, 1, 2], [5, 1, 2],
    [1, 2, -1], [2, 2, 4], [3, 2, 4], [5, 2, 2],
    [2, 3, 4], [4, 3, -1], [5, 3, 0],
  ];
  return (
    <svg className="mini" viewBox="-0.2 -0.2 6.4 4.4" aria-hidden>
      {Array.from({ length: 24 }, (_, i) => (
        <rect key={i} x={(i % 6) + 0.06} y={Math.floor(i / 6) + 0.06} width={0.88} height={0.88} rx={0.16} fill="var(--cell)" />
      ))}
      {cells.map(([x, y, c], i) => (
        <rect key={`c${i}`} x={x + 0.06} y={y + 0.06} width={0.88} height={0.88} rx={0.16} fill={c < 0 ? 'var(--loose)' : COS[c].color} />
      ))}
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
        <div className="hero-emoji">🦄</div>
        <h2>스타트업 M&amp;A에 초대받았어요</h2>
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

type Net = ReturnType<typeof useRoom>;

function RoomView({ code, name }: { code: string; name: string }) {
  const net = useRoom(code, name);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 7000);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (net.me > 0) track(SLUG, 'join');
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
  return <GameView net={net} room={net.room} g={net.room.game} />;
}

function Lobby({ net, room }: { net: Net; room: Room }) {
  const [copied, setCopied] = useState(false);
  const url = `${location.origin}${location.pathname}#r=${room.code}`;
  const host = room.seats[0];
  const filled = room.seats.slice(0, room.size).filter((s) => s.id || s.bot).length;

  const share = async () => {
    track(SLUG, 'invite');
    if (navigator.share) {
      try {
        await navigator.share({ title: '스타트업 M&A', text: '스타트업 M&A 한 판 하자! 🦄 링크 누르고 들어와', url });
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
          {([2, 3, 4, 5, 6] as Size[]).map((n) => (
            <button key={n} className={room.size === n ? 'is-on' : ''} onClick={() => net.setSize(n)}>
              {n}명
            </button>
          ))}
        </div>
      )}

      <ul className="seats">
        {room.seats.slice(0, room.size).map((s, i) => (
          <li key={i} className="seat card" style={{ '--c': P_COLORS[i] } as CSSProperties}>
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
            track(SLUG, 'start');
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

const PHASE_TEXT: Record<State['phase']['k'], string> = {
  place: '부지 놓는 중',
  found: '창업할 회사 고르는 중',
  survivor: '살아남을 회사 고르는 중',
  merge: '지분 정리하는 중',
  buy: '투자 고민 중',
  over: '게임 끝',
};

const MY_TEXT: Record<State['phase']['k'], string> = {
  place: '부지를 놓으세요',
  found: '창업하기',
  survivor: '인수할 회사 고르기',
  merge: '지분 정리하기',
  buy: '투자하기',
  over: '게임 끝',
};

function GameView({ net, room, g }: { net: Net; room: Room; g: State }) {
  const me = net.me;
  const who = actor(g);
  const mine = me >= 0 && who === me;
  const [sel, setSel] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const sz = useMemo(() => sizes(g), [g]);

  useEffect(() => setSel(null), [g.n]);
  useEffect(() => {
    if (!net.error) return;
    setToast(ERROR_TEXT[net.error.code] ?? '할 수 없어요');
    const t = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(t);
  }, [net.error]);

  // 창업·인수합병 알림 배너
  const [banner, setBanner] = useState<{ text: string; color: string; key: number } | null>(null);
  useEffect(() => {
    const f = g.flash;
    if (!f || f.kind === 'grow' || f.n !== g.n) return;
    const co = COS[f.co];
    setBanner({ text: f.kind === 'found' ? `${co.emoji} ${co.name} 창업!` : `🤝 ${co.name} 인수합병!`, color: co.color, key: f.n });
    const t = setTimeout(() => setBanner(null), 1800);
    return () => clearTimeout(t);
  }, [g.flash, g.n]);

  const hand = me >= 0 && g.phase.k !== 'over' ? g.players[me].hand : [];
  const handSet = new Set(hand);

  const status = g.phase.k === 'over' ? '게임 끝' : mine ? `내 차례 · ${MY_TEXT[g.phase.k]}` : `${g.players[who]?.name} ${PHASE_TEXT[g.phase.k]}…`;

  return (
    <main className="page game">
      <header className="bar">
        <button className="ghost-btn" onClick={() => go('')} aria-label="나가기">
          ←
        </button>
        <h1 className={`status ${mine ? 'is-mine' : ''}`}>
          <SwapText text={status} />
        </h1>
        <span className={`net ${net.connected ? 'is-on' : ''}`}>{net.connected ? '연결됨' : '연결 중…'}</span>
      </header>

      <div className="board-wrap">
        <div className="board" style={{ gridTemplateColumns: `repeat(${W}, 1fr)` }}>
          {Array.from({ length: N }, (_, t) => {
            const v = g.board[t];
            const co = v >= 0 ? COS[v] : null;
            const inHand = handSet.has(t);
            const cls = ['cell', v === LOOSE && 'is-loose', co && 'is-co', inHand && 'is-hand', sel === t && 'is-sel', g.last === t && 'is-last']
              .filter(Boolean)
              .join(' ');
            return (
              <button
                key={t}
                className={cls}
                style={co ? ({ '--co': co.color } as CSSProperties) : undefined}
                disabled={!inHand || !mine || g.phase.k !== 'place'}
                onClick={() => setSel(t)}
                aria-label={label(t)}
              >
                {co && isAnchor(g, t) ? <span className="cell-emoji">{co.emoji}</span> : v < 0 && v !== LOOSE ? <span className="cell-label">{label(t)}</span> : null}
              </button>
            );
          })}
        </div>
        {banner && (
          <div key={banner.key} className="banner" style={{ '--co': banner.color } as CSSProperties}>
            {banner.text}
          </div>
        )}
      </div>

      {g.phase.k === 'over' ? (
        <Over g={g} net={net} />
      ) : (
        <>
          {me >= 0 && (
            <Hand g={g} me={me} mine={mine && g.phase.k === 'place'} sel={sel} setSel={setSel} onPlace={(t) => net.act({ t: 'place', tile: t })} onPass={() => net.act({ t: 'pass' })} />
          )}
          {mine && g.phase.k === 'found' && <FoundPanel g={g} onPick={(co) => net.act({ t: 'found', co })} />}
          {mine && g.phase.k === 'survivor' && <SurvivorPanel g={g} onPick={(co) => net.act({ t: 'survivor', co })} />}
          {mine && g.phase.k === 'merge' && <DisposePanel key={g.n} g={g} me={me} onDone={(sell, trade) => net.act({ t: 'dispose', sell, trade })} />}
          {mine && g.phase.k === 'buy' && <BuyPanel key={g.n} g={g} me={me} onDone={(cos) => net.act({ t: 'buy', cos })} />}
          {!mine && g.phase.k === 'merge' && <MergeWatch g={g} />}
        </>
      )}

      <Companies g={g} sz={sz} me={me} />
      <Players g={g} room={room} net={net} />
      <Log g={g} />

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

/** 회사 이모지는 그 회사 칸 중 가장 앞 칸에만 */
function isAnchor(g: State, t: number) {
  const v = g.board[t];
  return g.board.indexOf(v) === t;
}

function Hand({
  g,
  me,
  mine,
  sel,
  setSel,
  onPlace,
  onPass,
}: {
  g: State;
  me: number;
  mine: boolean;
  sel: number | null;
  setSel: (t: number) => void;
  onPlace: (t: number) => void;
  onPass: () => void;
}) {
  const hand = [...g.players[me].hand].sort((a, b) => a - b);
  const none = mine && playable(g, me).length === 0;
  return (
    <section className={`panel hand-panel ${mine ? 'is-active' : ''}`}>
      <div className="panel-head">
        <b>내 부지</b>
        <span className="muted small">{mine ? '놓을 부지를 고르세요' : `남은 부지 ${g.bag.length}장`}</span>
      </div>
      <div className="hand">
        {hand.map((t) => {
          const st = tileStatus(g, t);
          const eff = tileEffect(g, t);
          return (
            <button key={t} className={`tile ${sel === t ? 'is-sel' : ''} is-${st}`} disabled={!mine || st !== 'ok'} onClick={() => setSel(t)}>
              <b>{label(t)}</b>
              {eff && <small>{eff}</small>}
            </button>
          );
        })}
      </div>
      {mine &&
        (none ? (
          <button className="primary wide" onClick={onPass}>
            놓을 부지가 없어요 · 투자로 넘어가기
          </button>
        ) : (
          <button className="primary wide" disabled={sel === null} onClick={() => sel !== null && onPlace(sel)}>
            {sel === null ? '부지를 골라 주세요' : `${label(sel)}에 놓기`}
          </button>
        ))}
    </section>
  );
}

function CoChip({ co, extra }: { co: number; extra?: string }) {
  return (
    <span className="co-chip" style={{ '--co': COS[co].color } as CSSProperties}>
      {COS[co].emoji} {COS[co].name}
      {extra && <small>{extra}</small>}
    </span>
  );
}

function FoundPanel({ g, onPick }: { g: State; onPick: (co: number) => void }) {
  const sz = sizes(g);
  return (
    <section className="panel is-active">
      <div className="panel-head">
        <b>🚀 어떤 스타트업을 세울까요?</b>
        <span className="muted small">창업자 지분 1주 증정</span>
      </div>
      <div className="pick-grid">
        {COS.map((c, i) =>
          sz[i] ? null : (
            <button key={i} className="pick" style={{ '--co': c.color } as CSSProperties} onClick={() => onPick(i)}>
              <span className="pick-emoji">{c.emoji}</span>
              <b>{c.name}</b>
              <small>{TIER_NAME[c.tier]}</small>
            </button>
          ),
        )}
      </div>
    </section>
  );
}

function SurvivorPanel({ g, onPick }: { g: State; onPick: (co: number) => void }) {
  if (g.phase.k !== 'survivor') return null;
  return (
    <section className="panel is-active">
      <div className="panel-head">
        <b>🤝 크기가 같아요. 누가 인수할까요?</b>
      </div>
      <div className="pick-grid">
        {g.phase.options.map((i) => (
          <button key={i} className="pick" style={{ '--co': COS[i].color } as CSSProperties} onClick={() => onPick(i)}>
            <span className="pick-emoji">{COS[i].emoji}</span>
            <b>{COS[i].name}</b>
            <small>내 지분 {g.players[g.turn].shares[i]}주</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function MergeWatch({ g }: { g: State }) {
  if (g.phase.k !== 'merge') return null;
  const d = g.phase.queue[0];
  return (
    <section className="panel">
      <p className="small">
        <CoChip co={g.phase.survivor} /> 이(가) <CoChip co={d} /> 을(를) 인수 중 · {g.players[g.phase.deciders[0]].name}님이 지분 정리 중…
      </p>
    </section>
  );
}

function Stepper({ value, min, max, step = 1, onChange }: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  return (
    <span className="stepper">
      <button onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} aria-label="빼기">
        −
      </button>
      <b>
        <PopNumber value={value} />
      </b>
      <button onClick={() => onChange(Math.min(max, value + step))} disabled={value + step > max} aria-label="더하기">
        +
      </button>
    </span>
  );
}

function DisposePanel({ g, me, onDone }: { g: State; me: number; onDone: (sell: number, trade: number) => void }) {
  const ph = g.phase;
  const [sell, setSell] = useState(0);
  const [trade, setTrade] = useState(0);
  if (ph.k !== 'merge') return null;
  const d = ph.queue[0];
  const sv = ph.survivor;
  const held = g.players[me].shares[d];
  const sz = sizes(g);
  const pr = price(d, sz[d]);
  const maxTrade = Math.min(Math.floor((held - sell) / 2), bank(g, sv)) * 2;
  const maxSell = held - trade;
  const keep = held - sell - trade;
  return (
    <section className="panel is-active">
      <div className="panel-head">
        <b>
          <CoChip co={d} /> 지분 {held}주 정리
        </b>
        <span className="muted small">인수: {COS[sv].name}</span>
      </div>
      <ul className="dispose">
        <li>
          <span>
            <b>엑시트</b>
            <small className="muted">1주당 {fmt(pr)} · +{fmt(sell * pr)}</small>
          </span>
          <Stepper value={sell} min={0} max={maxSell} onChange={setSell} />
        </li>
        <li>
          <span>
            <b>스왑</b>
            <small className="muted">
              2주 → {COS[sv].name} 1주 (남은 {bank(g, sv)}주)
            </small>
          </span>
          <Stepper value={trade} min={0} max={maxTrade} step={2} onChange={setTrade} />
        </li>
        <li>
          <span>
            <b>보유</b>
            <small className="muted">다시 창업되면 살아나요</small>
          </span>
          <b className="keep">{keep}주</b>
        </li>
      </ul>
      <div className="row">
        <button className="soft" onClick={() => { setSell(held); setTrade(0); }}>
          전부 엑시트
        </button>
        <button className="primary grow" onClick={() => onDone(sell, trade)}>
          확정
        </button>
      </div>
    </section>
  );
}

function BuyPanel({ g, me, onDone }: { g: State; me: number; onDone: (cos: number[]) => void }) {
  const [cart, setCart] = useState<number[]>([]);
  const sz = sizes(g);
  const cash = g.players[me].cash;
  const spent = cart.reduce((s, c) => s + price(c, sz[c]), 0);
  const active = COS.map((_, i) => i).filter((i) => sz[i] > 0);
  const count = (c: number) => cart.filter((x) => x === c).length;
  return (
    <section className="panel is-active">
      <div className="panel-head">
        <b>💸 지분 투자 ({cart.length}/{BUY_MAX})</b>
        <span className="muted small">
          남는 현금 <PopNumber value={fmt(cash - spent)} />
        </span>
      </div>
      {active.length === 0 ? (
        <p className="muted small">아직 세워진 스타트업이 없어요.</p>
      ) : (
        <ul className="buy">
          {active.map((c) => {
            const pr = price(c, sz[c]);
            const left = bank(g, c) - count(c);
            const can = cart.length < BUY_MAX && left > 0 && cash - spent >= pr;
            return (
              <li key={c}>
                <CoChip co={c} extra={`${sz[c]}칸`} />
                <span className="muted small grow">
                  {fmt(pr)} · 남은 {bank(g, c)}주
                </span>
                {count(c) > 0 && (
                  <button className="soft small-btn" onClick={() => setCart((k) => { const i = k.lastIndexOf(c); return k.filter((_, j) => j !== i); })}>
                    −
                  </button>
                )}
                {count(c) > 0 && <b className="cart-n">{count(c)}</b>}
                <button className="soft small-btn" disabled={!can} onClick={() => setCart((k) => [...k, c])}>
                  +
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <button className="primary wide" onClick={() => onDone(cart)}>
        {cart.length ? `${fmt(spent)} 투자하고 차례 끝` : '투자 안 하고 차례 끝'}
      </button>
    </section>
  );
}

function Companies({ g, sz, me }: { g: State; sz: number[]; me: number }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <b>스타트업 시세</b>
        <span className="muted small">🦄 {SAFE}칸↑ 유니콘</span>
      </div>
      <table className="cos">
        <thead>
          <tr>
            <th>회사</th>
            <th>칸</th>
            <th>주가</th>
            <th>남은</th>
            {me >= 0 && <th>내 지분</th>}
          </tr>
        </thead>
        <tbody>
          {COS.map((c, i) => {
            const bon = sz[i] ? bonuses(g, i) : null;
            const top = bon ? bon.indexOf(Math.max(...bon)) : -1;
            return (
              <tr key={i} className={sz[i] ? '' : 'is-off'}>
                <td>
                  <span className="co-dot" style={{ background: c.color }} />
                  {c.emoji} {c.name}
                  {sz[i] >= SAFE && ' 🦄'}
                  <small className="muted"> {TIER_NAME[c.tier]}</small>
                </td>
                <td>{sz[i] || '–'}</td>
                <td>{sz[i] ? fmt(price(i, sz[i])) : '–'}</td>
                <td>{bank(g, i)}</td>
                {me >= 0 && (
                  <td>
                    {g.players[me].shares[i] || '–'}
                    {top === me && bon![me] > 0 && <small title="최대주주"> 👑</small>}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="muted small">한 회사 지분은 총 {MAX_SHARES}주예요.</p>
    </section>
  );
}

function Players({ g, room, net }: { g: State; room: Room; net: Net }) {
  return (
    <section className="panel">
      <ul className="players">
        {g.players.map((p, i) => {
          const seat = room.seats[i];
          return (
            <li key={i} className={`player ${actor(g) === i ? 'is-turn' : ''}`} style={{ '--c': P_COLORS[i] } as CSSProperties}>
              <span className="seat-dot" />
              <span className="grow">
                <span>
                  <b>
                    {p.bot ? '🤖 ' : ''}
                    {p.name}
                  </b>
                  {i === net.me && <small className="muted"> · 나</small>}
                  {seat?.id && i !== net.me && !net.online(seat.id) && <small className="muted"> · 자리 비움</small>}
                </span>
                <span className="holdings">
                  {COS.map((c, ci) =>
                    p.shares[ci] ? (
                      <span key={ci} className="hold" style={{ '--co': c.color } as CSSProperties}>
                        {c.emoji}
                        {p.shares[ci]}
                      </span>
                    ) : null,
                  )}
                </span>
              </span>
              <b className="cash">
                <PopNumber value={fmt(p.cash)} />
              </b>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Log({ g }: { g: State }) {
  return (
    <section className="panel log">
      {g.log.slice(-5).reverse().map((l, i) => (
        <p key={g.log.length - i} className={i === 0 ? '' : 'muted'}>
          {l}
        </p>
      ))}
    </section>
  );
}

function Over({ g, net }: { g: State; net: Net }) {
  useEffect(() => {
    track(SLUG, 'finish');
  }, []);
  if (g.phase.k !== 'over') return null;
  const medals = ['🥇', '🥈', '🥉'];
  const iWon = g.phase.ranking[0].p === net.me;
  return (
    <section className="panel is-active over">
      <div className="over-hero">{iWon ? '🦄' : '📉'}</div>
      <h2>{iWon ? '최고 부자 등극!' : `${g.players[g.phase.ranking[0].p].name}님이 최고 부자!`}</h2>
      <ol className="ranking">
        {g.phase.ranking.map((r, i) => (
          <li key={r.p} className={r.p === net.me ? 'is-me' : ''}>
            <span>{medals[i] ?? `${i + 1}.`}</span>
            <b className="grow">{g.players[r.p].name}</b>
            <b>{fmt(r.cash)}</b>
          </li>
        ))}
      </ol>
      <div className="row">
        <button className="soft" onClick={() => go('')}>
          처음으로
        </button>
        {net.isHost && (
          <button
            className="primary grow"
            onClick={() => {
              track(SLUG, 'rematch');
              net.restart();
            }}
          >
            한 판 더
          </button>
        )}
      </div>
    </section>
  );
}
