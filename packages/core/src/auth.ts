import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

/** 현재 세션. loading 동안은 로그인 여부를 아직 모름 */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
      // 인증 메일 링크로 돌아왔을 때 주소창의 토큰 해시 정리
      if (s && location.hash.includes('access_token')) history.replaceState(null, '', location.pathname + location.search);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return { session, loading };
}

/** 게스트(익명) 로그인. Supabase > Authentication > Sign In / Providers > Allow anonymous sign-ins 필요 */
export async function signInAsGuest() {
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.session!;
}

export const isGuest = (session: Session | null) => Boolean(session?.user.is_anonymous);

/**
 * 회원가입. 게스트로 로그인 중이면 그 계정을 그대로 정식 계정으로 전환한다(데이터 유지).
 * metadata는 user_metadata로 저장된다(예: 닉네임).
 * "Confirm email"이 켜져 있으면 needsEmailConfirm=true — 메일 링크를 누르면 지금 앱으로 돌아온다.
 */
export async function signUpWithEmail(email: string, password: string, metadata?: Record<string, unknown>) {
  const redirectTo = location.origin + location.pathname;
  const { data: current } = await supabase.auth.getSession();

  if (isGuest(current.session)) {
    const { data, error } = await supabase.auth.updateUser({ email, data: metadata }, { emailRedirectTo: redirectTo });
    if (error) throw error;
    if (data.user.email !== email) return { needsEmailConfirm: true };
    const { error: pwError } = await supabase.auth.updateUser({ password });
    if (pwError) throw pwError;
    await supabase.auth.refreshSession(); // is_anonymous=false 가 담긴 새 토큰
    return { needsEmailConfirm: false };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata, emailRedirectTo: redirectTo },
  });
  if (error) throw error;
  return { needsEmailConfirm: !data.session };
}
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  await supabase.auth.signOut();
}

const AUTH_ERRORS: Record<string, string> = {
  invalid_credentials: '이메일 또는 비밀번호가 맞지 않아요.',
  email_not_confirmed: '메일함에서 인증 링크를 먼저 눌러주세요.',
  user_already_exists: '이미 가입된 이메일이에요. 로그인해 주세요.',
  weak_password: '비밀번호는 6자 이상이어야 해요.',
  email_address_invalid: '이메일 주소를 다시 확인해 주세요.',
  validation_failed: '이메일 주소를 다시 확인해 주세요.',
  over_email_send_rate_limit: '메일을 너무 자주 보냈어요. 잠시 후 다시 시도해 주세요.',
  over_request_rate_limit: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.',
  signup_disabled: '지금은 회원가입이 막혀 있어요.',
  anonymous_provider_disabled: '게스트 입장이 아직 꺼져 있어요. 회원가입으로 들어와 주세요.',
  email_exists: '이미 가입된 이메일이에요. 로그인해 주세요.',
};

/** Supabase Auth 에러 → 한국어 문구. 모르는 에러면 null */
export function authErrorMessage(e: unknown) {
  const code = (e as { code?: string })?.code;
  return (code && AUTH_ERRORS[code]) || null;
}
