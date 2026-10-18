import { rpc, table } from '../db';
import { ensureUser } from './sync';

export interface Profile {
  user_id: string;
  nickname: string;
  avatar: string;
  bio: string;
}

export interface FeedItem {
  id: string;
  user_id: string;
  body: string;
  mood: string | null;
  photo_path: string | null;
  happened_at: string;
  nickname: string;
  avatar: string;
  like_count: number;
  liked: boolean;
}

export interface Stats {
  posts: number;
  followers: number;
  following: number;
  i_follow: boolean;
}

export const AVATARS = ['🙂', '😎', '🐶', '🐱', '🐻', '🐰', '🦊', '🐼', '🐧', '🐥', '🌻', '🌙', '⭐', '🍀', '☕', '🎈'];

let myProfile: Profile | null | undefined;

export async function getMyProfile(force = false): Promise<Profile | null> {
  if (myProfile !== undefined && !force) return myProfile;
  const uid = await ensureUser();
  const { data, error } = await table('profiles').select('user_id, nickname, avatar, bio').eq('user_id', uid).maybeSingle();
  if (error) throw error;
  myProfile = (data as Profile | null) ?? null;
  return myProfile;
}

export async function saveMyProfile(p: Omit<Profile, 'user_id'>) {
  const uid = await ensureUser();
  const row = { user_id: uid, nickname: p.nickname.trim(), avatar: p.avatar, bio: p.bio.trim() };
  const { error } = await table('profiles').upsert(row);
  if (error) throw error;
  myProfile = row;
  return row;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await table('profiles').select('user_id, nickname, avatar, bio').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function fetchFeed(mode: 'discover' | 'following' | 'user', opts: { user?: string; before?: string; exclude?: string[]; limit?: number } = {}) {
  await ensureUser();
  return rpc<FeedItem[]>('feed', {
    p_mode: mode,
    p_user: opts.user ?? null,
    p_before: opts.before ?? null,
    p_exclude: opts.exclude ?? [],
    p_limit: opts.limit ?? 20,
  });
}

export async function fetchStats(userId: string) {
  const rows = await rpc<Stats[]>('profile_stats', { p_user: userId });
  return rows[0];
}

export async function suggestPeople() {
  await ensureUser();
  return rpc<(Profile & { posts: number })[]>('suggest_people', { p_limit: 10 });
}

export async function follow(userId: string, on: boolean) {
  const uid = await ensureUser();
  const { error } = on
    ? await table('follows').upsert({ follower_id: uid, followee_id: userId })
    : await table('follows').delete().eq('follower_id', uid).eq('followee_id', userId);
  if (error) throw error;
}

export async function like(entryId: string, on: boolean) {
  const uid = await ensureUser();
  const { error } = on
    ? await table('likes').upsert({ entry_id: entryId, user_id: uid })
    : await table('likes').delete().eq('entry_id', entryId).eq('user_id', uid);
  if (error) throw error;
}

/** 구독자 / 구독 중 목록 */
export async function fetchPeople(userId: string, kind: 'followers' | 'following'): Promise<Profile[]> {
  const [mine, other] = kind === 'followers' ? ['followee_id', 'follower_id'] : ['follower_id', 'followee_id'];
  const { data, error } = await table('follows').select(other).eq(mine, userId).order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  const ids = (data as unknown as Record<string, string>[]).map((r) => r[other]);
  if (!ids.length) return [];
  const { data: profiles, error: e2 } = await table('profiles').select('user_id, nickname, avatar, bio').in('user_id', ids);
  if (e2) throw e2;
  const byId = new Map((profiles as Profile[]).map((p) => [p.user_id, p]));
  return ids.flatMap((id) => (byId.get(id) ? [byId.get(id)!] : []));
}
