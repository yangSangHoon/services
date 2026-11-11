-- [phone-finder] 우리집 폰 찾기 — 가족 폰의 마지막 위치
-- 공유 Supabase 프로젝트 규칙: 모든 이름에 `phone_finder_` 접두사.
--
-- 로그인 없이 "가족 코드"(8자리, 추측 불가)가 비밀번호 역할을 한다.
-- 실시간 위치·소리 울리기는 Realtime broadcast 로 주고받고,
-- 이 테이블은 "앱을 닫은 폰의 마지막 위치"를 남겨 두는 용도.
-- 테이블은 직접 읽고 쓸 수 없고, 가족 코드를 아는 사람만 RPC 로 접근한다.

create table if not exists public.phone_finder_devices (
  family     text not null check (family ~ '^[A-Z0-9]{8,16}$'),
  device     uuid not null,
  name       text not null check (char_length(btrim(name)) between 1 and 20),
  emoji      text not null default '📱' check (char_length(emoji) <= 16),
  lat        double precision check (lat between -90 and 90),
  lng        double precision check (lng between -180 and 180),
  acc        real check (acc >= 0),
  battery    smallint check (battery between 0 and 100),
  platform   text check (platform in ('ios', 'android', 'other')),
  updated_at timestamptz not null default now(),
  primary key (family, device)
);
alter table public.phone_finder_devices enable row level security;
revoke all on public.phone_finder_devices from anon, authenticated;
-- 이미 만들어 둔 테이블에도 적용되게(재실행 안전)
alter table public.phone_finder_devices add column if not exists platform text check (platform in ('ios', 'android', 'other'));
drop function if exists public.phone_finder_report(text, uuid, text, text, double precision, double precision, real, smallint);

-- 내 폰 정보(+위치) 남기기
create or replace function public.phone_finder_report(
  p_family text, p_device uuid, p_name text, p_emoji text,
  p_lat double precision default null, p_lng double precision default null,
  p_acc real default null, p_battery smallint default null, p_platform text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into phone_finder_devices as d (family, device, name, emoji, lat, lng, acc, battery, platform, updated_at)
  values (p_family, p_device, btrim(p_name), coalesce(p_emoji, '📱'), p_lat, p_lng, p_acc, p_battery, p_platform, now())
  on conflict (family, device) do update set
    name = excluded.name,
    emoji = excluded.emoji,
    lat = coalesce(excluded.lat, d.lat),
    lng = coalesce(excluded.lng, d.lng),
    acc = case when excluded.lat is null then d.acc else excluded.acc end,
    battery = coalesce(excluded.battery, d.battery),
    platform = coalesce(excluded.platform, d.platform),
    updated_at = now();
end $$;

-- 가족 목록(마지막 위치 포함)
create or replace function public.phone_finder_list(p_family text)
returns setof public.phone_finder_devices
language sql stable security definer set search_path = public as $$
  select * from phone_finder_devices where family = p_family order by updated_at desc limit 30;
$$;

-- 가족에서 빼기
create or replace function public.phone_finder_remove(p_family text, p_device uuid)
returns void
language sql security definer set search_path = public as $$
  delete from phone_finder_devices where family = p_family and device = p_device;
$$;

grant execute on function public.phone_finder_report(text, uuid, text, text, double precision, double precision, real, smallint, text) to anon, authenticated;
grant execute on function public.phone_finder_list(text) to anon, authenticated;
grant execute on function public.phone_finder_remove(text, uuid) to anon, authenticated;
