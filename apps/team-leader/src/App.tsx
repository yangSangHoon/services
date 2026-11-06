import { track } from '@lab/core/track';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ATTACK_KINDS,
  Game,
  KINDS,
  RETIRE_AGE,
  START_AGE,
  rollPerks,
  type PerkDef,
  type RunResult,
} from './game';
import { isMuted, play, setMuted, unlockAudio } from './sound';

type Screen = 'title' | 'play' | 'perk' | 'pause' | 'end';

const BEST_KEY = 'team-leader:best';
const SHARE_URL = 'https://yangsanghoon.github.io/services/team-leader/';

function loadBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}
function saveBest(age: number) {
  try {
    localStorage.setItem(BEST_KEY, String(age));
  } catch {
    /* 무시 */
  }
}

const SPEECHES = [
  '여러분 덕분에 버텼습니다. 아니, 여러분 때문에 버텼습니다.',
  '내일부터 알람 없이 일어나겠습니다.',
  '제 자리는 정인턴… 아니 정부장님께 물려드립니다.',
  '단톡방은 오늘부로 나가겠습니다. 알림 끄지 마세요.',
  '15년간 막아낸 말들, 다 기억하겠습니다.',
];

export default function App() {
  const [screen, setScreen] = useState<Screen>('title');
  const [perks, setPerks] = useState<PerkDef[]>([]);
  const [yearAge, setYearAge] = useState(START_AGE);
  const [result, setResult] = useState<RunResult | null>(null);
  const [best, setBest] = useState(loadBest);
  const [muted, setMutedState] = useState(isMuted);
  const [copied, setCopied] = useState(false);
  const [game, setGame] = useState<Game | null>(null);

  const start = () => {
    unlockAudio();
    const g = new Game({
      onYearEnd: (age) => {
        setYearAge(age);
        setPerks(rollPerks(g.perks));
        setScreen('perk');
      },
      onEnd: (r) => {
        setResult(r);
        setScreen('end');
        track('team-leader', r.retired ? 'retire' : 'finish');
        setBest((b) => {
          if (r.age > b) {
            saveBest(r.age);
            return r.age;
          }
          return b;
        });
      },
      onSound: play,
      onHit: (big) => navigator.vibrate?.(big ? 140 : 35),
    });
    setGame(g);
    if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = g;
    setResult(null);
    setCopied(false);
    setScreen('play');
    track('team-leader', 'start');
  };

  const choosePerk = (p: PerkDef) => {
    if (!game) return;
    game.applyPerk(p.id);
    game.nextYear();
    setScreen('play');
  };

  // 탭을 벗어나면 일시정지
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) setScreen((s) => (s === 'play' ? 'pause' : s));
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const toggleMute = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };

  const share = async () => {
    if (!result) return;
    const text = result.retired
      ? `🎉 버텨라, 팀장님 — 공격 ${result.totalBlocked}개를 막고 정년퇴임했습니다! 당신도 버틸 수 있을까요?`
      : `🛡️ 버텨라, 팀장님 — ${result.age}세, ${result.cause}에 무너졌습니다… 당신은 정년까지 버틸 수 있을까요?`;
    track('team-leader', 'share');
    const mobile = matchMedia('(pointer: coarse)').matches;
    if (mobile && navigator.share) {
      try {
        await navigator.share({ title: '버텨라, 팀장님', text, url: SHARE_URL });
      } catch {
        /* 취소 */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${SHARE_URL}`);
      setCopied(true);
    } catch {
      /* 무시 */
    }
  };

  return (
    <div className="app">
      {game && <Stage game={game} running={screen === 'play'} />}

      {game && (screen === 'play' || screen === 'pause') && (
        <div className="topbtns">
          <button className="icon" onClick={toggleMute} aria-label={muted ? '소리 켜기' : '소리 끄기'}>
            {muted ? '🔇' : '🔊'}
          </button>
          <button
            className="icon"
            onClick={() => setScreen(screen === 'play' ? 'pause' : 'play')}
            aria-label={screen === 'play' ? '일시정지' : '계속하기'}
          >
            {screen === 'play' ? '⏸' : '▶'}
          </button>
        </div>
      )}

      {screen === 'title' && (
        <div className="overlay solid">
          <div className="card pop">
            <div className="hero">🛡️</div>
            <h1>버텨라, 팀장님</h1>
            <p className="lead">
              45세에 팀장이 되었습니다.
              <br />
              팀원·상사·사장의 공격을 막고 <b>{RETIRE_AGE}세 정년</b>까지 버티세요.
            </p>
            <ul className="legend">
              {ATTACK_KINDS.map((k) => (
                <li key={k} style={{ background: KINDS[k].fill, color: KINDS[k].ink }}>
                  {KINDS[k].icon} {KINDS[k].name}
                </li>
              ))}
              <li style={{ background: KINDS.good.fill, color: KINDS.good.ink }}>☕ 응원은 막지 말고 받기!</li>
            </ul>
            <p className="how">
              화면을 터치·드래그하거나 마우스를 움직이면 그 방향으로 방패가 돌아가요.
              <br />
              키보드는 ← →
            </p>
            <button className="primary" onClick={start}>
              출근하기
            </button>
            {best > 0 && (
              <p className="muted small">
                최고 기록: {best >= RETIRE_AGE ? '🎉 정년퇴임' : `${best}세까지 버팀`}
              </p>
            )}
          </div>
        </div>
      )}

      {screen === 'pause' && (
        <div className="overlay">
          <div className="card pop">
            <div className="hero sm">☕</div>
            <h2>잠깐 탕비실</h2>
            <p className="muted">숨 좀 돌리고 오세요.</p>
            <button className="primary" onClick={() => setScreen('play')}>
              자리로 돌아가기
            </button>
          </div>
        </div>
      )}

      {screen === 'perk' && (
        <div className="overlay">
          <div className="card pop">
            <p className="eyebrow">{yearAge}세 연말 인사평가</p>
            <h2>1년 더 버텼습니다!</h2>
            <p className="muted">특전을 하나 고르세요</p>
            <div className="perks">
              {perks.map((p, i) => (
                <button key={p.id} className="perk" style={{ animationDelay: `${i * 70}ms` }} onClick={() => choosePerk(p)}>
                  <span className="pe">{p.emoji}</span>
                  <span>
                    <b>{p.name}</b>
                    <small>{p.desc}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {screen === 'end' && result && (
        <div className="overlay">
          <div className="card pop">
            {result.retired ? (
              <>
                <div className="hero">🎉</div>
                <p className="eyebrow">60세 정년퇴임</p>
                <h2>끝까지 버텼습니다!</h2>
                <p className="quote">“{SPEECHES[result.totalBlocked % SPEECHES.length]}”</p>
              </>
            ) : (
              <>
                <div className="hero">📦</div>
                <p className="eyebrow">{result.age}세 퇴사</p>
                <h2>{result.cause}에 무너졌습니다</h2>
                <p className="muted">정년까지 {RETIRE_AGE - result.age}년 남았었는데…</p>
              </>
            )}
            <div className="stats">
              <div>
                <b>{result.totalBlocked}</b>
                <span>막아낸 공격</span>
              </div>
              <div>
                <b>{result.bestStreak}</b>
                <span>최고 연속 방어</span>
              </div>
              <div>
                <b>{result.age - START_AGE}년</b>
                <span>팀장 경력</span>
              </div>
            </div>
            <ul className="breakdown">
              {ATTACK_KINDS.filter((k) => result.blocked[k] + result.hits[k] > 0).map((k) => (
                <li key={k}>
                  <span>
                    {KINDS[k].icon} {KINDS[k].name}
                  </span>
                  <span>
                    막음 <b>{result.blocked[k]}</b> · 맞음 <b className="bad">{result.hits[k]}</b>
                  </span>
                </li>
              ))}
              {result.hits.good > 0 && (
                <li>
                  <span>☕ 받은 응원</span>
                  <b>{result.hits.good}번</b>
                </li>
              )}
            </ul>
            <div className="row">
              <button className="primary" onClick={start}>
                다시 출근하기
              </button>
              <button className="ghost" onClick={share}>
                {copied ? '복사됨!' : '자랑하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stage({ game, running }: { game: Game; running: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runningRef = useRef(running);
  runningRef.current = running;

  // 크기
  useEffect(() => {
    const wrap = wrapRef.current!;
    const canvas = canvasRef.current!;
    const fit = () => {
      const { width, height } = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0);
      game.resize(width, height);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [game]);

  // 다크 모드
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const set = () => (game.dark = mq.matches);
    set();
    mq.addEventListener('change', set);
    return () => mq.removeEventListener('change', set);
  }, [game]);

  // 루프
  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (runningRef.current) game.update(dt);
      game.draw(ctx);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [game]);

  // 키보드
  useEffect(() => {
    const keys = new Set<string>();
    const sync = () => {
      const l = keys.has('ArrowLeft') || keys.has('a') || keys.has('A');
      const r = keys.has('ArrowRight') || keys.has('d') || keys.has('D');
      game.keyDir = l === r ? 0 : l ? -1 : 1;
    };
    const down = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
      keys.add(e.key);
      sync();
    };
    const up = (e: KeyboardEvent) => {
      keys.delete(e.key);
      sync();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [game]);

  const onPointer = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      game.pointer(e.clientX - r.left, e.clientY - r.top);
    },
    [game],
  );

  return (
    <div className="stage" ref={wrapRef}>
      <canvas ref={canvasRef} onPointerDown={onPointer} onPointerMove={onPointer} />
    </div>
  );
}
