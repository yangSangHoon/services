import { useEffect, useRef, useState } from 'react';
import type { Database } from 'sql.js';
import { ALL_QUESTIONS, SQL_MISSIONS } from '../content';
import type { SqlMission } from '../content/types';
import { RULES } from '../data/levels';
import { solveSql, type Save } from '../store';
import { sfx } from '../sound';
import { freshDb, grade, runQuery, SCHEMA, type Grade, type QueryResult } from '../sqlEngine';
import { pickPractice } from '../util';
import { Code, Rich } from './Code';
import { Quiz } from './Quiz';
import { Room, Tabs } from './Room';

const FREE_MISSIONS = 3; // 레벨과 상관없이 체험 가능한 미션 수
const unlockedMission = (m: SqlMission, i: number, lv: number) => i < FREE_MISSIONS || m.level <= lv;

export function Office({ save, onClose }: { save: Save; onClose: () => void }) {
  const [tab, setTab] = useState<'missions' | 'play' | 'quiz'>('missions');
  const [mission, setMission] = useState<SqlMission | null>(null);
  const [quiz, setQuiz] = useState(false);
  const cur = Math.min(save.level, 10);

  if (quiz) {
    const pool = ALL_QUESTIONS.filter((q) => q.level <= cur && (q.type === '실무 상황' || q.type === '버그 찾기'));
    return (
      <Room emoji="💻" title="실무실" color="#9fe0c4" onClose={() => setQuiz(false)}>
        <Quiz questions={pickPractice(pool, save, 8)} mode="practice" feedback="instant" title="실무 상황 · 코드 리뷰" onClose={() => setQuiz(false)} />
      </Room>
    );
  }

  if (mission) {
    return (
      <Room emoji="🗄️" title={mission.title} sub={`Lv.${mission.level} SQL 미션`} color="#9fe0c4" onClose={() => setMission(null)}>
        <MissionView key={mission.id} mission={mission} solved={save.sqlSolved.includes(mission.id)} onNext={() => {
          const i = SQL_MISSIONS.findIndex((m) => m.id === mission.id);
          const n = SQL_MISSIONS[i + 1];
          setMission(n && unlockedMission(n, i + 1, cur) ? n : null);
        }} />
      </Room>
    );
  }

  const solved = save.sqlSolved.length;
  return (
    <Room emoji="💻" title="실무실" sub="‘자바커피 주식회사’ 실제 DB에 SQL을 날려 보세요. 브라우저 안에서 SQLite가 돌아가요." color="#9fe0c4" onClose={onClose}>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'missions', label: `🗄️ SQL 미션 ${solved}/${SQL_MISSIONS.length}` },
          { id: 'play', label: '🧪 SQL 놀이터' },
          { id: 'quiz', label: '🧯 실무 퀴즈' },
        ]}
      />
      {tab === 'missions' && (
        <div className="card-list">
          {SQL_MISSIONS.map((m, i) => {
            const open = unlockedMission(m, i, cur);
            const done = save.sqlSolved.includes(m.id);
            return (
              <button key={m.id} className={`lesson-card ${done ? 'read' : ''}`} disabled={!open} onClick={() => setMission(m)}>
                <span className="lc-no">{done ? '✓' : open ? i + 1 : '🔒'}</span>
                <span className="lc-text">
                  <strong>{m.title}</strong>
                  <span className="muted small">{open ? m.story : `Lv.${m.level} 에 열려요`}</span>
                </span>
                {open && !done && <span className="lc-xp">+{RULES.sqlMissionXp}</span>}
              </button>
            );
          })}
        </div>
      )}
      {tab === 'play' && <Playground />}
      {tab === 'quiz' && (
        <div className="exam-card">
          <p>운영 장애, 코드 리뷰, 설계 판단처럼 <strong>현업에서 마주치는 상황</strong>만 모은 퀴즈예요. 지금까지 열린 레벨 범위에서 8문제가 나와요.</p>
          <button className="btn primary wide" onClick={() => setQuiz(true)}>🧯 실무 퀴즈 시작</button>
        </div>
      )}
    </Room>
  );
}

function SchemaBox({ onPeek }: { onPeek?: (table: string) => void }) {
  return (
    <details className="schema">
      <summary>📋 테이블 구조 보기</summary>
      <ul>
        {SCHEMA.map((s) => (
          <li key={s.table}>
            <button className="linkish" onClick={() => onPeek?.(s.table)} title="미리보기 실행">
              <code className="inline">{s.table}</code>
            </button>{' '}
            <span className="muted small">{s.desc}</span>
            <div className="small mono">{s.cols}</div>
          </li>
        ))}
      </ul>
    </details>
  );
}

function ResultTable({ r }: { r: QueryResult }) {
  if (!r.columns.length) return <p className="muted small">결과 표가 없어요 (변경 문장은 실행만 됐어요)</p>;
  return (
    <div className="table-wrap result">
      <table>
        <thead>
          <tr>{r.columns.map((c, i) => <th key={i}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {r.rows.slice(0, 50).map((row, i) => (
            <tr key={i}>{row.map((v, j) => <td key={j} className={v === null ? 'null' : ''}>{v === null ? 'NULL' : String(v)}</td>)}</tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">{r.rows.length}행{r.rows.length > 50 ? ' (50행까지 표시)' : ''}</p>
    </div>
  );
}

function SqlEditor({ value, onChange, onRun }: { value: string; onChange: (v: string) => void; onRun: () => void }) {
  return (
    <textarea
      className="sql-editor"
      spellCheck={false}
      autoCapitalize="off"
      autoCorrect="off"
      value={value}
      placeholder="SELECT ..."
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          onRun();
        } else if (e.key === 'Tab') {
          e.preventDefault();
          const t = e.currentTarget;
          const s = t.selectionStart;
          onChange(value.slice(0, s) + '  ' + value.slice(t.selectionEnd));
          requestAnimationFrame(() => t.setSelectionRange(s + 2, s + 2));
        }
      }}
    />
  );
}

function MissionView({ mission, solved, onNext }: { mission: SqlMission; solved: boolean; onNext: () => void }) {
  const [sql, setSql] = useState('SELECT ');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<QueryResult | null>(null);
  const [res, setRes] = useState<Grade | null>(null);
  const [error, setError] = useState('');
  const [hints, setHints] = useState(0);
  const [tries, setTries] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [ok, setOk] = useState(false);

  const run = async () => {
    setBusy(true);
    setError('');
    setRes(null);
    try {
      const db = await freshDb();
      try {
        setPreview(runQuery(db, sql));
      } finally {
        db.close();
      }
    } catch (e) {
      setPreview(null);
      setError(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const g = await grade(sql, mission.answer, mission.orderMatters);
      setRes(g);
      setPreview(g.user ?? null);
      if (g.error) setError(g.error);
      if (g.ok) {
        setOk(true);
        sfx('correct');
        solveSql(mission.id);
      } else {
        sfx('wrong');
        setTries((t) => t + 1);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  };

  const peek = async (table: string) => {
    const db = await freshDb();
    setPreview(runQuery(db, `SELECT * FROM ${table} LIMIT 20`));
    db.close();
  };

  return (
    <div className="mission">
      <div className="story">
        <span className="story-emoji">💬</span>
        <p><Rich text={mission.story} /></p>
      </div>
      <div className="req">
        <strong>요구사항</strong>
        <p><Rich text={mission.prompt} /></p>
        {solved && !ok && <span className="done-pill">✓ 이미 해결한 미션</span>}
      </div>
      <SchemaBox onPeek={peek} />
      <SqlEditor value={sql} onChange={setSql} onRun={run} />
      <div className="row">
        <button className="btn" onClick={run} disabled={busy}>▶ 실행 <span className="muted small">⌘↵</span></button>
        <button className="btn primary" onClick={submit} disabled={busy}>✅ 제출</button>
        <button className="btn ghost" onClick={() => setHints((h) => Math.min(mission.hints.length, h + 1))} disabled={hints >= mission.hints.length}>
          💡 힌트 {hints}/{mission.hints.length}
        </button>
      </div>
      {hints > 0 && (
        <ol className="hints">
          {mission.hints.slice(0, hints).map((h, i) => <li key={i}><Rich text={h} /></li>)}
        </ol>
      )}
      {error && <div className="feedback bad"><strong>SQL 오류</strong><p className="mono small">{error}</p></div>}
      {res && !res.ok && !res.error && <div className="feedback bad"><strong>아직 달라요</strong><p>{res.reason}</p></div>}
      {ok && (
        <div className="feedback ok">
          <strong>정답! 결과가 정확히 일치해요 🎉</strong>
          <p><Rich text={mission.explain} /></p>
          <Code code={mission.answer} lang="sql" />
          <button className="btn primary wide" onClick={onNext}>다음 미션 →</button>
        </div>
      )}
      {!ok && tries >= 3 && (
        <button className="btn ghost wide" onClick={() => setShowAnswer((s) => !s)}>{showAnswer ? '정답 숨기기' : '🙈 정답 쿼리 보기'}</button>
      )}
      {!ok && showAnswer && (
        <div className="feedback">
          <Code code={mission.answer} lang="sql" />
          <p className="small"><Rich text={mission.explain} /></p>
        </div>
      )}
      {preview && (
        <>
          <h4 className="section-title">내 결과</h4>
          <ResultTable r={preview} />
        </>
      )}
      {res && !res.ok && (
        <details className="expected">
          <summary>기대 결과 미리보기 (처음 3행)</summary>
          <ResultTable r={{ columns: res.expected.columns, rows: res.expected.rows.slice(0, 3) }} />
        </details>
      )}
    </div>
  );
}

function Playground() {
  const db = useRef<Database | null>(null);
  const [sql, setSql] = useState('SELECT d.name, COUNT(*) AS cnt\nFROM employees e JOIN departments d ON e.dept_id = d.id\nGROUP BY d.name\nORDER BY cnt DESC;');
  const [res, setRes] = useState<QueryResult | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const reset = async () => {
    setLoading(true);
    db.current?.close();
    try {
      db.current = await freshDb();
      setErr('');
    } catch (e) {
      setErr('SQL 엔진을 불러오지 못했어요. 네트워크를 확인해 주세요.');
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    void reset();
    return () => db.current?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = () => {
    if (!db.current) return;
    try {
      setRes(runQuery(db.current, sql));
      setErr('');
    } catch (e) {
      setRes(null);
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="mission">
      <p className="small muted">자유롭게 SELECT·INSERT·UPDATE·DELETE·CREATE INDEX 까지 해보세요. 망가져도 “DB 초기화”면 원래대로!</p>
      <SchemaBox onPeek={(t) => { setSql(`SELECT * FROM ${t} LIMIT 20;`); }} />
      <SqlEditor value={sql} onChange={setSql} onRun={run} />
      <div className="row">
        <button className="btn primary" onClick={run} disabled={loading}>{loading ? '엔진 로딩…' : '▶ 실행'}</button>
        <button className="btn ghost" onClick={reset}>↺ DB 초기화</button>
      </div>
      {err && <div className="feedback bad"><p className="mono small">{err}</p></div>}
      {res && <ResultTable r={res} />}
    </div>
  );
}
