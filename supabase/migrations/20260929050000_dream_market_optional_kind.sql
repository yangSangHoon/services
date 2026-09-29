-- [dream-market] 꿈 종류를 선택 사항으로 (null = 기타 꿈)
alter table public.dream_market_dreams alter column kind drop not null;

-- 빈 문자열로 와도 null로 저장
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
  values (auth.uid(), v_nickname, trim(p_title), trim(coalesce(p_teaser, '')), nullif(p_kind, ''), p_honesty, p_price)
  returning * into r;

  insert into dream_market_contents (dream_id, content) values (r.id, trim(p_content));
  return r;
end $$;
