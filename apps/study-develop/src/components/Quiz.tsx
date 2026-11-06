import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Question } from '../content/types';
import { getCombo, recordAnswer } from '../store';
import { sfx } from '../sound';
import { shuffle } from '../util';
import { Code, Rich } from './Code';

export type QuizMode = 'practice' | 'exam' | 'note' | 'daily' | 'interview';

interface Props {
  questions: Question[];
  mode: QuizMode;
  title: string;
  /** instant: 고르자마자 정답·해설 / end: 끝에 몰아서 */
  feedback: 'instant' | 'end';
  onDone?: (score: number, total: number) => void;
  onClose: () => void;
  /** 결과 화면 상단에 추가로 보여줄 것 (합격/불합격 등) */
  result?: (score: number, total: number) => ReactNode;
}

interface Item {
  q: Question;
  order: number[]; // 화면 순서 → 원래 보기 인덱스
}

const keepOrder = (q: Question) =>
  q.type === 'OX' || q.choices.some((c) => /모두|없음|둘 다|전부/.test(c) && c.length < 20);

export function Quiz({ questions, mode, title, feedback, onDone, onClose, result }: Props) {
  const items = useMemo<Item[]>(
    () =>
      questions.map((q) => {
        const idx = q.choices.map((_, i) => i);
        return { q, order: keepOrder(q) ? idx : shuffle(idx) };
      }),
    [questions],
  );
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [log, setLog] = useState<{ q: Question; correct: boolean; pickedOrig: number }[]>([]);
  const [combo, setCombo] = useState(0);
  const done = i >= items.length;
  const reported = useRef(false);
  const score = log.filter((l) => l.correct).length;

  useEffect(() => {
    if (done && !reported.current) {
      reported.current = true;
      onDone?.(score, items.length);
    }
  }, [done, score, items.length, onDone]);

  const pick = (displayIdx: number) => {
    if (picked !== null || done) return;
    const it = items[i];
    const orig = it.order[displayIdx];
    const correct = orig === it.q.answer;
    setPicked(displayIdx);
    recordAnswer(it.q, correct, mode);
    setCombo(getCombo());
    sfx(correct ? 'correct' : 'wrong');
    setLog((l) => [...l, { q: it.q, correct, pickedOrig: orig }]);
    if (feedback === 'end') setTimeout(next, 380);
  };

  const next = () => {
    setPicked(null);
    setI((n) => n + 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done) return;
      if (picked === null && /^[1-5]$/.test(e.key)) {
        const n = Number(e.key) - 1;
        if (n < items[i].q.choices.length) pick(n);
      } else if (picked !== null && feedback === 'instant' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (done) {
    return (
      <div className="quiz">
        <div className="quiz-result">
          <div className="result-score">
            <span className="big">{score}</span> / {items.length}
          </div>
          {result?.(score, items.length)}
          <h3 className="section-title">문제 돌아보기</h3>
          <ol className="review">
            {log.map(({ q, correct, pickedOrig }) => (
              <li key={q.id} className={correct ? 'ok' : 'bad'}>
                <details open={!correct}>
                  <summary>
                    <span className="mark">{correct ? '⭕' : '❌'}</span> <Rich text={q.prompt} />
                  </summary>
                  {q.code && <Code code={q.code} lang={q.codeLang ?? 'java'} />}
                  {!correct && (
                    <p className="review-line bad-text">
                      내 답: <Rich text={q.choices[pickedOrig]} />
                    </p>
                  )}
                  <p className="review-line ok-text">
                    정답: <Rich text={q.choices[q.answer]} />
                  </p>
                  <p className="explain">
                    <Rich text={q.explain} />
                  </p>
                </details>
              </li>
            ))}
          </ol>
          <button className="btn primary wide" onClick={onClose}>
            확인
          </button>
        </div>
      </div>
    );
  }

  const it = items[i];
  const { q } = it;
  const answeredCorrect = picked !== null && it.order[picked] === q.answer;

  return (
    <div className="quiz">
      <div className="quiz-head">
        <span className="quiz-title">{title}</span>
        <span className="quiz-count">
          {i + 1} / {items.length}
        </span>
        {combo >= 3 && <span className="combo">🔥 {combo}</span>}
      </div>
      <div className="progress">
        <div className="progress-bar" style={{ width: `${(i / items.length) * 100}%` }} />
      </div>
      <div className="q-card" key={q.id}>
        <div className="q-tags">
          <span className={`tag type-${q.type.replace(/\s/g, '')}`}>{q.type}</span>
          <span className="tag soft">Lv.{q.level} · {q.topic}</span>
        </div>
        <p className="q-prompt">
          <Rich text={q.prompt} />
        </p>
        {q.code && <Code code={q.code} lang={q.codeLang ?? 'java'} />}
        <div className={`choices ${q.type === 'OX' ? 'ox' : ''}`}>
          {it.order.map((orig, d) => {
            let cls = 'choice';
            if (picked !== null && feedback === 'instant') {
              if (orig === q.answer) cls += ' correct';
              else if (d === picked) cls += ' wrong';
              else cls += ' dim';
            } else if (picked === d) cls += ' chosen';
            return (
              <button key={d} className={cls} onClick={() => pick(d)} disabled={picked !== null}>
                {q.type !== 'OX' && <span className="choice-no">{d + 1}</span>}
                <span className="choice-text">
                  <Rich text={q.choices[orig]} />
                </span>
              </button>
            );
          })}
        </div>
        {picked !== null && feedback === 'instant' && (
          <div className={`feedback ${answeredCorrect ? 'ok' : 'bad'}`}>
            <strong>{answeredCorrect ? '정답이에요! 🎉' : '아쉬워요 😢 오답노트에 저장했어요'}</strong>
            <p>
              <Rich text={q.explain} />
            </p>
            <button className="btn primary wide" onClick={next} autoFocus>
              {i + 1 < items.length ? '다음 문제 →' : '결과 보기'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
