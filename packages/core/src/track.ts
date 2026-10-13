/**
 * 공용 방문 통계. supabase-js 없이 fetch 한 번이라 번들에 거의 안 붙는다.
 *
 *   import { track } from '@lab/core/track';
 *   track('food-match');            // 방문 (main.tsx 에서 한 번)
 *   track('food-match', 'share');   // 앱 안 이벤트
 *
 * 개발 서버(npm run dev)에서는 기록하지 않는다. 집계는 /services/stats/ 대시보드.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const VISITOR_KEY = 'lab:visitor';

/** 브라우저마다 한 번 만드는 임의 ID. 순방문자 집계에만 쓴다 */
function visitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

/** 유입 경로: 앱 내 브라우저(카톡 등)는 referrer 가 비어 있어서 UA 로 구분한다 */
function source() {
  const ua = navigator.userAgent;
  if (/KAKAOTALK/i.test(ua)) return 'kakaotalk';
  if (/Instagram/i.test(ua)) return 'instagram';
  if (/FBAN|FBAV/i.test(ua)) return 'facebook';
  if (/NAVER\(inapp/i.test(ua)) return 'naver-app';
  if (/Line\//i.test(ua)) return 'line';
  const utm = new URLSearchParams(location.search).get('utm_source');
  if (utm) return utm.slice(0, 40);
  try {
    const ref = new URL(document.referrer);
    if (ref.host === location.host) return ref.pathname.split('/')[2] ? `lab:${ref.pathname.split('/')[2]}` : 'lab';
    return ref.host.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function track(app: string, event = 'view') {
  if (import.meta.env.DEV || !url || !key) return;
  void fetch(`${url}/rest/v1/rpc/lab_track`, {
    method: 'POST',
    keepalive: true,
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_app: app, p_event: event, p_visitor: visitorId(), p_referrer: event === 'view' ? source() : null }),
  }).catch(() => {
    /* 통계 실패는 앱 동작과 무관 */
  });
}
