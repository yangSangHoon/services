-- [dream-market] 팔린 꿈도 시장 목록에서 내용까지 볼 수 있도록 꿈 내용 전체 공개.
drop policy if exists "dream_market_contents readable" on public.dream_market_contents;
create policy "dream_market_contents readable" on public.dream_market_contents
  for select to authenticated using (true);
