-- [dosirak] 싸왔어? — 도시락 자랑 · 아낀 점심값 · 레시피 · 도시락 멤버(반찬 당번)
-- 공유 Supabase 프로젝트 규칙: 모든 이름에 `dosirak_` 접두사.

-- 프로필: 닉네임 + "회사 근처 점심값"(아낀 돈 계산 기준)
create table if not exists public.dosirak_profiles (
  user_id     uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  nickname    text not null check (char_length(btrim(nickname)) between 1 and 20),
  avatar      text not null default '🍙' check (char_length(avatar) <= 16),
  lunch_price int  not null default 12000 check (lunch_price between 0 and 100000),
  created_at  timestamptz not null default now()
);
alter table public.dosirak_profiles enable row level security;
create policy "dosirak_profiles read" on public.dosirak_profiles for select to authenticated using (true);
create policy "dosirak_profiles insert own" on public.dosirak_profiles for insert to authenticated with check (user_id = auth.uid());
create policy "dosirak_profiles update own" on public.dosirak_profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 도시락 글. saved = 그날 점심값 - 재료비 (점심값은 글 쓸 때 값으로 고정)
create table if not exists public.dosirak_posts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  photo_path  text check (photo_path is null or char_length(photo_path) <= 200),
  title       text not null check (char_length(btrim(title)) between 1 and 40),
  body        text not null default '' check (char_length(body) <= 500),
  cost        int  not null default 0 check (cost between 0 and 100000),
  lunch_price int  not null default 12000 check (lunch_price between 0 and 100000),
  saved       int  generated always as (greatest(lunch_price - cost, 0)) stored,
  tags        text[] not null default '{}' check (cardinality(tags) <= 8),
  cook_min    int  check (cook_min is null or cook_min between 0 and 600),
  ingredients text not null default '' check (char_length(ingredients) <= 1000),
  steps       text not null default '' check (char_length(steps) <= 2000),
  eaten_on    date not null default (now() at time zone 'Asia/Seoul')::date,
  visibility  text not null default 'public' check (visibility in ('public', 'private')),
  created_at  timestamptz not null default now()
);
create index if not exists dosirak_posts_time on public.dosirak_posts (created_at desc) where visibility = 'public';
create index if not exists dosirak_posts_user on public.dosirak_posts (user_id, eaten_on desc);
alter table public.dosirak_posts enable row level security;
create policy "dosirak_posts read" on public.dosirak_posts for select to authenticated using (visibility = 'public' or user_id = auth.uid());
create policy "dosirak_posts insert own" on public.dosirak_posts for insert to authenticated with check (user_id = auth.uid());
create policy "dosirak_posts update own" on public.dosirak_posts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "dosirak_posts delete own" on public.dosirak_posts for delete to authenticated using (user_id = auth.uid());

-- 맛있겠다(좋아요) · 댓글
create table if not exists public.dosirak_likes (
  post_id    uuid not null references public.dosirak_posts(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.dosirak_likes enable row level security;
create policy "dosirak_likes read" on public.dosirak_likes for select to authenticated using (true);
create policy "dosirak_likes insert own" on public.dosirak_likes for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.dosirak_posts p where p.id = post_id));
create policy "dosirak_likes delete own" on public.dosirak_likes for delete to authenticated using (user_id = auth.uid());

create table if not exists public.dosirak_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.dosirak_posts(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body       text not null check (char_length(btrim(body)) between 1 and 300),
  created_at timestamptz not null default now()
);
create index if not exists dosirak_comments_post on public.dosirak_comments (post_id, created_at);
alter table public.dosirak_comments enable row level security;
create policy "dosirak_comments read" on public.dosirak_comments for select to authenticated
  using (exists (select 1 from public.dosirak_posts p where p.id = post_id));
create policy "dosirak_comments insert own" on public.dosirak_comments for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.dosirak_posts p where p.id = post_id));
create policy "dosirak_comments delete own" on public.dosirak_comments for delete to authenticated using (user_id = auth.uid());

-- 도시락 멤버: 반찬 나눠 싸 오는 소모임
create table if not exists public.dosirak_crews (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(btrim(name)) between 1 and 30),
  code       text not null unique,
  owner_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.dosirak_crew_members (
  crew_id   uuid not null references public.dosirak_crews(id) on delete cascade,
  user_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);
create index if not exists dosirak_crew_members_user on public.dosirak_crew_members (user_id);

-- RLS 안에서 멤버 여부를 보면 재귀가 생기므로 security definer 함수로
create or replace function public.dosirak_is_member(p_crew uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from dosirak_crew_members where crew_id = p_crew and user_id = auth.uid()) $$;

alter table public.dosirak_crews enable row level security;
alter table public.dosirak_crew_members enable row level security;
create policy "dosirak_crews read member" on public.dosirak_crews for select to authenticated using (public.dosirak_is_member(id));
create policy "dosirak_crews update owner" on public.dosirak_crews for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "dosirak_crew_members read member" on public.dosirak_crew_members for select to authenticated using (public.dosirak_is_member(crew_id));
create policy "dosirak_crew_members leave" on public.dosirak_crew_members for delete to authenticated using (user_id = auth.uid());
-- 만들기·가입은 RPC로만

-- 반찬 당번: 멤버가 날짜별로 "내가 싸 올 반찬"을 적는다
create table if not exists public.dosirak_dishes (
  id         uuid primary key default gen_random_uuid(),
  crew_id    uuid not null references public.dosirak_crews(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day        date not null,
  dish       text not null check (char_length(btrim(dish)) between 1 and 40),
  note       text not null default '' check (char_length(note) <= 60),
  created_at timestamptz not null default now(),
  unique (crew_id, user_id, day)
);
create index if not exists dosirak_dishes_crew_day on public.dosirak_dishes (crew_id, day);
alter table public.dosirak_dishes enable row level security;
create policy "dosirak_dishes read member" on public.dosirak_dishes for select to authenticated using (public.dosirak_is_member(crew_id));
create policy "dosirak_dishes insert own" on public.dosirak_dishes for insert to authenticated with check (user_id = auth.uid() and public.dosirak_is_member(crew_id));
create policy "dosirak_dishes update own" on public.dosirak_dishes for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.dosirak_is_member(crew_id));
create policy "dosirak_dishes delete own" on public.dosirak_dishes for delete to authenticated using (user_id = auth.uid());

create or replace function public.dosirak_create_crew(p_name text)
returns public.dosirak_crews language plpgsql security definer set search_path = public
as $$
declare c dosirak_crews;
begin
  if auth.uid() is null then raise exception 'NOT_SIGNED_IN'; end if;
  if (select count(*) from dosirak_crews where owner_id = auth.uid()) >= 10 then raise exception 'TOO_MANY_CREWS'; end if;
  insert into dosirak_crews (name, code, owner_id)
  values (btrim(p_name), substr(replace(gen_random_uuid()::text, '-', ''), 1, 8), auth.uid())
  returning * into c;
  insert into dosirak_crew_members (crew_id, user_id) values (c.id, auth.uid());
  return c;
end $$;

-- 초대 링크 미리보기 (가입 전이라 RLS로는 못 봄)
create or replace function public.dosirak_crew_preview(p_code text)
returns table (id uuid, name text, members int, joined boolean)
language sql stable security definer set search_path = public
as $$
  select c.id, c.name,
         (select count(*)::int from dosirak_crew_members m where m.crew_id = c.id),
         exists (select 1 from dosirak_crew_members m where m.crew_id = c.id and m.user_id = auth.uid())
  from dosirak_crews c where c.code = p_code
$$;

create or replace function public.dosirak_join_crew(p_code text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'NOT_SIGNED_IN'; end if;
  select id into v_id from dosirak_crews where code = p_code;
  if v_id is null then raise exception 'CREW_NOT_FOUND'; end if;
  if (select count(*) from dosirak_crew_members where crew_id = v_id) >= 30 then raise exception 'CREW_FULL'; end if;
  insert into dosirak_crew_members (crew_id, user_id) values (v_id, auth.uid()) on conflict do nothing;
  return v_id;
end $$;

-- 피드. security invoker 라 RLS 그대로
--   latest 최신 / popular 이번 주 인기 / recipe 레시피 있는 글 / user 한 사람 / crew 우리 멤버
create or replace function public.dosirak_feed(
  p_mode   text,
  p_user   uuid default null,
  p_crew   uuid default null,
  p_tag    text default null,
  p_before timestamptz default null,
  p_limit  int default 20
)
returns table (
  id uuid, user_id uuid, photo_path text, title text, body text, cost int, saved int, tags text[],
  cook_min int, has_recipe boolean, eaten_on date, created_at timestamptz,
  nickname text, avatar text, like_count int, liked boolean, comment_count int
)
language sql stable security invoker set search_path = public
as $$
  select * from (
    select p.id, p.user_id, p.photo_path, p.title, p.body, p.cost, p.saved, p.tags,
           p.cook_min, (p.ingredients <> '' or p.steps <> '') as has_recipe, p.eaten_on, p.created_at,
           pr.nickname, pr.avatar,
           (select count(*)::int from dosirak_likes l where l.post_id = p.id) as like_count,
           exists (select 1 from dosirak_likes l where l.post_id = p.id and l.user_id = auth.uid()) as liked,
           (select count(*)::int from dosirak_comments c where c.post_id = p.id) as comment_count
    from dosirak_posts p
    join dosirak_profiles pr on pr.user_id = p.user_id
    where (p.visibility = 'public' or (p_mode = 'user' and p.user_id = auth.uid()))
      and (p_before is null or p.created_at < p_before)
      and (p_tag is null or p_tag = any (p.tags))
      and case p_mode
            when 'latest'  then true
            when 'popular' then p.created_at > now() - interval '7 days'
            when 'recipe'  then p.ingredients <> '' or p.steps <> ''
            when 'user'    then p.user_id = p_user
            when 'crew'    then dosirak_is_member(p_crew) and p.user_id in (select m.user_id from dosirak_crew_members m where m.crew_id = p_crew)
            else false
          end
  ) f
  order by case when p_mode = 'popular' then f.like_count end desc nulls last, f.created_at desc
  limit least(greatest(p_limit, 1), 50)
$$;

revoke execute on function public.dosirak_create_crew(text) from anon;
revoke execute on function public.dosirak_join_crew(text) from anon;
revoke execute on function public.dosirak_crew_preview(text) from anon;
revoke execute on function public.dosirak_feed(text, uuid, uuid, text, timestamptz, int) from anon;
grant execute on function public.dosirak_create_crew(text) to authenticated;
grant execute on function public.dosirak_join_crew(text) to authenticated;
grant execute on function public.dosirak_crew_preview(text) to authenticated;
grant execute on function public.dosirak_feed(text, uuid, uuid, text, timestamptz, int) to authenticated;
grant execute on function public.dosirak_is_member(uuid) to authenticated;

-- 사진: 공개 버킷(공유 카드·피드에 바로 쓰려고). 쓰기는 본인 폴더만
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dosirak', 'dosirak', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
create policy "dosirak_photos insert own" on storage.objects
  for insert to authenticated with check (bucket_id = 'dosirak' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "dosirak_photos delete own" on storage.objects
  for delete to authenticated using (bucket_id = 'dosirak' and (storage.foldername(name))[1] = auth.uid()::text);
