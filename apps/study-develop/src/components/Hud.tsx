import { levelMeta, MAX_LEVEL, rankOf } from '../data/levels';
import type { RoomId } from '../data/world';
import { examReady, useToasts, type Save } from '../store';
import { pct } from '../util';
import { Avatar } from './Avatar';

export function Hud({ save, onOpen }: { save: Save; onOpen: (r: RoomId) => void }) {
  const rank = rankOf(save.level);
  const max = save.level >= MAX_LEVEL;
  const need = max ? 1 : levelMeta(save.level).xpToExam;
  const ready = examReady(save);
  return (
    <header className="hud">
      <button className="hud-me" onClick={() => onOpen('home')}>
        <Avatar save={save} size={1.3} />
        <span className="hud-name">
          <strong>{save.name}</strong>
          <span className="small">{rank.emoji} Lv.{Math.min(save.level, 10)} {rank.rank}</span>
        </span>
      </button>
      <button className="hud-xp" onClick={() => onOpen('roadmap')} title="로드맵 보기">
        <div className={`xpbar ${ready ? 'ready' : ''}`}>
          <div className="xpbar-fill" style={{ width: `${max ? 100 : Math.min(100, pct(save.xp, need))}%` }} />
          <span>{max ? 'MAX' : ready ? '🎯 승급 시험 가능!' : `${save.xp} / ${need} XP`}</span>
        </div>
      </button>
      <div className="hud-pills">
        <span className="pill" title="연속 출석">🔥{save.streak.count}</span>
        <span className="pill" title="코인">🪙{save.coins}</span>
      </div>
    </header>
  );
}

const DOCK: { id: RoomId; emoji: string; label: string }[] = [
  { id: 'study', emoji: '📚', label: '공부' },
  { id: 'exam', emoji: '📝', label: '시험' },
  { id: 'office', emoji: '💻', label: '실무' },
  { id: 'cafe', emoji: '☕', label: '퀴즈' },
  { id: 'roadmap', emoji: '🗺️', label: '로드맵' },
  { id: 'reward', emoji: '🎁', label: '보상' },
  { id: 'shop', emoji: '🛍️', label: '상점' },
];

export function Dock({ save, onOpen }: { save: Save; onOpen: (r: RoomId) => void }) {
  return (
    <nav className="dock">
      {DOCK.map((d) => (
        <button key={d.id} className="dock-btn" onClick={() => onOpen(d.id)}>
          <span className="dock-emoji">{d.emoji}</span>
          <span className="dock-label">{d.label}</span>
          {d.id === 'reward' && save.pendingRewards.length > 0 && <span className="dot" />}
          {d.id === 'exam' && examReady(save) && <span className="dot" />}
        </button>
      ))}
    </nav>
  );
}

export function Toasts() {
  const list = useToasts();
  return (
    <div className="toasts" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={`toast t-${t.kind}`}>{t.text}</div>
      ))}
    </div>
  );
}
