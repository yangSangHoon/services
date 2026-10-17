-- [moments] 찰나 — 순간의 추억을 10초 만에 남기는 기록장
-- 공유 Supabase 프로젝트 규칙: 모든 테이블/함수/인덱스/정책 이름은 `moments_` 접두사를 쓴다.
-- 개인 기록이라 읽기·쓰기 모두 본인 것만. 사진은 비공개 버킷 moments/<user_id>/<entry_id>.jpg

create table if not exists public.moments_entries (
  id          uuid primary key,                -- 클라이언트가 만든 id (오프라인 저장 후 재전송해도 중복 안 생기게)
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body        text not null default '' check (char_length(body) <= 2000),
  mood        text check (mood is null or char_length(mood) <= 16),
  photo_path  text check (photo_path is null or char_length(photo_path) <= 200),
  happened_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  constraint moments_entries_not_empty check (char_length(body) > 0 or photo_path is not null or mood is not null)
);

create index if not exists moments_entries_user_time on public.moments_entries (user_id, happened_at desc);

alter table public.moments_entries enable row level security;

create policy "moments_entries select own" on public.moments_entries
  for select to authenticated using (user_id = auth.uid());
create policy "moments_entries insert own" on public.moments_entries
  for insert to authenticated with check (user_id = auth.uid());
create policy "moments_entries update own" on public.moments_entries
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "moments_entries delete own" on public.moments_entries
  for delete to authenticated using (user_id = auth.uid());

-- 사진 버킷 (비공개, 5MB, 이미지만)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('moments', 'moments', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "moments_photos select own" on storage.objects
  for select to authenticated using (bucket_id = 'moments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "moments_photos insert own" on storage.objects
  for insert to authenticated with check (bucket_id = 'moments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "moments_photos update own" on storage.objects
  for update to authenticated using (bucket_id = 'moments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "moments_photos delete own" on storage.objects
  for delete to authenticated using (bucket_id = 'moments' and (storage.foldername(name))[1] = auth.uid()::text);
