-- [moments] 찰나 — 소셜: 공개/비공개, 프로필, 구독(팔로우), 공감(좋아요), 추천·구독 피드
-- 20261017010945_moments.sql 다음에 실행

-- 1) 공개 범위. 기본은 나만 보기
alter table public.moments_entries
  add column if not exists visibility text not null default 'private' check (visibility in ('private', 'public'));
create index if not exists moments_entries_public_time on public.moments_entries (happened_at desc) where visibility = 'public';
create index if not exists moments_entries_photo on public.moments_entries (photo_path) where photo_path is not null;

drop policy if exists "moments_entries select own" on public.moments_entries;
drop policy if exists "moments_entries select own or public" on public.moments_entries;
create policy "moments_entries select own or public" on public.moments_entries
  for select to authenticated using (user_id = auth.uid() or visibility = 'public');

-- 공개 글의 사진은 다른 사람도 볼 수 있게
drop policy if exists "moments_photos select public" on storage.objects;
create policy "moments_photos select public" on storage.objects
  for select to authenticated using (
    bucket_id = 'moments'
    and exists (select 1 from public.moments_entries e where e.photo_path = storage.objects.name and e.visibility = 'public')
  );

-- 2) 프로필 (공개 글을 쓰려면 하나 필요)
create table if not exists public.moments_profiles (
  user_id    uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  nickname   text not null check (char_length(btrim(nickname)) between 1 and 20),
  avatar     text not null default '🙂' check (char_length(avatar) <= 16),
  bio        text not null default '' check (char_length(bio) <= 80),
  created_at timestamptz not null default now()
);
alter table public.moments_profiles enable row level security;
create policy "moments_profiles read" on public.moments_profiles for select to authenticated using (true);
create policy "moments_profiles insert own" on public.moments_profiles for insert to authenticated with check (user_id = auth.uid());
create policy "moments_profiles update own" on public.moments_profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 3) 구독(팔로우)
create table if not exists public.moments_follows (
  follower_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  followee_id uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index if not exists moments_follows_followee on public.moments_follows (followee_id);
alter table public.moments_follows enable row level security;
create policy "moments_follows read" on public.moments_follows for select to authenticated using (true);
create policy "moments_follows insert own" on public.moments_follows for insert to authenticated with check (follower_id = auth.uid());
create policy "moments_follows delete own" on public.moments_follows for delete to authenticated using (follower_id = auth.uid());

-- 4) 공감(좋아요) — 볼 수 있는 글에만
create table if not exists public.moments_likes (
  entry_id   uuid not null references public.moments_entries(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (entry_id, user_id)
);
create index if not exists moments_likes_user on public.moments_likes (user_id);
alter table public.moments_likes enable row level security;
create policy "moments_likes read" on public.moments_likes for select to authenticated using (true);
create policy "moments_likes insert own" on public.moments_likes for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.moments_entries e where e.id = entry_id));
create policy "moments_likes delete own" on public.moments_likes for delete to authenticated using (user_id = auth.uid());

-- 5) 피드. security invoker 라 RLS 그대로(남의 비공개 글은 절대 안 나옴)
--    p_mode: 'discover' 추천(랜덤) / 'following' 구독 / 'user' 한 사람의 공개 글
create or replace function public.moments_feed(
  p_mode    text,
  p_user    uuid default null,
  p_before  timestamptz default null,
  p_exclude uuid[] default '{}',
  p_limit   int default 20
)
returns table (
  id uuid, user_id uuid, body text, mood text, photo_path text, happened_at timestamptz,
  nickname text, avatar text, like_count int, liked boolean
)
language sql stable security invoker set search_path = public
as $$
  select e.id, e.user_id, e.body, e.mood, e.photo_path, e.happened_at,
         p.nickname, p.avatar,
         (select count(*)::int from moments_likes l where l.entry_id = e.id),
         exists (select 1 from moments_likes l where l.entry_id = e.id and l.user_id = auth.uid())
  from moments_entries e
  join moments_profiles p on p.user_id = e.user_id
  where e.visibility = 'public'
    and (p_before is null or e.happened_at < p_before)
    and not (e.id = any (p_exclude))
    and case p_mode
          when 'discover'  then e.user_id <> auth.uid() and e.happened_at > now() - interval '180 days'
          when 'following' then e.user_id in (select f.followee_id from moments_follows f where f.follower_id = auth.uid())
          when 'user'      then e.user_id = p_user
          else false
        end
  order by case when p_mode = 'discover' then random() end, e.happened_at desc
  limit least(greatest(p_limit, 1), 50)
$$;

-- 프로필 화면 숫자
create or replace function public.moments_profile_stats(p_user uuid)
returns table (posts int, followers int, following int, i_follow boolean)
language sql stable security invoker set search_path = public
as $$
  select
    (select count(*)::int from moments_entries where user_id = p_user and visibility = 'public'),
    (select count(*)::int from moments_follows where followee_id = p_user),
    (select count(*)::int from moments_follows where follower_id = p_user),
    exists (select 1 from moments_follows where follower_id = auth.uid() and followee_id = p_user)
$$;

-- 추천 사람: 공개 글이 있고 아직 구독 안 한 사람
create or replace function public.moments_suggest_people(p_limit int default 8)
returns table (user_id uuid, nickname text, avatar text, bio text, posts int)
language sql stable security invoker set search_path = public
as $$
  select p.user_id, p.nickname, p.avatar, p.bio, count(e.id)::int
  from moments_profiles p
  join moments_entries e on e.user_id = p.user_id and e.visibility = 'public'
  where p.user_id <> auth.uid()
    and not exists (select 1 from moments_follows f where f.follower_id = auth.uid() and f.followee_id = p.user_id)
  group by p.user_id
  order by max(e.happened_at) desc
  limit least(greatest(p_limit, 1), 30)
$$;

revoke execute on function public.moments_feed(text, uuid, timestamptz, uuid[], int) from anon;
revoke execute on function public.moments_profile_stats(uuid) from anon;
revoke execute on function public.moments_suggest_people(int) from anon;
grant execute on function public.moments_feed(text, uuid, timestamptz, uuid[], int) to authenticated;
grant execute on function public.moments_profile_stats(uuid) to authenticated;
grant execute on function public.moments_suggest_people(int) to authenticated;
