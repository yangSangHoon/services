/**
 * 기기 안 저장소(IndexedDB). 저장 버튼을 누르면 먼저 여기에 넣고 화면에 바로 보여준 뒤,
 * 서버 업로드는 뒤에서 한다 → 지하철·엘리베이터에서도 10초 안에 끝난다.
 */
export interface Entry {
  id: string;
  body: string;
  mood: string | null;
  photo_path: string | null;
  happened_at: string;
  created_at: string;
  /** 없으면 private (예전 기록) */
  visibility?: Visibility;
}

export type Visibility = 'private' | 'public';

export interface Pending {
  entry: Entry;
  photo: Blob | null;
  /** 'upsert' = 새 글/수정, 'delete' = 지우기 */
  op: 'upsert' | 'delete';
}

const DB = 'moments';
const STORE = 'pending';

let dbp: Promise<IDBDatabase> | null = null;
function db() {
  dbp ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'entry.id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) {
  const d = await db();
  return new Promise<T>((resolve, reject) => {
    const req = fn(d.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const putPending = (p: Pending) => tx('readwrite', (s) => s.put(p));
export const removePending = (id: string) => tx('readwrite', (s) => s.delete(id));
export const listPending = () => tx<Pending[]>('readonly', (s) => s.getAll());

// 서버 목록 캐시: 앱을 열자마자(네트워크 전에) 보관함을 보여주기 위해
const CACHE_KEY = 'moments:entries';
export function loadCachedEntries(): Entry[] {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '[]');
  } catch {
    return [];
  }
}
export function saveCachedEntries(entries: Entry[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entries.slice(0, 300)));
  } catch {
    /* 용량 초과 등은 무시 */
  }
}

// 작성 중인 글: 앱을 닫았다 열어도 남아 있게
const DRAFT_KEY = 'moments:draft';
export const loadDraft = () => {
  try {
    return localStorage.getItem(DRAFT_KEY) ?? '';
  } catch {
    return '';
  }
};
export const saveDraft = (text: string) => {
  try {
    if (text) localStorage.setItem(DRAFT_KEY, text);
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* noop */
  }
};

/** 안드로이드 공유 시트로 넘어온 사진/글 (sw.js 가 Cache 에 넣어 둔다) */
export async function takeSharedPayload(): Promise<{ text: string; photo: Blob | null } | null> {
  if (!('caches' in window)) return null;
  const cache = await caches.open('moments-share');
  const base = new URL('./', location.href).href;
  const [textRes, photoRes] = await Promise.all([cache.match(base + '__shared/text'), cache.match(base + '__shared/photo')]);
  if (!textRes && !photoRes) return null;
  const text = textRes ? await textRes.text() : '';
  const photo = photoRes ? await photoRes.blob() : null;
  await Promise.all([cache.delete(base + '__shared/text'), cache.delete(base + '__shared/photo')]);
  return { text, photo };
}

// 마지막으로 고른 공개 범위를 기억 (매번 고르지 않게)
const VIS_KEY = 'moments:visibility';
export const loadVisibility = (): Visibility => {
  try {
    return localStorage.getItem(VIS_KEY) === 'public' ? 'public' : 'private';
  } catch {
    return 'private';
  }
};
export const saveVisibility = (v: Visibility) => {
  try {
    localStorage.setItem(VIS_KEY, v);
  } catch {
    /* noop */
  }
};

// 안 보기로 한 사람 (이 기기에서만)
const HIDE_KEY = 'moments:hidden-users';
export const loadHidden = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(HIDE_KEY) ?? '[]');
  } catch {
    return [];
  }
};
export const saveHidden = (ids: string[]) => {
  try {
    localStorage.setItem(HIDE_KEY, JSON.stringify(ids));
  } catch {
    /* noop */
  }
};
