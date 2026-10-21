import { signInAsGuest, supabase } from '@lab/core';
import { rpc, table } from '../db';

export const BUCKET = 'dosirak';

export interface Profile {
  user_id: string;
  nickname: string;
  avatar: string;
  lunch_price: number;
}

export interface Post {
  id: string;
  user_id: string;
  photo_path: string | null;
  title: string;
  body: string;
  cost: number;
  saved: number;
  tags: string[];
  cook_min: number | null;
  has_recipe: boolean;
  eaten_on: string;
  created_at: string;
  nickname: string;
  avatar: string;
  like_count: number;
  liked: boolean;
  comment_count: number;
}

export interface PostFull extends Post {
  ingredients: string;
  steps: string;
  visibility: 'public' | 'private';
}

export interface Comment {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  nickname: string;
  avatar: string;
}

export interface Crew {
  id: string;
  name: string;
  code: string;
  owner_id: string;
}

export interface Dish {
  id: string;
  user_id: string;
  day: string;
  dish: string;
  note: string;
}

/** 가입 화면 없이 바로: 세션 없으면 조용히 게스트 */
export async function ensureUser() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session.user.id;
  return (await signInAsGuest()).user.id;
}

export const photoUrl = (path: string | null) => (path ? supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl : null);

const ERRORS: Record<string, string> = {
  CREW_NOT_FOUND: '초대 코드가 맞지 않아요.',
  CREW_FULL: '멤버가 꽉 찼어요 (최대 30명).',
  TOO_MANY_CREWS: '모임은 10개까지 만들 수 있어요.',
  NOT_SIGNED_IN: '잠시 후 다시 시도해 주세요.',
  anonymous_provider_disabled: '게스트 입장이 꺼져 있어요. 관리자에게 알려주세요.',
};
export function friendlyError(e: unknown) {
  const err = e as { message?: string; code?: string };
  for (const [k, v] of Object.entries(ERRORS)) if (err?.message?.includes(k) || err?.code === k) return v;
  return '잠시 후 다시 시도해 주세요.';
}

// ───── 프로필
let mine: Profile | null | undefined;
export async function getMyProfile(force = false) {
  if (mine !== undefined && !force) return mine;
  const uid = await ensureUser();
  const { data, error } = await table('profiles').select('user_id, nickname, avatar, lunch_price').eq('user_id', uid).maybeSingle();
  if (error) throw error;
  mine = (data as Profile | null) ?? null;
  return mine;
}
export async function saveMyProfile(p: Omit<Profile, 'user_id'>) {
  const uid = await ensureUser();
  const row = { user_id: uid, nickname: p.nickname.trim(), avatar: p.avatar, lunch_price: p.lunch_price };
  const { error } = await table('profiles').upsert(row);
  if (error) throw error;
  mine = row;
  return row;
}
export async function getProfile(id: string) {
  const { data, error } = await table('profiles').select('user_id, nickname, avatar, lunch_price').eq('user_id', id).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

// ───── 글
export type FeedMode = 'latest' | 'popular' | 'recipe' | 'user' | 'crew';
export async function fetchFeed(mode: FeedMode, o: { user?: string; crew?: string; tag?: string | null; before?: string; limit?: number } = {}) {
  await ensureUser();
  return rpc<Post[]>('feed', {
    p_mode: mode,
    p_user: o.user ?? null,
    p_crew: o.crew ?? null,
    p_tag: o.tag ?? null,
    p_before: o.before ?? null,
    p_limit: o.limit ?? 20,
  });
}

export async function fetchPost(id: string): Promise<PostFull | null> {
  await ensureUser();
  const { data, error } = await table('posts').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [author, likes, liked, comments] = await Promise.all([
    getProfile(data.user_id),
    table('likes').select('post_id', { count: 'exact', head: true }).eq('post_id', id),
    table('likes').select('post_id').eq('post_id', id).eq('user_id', (await supabase.auth.getSession()).data.session?.user.id ?? ''),
    table('comments').select('id', { count: 'exact', head: true }).eq('post_id', id),
  ]);
  return {
    ...(data as PostFull),
    has_recipe: Boolean(data.ingredients || data.steps),
    nickname: author?.nickname ?? '알 수 없음',
    avatar: author?.avatar ?? '🍙',
    like_count: likes.count ?? 0,
    liked: (liked.data?.length ?? 0) > 0,
    comment_count: comments.count ?? 0,
  };
}

export interface NewPost {
  title: string;
  body: string;
  cost: number;
  tags: string[];
  cook_min: number | null;
  ingredients: string;
  steps: string;
  eaten_on: string;
  visibility: 'public' | 'private';
  photo: Blob | null;
}

export async function createPost(p: NewPost, lunchPrice: number) {
  const uid = await ensureUser();
  const id = crypto.randomUUID();
  let photo_path: string | null = null;
  if (p.photo) {
    photo_path = `${uid}/${id}.jpg`;
    const { error } = await supabase.storage.from(BUCKET).upload(photo_path, p.photo, { contentType: 'image/jpeg', upsert: true });
    if (error) throw error;
  }
  const { photo: _photo, ...rest } = p;
  const { error } = await table('posts').insert({ ...rest, id, photo_path, lunch_price: lunchPrice, title: p.title.trim(), body: p.body.trim() });
  if (error) throw error;
  return id;
}

export async function deletePost(p: { id: string; photo_path: string | null }) {
  const { error } = await table('posts').delete().eq('id', p.id);
  if (error) throw error;
  if (p.photo_path) await supabase.storage.from(BUCKET).remove([p.photo_path]);
}

/** 내 기록(통계용): 날짜·아낀 돈·사진만 */
export async function fetchMyLog() {
  const uid = await ensureUser();
  const { data, error } = await table('posts').select('id, eaten_on, saved, cost, photo_path, title').eq('user_id', uid).order('eaten_on', { ascending: false }).limit(1000);
  if (error) throw error;
  return data as { id: string; eaten_on: string; saved: number; cost: number; photo_path: string | null; title: string }[];
}

export async function like(postId: string, on: boolean) {
  const uid = await ensureUser();
  const { error } = on ? await table('likes').upsert({ post_id: postId, user_id: uid }) : await table('likes').delete().eq('post_id', postId).eq('user_id', uid);
  if (error) throw error;
}

export async function fetchComments(postId: string): Promise<Comment[]> {
  const { data, error } = await table('comments').select('id, user_id, body, created_at').eq('post_id', postId).order('created_at').limit(200);
  if (error) throw error;
  const rows = data as Omit<Comment, 'nickname' | 'avatar'>[];
  const people = await profilesOf(rows.map((r) => r.user_id));
  return rows.map((r) => ({ ...r, nickname: people.get(r.user_id)?.nickname ?? '?', avatar: people.get(r.user_id)?.avatar ?? '🍙' }));
}
export async function addComment(postId: string, body: string) {
  const uid = await ensureUser();
  const { error } = await table('comments').insert({ post_id: postId, user_id: uid, body: body.trim() });
  if (error) throw error;
}
export async function deleteComment(id: string) {
  const { error } = await table('comments').delete().eq('id', id);
  if (error) throw error;
}

async function profilesOf(ids: string[]) {
  const uniq = [...new Set(ids)];
  if (!uniq.length) return new Map<string, Profile>();
  const { data, error } = await table('profiles').select('user_id, nickname, avatar, lunch_price').in('user_id', uniq);
  if (error) throw error;
  return new Map((data as Profile[]).map((p) => [p.user_id, p]));
}

// ───── 도시락 멤버
export async function myCrews(): Promise<(Crew & { members: number })[]> {
  const uid = await ensureUser();
  const { data, error } = await table('crew_members').select('crew_id').eq('user_id', uid);
  if (error) throw error;
  const ids = (data as { crew_id: string }[]).map((r) => r.crew_id);
  if (!ids.length) return [];
  const [crews, members] = await Promise.all([
    table('crews').select('id, name, code, owner_id').in('id', ids),
    table('crew_members').select('crew_id').in('crew_id', ids),
  ]);
  if (crews.error) throw crews.error;
  const count = new Map<string, number>();
  for (const m of (members.data ?? []) as { crew_id: string }[]) count.set(m.crew_id, (count.get(m.crew_id) ?? 0) + 1);
  return (crews.data as Crew[]).map((c) => ({ ...c, members: count.get(c.id) ?? 1 }));
}
export async function createCrew(name: string) {
  await ensureUser();
  return rpc<Crew>('create_crew', { p_name: name });
}
export async function previewCrew(code: string) {
  await ensureUser();
  const rows = await rpc<{ id: string; name: string; members: number; joined: boolean }[]>('crew_preview', { p_code: code });
  return rows[0] ?? null;
}
export async function joinCrew(code: string) {
  await ensureUser();
  return rpc<string>('join_crew', { p_code: code });
}
export async function leaveCrew(crewId: string) {
  const uid = await ensureUser();
  const { error } = await table('crew_members').delete().eq('crew_id', crewId).eq('user_id', uid);
  if (error) throw error;
}
export async function fetchCrew(crewId: string) {
  await ensureUser();
  const { data, error } = await table('crews').select('id, name, code, owner_id').eq('id', crewId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: m, error: e2 } = await table('crew_members').select('user_id, joined_at').eq('crew_id', crewId).order('joined_at');
  if (e2) throw e2;
  const people = await profilesOf((m as { user_id: string }[]).map((r) => r.user_id));
  const members = (m as { user_id: string }[]).map((r) => people.get(r.user_id) ?? { user_id: r.user_id, nickname: '(프로필 없음)', avatar: '🍙', lunch_price: 0 });
  return { crew: data as Crew, members };
}
export async function fetchDishes(crewId: string, from: string, to: string) {
  const { data, error } = await table('dishes').select('id, user_id, day, dish, note').eq('crew_id', crewId).gte('day', from).lte('day', to);
  if (error) throw error;
  return data as Dish[];
}
export async function setDish(crewId: string, day: string, dish: string, note: string) {
  const uid = await ensureUser();
  const { error } = await table('dishes').upsert({ crew_id: crewId, user_id: uid, day, dish: dish.trim(), note: note.trim() }, { onConflict: 'crew_id,user_id,day' });
  if (error) throw error;
}
export async function clearDish(crewId: string, day: string) {
  const uid = await ensureUser();
  const { error } = await table('dishes').delete().eq('crew_id', crewId).eq('user_id', uid).eq('day', day);
  if (error) throw error;
}
