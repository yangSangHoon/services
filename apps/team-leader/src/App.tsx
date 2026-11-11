import { track } from '@lab/core/track';
import { useCallback, useEffect, useRef, useState } from 'react';
import { makeCard } from './card';
import {
  ATTACK_KINDS,
  Game,
  MODES,
  perksOf,
  rollPerks,
  titlesOf,
  type Grade,
  type KindId,
  type Mode,
  type PerkDef,
  type RunResult,
  type TitleDef,
} from './game';
import { isMuted, play, setMuted, unlockAudio } from './sound';

type Screen = 'title' | 'play' | 'perk' | 'pause' | 'end';

// 팀장 모드는 예전 키 그대로 (기록 유지), 막내 모드는 staff- 접두어
const BEST_KEY = (m: Mode) => (m === 'leader' ? 'team-leader:best' : 'team-leader:staff-best');
const SEEN_KEY = (m: Mode) => (m === 'leader' ? 'team-leader:seen' : 'team-leader:staff-seen');
const TITLES_KEY = 'team-leader:titles';
const MODE_KEY = 'team-leader:mode';
const SHARE_URL = 'https://yangsanghoon.github.io/services/team-leader/';

function loadBest(m: Mode): number {
  try {
    return Number(localStorage.getItem(BEST_KEY(m))) || 0;
  } catch {
    return 0;
  }
}
function loadList(key: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function saveList(key: string, v: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* 무시 */
  }
}

const GRADE_TEXT: Record<Grade, string> = {
  S: '한 번도 안 맞았어요! 특전 후보 4개',
  A: '무난한 한 해였습니다',
  B: '내년엔 분발합시다',
  C: '평가 납득 안 돼요…',
};

function loadMode(): Mode {
  try {
    return localStorage.getItem(MODE_KEY) === 'staff' ? 'staff' : 'leader';
  } catch {
    return 'leader';
  }
}

function saveBest(m: Mode, age: number) {
  try {
    localStorage.setItem(BEST_KEY(m), String(age));
  } catch {
    /* 무시 */
  }
}

const STAFF_SPEECHES = [
  '팀장이 되었습니다. 이제 불만은 제 몫이네요.',
  '막내 때 들은 말들, 후배에게는 안 하겠습니다.',
  '라떼는… 아니, 아무 말도 안 하겠습니다.',
  '회식은 1차만 하겠습니다. 약속합니다.',
  '15년 버틴 나에게 박수를.',
];

const SPEECHES = [
  '여러분 덕분에 버텼습니다. 아니, 여러분 때문에 버텼습니다.',
  '내일부터 알람 없이 일어나겠습니다.',
  '제 자리는 정인턴… 아니 정부장님께 물려드립니다.',
  '단톡방은 오늘부로 나가겠습니다. 알림 끄지 마세요.',
  '15년간 막아낸 말들, 다 기억하겠습니다.',
];

export default function App() {
  const [screen, setScreen] = useState<Screen>('title');
  const [mode, setModeState] = useState<Mode>(loadMode);
  const M = MODES[mode];
  const [perks, setPerks] = useState<PerkDef[]>([]);
  const [yearAge, setYearAge] = useState(0);
  const [result, setResult] = useState<RunResult | null>(null);
  const [bests, setBests] = useState(() => ({ leader: loadBest('leader'), staff: loadBest('staff') }));
  const best = bests[mode];
  const [muted, setMutedState] = useState(isMuted);
  const [copied, setCopied] = useState(false);
  const [game, setGame] = useState<Game | null>(null);
  const [grade, setGrade] = useState<Grade>('A');
  const [owned, setOwned] = useState<string[]>(() => loadList(TITLES_KEY));
  const [earned, setEarned] = useState<{ t: TitleDef; isNew: boolean }[]>([]);

  const pickMode = (m: Mode) => {
    setModeState(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      /* 무시 */
    }
  };

  const ownedHere = M.titles.filter((t) => owned.includes(t.id)).length;

  const start = (m: Mode = mode) => {
    unlockAudio();
    if (m !== mode) pickMode(m);
    const g = new Game({
      onYearEnd: (age, gr) => {
        setYearAge(age);
        setGrade(gr);
        setPerks(rollPerks(m, g.perks, g.yearIndex + 1, gr === 'S' ? 4 : 3));
        setScreen('perk');
      },
      onEnd: (r) => {
        const got = titlesOf(r);
        const before = new Set(loadList(TITLES_KEY));
        setEarned(got.map((t) => ({ t, isNew: !before.has(t.id) })));
        const all = [...new Set([...before, ...got.map((t) => t.id)])];
        saveList(TITLES_KEY, all);
        setOwned(all);
        setResult(r);
        setScreen('end');
        track('team-leader', `${m === 'staff' ? 'staff-' : ''}${r.retired ? 'retire' : 'finish'}`);
        setBests((b) => {
          if (r.age > b[m]) {
            saveBest(m, r.age);
            return { ...b, [m]: r.age };
          }
          return b;
        });
      },
      onSound: play,
      onBuzz: (ms) => navigator.vibrate?.(ms),
      onNewKind: (k) => saveList(SEEN_KEY(m), [...new Set([...loadList(SEEN_KEY(m)), k])]),
    }, loadList(SEEN_KEY(m)) as KindId[], m);
    setGame(g);
    if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = g;
    setResult(null);
    setCopied(false);
    setScreen('play');
    track('team-leader', m === 'staff' ? 'staff-start' : 'start');
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

  const shareCard = async () => {
    if (!result) return;
    track('team-leader', 'share-card');
    const blob = await makeCard(result, earned.map((e) => e.t), SHARE_URL);
    if (!blob) return;
    const name = result.retired ? (result.mode === 'staff' ? '승진발령장.png' : '퇴직증명서.png') : '사직서.png';
    const file = new File([blob], name, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: M.appName, text: SHARE_URL });
        return;
      } catch {
        /* 취소 또는 실패 → 저장으로 */
      }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const share = async () => {
    if (!result) return;
    const text = result.retired
      ? `🎉 ${M.appName} — 공격 ${result.totalBlocked}개를 막고 ${M.goal}했습니다! 당신도 버틸 수 있을까요?`
      : `${M.hero} ${M.appName} — ${result.age}세, ${result.cause}에 무너졌습니다… 당신은 ${M.goal}까지 버틸 수 있을까요?`;
    track('team-leader', 'share');
    const mobile = matchMedia('(pointer: coarse)').matches;
    if (mobile && navigator.share) {
      try {
        await navigator.share({ title: M.appName, text, url: SHARE_URL });
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
            <div className="modes" role="tablist" aria-label="모드 선택">
              {(['leader', 'staff'] as Mode[]).map((id) => (
                <button key={id} role="tab" aria-selected={mode === id} className={mode === id ? 'on' : ''} onClick={() => pickMode(id)}>
                  {id === 'leader' ? '👔 팀장 모드' : '🐣 막내 모드'}
                </button>
              ))}
            </div>
            <div className="hero">{M.hero}</div>
            <h1>{M.appName}</h1>
            {mode === 'leader' ? (
              <p className="lead">
                45세에 팀장이 되었습니다.
                <br />
                팀원·상사·사장의 공격을 막고 <b>{M.endAge}세 정년</b>까지 버티세요.
              </p>
            ) : (
              <p className="lead">
                30세에 신입으로 입사했습니다.
                <br />
                선배·팀장·부장의 공격을 막고 <b>{M.endAge}세 팀장 승진</b>까지 버티세요.
              </p>
            )}
            <p className="how">
              화면을 터치·드래그하면 그 방향으로 방패가 돌아가요 (키보드 ← →).
              <br />
              새로운 공격은 처음 나올 때 알려드려요.
            </p>
            <ul className="legend">
              <li style={{ background: M.kinds.good.fill, color: M.kinds.good.ink }}>☕ 응원은 막지 말고 받기!</li>
            </ul>
            <div style={{ height: 18 }} />
            <button className="primary" onClick={() => start()}>
              {mode === 'leader' ? '출근하기' : '첫 출근하기'}
            </button>
            {best > 0 && (
              <p className="muted small">
                최고 기록: {best >= M.endAge ? `🎉 ${M.goal}` : `${best}세까지 버팀`}
                {ownedHere > 0 && ` · 칭호 ${ownedHere}/${M.titles.length}`}
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
            <div className={`grade g-${grade}`}>{grade}</div>
            <h2>1년 더 버텼습니다!</h2>
            <p className="muted">{GRADE_TEXT[grade]} · 특전을 하나 고르세요</p>
            {game && Object.keys(game.perks).length > 0 && (
              <p className="owned">
                보유:{' '}
                {Object.entries(game.perks).map(([id, n]) => (
                  <span key={id}>
                    {perksOf(mode).find((p) => p.id === id)?.emoji}
                    {n > 1 && <small>×{n}</small>}
                  </span>
                ))}
              </p>
            )}
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
                <div className="hero">{mode === 'staff' ? '👔' : '🎉'}</div>
                <p className="eyebrow">
                  {M.endAge}세 {M.goal}
                </p>
                <h2>{mode === 'staff' ? '드디어 팀장이 되었습니다!' : '끝까지 버텼습니다!'}</h2>
                <p className="quote">
                  “{(mode === 'staff' ? STAFF_SPEECHES : SPEECHES)[result.totalBlocked % SPEECHES.length]}”
                </p>
              </>
            ) : (
              <>
                <div className="hero">📦</div>
                <p className="eyebrow">{result.age}세 퇴사</p>
                <h2>{result.cause}에 무너졌습니다</h2>
                <p className="muted">
                  {M.goal}까지 {M.endAge - result.age}년 남았었는데…
                </p>
              </>
            )}
            {earned.length > 0 && (
              <div className="titles">
                {earned.map(({ t, isNew }) => (
                  <span key={t.id} className="title-chip" title={t.desc}>
                    {t.name}
                    {isNew && <em>NEW</em>}
                  </span>
                ))}
              </div>
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
                <b>{result.age - M.startAge}년</b>
                <span>{mode === 'staff' ? '회사 생활' : '팀장 경력'}</span>
              </div>
            </div>
            <ul className="breakdown">
              {ATTACK_KINDS.filter((k) => result.blocked[k] + result.hits[k] > 0).map((k) => (
                <li key={k}>
                  <span>
                    {M.kinds[k].icon} {M.kinds[k].name}
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
            {mode === 'staff' && result.retired && (
              <button className="primary wide" onClick={() => start('leader')}>
                👔 팀장으로 이어서 출근하기
              </button>
            )}
            <div className="row">
              <button className={mode === 'staff' && result.retired ? 'ghost' : 'primary'} onClick={() => start()}>
                다시 출근하기
              </button>
              <button className="ghost" onClick={share}>
                {copied ? '복사됨!' : '자랑하기'}
              </button>
            </div>
            <button className="ghost wide" onClick={shareCard}>
              {result.retired ? (mode === 'staff' ? '👔 승진 발령장 이미지' : '🎉 퇴직증명서 이미지') : '📄 사직서 이미지'}
            </button>
            <p className="muted small">
              칭호 도감 {ownedHere}/{M.titles.length}
              {' · '}
              <button className="link" onClick={() => setScreen('title')}>
                모드 바꾸기
              </button>
            </p>
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
