import { useState } from 'react';
import { lessonsOf, questionById, questionsOf } from '../content';
import type { Lesson } from '../content/types';
import { LEVELS, RULES } from '../data/levels';
import { ITEMS } from '../data/shop';
import { readLesson, type Save } from '../store';
import { pickPractice } from '../util';
import { Code, Rich } from './Code';
import { Quiz } from './Quiz';
import { LevelChips, Room, Tabs } from './Room';

export function StudyRoom({ save, onClose }: { save: Save; onClose: () => void }) {
  const cur = Math.min(save.level, 10);
  const [tab, setTab] = useState<'lessons' | 'note'>('lessons');
  const [lv, setLv] = useState(cur);
  const [open, setOpen] = useState<Lesson | null>(null);
  const [quiz, setQuiz] = useState<null | { title: string; ids: string[]; mode: 'practice' | 'note' }>(null);
  const desk = ITEMS.filter((i) => i.slot === 'desk' && save.owned.includes(i.id));

  if (quiz) {
    const qs = quiz.ids.map((id) => questionById(id)!).filter(Boolean);
    return (
      <Room emoji="📚" title="공부방" color="#a9c4ff" onClose={() => setQuiz(null)}>
        <Quiz questions={qs} mode={quiz.mode} title={quiz.title} feedback="instant" onClose={() => setQuiz(null)} />
      </Room>
    );
  }

  if (open) {
    const list = lessonsOf(open.level);
    const idx = list.findIndex((l) => l.id === open.id);
    const read = save.lessonsRead.includes(open.id);
    return (
      <Room emoji="📖" title={open.title} sub={`Lv.${open.level} ${LEVELS[open.level - 1].title} · ${idx + 1}/${list.length}`} color="#a9c4ff" onClose={() => setOpen(null)}>
        <article className="lesson">
          <p className="lesson-summary">
            <Rich text={open.summary} />
          </p>
          {open.blocks.map((b, i) => {
            if (b.t === 'p') return <p key={i}><Rich text={b.text} /></p>;
            if (b.t === 'code') return <Code key={i} code={b.code} lang={b.lang} />;
            if (b.t === 'list')
              return (
                <ul key={i}>
                  {b.items.map((it, j) => <li key={j}><Rich text={it} /></li>)}
                </ul>
              );
            if (b.t === 'tip') return <div key={i} className="tip"><Rich text={b.text} /></div>;
            return (
              <div key={i} className="table-wrap">
                <table>
                  <thead><tr>{b.head.map((h, j) => <th key={j}>{h}</th>)}</tr></thead>
                  <tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}><Rich text={c} /></td>)}</tr>)}</tbody>
                </table>
              </div>
            );
          })}
          <div className="lesson-foot">
            {read ? (
              <span className="done-pill">✓ 완독한 레슨</span>
            ) : (
              <button className="btn primary" onClick={() => readLesson(open.id)}>다 읽었어요 (+{RULES.lessonXp} XP)</button>
            )}
            <button
              className="btn"
              onClick={() => setQuiz({ title: `Lv.${open.level} 확인 문제`, ids: pickPractice(questionsOf(open.level), save, 5).map((q) => q.id), mode: 'practice' })}
            >
              ✏️ 확인 문제 5개
            </button>
          </div>
          <div className="lesson-nav">
            <button className="btn ghost" disabled={idx <= 0} onClick={() => setOpen(list[idx - 1])}>← 이전</button>
            <button className="btn ghost" disabled={idx >= list.length - 1} onClick={() => setOpen(list[idx + 1])}>다음 →</button>
          </div>
        </article>
      </Room>
    );
  }

  const lessons = lessonsOf(lv);
  const readCount = lessons.filter((l) => save.lessonsRead.includes(l.id)).length;
  const notes = save.wrongNote.map((id) => questionById(id)).filter((q) => !!q);

  return (
    <Room
      emoji="📚"
      title="공부방"
      sub="개념 카드를 읽고 XP를 모으세요. 틀린 문제는 오답노트에 쌓여요."
      color="#a9c4ff"
      onClose={onClose}
      actions={desk.length ? <span className="desk">{desk.map((d) => d.emoji).join('')}</span> : undefined}
    >
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'lessons', label: '📖 개념 카드' },
          { id: 'note', label: `🩹 오답노트 ${notes.length ? `(${notes.length})` : ''}` },
        ]}
      />
      {tab === 'lessons' ? (
        <>
          <LevelChips value={lv} max={cur} onChange={setLv} />
          <div className="level-banner">
            <span className="lb-emoji">{LEVELS[lv - 1].emoji}</span>
            <div>
              <strong>Lv.{lv} {LEVELS[lv - 1].title}</strong>
              <p className="muted small">완독 {readCount}/{lessons.length} · {LEVELS[lv - 1].topics.join(' · ')}</p>
            </div>
          </div>
          <div className="card-list">
            {lessons.map((l, i) => {
              const read = save.lessonsRead.includes(l.id);
              return (
                <button key={l.id} className={`lesson-card ${read ? 'read' : ''}`} onClick={() => setOpen(l)}>
                  <span className="lc-no">{read ? '✓' : i + 1}</span>
                  <span className="lc-text">
                    <strong>{l.title}</strong>
                    <span className="muted small"><Rich text={l.summary} /></span>
                  </span>
                  {!read && <span className="lc-xp">+{RULES.lessonXp}</span>}
                </button>
              );
            })}
          </div>
          <button
            className="btn wide"
            onClick={() => setQuiz({ title: `Lv.${lv} 연습문제`, ids: pickPractice(questionsOf(lv), save, 10).map((q) => q.id), mode: 'practice' })}
          >
            ✏️ Lv.{lv} 연습문제 10개 풀기
          </button>
        </>
      ) : notes.length === 0 ? (
        <div className="empty">
          <div className="empty-emoji">🎉</div>
          <p>오답노트가 비어 있어요!<br />틀린 문제는 여기에 모이고, 다시 맞히면 졸업해요 (+{RULES.wrongNoteClearXp} XP 보너스).</p>
        </div>
      ) : (
        <>
          <button
            className="btn primary wide"
            onClick={() => setQuiz({ title: '오답노트 복습', ids: notes.slice(0, 10).map((q) => q.id), mode: 'note' })}
          >
            🩹 오답 복습 시작 ({Math.min(10, notes.length)}문제)
          </button>
          <ul className="note-list">
            {notes.map((q) => (
              <li key={q.id}>
                <span className="tag soft">Lv.{q.level} · {q.topic}</span>
                <span className="note-q"><Rich text={q.prompt} /></span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Room>
  );
}
