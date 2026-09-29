-- [dream-market] 코인 벌기(꿈 쓰기 · 감정 투표 · 후기) + 되팔기
-- 보상은 회원만. 게스트는 투표·후기는 할 수 있지만 코인은 0.

-- ─────────────────────────────── 꿈 컬럼 추가
alter table public.dream_market_dreams add column if not exists parent_id uuid references public.dream_market_dreams(id) on delete set null;
alter table public.dream_market_dreams add column if not exists generation int not null default 1;          -- 몇 번째 거래 매물인지
alter table public.dream_market_dreams add column if not exists original_seller_nickname text;             -- 원래 꿈꾼 사람
alter table public.dream_market_dreams add column if not exists votes_real int not null default 0;
alter table public.dream_market_dreams add column if not exists votes_fake int not null default 0;
alter table public.dream_market_dreams add column if not exists resold boolean not null default false;      -- 구매자가 되팔기 했는지

-- ─────────────────────────────── 보상 기록
create table if not exists public.dream_market_rewards (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.dream_market_profiles(id) on delete cascade,
  kind       text not null check (kind in ('write', 'vote', 'review')),
  dream_id   uuid not null,
  amount     bigint not null,
  created_at timestamptz not null default now(),
  unique (user_id, kind, dream_id)
);
create index if not exists dream_market_rewards_daily_idx on public.dream_market_rewards (user_id, kind, created_at);

-- ─────────────────────────────── 감정 투표
create table if not exists public.dream_market_votes (
  dream_id   uuid not null references public.dream_market_dreams(id) on delete cascade,
  user_id    uuid not null references public.dream_market_profiles(id) on delete cascade,
  verdict    text not null check (verdict in ('real', 'fake')),
  created_at timestamptz not null default now(),
  primary key (dream_id, user_id)
);

-- ─────────────────────────────── 후기 (산 꿈 하나에 하나)
create table if not exists public.dream_market_reviews (
  dream_id      uuid primary key references public.dream_market_dreams(id) on delete cascade,
  user_id       uuid not null references public.dream_market_profiles(id) on delete cascade,
  user_nickname text not null,
  verdict       text not null check (verdict in ('hit', 'meh', 'miss')),
  body          text not null check (char_length(body) between 1 and 200),
  created_at    timestamptz not null default now()
);

alter table public.dream_market_rewards enable row level security;
alter table public.dream_market_votes   enable row level security;
alter table public.dream_market_reviews enable row level security;
revoke insert, update, delete on public.dream_market_rewards, public.dream_market_votes, public.dream_market_reviews from anon, authenticated;

drop policy if exists "dream_market_rewards own" on public.dream_market_rewards;
create policy "dream_market_rewards own" on public.dream_market_rewards for select to authenticated using (user_id = auth.uid());
drop policy if exists "dream_market_votes readable" on public.dream_market_votes;
create policy "dream_market_votes readable" on public.dream_market_votes for select to authenticated using (true);
drop policy if exists "dream_market_reviews readable" on public.dream_market_reviews;
create policy "dream_market_reviews readable" on public.dream_market_reviews for select to authenticated using (true);

-- ─────────────────────────────── 보상 지급 (내부 전용)
-- 오늘(한국 시간) p_daily 회까지, (사람·종류·꿈)당 한 번. 게스트는 0.
create or replace function public.dream_market__reward(p_kind text, p_dream uuid, p_amount bigint, p_daily int)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_today int;
  v_coins bigint;
begin
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    return json_build_object('amount', 0, 'reason', 'guest');
  end if;

  select count(*) into v_today from dream_market_rewards
   where user_id = auth.uid() and kind = p_kind
     and created_at >= (date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul');
  if v_today >= p_daily then
    return json_build_object('amount', 0, 'reason', 'daily_cap', 'today', v_today, 'cap', p_daily);
  end if;

  insert into dream_market_rewards (user_id, kind, dream_id, amount) values (auth.uid(), p_kind, p_dream, p_amount)
  on conflict do nothing;
  if not found then return json_build_object('amount', 0, 'reason', 'already'); end if;

  update dream_market_profiles set coins = coins + p_amount where id = auth.uid() returning coins into v_coins;
  return json_build_object('amount', p_amount, 'today', v_today + 1, 'cap', p_daily, 'coins', v_coins);
end $$;
revoke execute on function public.dream_market__reward(text, uuid, bigint, int) from public, anon, authenticated;

-- ─────────────────────────────── 꿈 올리기 + 쓰기 보상 (하루 3번, 내용 10자 이상)
create or replace function public.dream_market_list(p_title text, p_content text, p_honesty text, p_price bigint)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  r public.dream_market_dreams;
  v_reward json;
begin
  r := dream_market_sell(p_title, '', p_content, null, p_honesty, p_price);
  if char_length(trim(p_content)) >= 10 then
    v_reward := dream_market__reward('write', r.id, 1000000, 3);
  else
    v_reward := json_build_object('amount', 0, 'reason', 'too_short');
  end if;
  return json_build_object('dream', row_to_json(r), 'reward', v_reward);
end $$;

-- ─────────────────────────────── 감정 투표 (+10만, 하루 20번, 꿈마다 첫 투표만)
create or replace function public.dream_market_vote(p_dream_id uuid, p_verdict text)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  d public.dream_market_dreams;
  v_prev text;
  v_real int;
  v_fake int;
  v_reward json := json_build_object('amount', 0, 'reason', 'changed');
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_verdict not in ('real', 'fake') then raise exception 'INVALID_VOTE'; end if;
  if not exists (select 1 from dream_market_profiles where id = auth.uid()) then raise exception 'NO_PROFILE'; end if;

  select * into d from dream_market_dreams where id = p_dream_id for update;
  if not found then raise exception 'DREAM_NOT_FOUND'; end if;
  if d.seller_id = auth.uid() then raise exception 'OWN_DREAM'; end if;

  select verdict into v_prev from dream_market_votes where dream_id = p_dream_id and user_id = auth.uid();
  if v_prev = p_verdict then
    return json_build_object('real', d.votes_real, 'fake', d.votes_fake, 'verdict', p_verdict, 'reward', json_build_object('amount', 0, 'reason', 'same'));
  end if;

  if v_prev is null then
    insert into dream_market_votes (dream_id, user_id, verdict) values (p_dream_id, auth.uid(), p_verdict);
    update dream_market_dreams
       set votes_real = votes_real + (p_verdict = 'real')::int,
           votes_fake = votes_fake + (p_verdict = 'fake')::int
     where id = p_dream_id
    returning votes_real, votes_fake into v_real, v_fake;
    v_reward := dream_market__reward('vote', p_dream_id, 100000, 20);
  else
    update dream_market_votes set verdict = p_verdict, created_at = now() where dream_id = p_dream_id and user_id = auth.uid();
    update dream_market_dreams
       set votes_real = votes_real + case when p_verdict = 'real' then 1 else -1 end,
           votes_fake = votes_fake + case when p_verdict = 'fake' then 1 else -1 end
     where id = p_dream_id
    returning votes_real, votes_fake into v_real, v_fake;
  end if;

  return json_build_object('real', v_real, 'fake', v_fake, 'verdict', p_verdict, 'reward', v_reward);
end $$;

-- ─────────────────────────────── 후기 (+50만, 산 꿈마다 한 번)
create or replace function public.dream_market_review(p_dream_id uuid, p_verdict text, p_body text)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  d public.dream_market_dreams;
  v_nickname text;
  v_body text := trim(coalesce(p_body, ''));
  v_reward json;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_verdict not in ('hit', 'meh', 'miss') then raise exception 'INVALID_REVIEW'; end if;
  if char_length(v_body) not between 1 and 200 then raise exception 'INVALID_REVIEW'; end if;

  select * into d from dream_market_dreams where id = p_dream_id;
  if not found then raise exception 'DREAM_NOT_FOUND'; end if;
  if d.buyer_id is distinct from auth.uid() then raise exception 'NOT_BUYER'; end if;

  select nickname into v_nickname from dream_market_profiles where id = auth.uid();
  insert into dream_market_reviews (dream_id, user_id, user_nickname, verdict, body)
  values (p_dream_id, auth.uid(), v_nickname, p_verdict, v_body)
  on conflict (dream_id) do nothing;
  if not found then raise exception 'ALREADY_REVIEWED'; end if;

  v_reward := dream_market__reward('review', p_dream_id, 500000, 1000);
  return json_build_object('review', json_build_object('verdict', p_verdict, 'body', v_body, 'user_nickname', v_nickname), 'reward', v_reward);
end $$;

-- ─────────────────────────────── 되팔기: 산 꿈을 새 매물로 (구매 한 건당 한 번)
create or replace function public.dream_market_resell(p_dream_id uuid, p_price bigint)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  d public.dream_market_dreams;
  r public.dream_market_dreams;
  v_nickname text;
  v_content text;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into d from dream_market_dreams where id = p_dream_id for update;
  if not found then raise exception 'DREAM_NOT_FOUND'; end if;
  if d.buyer_id is distinct from auth.uid() then raise exception 'NOT_BUYER'; end if;
  if d.resold then raise exception 'ALREADY_RESOLD'; end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) and p_price <> 0 then raise exception 'GUEST_FREE_ONLY'; end if;

  select nickname into v_nickname from dream_market_profiles where id = auth.uid();
  select content into v_content from dream_market_contents where dream_id = d.id;

  insert into dream_market_dreams (seller_id, seller_nickname, title, teaser, kind, honesty, price, parent_id, generation, original_seller_nickname)
  values (auth.uid(), v_nickname, d.title, '', d.kind, d.honesty, p_price, d.id, d.generation + 1, coalesce(d.original_seller_nickname, d.seller_nickname))
  returning * into r;
  insert into dream_market_contents (dream_id, content) values (r.id, v_content);
  update dream_market_dreams set resold = true where id = d.id;

  return row_to_json(r);
end $$;

-- 되판 매물을 거두면 원래 산 꿈은 다시 되팔 수 있게
create or replace function public.dream_market_withdraw(p_dream_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_parent uuid;
begin
  delete from dream_market_dreams where id = p_dream_id and seller_id = auth.uid() and status = 'on_sale'
  returning parent_id into v_parent;
  if not found then raise exception 'DREAM_NOT_FOUND'; end if;
  if v_parent is not null then update dream_market_dreams set resold = false where id = v_parent; end if;
end $$;

-- 닉네임 바꾸기: 후기에 적힌 이름도 함께
create or replace function public.dream_market_rename(p_nickname text)
returns public.dream_market_profiles
language plpgsql security definer set search_path = public
as $$
declare
  v_nickname text := trim(coalesce(p_nickname, ''));
  r public.dream_market_profiles;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if char_length(v_nickname) not between 1 and 20 then raise exception 'INVALID_NICKNAME'; end if;

  update dream_market_profiles set nickname = v_nickname where id = auth.uid() returning * into r;
  if not found then raise exception 'NO_PROFILE'; end if;

  update dream_market_dreams set seller_nickname = v_nickname where seller_id = auth.uid();
  update dream_market_dreams set buyer_nickname = v_nickname where buyer_id = auth.uid();
  update dream_market_reviews set user_nickname = v_nickname where user_id = auth.uid();
  return r;
end $$;

revoke execute on function public.dream_market_list(text, text, text, bigint) from public, anon;
revoke execute on function public.dream_market_vote(uuid, text)                from public, anon;
revoke execute on function public.dream_market_review(uuid, text, text)        from public, anon;
revoke execute on function public.dream_market_resell(uuid, bigint)            from public, anon;
revoke execute on function public.dream_market_withdraw(uuid)                  from public, anon;
revoke execute on function public.dream_market_rename(text)                    from public, anon;
grant execute on function public.dream_market_list(text, text, text, bigint) to authenticated;
grant execute on function public.dream_market_vote(uuid, text)                to authenticated;
grant execute on function public.dream_market_review(uuid, text, text)        to authenticated;
grant execute on function public.dream_market_resell(uuid, bigint)            to authenticated;
grant execute on function public.dream_market_withdraw(uuid)                  to authenticated;
grant execute on function public.dream_market_rename(text)                    to authenticated;
