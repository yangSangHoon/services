import { signInAsGuest, supabase } from '@lab/core';
import { table } from '../db';
import { listPending, removePending, type Entry } from './store';

export const BUCKET = 'moments';

/** 로그인 안 돼 있으면 조용히 게스트로. 가입 화면 없이 바로 쓰게 하는 게 핵심 */
export async function ensureUser() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session.user.id;
  const session = await signInAsGuest();
  return session.user.id;
}

let running: Promise<number> | null = null;

/** 기기에 쌓인 글을 서버로. 동시에 여러 번 불려도 한 번만 돈다. 남은 개수를 돌려준다 */
export function flushPending(): Promise<number> {
  running ??= (async () => {
    try {
      const pending = await listPending();
      if (pending.length === 0) return 0;
      const uid = await ensureUser();
      let left = pending.length;
      for (const p of pending.sort((a, b) => a.entry.created_at.localeCompare(b.entry.created_at))) {
        if (p.op === 'delete') {
          const { error } = await table('entries').delete().eq('id', p.entry.id);
          if (error) throw error;
          if (p.entry.photo_path) await supabase.storage.from(BUCKET).remove([p.entry.photo_path]);
        } else {
          let photo_path = p.entry.photo_path;
          if (p.photo) {
            photo_path = `${uid}/${p.entry.id}.jpg`;
            const { error } = await supabase.storage.from(BUCKET).upload(photo_path, p.photo, { contentType: 'image/jpeg', upsert: true });
            if (error) throw error;
          }
          const { error } = await table('entries').upsert({ ...p.entry, photo_path });
          if (error) throw error;
        }
        await removePending(p.entry.id);
        left--;
      }
      return left;
    } finally {
      running = null;
    }
  })();
  return running;
}

/** 내 기록만 (RLS 로는 남의 공개 글도 보이므로 user_id 로 거른다) */
export async function fetchEntries(): Promise<Entry[]> {
  const uid = await ensureUser();
  const { data, error } = await table('entries')
    .select('id, body, mood, photo_path, happened_at, created_at, visibility')
    .eq('user_id', uid)
    .order('happened_at', { ascending: false })
    .limit(1000);
  if (error) throw error;
  return data as Entry[];
}

// 비공개 버킷이라 서명 URL. 한 시간짜리를 메모리에 들고 있는다
const signed = new Map<string, { url: string; exp: number }>();
export async function signPhotos(paths: string[]) {
  const now = Date.now();
  const need = paths.filter((p) => (signed.get(p)?.exp ?? 0) <= now);
  for (let i = 0; i < need.length; i += 100) {
    const chunk = need.slice(i, i + 100);
    const { data } = await supabase.storage.from(BUCKET).createSignedUrls(chunk, 3600);
    data?.forEach((d) => d.signedUrl && d.path && signed.set(d.path, { url: d.signedUrl, exp: now + 3500_000 }));
  }
  return Object.fromEntries(paths.flatMap((p) => (signed.get(p) ? [[p, signed.get(p)!.url]] : [])));
}
