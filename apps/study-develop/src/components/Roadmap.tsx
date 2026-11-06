import { lessonsOf, questionsOf } from '../content';
import { GRADUATE, LEVELS, MAX_LEVEL } from '../data/levels';
import { itemById } from '../data/shop';
import type { Save } from '../store';
import { pct } from '../util';
import { Room } from './Room';

export function Roadmap({ save, onClose }: { save: Save; onClose: () => void }) {
  return (
    <Room emoji="🗺️" title="커리어 로드맵" sub="Java 지망생에서 아키텍트까지 — 전체 성장 과정" color="#7c5cd6" onClose={onClose}>
      <ol className="roadmap">
        {LEVELS.map((m) => {
          const state = save.level > m.level ? 'done' : save.level === m.level ? 'now' : 'locked';
          const lessons = lessonsOf(m.level);
          const qs = questionsOf(m.level);
          const read = lessons.filter((l) => save.lessonsRead.includes(l.id)).length;
          const solved = qs.filter((q) => save.answers[q.id]?.correct).length;
          const best = Math.max(0, ...save.exams.filter((e) => e.level === m.level).map((e) => e.score));
          const item = m.reward.item ? itemById(m.reward.item) : undefined;
          return (
            <li key={m.level} className={`rm ${state}`}>
              <div className="rm-dot">{state === 'done' ? '✓' : m.emoji}</div>
              <div className="rm-body">
                <div className="rm-head">
                  <strong>Lv.{m.level} {m.rank}</strong>
                  {state === 'now' && <span className="tag">지금 여기</span>}
                </div>
                <p className="small">{m.title} — {m.topics.join(' · ')}</p>
                {state !== 'locked' && (
                  <div className="rm-stats small muted">
                    레슨 {read}/{lessons.length} · 문제 {solved}/{qs.length} ({pct(solved, qs.length)}%)
                    {best > 0 && ` · 시험 최고 ${best}점`}
                  </div>
                )}
                {state === 'now' && (
                  <div className="xpbar thin">
                    <div className="xpbar-fill" style={{ width: `${Math.min(100, pct(save.xp, m.xpToExam))}%` }} />
                    <span>{Math.min(save.xp, m.xpToExam)} / {m.xpToExam} XP → 승급 시험</span>
                  </div>
                )}
                <p className="rm-reward small">🎁 승급 보상: 🪙{m.reward.coins}{item ? ` + ${item.emoji} ${item.name}` : ''}</p>
              </div>
            </li>
          );
        })}
        <li className={`rm ${save.level >= MAX_LEVEL ? 'done' : 'locked'}`}>
          <div className="rm-dot">{GRADUATE.emoji}</div>
          <div className="rm-body">
            <strong>{GRADUATE.rank}</strong>
            <p className="small">모든 승급 시험 통과. 이제 후배들을 이끌어 주세요!</p>
          </div>
        </li>
      </ol>
      <div className="tip">
        💡 레벨업 방법: <strong>공부방</strong>에서 레슨 읽기 · <strong>시험장</strong>에서 연습문제 · <strong>실무실</strong> SQL 미션 · <strong>카페</strong> 오늘의 퀴즈로 XP를 모으면 승급 시험이 열려요. 70% 이상 맞히면 레벨업!
      </div>
    </Room>
  );
}
