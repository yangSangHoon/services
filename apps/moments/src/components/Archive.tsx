import { Reveal } from '@lab/core/motion';
import { track } from '@lab/core/track';
import { useMemo, useState } from 'react';
import { MOODS } from '../lib/moods';
import type { Entry } from '../lib/store';
import { dateLabel, dayKey } from '../lib/time';
import { MomentCard } from './MomentCard';

type View = 'timeline' | 'photos';

export function Archive({
  entries,
  photoOf,
  pendingIds,
  onOpen,
}: {
  entries: Entry[];
  photoOf: (e: Entry) => string | undefined;
  pendingIds: Set<string>;
  onOpen: (id: string) => void;
}) {
  const [mood, setMood] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [view, setView] = useState<View>('timeline');

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    return entries.filter((e) => (!mood || e.mood === mood) && (!k || e.body.toLowerCase().includes(k)));
  }, [entries, mood, q]);

  const groups = useMemo(() => {
    const out: { key: string; label: string; items: Entry[] }[] = [];
    for (const e of filtered) {
      const d = new Date(e.happened_at);
      const key = dayKey(d);
      const last = out[out.length - 1];
      if (last?.key === key) last.items.push(e);
      else out.push({ key, label: dateLabel(d), items: [e] });
    }
    return out;
  }, [filtered]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of entries) if (e.mood) c[e.mood] = (c[e.mood] ?? 0) + 1;
    return c;
  }, [entries]);

  const photos = filtered.filter((e) => photoOf(e) || e.photo_path);

  const surprise = () => {
    if (!entries.length) return;
    track('moments', 'random');
    onOpen(entries[Math.floor(Math.random() * entries.length)].id);
  };

  if (entries.length === 0)
    return (
      <main className="page">
        <div className="archive-empty">
          <div className="big">📚</div>
          <p>아직 보관한 순간이 없어요.</p>
          <p className="muted">첫 번째 찰나를 남겨 보세요.</p>
        </div>
      </main>
    );

  return (
    <main className="page">
      <div className="archive-head">
        <h1>
          보관한 순간 <b>{entries.length}</b>
        </h1>
        <button className="pill" onClick={surprise}>
          🎲 추억 하나 꺼내기
        </button>
      </div>

      <input className="search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 그때 뭐라고 적었더라…" />

      <div className="filter">
        <button className={!mood ? 'on' : ''} onClick={() => setMood(null)}>
          전체
        </button>
        {MOODS.filter((m) => counts[m.key]).map((m) => (
          <button key={m.key} className={mood === m.key ? 'on' : ''} onClick={() => setMood(mood === m.key ? null : m.key)}>
            {m.emoji} {counts[m.key]}
          </button>
        ))}
        <span className="spacer" />
        <div className="seg">
          <button className={view === 'timeline' ? 'on' : ''} onClick={() => setView('timeline')} aria-label="타임라인">
            ☰
          </button>
          <button className={view === 'photos' ? 'on' : ''} onClick={() => setView('photos')} aria-label="사진 모아보기">
            ▦
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="muted center">찾는 순간이 없어요.</p>
      ) : view === 'photos' ? (
        photos.length ? (
          <div className="grid">
            {photos.map((e) => {
              const src = photoOf(e);
              return (
                <button key={e.id} className="grid-cell" onClick={() => onOpen(e.id)}>
                  {src ? <img src={src} alt="" loading="lazy" /> : <span className="ph" />}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="muted center">사진이 있는 순간이 없어요.</p>
        )
      ) : (
        groups.map((g) => (
          <section key={g.key} className="day">
            <h2 className="day-label">{g.label}</h2>
            {g.items.map((e, i) => (
              <Reveal key={e.id} index={Math.min(i, 6)}>
                <MomentCard entry={e} photo={photoOf(e)} waiting={pendingIds.has(e.id)} showDate={false} onOpen={() => onOpen(e.id)} />
              </Reveal>
            ))}
          </section>
        ))
      )}
    </main>
  );
}
