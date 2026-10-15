import type { PhotoMeta } from "../types";

const DB_NAME = "travel-map";
const STORE = "snapshot";
const KEY = "root";
const VERSION = 1;

export type Snapshot = {
  traveler: PhotoMeta | null;
  photos: PhotoMeta[];
  memos: Record<string, string>;
  manualOrder: boolean;
};

const openDB = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

// The object URL in PhotoMeta.url is bound to this page's lifetime — never
// persist it; mint a fresh one from the stored File after load.
const stripUrl = (m: PhotoMeta): PhotoMeta => ({ ...m, url: "" });
const rehydrate = (m: PhotoMeta): PhotoMeta => ({
  ...m,
  url: URL.createObjectURL(m.file),
});

export const loadSnapshot = async (): Promise<Snapshot | null> => {
  try {
    const db = await openDB();
    const raw = await new Promise<Snapshot | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result as Snapshot | undefined);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (!raw) return null;
    return {
      traveler: raw.traveler ? rehydrate(raw.traveler) : null,
      photos: (raw.photos ?? []).map(rehydrate),
      memos: raw.memos ?? {},
      manualOrder: raw.manualOrder ?? false,
    };
  } catch {
    return null;
  }
};

export const saveSnapshot = async (snap: Snapshot): Promise<void> => {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(
        {
          traveler: snap.traveler ? stripUrl(snap.traveler) : null,
          photos: snap.photos.map(stripUrl),
          memos: snap.memos,
          manualOrder: snap.manualOrder,
        },
        KEY,
      );
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Storage errors are non-fatal — the session keeps working.
  }
};

export const clearSnapshot = async (): Promise<void> => {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // no-op
  }
};
