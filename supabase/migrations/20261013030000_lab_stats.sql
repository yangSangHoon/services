-- [lab] 모든 앱 공용 방문 통계
-- 앱은 lab_track() 으로 방문·이벤트를 남기고, 대시보드(apps/stats)는 lab_stats() 로 집계만 받는다.
-- 원본 행은 아무도 직접 못 읽는다(RLS 정책 없음). 집계는 lab_admins 에 등록된 계정만.

-- ─────────────────────────────── 테이블

create table if not exists public.lab_visits (
  id         bigint generated always as identity primary key,
  app        text not null check (app ~ '^[a-z0-9-]{1,40}$'),
  event      text not null default 'view' check (event ~ '^[a-z0-9_-]{1,40}$'),
  visitor    uuid not null,              -- 브라우저마다 임의로 만든 ID (개인정보 아님)
  referrer   text check (char_length(referrer) <= 100), -- 유입 호스트 또는 'kakaotalk' 등
  created_at timestamptz not null default now()
);

create index if not exists lab_visits_app_time_idx on public.lab_visits (app, created_at desc);
create index if not exists lab_visits_dedupe_idx on public.lab_visits (visitor, app, event, created_at desc);

-- 대시보드를 볼 수 있는 계정. 등록은 SQL Editor 에서:
--   insert into public.lab_admins (user_id) select id from auth.users where email = '<내 이메일>';
create table if not exists public.lab_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.lab_visits enable row level security;
alter table public.lab_admins enable row level security;
revoke all on public.lab_visits, public.lab_admins from anon, authenticated;

-- ─────────────────────────────── 기록

-- 'view' 는 같은 브라우저가 30분 안에 다시 와도 한 번만 센다(새로고침 부풀림 방지).
-- 다른 이벤트는 같은 것이 3초 안에 반복되면 무시한다(연타 방지).
create or replace function public.lab_track(p_app text, p_event text, p_visitor uuid, p_referrer text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window interval := case when p_event = 'view' then interval '30 minutes' else interval '3 seconds' end;
begin
  if p_app !~ '^[a-z0-9-]{1,40}$' or p_event !~ '^[a-z0-9_-]{1,40}$' or p_visitor is null then
    raise exception 'INVALID_EVENT';
  end if;
  if exists (
    select 1 from lab_visits
    where visitor = p_visitor and app = p_app and event = p_event and created_at > now() - v_window
  ) then
    return;
  end if;
  insert into lab_visits (app, event, visitor, referrer)
  values (p_app, p_event, p_visitor, nullif(left(p_referrer, 100), ''));
end;
$$;

-- ─────────────────────────────── 집계 (관리자만)

create or replace function public.lab_stats(p_days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_days  int := least(greatest(coalesce(p_days, 30), 7), 365);
  v_since timestamptz := ((v_today - (v_days - 1))::timestamp at time zone 'Asia/Seoul');
  v_week  timestamptz := ((v_today - 6)::timestamp at time zone 'Asia/Seoul');
  v_day   timestamptz := (v_today::timestamp at time zone 'Asia/Seoul');
begin
  if not exists (select 1 from lab_admins where user_id = auth.uid()) then
    raise exception 'NOT_ADMIN';
  end if;

  return jsonb_build_object(
    'today', v_today,
    'days', v_days,
    -- 앱별 요약: 순방문자(오늘/7일/기간), 방문 수(기간), 누적 순방문자
    'apps', coalesce((
      select jsonb_agg(row_to_json(s) order by s.period_visitors desc)
      from (
        select app,
               count(distinct visitor) filter (where created_at >= v_day)   as today_visitors,
               count(distinct visitor) filter (where created_at >= v_week)  as week_visitors,
               count(distinct visitor) filter (where created_at >= v_since) as period_visitors,
               count(*) filter (where created_at >= v_since)                as period_views,
               count(distinct visitor)                                      as total_visitors
        from lab_visits
        where event = 'view'
        group by app
      ) s
    ), '[]'::jsonb),
    -- 일별 추이
    'daily', coalesce((
      select jsonb_agg(row_to_json(d) order by d.day)
      from (
        select app, (created_at at time zone 'Asia/Seoul')::date as day,
               count(distinct visitor) as visitors, count(*) as views
        from lab_visits
        where event = 'view' and created_at >= v_since
        group by 1, 2
      ) d
    ), '[]'::jsonb),
    -- 앱 안 이벤트(녹화, 공유 등)
    'events', coalesce((
      select jsonb_agg(row_to_json(e) order by e.count desc)
      from (
        select app, event, count(*) as count, count(distinct visitor) as visitors
        from lab_visits
        where event <> 'view' and created_at >= v_since
        group by 1, 2
      ) e
    ), '[]'::jsonb),
    -- 유입 경로
    'referrers', coalesce((
      select jsonb_agg(row_to_json(r) order by r.visitors desc)
      from (
        select app, coalesce(referrer, 'direct') as referrer, count(distinct visitor) as visitors
        from lab_visits
        where event = 'view' and created_at >= v_since
        group by 1, 2
        order by 3 desc
        limit 100
      ) r
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.lab_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select exists (select 1 from lab_admins where user_id = auth.uid()) $$;

revoke execute on function public.lab_track(text, text, uuid, text) from public;
revoke execute on function public.lab_stats(int) from public, anon;
revoke execute on function public.lab_is_admin() from public, anon;
grant execute on function public.lab_track(text, text, uuid, text) to anon, authenticated;
grant execute on function public.lab_stats(int) to authenticated;
grant execute on function public.lab_is_admin() to authenticated;
