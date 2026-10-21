import { useEffect, useState } from 'react';

/**
 * 해시 라우트
 *   #/ 피드   #/new 쓰기   #/me 내 도시락   #/p/<id> 글   #/u/<id> 사람
 *   #/crew 멤버 목록   #/crew/<id> 반찬 당번표   #/join/<code> 초대
 */
export type Route =
  | { name: 'feed' }
  | { name: 'new' }
  | { name: 'me' }
  | { name: 'post'; id: string }
  | { name: 'user'; id: string }
  | { name: 'crews' }
  | { name: 'crew'; id: string }
  | { name: 'join'; code: string };

export function parse(hash: string): Route {
  const [, a, b] = hash.replace(/^#/, '').split('/');
  if (a === 'new') return { name: 'new' };
  if (a === 'me') return { name: 'me' };
  if (a === 'p' && b) return { name: 'post', id: b };
  if (a === 'u' && b) return { name: 'user', id: b };
  if (a === 'crew' && b) return { name: 'crew', id: b };
  if (a === 'crew') return { name: 'crews' };
  if (a === 'join' && b) return { name: 'join', code: b };
  return { name: 'feed' };
}

export const go = (hash: string) => {
  location.hash = hash;
};
export const back = (fallback = '#/') => (history.length > 1 ? history.back() : go(fallback));

export function useRoute() {
  const [route, setRoute] = useState(() => parse(location.hash));
  useEffect(() => {
    const on = () => {
      setRoute(parse(location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
