import { isConfigured, useSession } from '@lab/core';
import { PopNumber, usePresence } from '@lab/core/motion';
import { track } from '@lab/core/track';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Archive } from './components/Archive';
import { Composer, type Draft } from './components/Composer';
import { Detail } from './components/Detail';
import { MomentCard } from './components/MomentCard';
import { Settings } from './components/Settings';
import { compressPhoto } from './lib/image';
import { isStandalone } from './lib/install';
import { dayKey } from './lib/time';
import { listPending, loadCachedEntries, putPending, removePending, saveCachedEntries, takeSharedPayload, type Entry, type Pending } from './lib/store';
import { fetchEntries, flushPending, signPhotos } from './lib/sync';

type Tab = 'write' | 'archive';
type SyncState = 'idle' | 'syncing' | 'offline' | 'error';

const NUDGE_KEY = 'moments:nudge-off';

export default function App() {
  const { session } = useSession();
  const [tab, setTab] = useState<Tab>('write');
  const [server, setServer] = useState<Entry[]>(loadCachedEntries);
  const [pending, setPending] = useState<Pending[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [sync, setSync] = useState<SyncState>('idle');
  const [syncError, setSyncError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [shared, setShared] = useState<Partial<Draft> | null>(null);
  const [nudge, setNudge] = useState(() => !isStandalone() && !safeGet(NUDGE_KEY));
  const localUrls = useRef(new Map<string, string>());

  const loadPending = useCallback(async () => {
    const list = await listPending().catch(() => [] as Pending[]);
    for (const p of list) if (p.photo && !localUrls.current.has(p.entry.id)) localUrls.current.set(p.entry.id, URL.createObjectURL(p.photo));
    setPending(list);
    return list;
  }, []);

  const refresh = useCallback(async () => {
    if (!isConfigured) return;
    if (!navigator.onLine) return setSync('offline');
    setSync('syncing');
    try {
      await flushPending();
      await loadPending();
      const list = await fetchEntries();
      setServer(list);
      saveCachedEntries(list);
      const paths = list.flatMap((e) => (e.photo_path ? [e.photo_path] : []));
      if (paths.length) setPhotoUrls(await signPhotos(paths));
      setSync('idle');
      setSyncError('');
    } catch (e) {
      console.warn('[moments] sync', e);
      setSync(navigator.onLine ? 'error' : 'offline');
      setSyncError((e as { code?: string; message?: string })?.code ?? (e as Error)?.message ?? '');
      await loadPending();
    }
  }, [loadPending]);

  // 처음 열 때: 기기 대기분 → 공유/URL로 넘어온 내용 → 서버 동기화
  useEffect(() => {
    loadPending();
    const params = new URLSearchParams(location.search);
    const text = params.get('text') ?? params.get('t');
    if (text) setShared({ body: text });
    if (params.has('shared')) {
      takeSharedPayload().then((p) => p && setShared({ body: p.text, photo: p.photo }));
    }
    if (params.has('archive')) setTab('archive');
    if ([...params.keys()].length) history.replaceState(null, '', location.pathname);
    refresh();
    const onOnline = () => refresh();
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', () => setSync('offline'));
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadPending, refresh]);

  // 다른 계정으로 바뀌면 다시 받아온다
  const uid = session?.user.id;
  const lastUid = useRef(uid);
  useEffect(() => {
    if (uid && lastUid.current && uid !== lastUid.current) {
      setServer([]);
      refresh();
    }
    lastUid.current = uid;
  }, [uid, refresh]);

  const entries = useMemo(() => {
    const map = new Map(server.map((e) => [e.id, e]));
    for (const p of pending) {
      if (p.op === 'delete') map.delete(p.entry.id);
      else map.set(p.entry.id, p.entry);
    }
    return [...map.values()].sort((a, b) => b.happened_at.localeCompare(a.happened_at));
  }, [server, pending]);

  const pendingIds = useMemo(() => new Set(pending.map((p) => p.entry.id)), [pending]);
  const photoOf = useCallback(
    (e: Entry) => localUrls.current.get(e.id) ?? (e.photo_path ? photoUrls[e.photo_path] : undefined),
    [photoUrls],
  );

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 2400);
  };

  const save = async (d: Draft) => {
    const now = new Date();
    const entry: Entry = {
      id: crypto.randomUUID(),
      body: d.body.trim(),
      mood: d.mood,
      photo_path: null,
      happened_at: d.happenedAt.toISOString(),
      created_at: now.toISOString(),
    };
    const photo = d.photo ? await compressPhoto(d.photo).catch(() => d.photo) : null;
    await putPending({ entry, photo, op: 'upsert' });
    if (photo) localUrls.current.set(entry.id, URL.createObjectURL(photo));
    setPending((list) => [...list, { entry, photo, op: 'upsert' }]);
    track('moments', d.photo ? 'save-photo' : 'save');
    flash(d.photo ? '📸 사진이랑 같이 보관했어요' : '✨ 이 순간, 보관했어요');
    refresh();
  };

  const update = async (entry: Entry) => {
    await putPending({ entry, photo: null, op: 'upsert' });
    setPending((list) => [...list.filter((p) => p.entry.id !== entry.id), { entry, photo: null, op: 'upsert' }]);
    refresh();
  };

  const remove = async (entry: Entry) => {
    const onlyLocal = pending.some((p) => p.entry.id === entry.id) && !server.some((s) => s.id === entry.id);
    const p: Pending = { entry, photo: null, op: 'delete' };
    if (onlyLocal) {
      // 아직 서버에 안 올라간 글은 기기에서만 지우면 끝
      await removePending(entry.id);
      setPending((list) => list.filter((x) => x.entry.id !== entry.id));
    } else {
      await putPending(p);
      setPending((list) => [...list.filter((x) => x.entry.id !== entry.id), p]);
      refresh();
    }
    setOpenId(null);
    flash('지웠어요');
  };

  const open = entries.find((e) => e.id === openId) ?? null;
  const today = useMemo(() => onThisDay(entries), [entries]);
  const waiting = pending.length;

  const dismissNudge = () => {
    setNudge(false);
    safeSet(NUDGE_KEY, '1');
  };

  return (
    <div className="app">
      <header className="top">
        <button className="brand" onClick={() => setTab('write')}>
          <span className="brand-mark">📸</span> 찰나
        </button>
        <SyncBadge state={sync} waiting={waiting} onClick={() => setSettings(true)} />
        <button className="icon-btn" onClick={() => setSettings(true)} aria-label="설정">
          ⚙️
        </button>
      </header>

      {tab === 'write' ? (
        <main className="page">
          <Composer key={shared ? 'shared' : 'blank'} initial={shared} onSave={save} />

          {nudge && (
            <div className="nudge">
              <span>📌 홈 화면에 두면 앱처럼 1초 만에 열려요</span>
              <button className="link" onClick={() => setSettings(true)}>
                방법 보기
              </button>
              <button className="x" onClick={dismissNudge} aria-label="닫기">
                ✕
              </button>
            </div>
          )}

          {today && (
            <section className="throwback">
              <h2>
                <span>🕰️</span> {today.label}
              </h2>
              <MomentCard entry={today.entry} photo={photoOf(today.entry)} onOpen={() => setOpenId(today.entry.id)} />
            </section>
          )}

          {entries.length > 0 && (
            <section className="recent">
              <div className="section-head">
                <h2>최근 순간</h2>
                <button className="link" onClick={() => setTab('archive')}>
                  전체 보기 →
                </button>
              </div>
              {entries.slice(0, 3).map((e) => (
                <MomentCard key={e.id} entry={e} photo={photoOf(e)} waiting={pendingIds.has(e.id)} onOpen={() => setOpenId(e.id)} />
              ))}
            </section>
          )}

          {entries.length === 0 && (
            <p className="empty-hint">
              둘이 한참 웃었던 일, 아이가 처음 한 말, 별것 아닌데 좋았던 저녁.
              <br />
              사진 한 장, 한 줄이면 충분해요.
            </p>
          )}
        </main>
      ) : (
        <Archive entries={entries} photoOf={photoOf} pendingIds={pendingIds} onOpen={setOpenId} />
      )}

      <nav className="tabbar">
        <button className={tab === 'write' ? 'on' : ''} onClick={() => setTab('write')}>
          <span className="tab-icon">✍️</span>
          남기기
        </button>
        <button className={tab === 'archive' ? 'on' : ''} onClick={() => setTab('archive')}>
          <span className="tab-icon">📚</span>
          보관함 {entries.length > 0 && <span className="count"><PopNumber value={entries.length} /></span>}
        </button>
      </nav>

      <Toast message={toast} />

      {open && <Detail entry={open} photo={photoOf(open)} onClose={() => setOpenId(null)} onUpdate={update} onDelete={remove} />}
      {settings && <Settings onClose={() => setSettings(false)} waiting={waiting} syncError={sync === 'error' ? syncError : ''} onRetry={refresh} />}
    </div>
  );
}

function SyncBadge({ state, waiting, onClick }: { state: SyncState; waiting: number; onClick: () => void }) {
  const label =
    state === 'offline'
      ? `📴 기기에 보관 중${waiting ? ` ${waiting}` : ''}`
      : state === 'error'
        ? '⚠️ 업로드 대기'
        : state === 'syncing' && waiting
          ? '☁️ 올리는 중…'
          : waiting
            ? `⏳ 대기 ${waiting}`
            : '';
  return (
    <button className={`sync ${label ? 'show' : ''}`} onClick={onClick}>
      {label}
    </button>
  );
}

function Toast({ message }: { message: string | null }) {
  const [last, setLast] = useState(message);
  if (message && message !== last) setLast(message);
  const { mounted, className } = usePresence(Boolean(message));
  if (!mounted) return null;
  return (
    <div className={`toast t-dropdown ${className}`} role="status">
      {message ?? last}
    </div>
  );
}

/** "1년 전 오늘" — 같은 날짜의 지난 기록. 없으면 "한 달 전 오늘", "일주일 전" 순 */
function onThisDay(entries: Entry[]) {
  const now = new Date();
  const byYear = entries.find((e) => {
    const d = new Date(e.happened_at);
    return d.getFullYear() < now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  });
  if (byYear) return { label: `${now.getFullYear() - new Date(byYear.happened_at).getFullYear()}년 전 오늘`, entry: byYear };
  const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  for (const [label, d] of [['한 달 전 오늘', monthAgo], ['일주일 전 오늘', weekAgo]] as const) {
    const hit = entries.find((e) => dayKey(new Date(e.happened_at)) === dayKey(d));
    if (hit) return { label, entry: hit };
  }
  return null;
}

function safeGet(k: string) {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function safeSet(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* noop */
  }
}
