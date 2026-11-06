import { useCallback, useState } from 'react';
import { ALL_QUESTIONS, questionsOf } from '../content';
import type { Question, QuestionType } from '../content/types';
import { LEVELS, MAX_LEVEL, RULES, levelMeta } from '../data/levels';
import { examReady, finishExam, finishInterview, type Save } from '../store';
import { sfx } from '../sound';
import { pct, pickPractice, shuffle } from '../util';
import { Quiz } from './Quiz';
import { LevelChips, Room } from './Room';

type Run =
  | { kind: 'exam'; level: number; qs: Question[] }
  | { kind: 'practice'; title: string; qs: Question[] }
  | { kind: 'interview'; qs: Question[] };

const TYPES: QuestionType[] = ['코드 출력', '빈칸 채우기', '버그 찾기', '실무 상황', 'SQL'];

export function ExamHall({ save, onClose, goReward }: { save: Save; onClose: () => void; goReward: () => void }) {
  const cur = Math.min(save.level, 10);
  const [lv, setLv] = useState(cur);
  const [run, setRun] = useState<Run | null>(null);
  const graduated = save.level >= MAX_LEVEL;
  const meta = levelMeta(cur);
  const ready = examReady(save);
  const unlocked = ALL_QUESTIONS.filter((q) => q.level <= cur);

  const onExamDone = useCallback(
    (score: number, total: number) => {
      if (run?.kind === 'exam') {
        const passed = finishExam(run.level, score, total);
        sfx(passed ? 'levelup' : 'wrong');
      } else if (run?.kind === 'interview') finishInterview(score, total);
    },
    [run],
  );

  if (run) {
    const title =
      run.kind === 'exam' ? `Lv.${run.level} 승급 시험` : run.kind === 'interview' ? '모의 기술면접' : run.title;
    return (
      <Room emoji="📝" title="시험장" color="#ffb4a2" onClose={() => setRun(null)}>
        <Quiz
          questions={run.qs}
          mode={run.kind === 'exam' ? 'exam' : run.kind === 'interview' ? 'interview' : 'practice'}
          feedback={run.kind === 'practice' ? 'instant' : 'end'}
          title={title}
          onDone={onExamDone}
          onClose={() => setRun(null)}
          result={(score, total) => {
            if (run.kind === 'exam') {
              const passed = score / total >= RULES.examPassRate;
              const next = run.level + 1;
              return passed ? (
                <div className="verdict pass">
                  <div className="verdict-emoji">🎊</div>
                  <h3>합격! {next <= 10 ? `Lv.${next} ${LEVELS[next - 1].rank}` : '전설의 멘토'} 승급</h3>
                  <p>보상함에 승급 선물이 도착했어요.</p>
                  <button className="btn primary" onClick={goReward}>🎁 보상 받으러 가기</button>
                </div>
              ) : (
                <div className="verdict fail">
                  <div className="verdict-emoji">📚</div>
                  <h3>불합격 — {Math.ceil(total * RULES.examPassRate)}개 이상 맞혀야 해요</h3>
                  <p>틀린 문제는 오답노트에 들어갔어요. 공부방에서 복습하고 다시 도전!</p>
                </div>
              );
            }
            if (run.kind === 'interview') {
              const pass = score >= 8;
              return (
                <div className={`verdict ${pass ? 'pass' : 'fail'}`}>
                  <div className="verdict-emoji">{pass ? '🤝' : '🙇'}</div>
                  <h3>{pass ? '최종 합격 느낌! 면접관이 고개를 끄덕여요' : score >= 6 ? '아쉽게 탈락… 조금만 더!' : '기본기를 더 다져봐요'}</h3>
                </div>
              );
            }
            return <p className="muted center">정답률 {pct(score, total)}%</p>;
          }}
        />
      </Room>
    );
  }

  const startExam = () => {
    const own = shuffle(questionsOf(cur)).slice(0, cur === 1 ? RULES.examSize : RULES.examSize - RULES.examReviewSize);
    const review = cur === 1 ? [] : shuffle(ALL_QUESTIONS.filter((q) => q.level < cur)).slice(0, RULES.examReviewSize);
    setRun({ kind: 'exam', level: cur, qs: shuffle([...own, ...review]) });
  };

  const history = [...save.exams].reverse().slice(0, 8);

  return (
    <Room emoji="📝" title="시험장" sub="연습으로 XP를 모으고, 승급 시험에 합격하면 레벨업!" color="#ffb4a2" onClose={onClose}>
      {!graduated ? (
        <div className={`exam-card ${ready ? 'ready' : ''}`}>
          <div className="exam-top">
            <span className="exam-emoji">{meta.emoji}</span>
            <div>
              <strong>Lv.{cur} → Lv.{cur + 1} 승급 시험</strong>
              <p className="muted small">
                {RULES.examSize}문제 · {Math.round(RULES.examPassRate * 100)}% 이상 합격{cur > 1 ? ` · 이전 레벨 복습 ${RULES.examReviewSize}문제 포함` : ''}
              </p>
            </div>
          </div>
          <div className="xpbar">
            <div className="xpbar-fill" style={{ width: `${Math.min(100, pct(save.xp, meta.xpToExam))}%` }} />
            <span>{Math.min(save.xp, meta.xpToExam)} / {meta.xpToExam} XP</span>
          </div>
          <button className="btn primary wide" disabled={!ready} onClick={startExam}>
            {ready ? '🎯 승급 시험 응시하기' : `🔒 XP ${meta.xpToExam - save.xp} 더 모으면 열려요`}
          </button>
        </div>
      ) : (
        <div className="exam-card ready">
          <strong>🐉 모든 승급 시험을 통과했어요!</strong>
          <p className="muted small">연습과 모의면접으로 실력을 유지하세요.</p>
        </div>
      )}

      <h3 className="section-title">✏️ 레벨별 연습 (즉시 해설)</h3>
      <LevelChips value={lv} max={cur} onChange={setLv} />
      <button
        className="btn wide"
        onClick={() => setRun({ kind: 'practice', title: `Lv.${lv} 연습`, qs: pickPractice(questionsOf(lv), save, 10) })}
      >
        Lv.{lv} {LEVELS[lv - 1].title} 연습 10문제
      </button>

      <h3 className="section-title">🎯 유형별 집중 연습</h3>
      <div className="grid-btns">
        {TYPES.map((t) => {
          const pool = unlocked.filter((q) => q.type === t);
          return (
            <button
              key={t}
              className="btn"
              disabled={pool.length === 0}
              onClick={() => setRun({ kind: 'practice', title: `${t} 연습`, qs: pickPractice(pool, save, 8) })}
            >
              {t} <span className="muted small">({pool.length})</span>
            </button>
          );
        })}
      </div>

      <h3 className="section-title">🤝 모의 기술면접</h3>
      <div className="exam-card">
        <p className="small">
          지금까지 배운 전 범위에서 랜덤 {RULES.interviewSize}문제. 해설은 끝나고 한꺼번에. 8개 이상이면 면접 합격!
          {save.bestInterview > 0 && <> · 최고 기록 <strong>{save.bestInterview}점</strong></>}
        </p>
        <button
          className="btn wide"
          disabled={save.level < RULES.interviewMinLevel}
          onClick={() => setRun({ kind: 'interview', qs: shuffle(unlocked).slice(0, RULES.interviewSize) })}
        >
          {save.level < RULES.interviewMinLevel ? `🔒 Lv.${RULES.interviewMinLevel}부터 응시 가능` : '면접 보러 가기'}
        </button>
      </div>

      {history.length > 0 && (
        <>
          <h3 className="section-title">📋 최근 기록</h3>
          <ul className="history">
            {history.map((h, i) => (
              <li key={i}>
                <span>{h.level === 0 ? '모의면접' : `Lv.${h.level} 승급시험`}</span>
                <span>{h.score}/{h.total}</span>
                <span className={h.passed ? 'ok-text' : 'bad-text'}>{h.passed ? '합격' : '불합격'}</span>
                <span className="muted small">{h.at}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Room>
  );
}
