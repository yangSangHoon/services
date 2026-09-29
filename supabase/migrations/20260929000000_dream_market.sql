-- [dream-market] 꿈사꿈팔
-- 공유 Supabase 프로젝트 규칙: 모든 테이블/함수는 `dream_market_` 접두사를 쓴다.
-- 코인 이동은 전부 security definer 함수(RPC)로만 가능하고, 클라이언트는 테이블에 직접 쓸 수 없습니다.

create extension if not exists pgcrypto;

-- ─────────────────────────────── 테이블

create table if not exists public.dream_market_profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  nickname      text not null check (char_length(nickname) between 1 and 20),
  coins         bigint not null default 0 check (coins >= 0),
  bonus_claimed boolean not null default false,
  created_at    timestamptz not null default now()
);

create table if not exists public.dream_market_dreams (
  id              uuid primary key default gen_random_uuid(),
  seller_id       uuid not null references public.dream_market_profiles(id) on delete cascade,
  seller_nickname text not null,
  title           text not null check (char_length(title) between 1 and 40),
  teaser          text not null default '' check (char_length(teaser) <= 80),
  kind            text not null check (kind in ('dragon','pig','poop','baby','love','nightmare','dog')),
  honesty         text not null check (honesty in ('real','half','fake')),
  price           bigint not null check (price between 0 and 1000000000000), -- 0 = 무료 나눔
  status          text not null default 'on_sale' check (status in ('on_sale','sold')),
  buyer_id        uuid references public.dream_market_profiles(id) on delete set null,
  buyer_nickname  text,
  sold_at         timestamptz,
  created_at      timestamptz not null default now()
);

-- 이미 테이블이 있던 경우를 위해 가격 제약을 다시 건다 (0 = 무료 나눔 허용)
alter table public.dream_market_dreams drop constraint if exists dream_market_dreams_price_check;
alter table public.dream_market_dreams add constraint dream_market_dreams_price_check check (price between 0 and 1000000000000);

create index if not exists dream_market_dreams_on_sale_idx on public.dream_market_dreams (created_at desc) where status = 'on_sale';
create index if not exists dream_market_dreams_seller_idx on public.dream_market_dreams (seller_id);
create index if not exists dream_market_dreams_buyer_idx on public.dream_market_dreams (buyer_id);

-- 꿈 본문은 판매자/구매자만 볼 수 있도록 별도 테이블로 분리
create table if not exists public.dream_market_contents (
  dream_id uuid primary key references public.dream_market_dreams(id) on delete cascade,
  content  text not null check (char_length(content) between 1 and 2000)
);

-- ─────────────────────────────── RLS (읽기만 허용, 쓰기는 RPC 전용)

alter table public.dream_market_profiles       enable row level security;
alter table public.dream_market_dreams         enable row level security;
alter table public.dream_market_contents enable row level security;

revoke insert, update, delete on public.dream_market_profiles, public.dream_market_dreams, public.dream_market_contents from anon, authenticated;

drop policy if exists "dream_market_profiles readable" on public.dream_market_profiles;
create policy "dream_market_profiles readable" on public.dream_market_profiles
  for select to authenticated using (true);

-- 팔린 꿈은 시장에서 사라지고, 판매자/구매자에게만 보임
drop policy if exists "dream_market_dreams visible" on public.dream_market_dreams;
create policy "dream_market_dreams visible" on public.dream_market_dreams
  for select to authenticated
  using (status = 'on_sale' or seller_id = auth.uid() or buyer_id = auth.uid());

drop policy if exists "dream_market_contents for owners" on public.dream_market_contents;
create policy "dream_market_contents for owners" on public.dream_market_contents
  for select to authenticated
  using (exists (
    select 1 from public.dream_market_dreams d
    where d.id = dream_id and (d.seller_id = auth.uid() or d.buyer_id = auth.uid())
  ));

-- ─────────────────────────────── RPC

-- 닉네임으로 입장 (프로필 생성/닉네임 변경). 게스트(익명)도 가능
create or replace function public.dream_market_join(p_nickname text)
returns public.dream_market_profiles
language plpgsql security definer set search_path = public
as $$
declare
  r public.dream_market_profiles;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  insert into dream_market_profiles (id, nickname) values (auth.uid(), trim(p_nickname))
  on conflict (id) do update set nickname = excluded.nickname
  returning * into r;
  return r;
end $$;

-- 첫 계시: 1억 코인 (가입 계정당 1회)
create or replace function public.dream_market_claim_bonus()
returns bigint
language plpgsql security definer set search_path = public
as $$
declare
  v_coins bigint;
begin
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then raise exception 'SIGNUP_REQUIRED'; end if;
  update dream_market_profiles set coins = coins + 100000000, bonus_claimed = true
  where id = auth.uid() and not bonus_claimed
  returning coins into v_coins;
  if v_coins is null then raise exception 'ALREADY_CLAIMED'; end if;
  return v_coins;
end $$;

-- 꿈 팔기 (회원: 유료/무료, 게스트: 무료만)
create or replace function public.dream_market_sell(
  p_title text, p_teaser text, p_content text, p_kind text, p_honesty text, p_price bigint
)
returns public.dream_market_dreams
language plpgsql security definer set search_path = public
as $$
declare
  v_nickname text;
  r public.dream_market_dreams;
begin
  select nickname into v_nickname from dream_market_profiles where id = auth.uid();
  if v_nickname is null then raise exception 'NO_PROFILE'; end if;
  -- 게스트는 코인을 벌 수 없으므로 무료 나눔만
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) and p_price <> 0 then
    raise exception 'GUEST_FREE_ONLY';
  end if;

  insert into dream_market_dreams (seller_id, seller_nickname, title, teaser, kind, honesty, price)
  values (auth.uid(), v_nickname, trim(p_title), trim(coalesce(p_teaser, '')), p_kind, p_honesty, p_price)
  returning * into r;

  insert into dream_market_contents (dream_id, content) values (r.id, trim(p_content));
  return r;
end $$;

-- 꿈 사기: 코인 이동 + 판매완료 처리 + 본문 반환 (원자적)
create or replace function public.dream_market_buy(p_dream_id uuid)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  d          public.dream_market_dreams;
  v_coins    bigint;
  v_nickname text;
  v_content  text;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into d from dream_market_dreams where id = p_dream_id for update;
  if not found then raise exception 'DREAM_NOT_FOUND'; end if;
  if d.status <> 'on_sale' then raise exception 'ALREADY_SOLD'; end if;
  if d.seller_id = auth.uid() then raise exception 'OWN_DREAM'; end if;

  update dream_market_profiles set coins = coins - d.price
  where id = auth.uid() and coins >= d.price
  returning coins, nickname into v_coins, v_nickname;
  if v_coins is null then raise exception 'NOT_ENOUGH_COINS'; end if;

  update dream_market_profiles set coins = coins + d.price where id = d.seller_id;
  update dream_market_dreams
     set status = 'sold', buyer_id = auth.uid(), buyer_nickname = v_nickname, sold_at = now()
   where id = d.id;

  select content into v_content from dream_market_contents where dream_id = d.id;
  return json_build_object('content', v_content, 'coins', v_coins);
end $$;

-- 판매 중인 내 꿈 거두기
create or replace function public.dream_market_withdraw(p_dream_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  delete from dream_market_dreams where id = p_dream_id and seller_id = auth.uid() and status = 'on_sale';
  if not found then raise exception 'DREAM_NOT_FOUND'; end if;
end $$;

revoke execute on function public.dream_market_join(text)  from public, anon;
revoke execute on function public.dream_market_claim_bonus()   from public, anon;
revoke execute on function public.dream_market_sell(text, text, text, text, text, bigint) from public, anon;
revoke execute on function public.dream_market_buy(uuid)         from public, anon;
revoke execute on function public.dream_market_withdraw(uuid)    from public, anon;

grant execute on function public.dream_market_join(text)  to authenticated;
grant execute on function public.dream_market_claim_bonus()   to authenticated;
grant execute on function public.dream_market_sell(text, text, text, text, text, bigint) to authenticated;
grant execute on function public.dream_market_buy(uuid)         to authenticated;
grant execute on function public.dream_market_withdraw(uuid)    to authenticated;
