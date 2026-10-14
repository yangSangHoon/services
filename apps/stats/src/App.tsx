import { authErrorMessage, isConfigured, signInWithEmail, signOut, supabase, useSession } from '@lab/core';
import { PopNumber } from '@lab/core/motion';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

// ───────── 데이터

type AppRow = {
  app: string;
  today_visitors: number;
  week_visitors: number;
  period_visitors: number;
  period_views: number;
  total_visitors: number;
};
type Stats = {
  today: string;
  days: number;
  apps: AppRow[];
  daily: { app: string; day: string; visitors: number; views: number }[];
  events: { app: string; event: string; count: number; visitors: number }[];
  referrers: { app: string; referrer: string; visitors: number }[];
};

/** 저장소의 apps/<slug>/package.json "lab" 정보(제목·이모지)를 빌드 때 모은다 */
const META = Object.fromEntries(
  Object.entries(import.meta.glob<{ title: string; emoji: string }>('../../*/package.json', { eager: true, import: 'lab' })).map(
    ([path, lab]) => [path.split('/')[2], lab],
  ),
);
const appName = (slug: string) => (META[slug] ? `${META[slug].emoji} ${META[slug].title}` : slug);

const PALETTE = ['#5b4bdb', '#e8592f', '#1f9d63', '#d6a01d', '#d93a7a', '#2f8fd9'];

const EVENT_LABEL: Record<string, string> = {
  share: '공유',
  save: '저장',
  record: '녹화',
  camera: '카메라 켬',
  catch: '모기 잡기',
  local: '한 폰 대결 시작',
  online: '온라인 방 만들기',
  invite: '친구 초대',
  join: '초대받아 입장',
  finish: '한 판 끝',
  solo: '봇이랑 혼자 시작',
  room: '친구 방 만들기',
  start: '게임 시작',
  offer: '거래 제안',
  rematch: '한 판 더',
};
const REFERRER_LABEL: Record<string, string> = {
  direct: '직접 접속',
  kakaotalk: '카카오톡',
  instagram: '인스타그램',
  facebook: '페이스북',
  'naver-app': '네이버 앱',
  line: '라인',
  lab: 'Idea Lab 목록',
};
const referrerLabel = (r: string) =>
  REFERRER_LABEL[r] ?? (r.startsWith('lab:') ? `다른 앱 · ${appName(r.slice(4))}` : r);

const RANGES = [7, 30, 90] as const;

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// ───────── 화면

export default function App() {
  const { session, loading } = useSession();

  if (!isConfigured) return <Shell><p className="muted">.env 설정이 필요해요.</p></Shell>;
  if (loading) return <Shell />;
  if (!session || session.user.is_anonymous) return <Login />;
  return <Dashboard email={session.user.email ?? ''} />;
}

function Shell({ children }: { children?: React.ReactNode }) {
  return (
    <main className="page">
      <header className="head">
        <h1>📊 방문 통계</h1>
      </header>
      {children}
    </main>
  );
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signInWithEmail(email, password);
    } catch (err) {
      setError(authErrorMessage(err) ?? '로그인하지 못했어요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <form className="card login" onSubmit={submit}>
        <p className="muted">관리자 계정으로 로그인하세요. 꿈사꿈팔과 같은 계정이에요.</p>
        <input type="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy}>
          {busy ? '로그인 중…' : '로그인'}
        </button>
      </form>
    </Shell>
  );
}

function Dashboard({ email }: { email: string }) {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<'' | 'not-admin' | 'failed'>('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: e } = await supabase.rpc('lab_stats', { p_days: days });
    setLoading(false);
    if (e) return setError(e.message.includes('NOT_ADMIN') ? 'not-admin' : 'failed');
    setError('');
    setStats(data as Stats);
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  const colors = useMemo(
    () => Object.fromEntries((stats?.apps ?? []).map((a, i) => [a.app, PALETTE[i % PALETTE.length]])),
    [stats],
  );

  return (
    <main className="page">
      <header className="head">
        <h1>📊 방문 통계</h1>
        <div className="head-actions">
          <button className="ghost" onClick={load} disabled={loading} aria-label="새로고침">
            {loading ? '…' : '↻'}
          </button>
          <button className="ghost" onClick={() => signOut()}>
            로그아웃
          </button>
        </div>
      </header>

      {error === 'not-admin' && (
        <div className="card">
          <p>
            <b>{email}</b> 계정은 아직 관리자로 등록되지 않았어요.
          </p>
          <p className="muted small">Supabase SQL Editor에서 한 번 실행해 주세요.</p>
          <pre>{`insert into public.lab_admins (user_id)\nselect id from auth.users where email = '${email}';`}</pre>
        </div>
      )}
      {error === 'failed' && <p className="error">통계를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>}

      {stats && (
        <>
          <div className="ranges" role="tablist">
            {RANGES.map((r) => (
              <button key={r} role="tab" aria-selected={days === r} className={days === r ? 'is-on' : ''} onClick={() => setDays(r)}>
                최근 {r}일
              </button>
            ))}
          </div>

          <Summary stats={stats} />
          <TrendChart stats={stats} colors={colors} />

          {stats.apps.length === 0 ? (
            <p className="card muted">아직 기록이 없어요. 배포된 앱에 접속하면 여기에 쌓여요.</p>
          ) : (
            <div className="apps">
              {stats.apps.map((a) => (
                <AppCard key={a.app} row={a} stats={stats} color={colors[a.app]} />
              ))}
            </div>
          )}
          <p className="foot muted small">
            순방문자는 브라우저 기준이에요(같은 사람도 기기가 다르면 따로 세요). 방문은 30분 안의 재방문을 한 번으로 셉니다. 날짜는
            한국 시간 기준.
          </p>
        </>
      )}
    </main>
  );
}

function Summary({ stats }: { stats: Stats }) {
  const sum = (k: keyof AppRow) => stats.apps.reduce((n, a) => n + Number(a[k]), 0);
  const items = [
    { label: '오늘', value: sum('today_visitors') },
    { label: '최근 7일', value: sum('week_visitors') },
    { label: `최근 ${stats.days}일`, value: sum('period_visitors') },
    { label: `방문 수 (${stats.days}일)`, value: sum('period_views') },
  ];
  return (
    <section className="summary">
      {items.map((it) => (
        <div key={it.label} className="card stat">
          <span className="muted small">{it.label}</span>
          <strong>
            <PopNumber value={it.value.toLocaleString()} />
          </strong>
        </div>
      ))}
      <p className="muted small summary-note">앱별 순방문자를 더한 값이에요.</p>
    </section>
  );
}

/** 앱별 일일 순방문자 꺾은선 */
function TrendChart({ stats, colors }: { stats: Stats; colors: Record<string, string> }) {
  const W = 640;
  const H = 200;
  const P = { l: 32, r: 12, t: 12, b: 26 };
  const dates = Array.from({ length: stats.days }, (_, i) => addDays(stats.today, i - stats.days + 1));
  const series = stats.apps.map((a) => {
    const byDay = new Map(stats.daily.filter((d) => d.app === a.app).map((d) => [d.day, d.visitors]));
    return { app: a.app, values: dates.map((d) => byDay.get(d) ?? 0) };
  });
  const max = Math.max(4, ...series.flatMap((s) => s.values));
  const step = Math.ceil(max / 4);
  const top = step * 4;
  const x = (i: number) => P.l + (i / Math.max(1, dates.length - 1)) * (W - P.l - P.r);
  const y = (v: number) => H - P.b - (v / top) * (H - P.t - P.b);
  const label = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8))}`;

  return (
    <section className="card">
      <h2>일별 순방문자</h2>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="앱별 일별 순방문자 추이">
        {[0, 1, 2, 3, 4].map((k) => (
          <g key={k}>
            <line x1={P.l} x2={W - P.r} y1={y(step * k)} y2={y(step * k)} className="grid" />
            <text x={P.l - 6} y={y(step * k) + 4} className="axis" textAnchor="end">
              {step * k}
            </text>
          </g>
        ))}
        {[0, Math.floor((dates.length - 1) / 2), dates.length - 1].map((i) => (
          <text key={i} x={x(i)} y={H - 6} className="axis" textAnchor={i === 0 ? 'start' : i === dates.length - 1 ? 'end' : 'middle'}>
            {label(dates[i])}
          </text>
        ))}
        {series.map((s) => (
          <g key={s.app}>
            <polyline
              points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
              fill="none"
              stroke={colors[s.app]}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {s.values.map((v, i) =>
              v ? (
                <circle key={i} cx={x(i)} cy={y(v)} r={3} fill={colors[s.app]}>
                  <title>{`${appName(s.app)} · ${label(dates[i])} · ${v}명`}</title>
                </circle>
              ) : null,
            )}
          </g>
        ))}
      </svg>
      <ul className="legend">
        {stats.apps.map((a) => (
          <li key={a.app}>
            <i style={{ background: colors[a.app] }} />
            {appName(a.app)}
          </li>
        ))}
      </ul>
    </section>
  );
}

function AppCard({ row, stats, color }: { row: AppRow; stats: Stats; color: string }) {
  const events = stats.events.filter((e) => e.app === row.app);
  const refs = stats.referrers.filter((r) => r.app === row.app).slice(0, 5);
  const refMax = Math.max(1, ...refs.map((r) => r.visitors));

  return (
    <section className="card app" style={{ '--c': color } as React.CSSProperties}>
      <div className="app-head">
        <h2>{appName(row.app)}</h2>
        <a className="muted small" href={`../${row.app}/`} target="_blank" rel="noreferrer">
          열기 ↗
        </a>
      </div>
      <dl className="nums">
        <div>
          <dt>오늘</dt>
          <dd>{row.today_visitors}</dd>
        </div>
        <div>
          <dt>7일</dt>
          <dd>{row.week_visitors}</dd>
        </div>
        <div>
          <dt>{stats.days}일</dt>
          <dd>{row.period_visitors}</dd>
        </div>
        <div>
          <dt>누적</dt>
          <dd>{row.total_visitors}</dd>
        </div>
      </dl>

      {events.length > 0 && (
        <>
          <h3>앱 안에서 한 일</h3>
          <ul className="events">
            {events.map((e) => (
              <li key={e.event}>
                <span>{EVENT_LABEL[e.event] ?? e.event}</span>
                <b>{e.count}회</b>
                <span className="muted small">{e.visitors}명</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {refs.length > 0 && (
        <>
          <h3>어디서 왔나</h3>
          <ul className="refs">
            {refs.map((r) => (
              <li key={r.referrer}>
                <span className="ref-name">{referrerLabel(r.referrer)}</span>
                <span className="bar">
                  <i style={{ width: `${(r.visitors / refMax) * 100}%` }} />
                </span>
                <b>{r.visitors}</b>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
