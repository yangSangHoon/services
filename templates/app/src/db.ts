import { supabase } from '@lab/core';

/**
 * 공유 Supabase 프로젝트 규칙: 이 앱의 모든 테이블/함수는 `__PREFIX__` 접두사를 쓴다.
 * 스키마: supabase/migrations/*___PREFIX__*.sql
 */
export const PREFIX = '__PREFIX__';
export const table = (name: string) => supabase.from(`${PREFIX}${name}`);
export const rpc = <T,>(name: string, args?: Record<string, unknown>) =>
  supabase.rpc(`${PREFIX}${name}`, args).then(({ data, error }) => {
    if (error) throw error;
    return data as T;
  });
