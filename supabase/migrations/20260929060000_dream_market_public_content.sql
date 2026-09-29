-- [dream-market] 판매 중인 꿈은 사기 전에도 내용 공개. 팔린 꿈은 판매자/구매자만.
drop policy if exists "dream_market_contents for owners" on public.dream_market_contents;
drop policy if exists "dream_market_contents readable" on public.dream_market_contents;
create policy "dream_market_contents readable" on public.dream_market_contents
  for select to authenticated
  using (exists (
    select 1 from public.dream_market_dreams d
    where d.id = dream_id
      and (d.status = 'on_sale' or d.seller_id = auth.uid() or d.buyer_id = auth.uid())
  ));
