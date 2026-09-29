import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && anonKey);

/**
 * 모든 앱이 공유하는 Supabase 클라이언트.
 * 앱들이 같은 origin(github.io/services)에서 서비스되므로 로그인 세션도 앱 간에 공유된다.
 */
export const supabase = createClient(url ?? 'http://localhost:54321', anonKey ?? 'missing-anon-key');
