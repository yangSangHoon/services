-- [dream-market] 닉네임 바꾸기. 내가 올린/산 꿈에 적힌 이름도 함께 바꾼다.
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
  return r;
end $$;

revoke execute on function public.dream_market_rename(text) from public, anon;
grant execute on function public.dream_market_rename(text) to authenticated;
