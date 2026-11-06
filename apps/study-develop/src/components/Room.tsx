import type { ReactNode } from 'react';

/** 건물 안 화면 공통 틀 */
export function Room({ emoji, title, sub, color, onClose, children, actions }: {
  emoji: string;
  title: string;
  sub?: ReactNode;
  color: string;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="room-backdrop">
      <section className="room" style={{ ['--c' as string]: color }}>
        <header className="room-head">
          <button className="btn ghost back" onClick={onClose} aria-label="캠퍼스로 나가기">
            ← 캠퍼스
          </button>
          <div className="room-title">
            <span className="room-emoji">{emoji}</span>
            <div>
              <h2>{title}</h2>
              {sub && <p className="muted small">{sub}</p>}
            </div>
          </div>
          <div className="room-actions">{actions}</div>
        </header>
        <div className="room-body">{children}</div>
      </section>
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { id: T; label: ReactNode }[] }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} className={`tab ${value === t.id ? 'on' : ''}`} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function LevelChips({ value, max, onChange }: { value: number; max: number; onChange: (lv: number) => void }) {
  return (
    <div className="chips">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((lv) => (
        <button key={lv} className={`chip ${value === lv ? 'on' : ''}`} disabled={lv > max} onClick={() => onChange(lv)}>
          {lv > max ? '🔒' : ''}Lv.{lv}
        </button>
      ))}
    </div>
  );
}
