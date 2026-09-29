-- [dream-market] 팔린 꿈도 시장 목록에 (흐리게) 보이도록 모든 꿈 행을 공개.
-- 꿈 내용(dream_market_contents)은 그대로: 판매 중이거나 내가 사고판 꿈만.
drop policy if exists "dream_market_dreams visible" on public.dream_market_dreams;
create policy "dream_market_dreams visible" on public.dream_market_dreams
  for select to authenticated using (true);

create index if not exists dream_market_dreams_created_idx on public.dream_market_dreams (created_at desc);
